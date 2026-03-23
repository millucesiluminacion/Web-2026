import Stripe from 'stripe';
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

        // Obtener configuración de Stripe desde la base de datos
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'payment_stripe')
            .single();

        if (error || !data?.value?.secretKey) {
            return res.status(400).json({ error: 'Stripe no está configurado en el panel de administración.' });
        }

        const stripe = new Stripe(data.value.secretKey, { apiVersion: '2024-04-10' });

        const { amount, currency = 'eur', metadata = {} } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'El importe del pago no es válido.' });
        }

        // Crear el PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe usa céntimos
            currency: currency.toLowerCase(),
            metadata: metadata,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id
        });

    } catch (err) {
        console.error('[Stripe PaymentIntent Error]:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
