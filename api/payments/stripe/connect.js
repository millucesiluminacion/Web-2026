import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return res.status(500).json({ error: 'Faltan llaves maestras en el servidor.' });
        }

        // Obtener Client ID de Stripe Connect de variables de entorno o DB
        const stripeClientId = process.env.STRIPE_CONNECT_CLIENT_ID || process.env.VITE_STRIPE_CONNECT_CLIENT_ID || 'ca_test_placeholder';

        const proto = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const redirectUri = `${proto}://${host}/api/payments/stripe/callback`;

        const state = Buffer.from(JSON.stringify({ timestamp: Date.now() })).toString('base64');

        const stripeConnectUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${stripeClientId}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

        return res.status(200).json({ url: stripeConnectUrl });
    } catch (err) {
        console.error('[stripe/connect] Error:', err);
        return res.status(500).json({ error: 'Error al generar URL de conexión de Stripe.' });
    }
}
