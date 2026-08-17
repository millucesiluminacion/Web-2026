import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const config = {
    api: { bodyParser: true }
};

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email } = req.body;
    if (!email || !email.trim()) {
        return res.status(400).json({ error: 'Introduce tu email para recuperar la contraseña.' });
    }

    const targetEmail = email.trim();
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ error: 'Servidor no configurado con llaves maestras.' });
    }

    try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Determinar URL de redirección
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host || 'millucesiluminacion.com';
        const redirectUrl = `${proto}://${host}/reset-password`;

        // 2. Generar enlace raw mediante la API Admin de Supabase
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: targetEmail,
            options: {
                redirectTo: redirectUrl
            }
        });

        if (linkError) {
            console.error('[auth/recover] Error generando enlace:', linkError);
            return res.status(400).json({ error: 'No pudimos generar el enlace. Verifica que el correo exista.' });
        }

        const resetUrl = linkData?.properties?.action_link || `${redirectUrl}#access_token=${linkData?.properties?.hashed_token}&type=recovery`;

        // 3. Obtener el nombre del usuario para la plantilla
        let userName = targetEmail.split('@')[0];
        try {
            if (linkData?.user?.id) {
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('full_name')
                    .eq('id', linkData.user.id)
                    .maybeSingle();
                if (profile?.full_name) userName = profile.full_name;
            }
        } catch (e) {
            console.warn('[auth/recover] Could not fetch profile name:', e.message);
        }

        // 4. Cargar configuraciones de la base de datos (app_settings)
        const { data: settings } = await supabaseAdmin
            .from('app_settings')
            .select('key, value')
            .in('key', ['smtp_config', 'site_branding', 'email_templates']);

        const smtp = settings?.find(s => s.key === 'smtp_config')?.value;
        const brand = settings?.find(s => s.key === 'site_branding')?.value;
        const emailTemplates = settings?.find(s => s.key === 'email_templates')?.value || {};

        const siteName = brand?.site_name || 'Mil Luces';

        // 5. Resolver Plantilla "password_reset" y "master_layout"
        const defaultResetTemplate = {
            subject: 'Restablecer contraseña - {site_name}',
            body: 'Hola {name},\n\nHemos recibido una solicitud para restablecer la contraseña de tu cuenta.\n\nPara crear una nueva contraseña, haz clic en el siguiente enlace de forma segura:\n\n<a href="{reset_url}" style="display:inline-block; padding: 14px 28px; background-color: #111827; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; margin-top:20px; margin-bottom:20px;">Restablecer mi Contraseña</a>\n\nSi no has solicitado este cambio, por favor ignora este correo.'
        };

        const template = emailTemplates['password_reset'] || defaultResetTemplate;

        let finalSubject = template.subject || `Restablecer contraseña - ${siteName}`;
        let rawBody = template.body || defaultResetTemplate.body;

        const variables = {
            name: userName,
            site_name: siteName,
            reset_url: resetUrl
        };

        // Reemplazar variables en Subject y Body
        Object.keys(variables).forEach(key => {
            const val = variables[key] || '';
            finalSubject = finalSubject.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
            rawBody = rawBody.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
        });

        // Renderizar Markdown si aplica
        let bodyHtml = rawBody;
        try {
            const { marked } = await import('marked');
            bodyHtml = marked.parse(rawBody);
        } catch (e) {
            console.warn('[auth/recover] Marked parse error:', e.message);
        }

        // Envolver en master_layout si está configurado
        let finalHtml = bodyHtml;
        const masterLayout = emailTemplates['master_layout']?.body;
        if (masterLayout && masterLayout.includes('{body}')) {
            let master = masterLayout;
            Object.keys(variables).forEach(key => {
                master = master.replace(new RegExp(`\\{${key}\\}`, 'g'), variables[key] || '');
            });
            finalHtml = master.replace('{body}', bodyHtml);
        }

        const finalText = rawBody.replace(/<[^>]*>?/gm, '');

        // 6. Enviar Correo mediante el Servidor Configurado (Resend o SMTP)
        let mailSent = false;

        if (smtp && (smtp.pass || smtp.user || smtp.host)) {
            const isResend = smtp.host?.includes('resend') || smtp.user === 'resend' || smtp.provider === 'resend';

            if (isResend) {
                try {
                    const { Resend } = await import('resend');
                    const resendClient = new Resend(smtp.pass || process.env.VITE_EMAIL_SYSTEM_KEY);
                    const { error: resendErr } = await resendClient.emails.send({
                        from: `"${smtp.from_name || siteName}" <${smtp.from_email || 'onboarding@resend.dev'}>`,
                        to: [targetEmail],
                        subject: finalSubject,
                        html: finalHtml,
                        text: finalText
                    });
                    if (!resendErr) mailSent = true;
                    else console.error('[auth/recover] Resend Error:', resendErr);
                } catch (e) {
                    console.error('[auth/recover] Resend exception:', e.message);
                }
            } else if (smtp.host && smtp.user && smtp.pass) {
                try {
                    const port = parseInt(smtp.port || '465');
                    let isSecure = smtp.secure === true || port === 465;

                    const transporter = nodemailer.createTransport({
                        host: smtp.host,
                        port: port,
                        secure: isSecure,
                        auth: { user: smtp.user, pass: smtp.pass },
                        connectionTimeout: 15000,
                        tls: { rejectUnauthorized: false }
                    });

                    await transporter.sendMail({
                        from: `"${smtp.from_name || siteName}" <${smtp.from_email || smtp.user}>`,
                        to: targetEmail,
                        subject: finalSubject,
                        html: finalHtml,
                        text: finalText
                    });
                    mailSent = true;
                } catch (e) {
                    console.error('[auth/recover] SMTP Nodemailer error:', e.message);
                }
            }
        }

        // 7. Fallback: Si el servidor SMTP no envió el correo, usar Supabase nativo
        if (!mailSent) {
            console.log('[auth/recover] Custom SMTP failed or not configured. Falling back to Supabase native auth mailer.');
            const { error: fallbackErr } = await supabaseAdmin.auth.resetPasswordForEmail(targetEmail, {
                redirectTo: redirectUrl
            });
            if (fallbackErr) {
                console.error('[auth/recover] Fallback error:', fallbackErr);
                return res.status(500).json({ error: 'Error al enviar correo de recuperación.' });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Hemos enviado un correo con las instrucciones para restablecer tu contraseña.'
        });

    } catch (err) {
        console.error('[auth/recover] Unexpected error:', err);
        return res.status(500).json({ error: 'Ocurrió un error inesperado al procesar la recuperación.' });
    }
}
