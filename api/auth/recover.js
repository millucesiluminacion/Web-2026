import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido.' });

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ error: 'Servidor no configurado con llaves maestras.' });
    }

    try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Generar enlace raw (secuestro del flujo de email nativo)
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: email
        });

        if (linkError) {
            console.error('[auth/recover] Error generando enlace:', linkError);
            return res.status(400).json({ error: 'No pudimos generar el enlace. Verifica que el correo exista.' });
        }

        const resetUrl = linkData.properties.action_link;

        // 2. Obtener el nombre del usuario para el correo
        let userName = email.split('@')[0];
        try {
            const { data: profile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', linkData.user.id).single();
            if (profile?.full_name) userName = profile.full_name;
        } catch (e) { }

        // 3. Autoinvocar nuestro gestor avanzado de emails centralizado
        const proto = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host;
        const sendEmailUrl = `${proto}://${host}/api/send-email`;

        const emailResponse = await fetch(sendEmailUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.EMAIL_SYSTEM_KEY || process.env.VITE_EMAIL_SYSTEM_KEY
            },
            body: JSON.stringify({
                to: email,
                templateKey: 'password_reset',
                variables: {
                    name: userName,
                    reset_url: resetUrl
                }
            })
        });

        if (!emailResponse.ok) {
            const err = await emailResponse.json();
            throw new Error(`Email sender falló: ${err.error || 'Server error'}`);
        }

        return res.status(200).json({ message: 'Enlace enviado a tu correo configurado con plantillas personalizadas.' });

    } catch (err) {
        console.error('[auth/recover] Fatality:', err);
        return res.status(500).json({ error: 'Ocurrió un error inesperado al procesar la recuperación.' });
    }
}
