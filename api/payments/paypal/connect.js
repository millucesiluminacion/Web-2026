import dotenv from 'dotenv';
dotenv.config();

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const paypalClientId = req.query?.clientId || process.env.PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID || '';

        const proto = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const returnUrl = `${proto}://${host}/admin/payments`;

        // Detect sandbox vs live based on Client ID prefix or PAYPAL_MODE
        const isSandbox = process.env.PAYPAL_MODE === 'sandbox' || paypalClientId.startsWith('sb');
        const paypalDomain = isSandbox ? 'https://www.sandbox.paypal.com' : 'https://www.paypal.com';

        const paypalAuthUrl = `${paypalDomain}/bizsignup/partner/entry?partnerClientId=${encodeURIComponent(paypalClientId)}&partnerId=${encodeURIComponent(paypalClientId)}&sellerNonce=${Date.now()}&returnToPartnerUrl=${encodeURIComponent(returnUrl)}`;

        return res.status(200).json({ url: paypalAuthUrl });
    } catch (err) {
        console.error('[paypal/connect] Error:', err);
        return res.status(500).json({ error: 'Error al generar enlace de conexión de PayPal.' });
    }
}
