import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

export default async function handler(req, res) {
    const { merchantId, merchantIdInPayPal, permissionsGranted } = req.query;

    const redirectPath = '/admin/payments';
    const finalMerchantId = merchantIdInPayPal || merchantId;

    if (!finalMerchantId) {
        console.warn('[paypal/callback] No merchant ID returned');
        return res.redirect(`${redirectPath}?error=paypal_onboarding_incomplete`);
    }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return res.redirect(`${redirectPath}?error=server_configuration_error`);
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { data: current } = await supabaseAdmin
            .from('app_settings')
            .select('value')
            .eq('key', 'payment_paypal')
            .maybeSingle();

        const currentSettings = current?.value || { enabled: true, clientId: '', secretKey: '' };

        const updatedSettings = {
            ...currentSettings,
            enabled: true,
            mode: 'connect',
            merchantId: finalMerchantId,
            connectEnabled: true,
            permissionsGranted: permissionsGranted === 'true',
            connectedAt: new Date().toISOString()
        };

        await supabaseAdmin
            .from('app_settings')
            .upsert({
                key: 'payment_paypal',
                value: updatedSettings,
                description: 'Configuración de PayPal con soporte Partner OAuth'
            }, { onConflict: 'key' });

        return res.redirect(`${redirectPath}?status=paypal_connected&merchant_id=${finalMerchantId}`);
    } catch (err) {
        console.error('[paypal/callback] Exception:', err.message);
        return res.redirect(`${redirectPath}?error=${encodeURIComponent(err.message)}`);
    }
}
