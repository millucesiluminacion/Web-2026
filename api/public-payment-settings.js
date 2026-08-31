import { createClient } from '@supabase/supabase-js';

export const config = {
    api: { bodyParser: true }
};

export default async function handler(req, res) {
    const allowedOrigin = process.env.VITE_APP_URL || 'https://milluces.vercel.app';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
        );

        const { data, error } = await supabase
            .from('app_settings')
            .select('key, value')
            .in('key', ['payment_stripe', 'payment_paypal', 'payment_transfer']);

        if (error) throw error;

        const publicSettings = {
            stripe: { enabled: false, sandbox: false, publicKey: '' },
            paypal: { enabled: false, sandbox: false, clientId: '' },
            transfer: { enabled: false, iban: '', titular: '', banco: '', concepto: '' }
        };

        if (data) {
            data.forEach(row => {
                const val = row.value || {};

                if (row.key === 'payment_stripe') {
                    if (val.enabled) {
                        const isSandbox = !!val.sandbox;

                        let rawPubKey = isSandbox
                            ? (val.testPublicKey || val.publicKey || '')
                            : (val.livePublicKey || val.publicKey || '');

                        let rawSecKey = isSandbox
                            ? (val.testSecretKey || val.secretKey || '')
                            : (val.liveSecretKey || val.secretKey || '');

                        rawPubKey = (rawPubKey || '').trim().replace(/^["']|["']$/g, '');
                        rawSecKey = (rawSecKey || '').trim().replace(/^["']|["']$/g, '');

                        // AUTO-DETECT SWAPPED KEYS
                        // If pubKey starts with sk_ / rk_ and secKey starts with pk_, swap them!
                        let finalPubKey = rawPubKey;
                        if ((rawPubKey.startsWith('sk_') || rawPubKey.startsWith('rk_')) && rawSecKey.startsWith('pk_')) {
                            finalPubKey = rawSecKey;
                            console.log('[Stripe Public API] Keys were inverted in settings; auto-corrected pubKey for frontend.');
                        } else if (rawPubKey.startsWith('sk_') || rawPubKey.startsWith('rk_')) {
                            // If pubKey is secret key and no secKey fallback, reject to prevent Stripe.js IntegrationError
                            finalPubKey = '';
                            console.error('[Stripe Public API] pubKey starts with sk_! Refusing to send secret key to browser.');
                        }

                        publicSettings.stripe = {
                            enabled: true,
                            sandbox: isSandbox,
                            publicKey: finalPubKey,
                            mode: val.mode || 'manual',
                            connectEnabled: !!val.connectEnabled,
                            keyError: !finalPubKey || !finalPubKey.startsWith('pk_')
                                ? 'La clave pública de Stripe no es válida (debe empezar por pk_test_ o pk_live_).'
                                : null
                        };
                    }
                }

                if (row.key === 'payment_paypal') {
                    if (val.enabled) {
                        const isSandbox = !!val.sandbox;
                        const clientId = isSandbox
                            ? (val.testClientId || val.clientId || val.connectClientId || '')
                            : (val.liveClientId || val.clientId || val.connectClientId || '');

                        publicSettings.paypal = {
                            enabled: true,
                            sandbox: isSandbox,
                            clientId: (clientId || '').trim().replace(/^["']|["']$/g, ''),
                            merchantId: val.merchantId || ''
                        };
                    }
                }

                if (row.key === 'payment_transfer') {
                    if (val.enabled) {
                        publicSettings.transfer = {
                            enabled: true,
                            iban: val.iban || '',
                            titular: val.titular || '',
                            banco: val.banco || '',
                            concepto: val.concepto || ''
                        };
                    }
                }
            });
        }

        return res.status(200).json(publicSettings);

    } catch (err) {
        console.error('[Public Payment Settings Error]:', err.message);
        return res.status(500).json({ error: 'Error al obtener métodos de pago.' });
    }
}
