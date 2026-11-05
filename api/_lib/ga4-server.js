/**
 * Helper to send purchase and refund events directly to GA4 via Measurement Protocol from server endpoints.
 * This ensures sales are recorded in Google Analytics even if the customer closes their browser
 * during 3D Secure bank redirects or when orders are confirmed/updated from the admin panel.
 * 
 * NOTE: Placed in api/_lib/ so Vercel does NOT treat this helper as a Serverless Function!
 */
// Fecha de corte fija al inicio de la etapa actual de pedidos en la web (1 de septiembre de 2026).
// Bloquea de raíz los 134 pedidos históricos importados (febrero–julio), permitiendo operar con
// normalidad sobre los pedidos reales de la web actual (incluyendo confirmaciones diferidas de fin
// de semana/transferencia y posibles devoluciones reales de pedidos recientes).
const GA4_HISTORICAL_CUTOFF = '2026-09-01T00:00:00Z';

function isHistoricalOrder(order) {
    if (!order?.created_at) return true;
    const createdTime = new Date(order.created_at).getTime();
    const cutoffTime = new Date(GA4_HISTORICAL_CUTOFF).getTime();
    return Number.isNaN(createdTime) || createdTime < cutoffTime;
}

export async function sendServerPurchaseEvent(supabase, orderId, options = {}) {
    try {
        const { clientTracked = false, gaClientId = null } = options;
        const apiSecret = process.env.GA4_API_SECRET || 'SeqhU2SYTsWQuXbRLJP8Sg';
        const measurementId = process.env.GA4_MEASUREMENT_ID || 'G-8Z16FYML7H';
        if (!apiSecret || !orderId) return { success: false, reason: 'missing_config_or_id' };

        const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
        if (!order) return { success: false, reason: 'order_not_found' };

        // 0. CANDADO HISTÓRICO FIJO: Jamás enviar a GA4 pedidos anteriores a la fecha de corte
        if (isHistoricalOrder(order)) {
            console.log(`[GA4 Server] Skipping historical order #${order.id.slice(0, 8).toUpperCase()} (${order.created_at} < ${GA4_HISTORICAL_CUTOFF}).`);
            return { success: false, reason: 'historical_order_locked' };
        }

        // 1. REGLA: Solo pedidos efectivamente confirmados (PAGADOS, ENVIADOS o ENTREGADOS)
        // Pedidos cancelados o fallidos NO deben registrarse como compra
        if (order.status === 'CANCELLED' || order.status === 'failed' || order.status === 'RETURNED') {
            return { success: false, reason: 'order_cancelled_or_failed' };
        }

        const isPaidOrShipped = 
            String(order.payment_status || '').toUpperCase() === 'PAID' || 
            String(order.payment_status || '').toLowerCase() === 'completed' || 
            ['PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(String(order.status || '').toUpperCase());

        if (!isPaidOrShipped) {
            console.log(`[GA4 Server] Skipping order #${order.id.slice(0, 8).toUpperCase()}: payment/order is still pending (status: ${order.status}, payment_status: ${order.payment_status}).`);
            return { success: false, reason: 'payment_pending' };
        }

        // 2. CONTROL DE IDEMPOTENCIA: Verificar si ya fue sincronizado con GA4 previamente
        if (order.admin_notes && order.admin_notes.includes('[GA4_PURCHASE_SYNCED]')) {
            console.log(`[GA4 Server] Order #${order.id.slice(0, 8).toUpperCase()} already synced to GA4 previously. Skipping duplicate.`);
            return { success: false, reason: 'already_synced' };
        }

        // 3. DEDUPLICACIÓN NAVEGADOR vs SERVIDOR:
        // Si el navegador del cliente ya envió el evento con gtag.js activo (sin AdBlock),
        // solo marcamos [GA4_PURCHASE_SYNCED] para no duplicar la venta en GA4 ni al cambiar estado en Admin.
        if (clientTracked) {
            const currentNotes = order.admin_notes ? order.admin_notes.trim() : '';
            const updatedNotes = currentNotes ? `${currentNotes} [GA4_PURCHASE_SYNCED]` : '[GA4_PURCHASE_SYNCED]';
            await supabase.from('orders').update({ admin_notes: updatedNotes }).eq('id', order.id);
            console.log(`[GA4 Server] Order #${order.id.slice(0, 8).toUpperCase()} tracked by client browser; marked [GA4_PURCHASE_SYNCED].`);
            return { success: true, mode: 'client_tracked_marked' };
        }

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

        const resolvedClientId = gaClientId || `server_${order.id.replace(/-/g, '').slice(0, 16)}`;

        const payload = {
            client_id: resolvedClientId,
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
            // Marcar en admin_notes para asegurar que NUNCA vuelva a duplicarse
            const currentNotes = order.admin_notes ? order.admin_notes.trim() : '';
            const updatedNotes = currentNotes ? `${currentNotes} [GA4_PURCHASE_SYNCED]` : '[GA4_PURCHASE_SYNCED]';
            await supabase.from('orders').update({ admin_notes: updatedNotes }).eq('id', order.id);
            return { success: true };
        }
        return { success: false, status: res.status };
    } catch (e) {
        console.warn('[GA4 Server] Could not send purchase event:', e.message);
        return { success: false, error: e.message };
    }
}

export async function sendServerRefundEvent(supabase, orderId) {
    try {
        const apiSecret = process.env.GA4_API_SECRET || 'SeqhU2SYTsWQuXbRLJP8Sg';
        const measurementId = process.env.GA4_MEASUREMENT_ID || 'G-8Z16FYML7H';
        if (!apiSecret || !orderId) return { success: false, reason: 'missing_config_or_id' };

        const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
        if (!order) return { success: false, reason: 'order_not_found' };

        // 0. CANDADO HISTÓRICO FIJO: Jamás tocar ni reembolsar en GA4 pedidos anteriores a la fecha de corte
        if (isHistoricalOrder(order)) {
            console.log(`[GA4 Server] Skipping refund for historical order #${order.id.slice(0, 8).toUpperCase()} (${order.created_at} < ${GA4_HISTORICAL_CUTOFF}).`);
            return { success: false, reason: 'historical_order_locked' };
        }

        // 1. Solo reembolsar si realmente fue contabilizado previamente como compra en GA4
        if (!order.admin_notes || !order.admin_notes.includes('[GA4_PURCHASE_SYNCED]')) {
            console.log(`[GA4 Server] Skipping refund for order #${order.id.slice(0, 8).toUpperCase()}: never synced as purchase.`);
            return { success: false, reason: 'never_purchased_in_ga4' };
        }

        // 2. Si ya fue reembolsado en GA4, evitar duplicar el reembolso
        if (order.admin_notes && order.admin_notes.includes('[GA4_REFUND_SYNCED]')) {
            console.log(`[GA4 Server] Order #${order.id.slice(0, 8).toUpperCase()} already refunded in GA4 previously. Skipping duplicate.`);
            return { success: false, reason: 'already_refunded' };
        }

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
            const currentNotes = order.admin_notes ? order.admin_notes.trim() : '';
            const updatedNotes = currentNotes ? `${currentNotes} [GA4_REFUND_SYNCED]` : '[GA4_REFUND_SYNCED]';
            await supabase.from('orders').update({ admin_notes: updatedNotes }).eq('id', order.id);
            return { success: true };
        }
        return { success: false, status: res.status };
    } catch (e) {
        console.warn('[GA4 Server] Could not send refund event:', e.message);
        return { success: false, error: e.message };
    }
}
