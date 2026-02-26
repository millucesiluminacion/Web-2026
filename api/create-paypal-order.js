import { createClient } from '@supabase/supabase-js';

export const config = {
    api: { bodyParser: true }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'payment_paypal')
            .single();

        if (error || !data?.value?.clientId || !data?.value?.secretKey) {
            return res.status(400).json({ error: 'PayPal no está configurado en el admin.' });
        }

        const { clientId, secretKey } = data.value;
        const { totalPrice, orderId } = req.body;

        if (!totalPrice || totalPrice <= 0) {
            return res.status(400).json({ error: 'Importe no válido.' });
        }

        // Autenticación con PayPal
        const authRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${clientId}:${secretKey}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        const authData = await authRes.json();
        if (!authData.access_token) {
            console.error('[PayPal] Auth failed:', authData);
            return res.status(500).json({ error: 'No se pudo autenticar con PayPal. Revisa las credenciales.' });
        }

        const baseUrl = process.env.VITE_APP_URL || 'https://milluces.vercel.app';

        // Crear orden PayPal
        const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
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
                        value: parseFloat(totalPrice).toFixed(2),
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
        return res.status(500).json({ error: 'Error creando la orden en PayPal.', detail: paypalOrder });

    } catch (err) {
        console.error('[PayPal] Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
