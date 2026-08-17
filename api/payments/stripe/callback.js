import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

export default async function handler(req, res) {
    const { code, error, error_description } = req.query;

    const redirectPath = '/admin/payments';

    if (error) {
        console.error('[stripe/callback] OAuth Error:', error, error_description);
        return res.redirect(`${redirectPath}?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code) {
        return res.redirect(`${redirectPath}?error=missing_code`);
    }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return res.redirect(`${redirectPath}?error=server_configuration_error`);
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Si tenemos clave secreta de Stripe, usamos el SDK para hacer el token exchange
        let connectedAccountId = null;

        if (stripeSecretKey) {
            const stripe = new Stripe(stripeSecretKey);
            const response = await stripe.oauth.token({
                grant_type: 'authorization_code',
                code: code,
            });
            connectedAccountId = response.stripe_user_id;
        } else {
            // Fallback directo vía HTTP a Stripe API
            const tokenRes = await fetch('https://connect.stripe.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_secret: process.env.STRIPE_SECRET_KEY || '',
                    code: code,
                    grant_type: 'authorization_code'
                })
            });
            const data = await tokenRes.json();
            if (data.error) throw new Error(data.error_description || data.error);
            connectedAccountId = data.stripe_user_id;
        }

        if (!connectedAccountId) {
            throw new Error('No se pudo recuperar el ID de la cuenta conectada.');
        }

        // Obtener configuración actual de Stripe en DB
        const { data: current } = await supabaseAdmin
            .from('app_settings')
            .select('value')
            .eq('key', 'payment_stripe')
            .maybeSingle();

        const currentSettings = current?.value || { enabled: true, publicKey: '', secretKey: '' };

        const updatedSettings = {
            ...currentSettings,
            enabled: true,
            mode: 'connect', // Activar modo Connect
            connectAccountId: connectedAccountId,
            connectEnabled: true,
            connectedAt: new Date().toISOString()
        };

        await supabaseAdmin
            .from('app_settings')
            .upsert({
                key: 'payment_stripe',
                value: updatedSettings,
                description: 'Configuración de Stripe con soporte OAuth Connect'
            }, { onConflict: 'key' });

        return res.redirect(`${redirectPath}?status=stripe_connected&account_id=${connectedAccountId}`);
    } catch (err) {
        console.error('[stripe/callback] Exception:', err.message);
        return res.redirect(`${redirectPath}?error=${encodeURIComponent(err.message)}`);
    }
}
