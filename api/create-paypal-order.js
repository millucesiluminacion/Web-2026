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

        // Clean any accidental whitespace, quotes, or newlines
        const clientId = rawClientId.trim().replace(/^["']|["']$/g, '');
        const secretKey = rawSecretKey.trim().replace(/^["']|["']$/g, '');
        const sandbox = paypalConfig.sandbox || paypalConfig.mode === 'sandbox';

        if (!clientId) {
            return res.status(400).json({ error: 'PayPal no está configurado correctamente (falta Client ID). Revisa el panel de administración.' });
        }
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'Se requiere un ID de pedido válido.' });
        }

        // SERVER-SIDE PRICE VERIFICATION
        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('product_id, quantity')
            .eq('order_id', orderId);

        if (itemsError || !orderItems?.length) {
            return res.status(400).json({ error: 'Pedido no encontrado o sin productos.' });
        }

        const productIds = orderItems.map(item => item.product_id);
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, price, discount_price')
            .in('id', productIds);

        if (productsError || !products?.length) {
            return res.status(400).json({ error: 'Error al verificar los precios.' });
        }

        const productMap = {};
        products.forEach(p => {
            productMap[p.id] = (p.discount_price && p.discount_price > 0 && p.discount_price < p.price)
                ? p.discount_price
                : p.price;
        });

        let verifiedSubtotal = 0;
        for (const item of orderItems) {
            const unitPrice = productMap[item.product_id];
            if (unitPrice === undefined) {
                return res.status(400).json({ error: `Producto no encontrado en el catálogo.` });
            }
            verifiedSubtotal += unitPrice * item.quantity;
        }

        // Get order total (includes shipping) and verify
        const { data: orderData } = await supabase
            .from('orders')
            .select('total')
            .eq('id', orderId)
            .single();

        const clientTotal = orderData?.total || 0;
        const maxAllowedDifference = 30;

        if (Math.abs(clientTotal - verifiedSubtotal) > maxAllowedDifference) {
            console.error(`[PayPal] Price mismatch! Client: ${clientTotal}, Server: ${verifiedSubtotal}`);
            return res.status(400).json({ error: 'Error de verificación de precio. Los precios han cambiado.' });
        }

        const verifiedTotal = clientTotal;

        if (!verifiedTotal || verifiedTotal <= 0) {
            return res.status(400).json({ error: 'Importe no válido.' });
        }

        // Determine initial PayPal base URL (Live vs Sandbox)
        let activePaypalBaseUrl = (sandbox || String(clientId).startsWith('sb') || String(secretKey).startsWith('E'))
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';

        // Intento 1: Autenticación con el endpoint principal
        let authRes = await fetch(`${activePaypalBaseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${clientId}:${secretKey}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        let authData = await authRes.json();

        // Intento 2: Fallback automático si la cuenta es de Sandbox/Live alternativo
        if (!authData.access_token) {
            const alternateUrl = activePaypalBaseUrl.includes('sandbox')
                ? 'https://api-m.paypal.com'
                : 'https://api-m.sandbox.paypal.com';

            console.warn(`[PayPal] Primary auth failed on ${activePaypalBaseUrl}. Retrying on alternate: ${alternateUrl}`);
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
                console.error('[PayPal] Auth failed on both Live & Sandbox:', authData, altData);
                return res.status(500).json({
                    error: `No se pudo autenticar con PayPal (${authData.error_description || authData.error || 'Credenciales no válidas'}). Verifica tu Client ID y Secret Key.`
                });
            }
        }

        const baseUrl = process.env.VITE_APP_URL || 'https://milluces.vercel.app';

        // Crear orden PayPal con precio verificado
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
                    return_url: `${baseUrl}/cart?payment=success&order=${orderId}`,
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

        console.error('[PayPal] Order creation failed:', paypalOrder);
        return res.status(500).json({ error: 'Error creando la orden en PayPal.' });

    } catch (err) {
        console.error('[PayPal] Error:', err.message);
        return res.status(500).json({ error: 'Error al procesar el pago con PayPal.' });
    }
}
