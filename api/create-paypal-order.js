import { createClient } from '@supabase/supabase-js';

export const config = {
    api: { bodyParser: true }
};

export default async function handler(req, res) {
    const allowedOrigin = process.env.VITE_APP_URL || 'https://milluces.vercel.app';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'payment_paypal')
            .maybeSingle();

        const paypalConfig = data?.value || {};

        const rawClientId = paypalConfig.clientId || paypalConfig.connectClientId || process.env.PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID || '';
        const rawSecretKey = paypalConfig.secretKey || process.env.PAYPAL_SECRET_KEY || process.env.VITE_PAYPAL_SECRET_KEY || '';

        const clientId = rawClientId.trim().replace(/^["']|["']$/g, '');
        const secretKey = rawSecretKey.trim().replace(/^["']|["']$/g, '');
        const sandbox = paypalConfig.sandbox || paypalConfig.mode === 'sandbox';

        if (!clientId) {
            return res.status(400).json({ error: 'PayPal no está configurado correctamente (falta Client ID).' });
        }

        let activePaypalBaseUrl = (sandbox || String(clientId).startsWith('sb') || String(secretKey).startsWith('E'))
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';

        // Obtain OAuth Access Token
        let authRes = await fetch(`${activePaypalBaseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${clientId}:${secretKey}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        let authData = await authRes.json();

        if (!authData.access_token) {
            const alternateUrl = activePaypalBaseUrl.includes('sandbox')
                ? 'https://api-m.paypal.com'
                : 'https://api-m.sandbox.paypal.com';

            const altRes = await fetch(`${alternateUrl}/v1/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${clientId}:${secretKey}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'grant_type=client_credentials',
            });
            const altData = await altRes.json();
            if (altData.access_token) {
                authData = altData;
                activePaypalBaseUrl = alternateUrl;
            } else {
                return res.status(500).json({ error: 'Error de autenticación con PayPal.' });
            }
        }

        const { action, paypalOrderId, orderId, items, shippingCost, appliedCoupon } = req.body;

        // ── ACTION 1: CAPTURE PAYPAL ORDER ──
        if (action === 'capture' || paypalOrderId) {
            if (!paypalOrderId) {
                return res.status(400).json({ error: 'Se requiere paypalOrderId para capturar.' });
            }

            const captureRes = await fetch(`${activePaypalBaseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.access_token}`,
                    'Content-Type': 'application/json',
                }
            });

            const captureData = await captureRes.json();

            if (captureData.status === 'COMPLETED' || captureData.status === 'APPROVED') {
                if (orderId) {
                    await supabase
                        .from('orders')
                        .update({
                            status: 'PAID',
                            payment_status: 'completed',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', orderId);
                }

                return res.status(200).json({ success: true, capture: captureData });
            } else {
                return res.status(400).json({ error: 'No se pudo completar el cobro en PayPal.', details: captureData });
            }
        }

        // ── ACTION 2: CREATE PAYPAL ORDER ──
        let verifiedTotal = 0;

        if (items && Array.isArray(items) && items.length > 0) {
            const productIds = items.map(item => item.id || item.product_id);
            const { data: products, error: productsError } = await supabase
                .from('products')
                .select('id, price, discount_price')
                .in('id', productIds);

            if (productsError || !products?.length) {
                return res.status(400).json({ error: 'Error al verificar los precios del catálogo.' });
            }

            const productMap = {};
            products.forEach(p => {
                productMap[p.id] = (p.discount_price && p.discount_price > 0 && p.discount_price < p.price)
                    ? p.discount_price
                    : p.price;
            });

            let subtotal = 0;
            for (const item of items) {
                const itemId = item.id || item.product_id;
                const unitPrice = productMap[itemId];
                if (unitPrice === undefined) {
                    return res.status(400).json({ error: `Producto no encontrado.` });
                }
                subtotal += unitPrice * item.quantity;
            }

            let discount = 0;
            if (appliedCoupon && appliedCoupon.discount_percentage) {
                discount = subtotal * (appliedCoupon.discount_percentage / 100);
            }

            const shipping = Number(shippingCost) || 0;
            verifiedTotal = Math.max(0, subtotal - discount + shipping);
        } else if (orderId) {
            // Fallback for orders created in DB beforehand
            const { data: orderData } = await supabase
                .from('orders')
                .select('total')
                .eq('id', orderId)
                .single();

            verifiedTotal = orderData?.total || 0;
        }

        if (!verifiedTotal || verifiedTotal <= 0) {
            return res.status(400).json({ error: 'Importe no válido para la orden de PayPal.' });
        }

        const baseUrl = process.env.VITE_APP_URL || 'https://milluces.vercel.app';

        const orderRes = await fetch(`${activePaypalBaseUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authData.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    reference_id: orderId || 'MIL-LUCES',
                    amount: {
                        currency_code: 'EUR',
                        value: parseFloat(verifiedTotal).toFixed(2),
                    },
                    description: 'Pedido Mil Luces',
                }],
                application_context: {
                    return_url: `${baseUrl}/cart?payment=success`,
                    cancel_url: `${baseUrl}/cart?payment=cancelled`,
                    brand_name: 'Mil Luces',
                    locale: 'es-ES',
                    user_action: 'PAY_NOW',
                    shipping_preference: 'NO_SHIPPING',
                },
            }),
        });

        const paypalOrder = await orderRes.json();

        if (paypalOrder.id) {
            const approveLink = paypalOrder.links?.find(l => l.rel === 'approve')?.href;
            return res.status(200).json({ orderId: paypalOrder.id, approveUrl: approveLink });
        }

        return res.status(500).json({ error: 'Error creando la orden en PayPal.' });

    } catch (err) {
        console.error('[PayPal API] Error:', err);
        return res.status(500).json({ error: 'Error procesando la solicitud de PayPal.' });
    }
}
