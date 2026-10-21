/**
 * Helper to send purchase and refund events directly to GA4 via Measurement Protocol from server endpoints.
 * This ensures sales are recorded in Google Analytics even if the customer closes their browser
 * during 3D Secure bank redirects or when orders are confirmed/updated from the admin panel.
 * 
 * NOTE: Placed in api/_lib/ so Vercel does NOT treat this helper as a Serverless Function!
 */
export async function sendServerPurchaseEvent(supabase, orderId) {
    try {
        const apiSecret = process.env.GA4_API_SECRET;
        const measurementId = process.env.GA4_MEASUREMENT_ID || 'G-8Z16FYML7H';
        if (!apiSecret || !orderId) return;

        const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
        if (!order) return;

        // Verificar que no sea un pedido cancelado o fallido
        if (order.status === 'CANCELLED' || order.status === 'failed') return;

        const { data: items } = await supabase.from('order_items').select('*, products(*)').eq('order_id', orderId);

        const ga4Items = (items || []).map(item => ({
            item_id: String(item.products?.reference || item.product_id),
            item_name: String(item.products?.name || item.product_name || item.name || 'Producto'),
            price: Number(Number(item.unit_price || item.price_at_purchase || item.price || item.products?.price || 0).toFixed(2)),
            quantity: Number(item.quantity || 1)
        }));

        const totalVal = Number(Number(order.total || 0).toFixed(2));
        const shippingVal = Number(Number(order.shipping_cost || 0).toFixed(2));
        const taxVal = Number((totalVal - (totalVal / 1.21)).toFixed(2));

        const payload = {
            client_id: `server_${order.id.replace(/-/g, '').slice(0, 16)}`,
            events: [
                {
                    name: 'purchase',
                    params: {
                        currency: 'EUR',
                        transaction_id: order.id.slice(0, 8).toUpperCase(),
                        value: totalVal,
                        shipping: shippingVal,
                        tax: taxVal,
                        items: ga4Items
                    }
                }
            ]
        };

        const res = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            console.log(`[GA4 Server] Successfully tracked purchase for order #${order.id.slice(0, 8).toUpperCase()}`);
        }
    } catch (e) {
        console.warn('[GA4 Server] Could not send purchase event:', e.message);
    }
}

export async function sendServerRefundEvent(supabase, orderId) {
    try {
        const apiSecret = process.env.GA4_API_SECRET;
        const measurementId = process.env.GA4_MEASUREMENT_ID || 'G-8Z16FYML7H';
        if (!apiSecret || !orderId) return;

        const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
        if (!order) return;

        const { data: items } = await supabase.from('order_items').select('*, products(*)').eq('order_id', orderId);

        const ga4Items = (items || []).map(item => ({
            item_id: String(item.products?.reference || item.product_id),
            item_name: String(item.products?.name || item.product_name || item.name || 'Producto'),
            price: Number(Number(item.unit_price || item.price_at_purchase || item.price || item.products?.price || 0).toFixed(2)),
            quantity: Number(item.quantity || 1)
        }));

        const totalVal = Number(Number(order.total || 0).toFixed(2));
        const shippingVal = Number(Number(order.shipping_cost || 0).toFixed(2));

        const payload = {
            client_id: `server_${order.id.replace(/-/g, '').slice(0, 16)}`,
            events: [
                {
                    name: 'refund',
                    params: {
                        currency: 'EUR',
                        transaction_id: order.id.slice(0, 8).toUpperCase(),
                        value: totalVal,
                        shipping: shippingVal,
                        items: ga4Items
                    }
                }
            ]
        };

        const res = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            console.log(`[GA4 Server] Successfully refunded order #${order.id.slice(0, 8).toUpperCase()}`);
        }
    } catch (e) {
        console.warn('[GA4 Server] Could not send refund event:', e.message);
    }
}
