import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MEASUREMENT_ID = 'G-8Z16FYML7H';
const API_SECRET = 'SeqhU2SYTsWQuXbRLJP8Sg';

async function syncOrdersToGA4() {
    const orderIds = [
        '879750db-89f2-411f-9f95-72672b5aa1ff',
        '8c96d528-dec6-4181-8750-2e9ed58a2e40'
    ];

    for (const id of orderIds) {
        const { data: order, error: orderErr } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        if (orderErr || !order) {
            console.error(`Order ${id} not found:`, orderErr);
            continue;
        }

        const { data: items, error: itemsErr } = await supabase
            .from('order_items')
            .select('*, products(*)')
            .eq('order_id', id);

        if (itemsErr) {
            console.error(`Items for order ${id} not found:`, itemsErr);
            continue;
        }

        console.log(`\n========================================`);
        console.log(`Processing order #${order.id.slice(0, 8).toUpperCase()}...`);
        console.log(`Created at: ${order.created_at}`);
        console.log(`Items count: ${items.length}, Total: ${order.total}€, Shipping: ${order.shipping_cost}€`);

        const ga4Items = items.map(item => ({
            item_id: String(item.products?.reference || item.product_id),
            item_name: String(item.products?.name || item.name || 'Producto'),
            price: Number(Number(item.price_at_purchase || item.price || item.products?.price || 0).toFixed(2)),
            quantity: Number(item.quantity || 1)
        }));

        const totalVal = Number(Number(order.total || 0).toFixed(2));
        const shippingVal = Number(Number(order.shipping_cost || 0).toFixed(2));
        const taxVal = Number((totalVal - (totalVal / 1.21)).toFixed(2));
        
        // Parse created_at to microsecond timestamp
        const orderDate = new Date(order.created_at || Date.now());
        const timestampMicros = String(orderDate.getTime() * 1000);

        const payload = {
            client_id: `client_${order.id.replace(/-/g, '').slice(0, 16)}`,
            timestamp_micros: timestampMicros,
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

        console.log('Sending to GA4 Debug endpoint...');
        // 1. Validate with debug endpoint
        const debugUrl = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;
        const debugRes = await fetch(debugUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const debugJson = await debugRes.json();
        console.log('Debug validation result:', JSON.stringify(debugJson, null, 2));

        if (debugJson.validationMessages && debugJson.validationMessages.length > 0) {
            console.error('Validation messages found! Checking errors...');
            continue;
        }

        // 2. Send to live GA4 endpoint
        const liveUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;
        const liveRes = await fetch(liveUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`Live send status for order #${order.id.slice(0, 8).toUpperCase()}: HTTP ${liveRes.status} (204 = SUCCESS)`);
    }
}

syncOrdersToGA4();
