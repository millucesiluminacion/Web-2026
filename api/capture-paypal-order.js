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
        const { paypalOrderId, orderId } = req.body;

        if (!paypalOrderId || !orderId) {
            return res.status(400).json({ error: 'Se requieren paypalOrderId y orderId.' });
        }

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
                return res.status(500).json({ error: 'Error de autenticación con PayPal al capturar orden.' });
            }
        }

        // Capture PayPal Order
        const captureRes = await fetch(`${activePaypalBaseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authData.access_token}`,
                'Content-Type': 'application/json',
            }
        });

        const captureData = await captureRes.json();

        if (captureData.status === 'COMPLETED' || captureData.status === 'APPROVED') {
            // Update order status in Supabase
            await supabase
                .from('orders')
                .update({
                    status: 'PAID',
                    payment_status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            return res.status(200).json({ success: true, capture: captureData });
        } else {
            console.error('[PayPal Capture] Failed or non-completed status:', captureData);
            return res.status(400).json({ error: 'No se pudo completar el cobro en PayPal.', details: captureData });
        }

    } catch (err) {
        console.error('[PayPal Capture] Exception:', err);
        return res.status(500).json({ error: 'Error procesando la captura de PayPal.' });
    }
}
