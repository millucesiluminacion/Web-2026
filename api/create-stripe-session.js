import Stripe from 'stripe';
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

        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'payment_stripe')
            .single();

        const stripeConfig = data?.value || {};
        const isSandbox = stripeConfig.sandbox || stripeConfig.mode === 'sandbox';

        let rawSecretKey = isSandbox
            ? (stripeConfig.testSecretKey || stripeConfig.secretKey || process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY || '')
            : (stripeConfig.liveSecretKey || stripeConfig.secretKey || process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY || '');

        let secretKey = rawSecretKey.trim().replace(/^["']|["']$/g, '');

        if (secretKey.startsWith('pk_')) {
            const rawPubKey = isSandbox
                ? (stripeConfig.testPublicKey || stripeConfig.publicKey || '')
                : (stripeConfig.livePublicKey || stripeConfig.publicKey || '');
            const cleanPubKey = rawPubKey.trim().replace(/^["']|["']$/g, '');
            if (cleanPubKey.startsWith('sk_') || cleanPubKey.startsWith('rk_')) {
                secretKey = cleanPubKey;
            }
        }

        if (!secretKey) {
            return res.status(400).json({ error: 'Stripe no está configurado en el admin.' });
        }

        const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10' });

        const { items, orderId } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No hay productos en el pedido.' });
        }

        const baseUrl = process.env.VITE_APP_URL || 'https://milluces.vercel.app';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: items.map(item => ({
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: item.name,
                        ...(item.image_url ? { images: [item.image_url] } : {}),
                    },
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: item.quantity,
            })),
            mode: 'payment',
            success_url: `${baseUrl}/cart?payment=success&order=${orderId}`,
            cancel_url: `${baseUrl}/cart?payment=cancelled`,
            metadata: { order_id: orderId || '' },
            locale: 'es',
        });

        return res.status(200).json({ url: session.url, sessionId: session.id });

    } catch (err) {
        console.error('[Stripe] Error:', err.message);
        return res.status(500).json({ error: 'Error al crear la sesión de pago.' });
    }
}
