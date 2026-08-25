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
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'payment_paypal')
            .maybeSingle();

        const paypalConfig = data?.value || {};
        const sandbox = paypalConfig.sandbox || paypalConfig.mode === 'sandbox';

        const rawClientId = sandbox
            ? (paypalConfig.testClientId || paypalConfig.clientId || paypalConfig.connectClientId || process.env.PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID || '')
            : (paypalConfig.liveClientId || paypalConfig.clientId || paypalConfig.connectClientId || process.env.PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID || '');

        const rawSecretKey = sandbox
            ? (paypalConfig.testSecretKey || paypalConfig.secretKey || process.env.PAYPAL_SECRET_KEY || process.env.VITE_PAYPAL_SECRET_KEY || '')
            : (paypalConfig.liveSecretKey || paypalConfig.secretKey || process.env.PAYPAL_SECRET_KEY || process.env.VITE_PAYPAL_SECRET_KEY || '');

        const clientId = rawClientId.trim().replace(/^["']|["']$/g, '');
        const secretKey = rawSecretKey.trim().replace(/^["']|["']$/g, '');

        // Debug: log which fields resolved (mask most of the secret)
        console.log('[PayPal Config] sandbox:', sandbox,
            '| clientId field used:', sandbox ? 'testClientId' : 'liveClientId',
            '| clientId found:', !!clientId, clientId ? `(${clientId.slice(0, 8)}...)` : '(empty)',
            '| secretKey found:', !!secretKey, secretKey ? `(${secretKey.slice(0, 4)}...)` : '(empty)',
            '| paypalConfig keys:', Object.keys(paypalConfig)
        );

        if (!clientId) {
            return res.status(400).json({ error: 'PayPal no está configurado: falta el Client ID. Configúralo en Admin → Métodos de Pago → PayPal.' });
        }
        if (!secretKey) {
            return res.status(400).json({ error: 'PayPal no está configurado: falta el Secret Key. Configúralo en Admin → Métodos de Pago → PayPal.' });
        }

        let activePaypalBaseUrl = (sandbox || String(clientId).startsWith('sb'))
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
                console.error('[PayPal Auth Error]:', authData, altData);
                return res.status(500).json({ error: 'Error de autenticación con PayPal. Revisa el Client ID y Secret Key.' });
            }
        }

        const { action, paypalOrderId, orderId, items, shippingCost, appliedCoupon, total } = req.body;

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
                console.error('[PayPal Capture Error Details]:', captureData);
                return res.status(400).json({ error: 'No se pudo completar el cobro en PayPal.', details: captureData });
            }
        }

        // ── ACTION 2: CREATE PAYPAL ORDER ──
        let verifiedTotal = 0;

        if (items && Array.isArray(items) && items.length > 0) {
            const productIds = items.map(item => item.id || item.product_id).filter(Boolean);
            if (productIds.length > 0) {
                const { data: products } = await supabase
                    .from('products')
                    .select('id, price, discount_price')
                    .in('id', productIds);

                if (products && products.length > 0) {
                    const productMap = {};
                    products.forEach(p => {
                        productMap[p.id] = (p.discount_price && p.discount_price > 0 && p.discount_price < p.price)
                            ? p.discount_price
                            : p.price;
                    });

                    let subtotal = 0;
                    for (const item of items) {
                        const itemId = item.id || item.product_id;
                        const unitPrice = productMap[itemId] !== undefined ? productMap[itemId] : (Number(item.price) || 0);
                        subtotal += unitPrice * item.quantity;
                    }

                    let discount = 0;
                    if (appliedCoupon && appliedCoupon.discount_percentage) {
                        discount = subtotal * (appliedCoupon.discount_percentage / 100);
                    }

                    const shipping = Number(shippingCost) || 0;
                    verifiedTotal = Math.max(0, subtotal - discount + shipping);
                }
            }
        }

        if (!verifiedTotal) {
            verifiedTotal = Number(total) || 0;
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
                    amount: {
                        currency_code: 'EUR',
                        value: parseFloat(verifiedTotal).toFixed(2),
                    },
                    description: 'Pedido en Mil Luces',
                }],
                application_context: {
                    brand_name: 'Mil Luces',
                    locale: 'es-ES',
                    user_action: 'PAY_NOW',
                },
            }),
        });

        const paypalOrder = await orderRes.json();

        if (paypalOrder.id) {
            const approveLink = paypalOrder.links?.find(l => l.rel === 'approve')?.href;
            return res.status(200).json({ orderId: paypalOrder.id, approveUrl: approveLink });
        }

        console.error('[PayPal Order Creation Rejected]:', JSON.stringify(paypalOrder, null, 2));
        const detailMsg = paypalOrder.details?.map(d => `${d.issue || ''}: ${d.description || ''}`).filter(Boolean).join(' | ');
        return res.status(400).json({
            error: detailMsg || paypalOrder.message || paypalOrder.name || 'PayPal rechazó la creación de la orden.',
            details: paypalOrder
        });

    } catch (err) {
        console.error('[PayPal API Catch Error]:', err);
        return res.status(500).json({ error: err.message || 'Error procesando la solicitud de PayPal.' });
    }
}
