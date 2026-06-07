import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

export const config = {
    api: { bodyParser: true }
};

export default async function handler(req, res) {
    console.log('[send-email] Request received:', req.method);

    // Configurar cabeceras de seguridad y CORS básicas
    res.setHeader('Content-Type', 'application/json');

    try {
        if (req.method === 'OPTIONS') return res.status(200).end();
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

        // 1. Check environment variables
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

        console.log('[send-email] DB URL present:', !!supabaseUrl);
        console.log('[send-email] Service Key present:', !!supabaseServiceKey);

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[send-email] CRITICAL: Missing Env Vars');
            return res.status(500).json({
                error: 'Faltan variables de entorno en el servidor.',
                diagnostics: { url: !!supabaseUrl, key: !!supabaseServiceKey }
            });
        }

        // 2. Validate session OR System Key
        const authHeader = req.headers['authorization'];
        const systemKey = req.headers['x-api-key'] || req.headers['X-API-KEY'] || req.headers['x-api-token'];
        const expectedSystemKey = process.env.EMAIL_SYSTEM_KEY || process.env.VITE_EMAIL_SYSTEM_KEY;
        let isAuthorized = false;

        console.log(`[send-email] Auth Check: hasHeader=${!!authHeader}, hasSystemKey=${!!systemKey}, expectedKeySet=${!!expectedSystemKey}`);

        if (systemKey && expectedSystemKey && systemKey.trim() === expectedSystemKey.trim()) {
            console.log('[send-email] Authorized via System Key');
            isAuthorized = true;
        }

        if (!isAuthorized && authHeader) {
            console.log('[send-email] Attempting Auth via Bearer Token...');
            const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);
            const token = authHeader.replace('Bearer ', '');
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser(token);
                if (!userError && user) {
                    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                    if (profile?.role === 'admin') {
                        console.log('[send-email] Authorized via Admin Session');
                        isAuthorized = true;
                    }
                }
            } catch (e) {
                console.error('[send-email] Auth logic crash:', e.message);
            }
        }

        if (!isAuthorized) {
            console.warn('[send-email] Unauthorized access attempt');
            return res.status(401).json({ error: 'No autorizado. Se requiere sesión de administrador o clave de sistema.' });
        }

        // 3. Fetch SMTP config
        console.log('[send-email] Fetching SMTP config from DB...');
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Verificamos si la tabla existe intentando una consulta simple
        const { data: setting, error: settingsError } = await supabaseAdmin
            .from('app_settings')
            .select('value')
            .eq('key', 'smtp_config')
            .maybeSingle();

        if (settingsError) {
            console.error('[send-email] DB Error fetching settings:', settingsError);
            return res.status(500).json({ error: 'Error al consultar la base de datos.', details: settingsError.message });
        }

        if (!setting) {
            console.warn('[send-email] SMTP settings not found in app_settings table');
            return res.status(404).json({ error: 'Configuración SMTP no encontrada en la base de datos.' });
        }

        const smtp = setting.value;
        const { to, subject, html, text, templateKey, variables } = req.body;

        if (!to) {
            return res.status(400).json({ error: 'Falta campo destino (to).' });
        }

        let finalSubject = subject;
        let finalHtml = html;
        let finalText = text || 'Este correo requiere un cliente HTML.';

        // Interceptor de Plantillas Avanzadas
        if (templateKey) {
            console.log(`[send-email] Autogenerando correo con templateKey: ${templateKey}`);
            const { data: emailSettings } = await supabaseAdmin
                .from('app_settings')
                .select('value')
                .eq('key', 'email_templates')
                .maybeSingle();

            if (emailSettings && emailSettings.value) {
                const templates = emailSettings.value;
                const template = templates[templateKey];

                if (template) {
                    finalSubject = template.subject || '';
                    let rawBody = template.body || '';

                    // Construimos siempre variables. Por defecto metemos site_name de branding
                    let injectionVars = { ...variables };
                    try {
                        if (!injectionVars.site_name) {
                            const { data: brandSetting } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'site_branding').maybeSingle();
                            if (brandSetting) injectionVars.site_name = brandSetting.value.site_name || 'Nuestra Tienda';
                        }
                    } catch (e) { }

                    // Inyectar en subject y body
                    Object.keys(injectionVars).forEach(key => {
                        const val = injectionVars[key] || '';
                        finalSubject = finalSubject.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
                        rawBody = rawBody.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
                    });

                    // Renderizar Markdown
                    let bodyHtml = rawBody;
                    try {
                        const { marked } = await import('marked');
                        bodyHtml = marked.parse(rawBody);
                    } catch (e) {
                        console.warn('[send-email] Error compilando markdown:', e);
                    }

                    // Envolver en master_layout (Layout Maestro)
                    if (templates['master_layout'] && templates['master_layout'].body) {
                        let master = templates['master_layout'].body;
                        Object.keys(injectionVars).forEach(key => {
                            master = master.replace(new RegExp(`\\{${key}\\}`, 'g'), injectionVars[key] || '');
                        });
                        finalHtml = master.replace('{body}', bodyHtml);
                    } else {
                        finalHtml = bodyHtml;
                    }
                    finalText = rawBody.replace(/<[^>]*>?/gm, ''); // Fallback text básico
                } else {
                    console.warn(`[send-email] La plantilla ${templateKey} no existe en DB.`);
                }
            }
        }

        // Validación final
        if (!finalSubject || !finalHtml) {
            return res.status(400).json({ error: 'Falta subject o html, y no se pudo resolver la plantilla.' });
        }

        // Mapeo original para el resto del código
        const subjectToSend = finalSubject;
        const htmlToSend = finalHtml;
        const textToSend = finalText;

        // 4. Determinar Proveedor (SMTP vs Resend)
        let infoMessageId = null;

        const isResend = smtp.host?.includes('resend') || smtp.user === 'resend' || smtp.provider === 'resend';

        if (isResend) {
            console.log('[send-email] Using RESEND API natively');
            // Importación dinámica para asegurar que exista
            const { Resend } = await import('resend');

            // La contraseña en Resend actúa como la API Key en este contexto
            const resendClient = new Resend(smtp.pass || process.env.VITE_EMAIL_SYSTEM_KEY);

            const { data: resendData, error: resendError } = await resendClient.emails.send({
                from: `"${smtp.from_name || 'Mil Luces'}" <${smtp.from_email || 'onboarding@resend.dev'}>`,
                to: [to],
                subject: finalSubject,
                html: finalHtml,
                text: finalText
            });

            if (resendError) {
                console.error('[send-email] Resend API Error:', resendError);
                return res.status(500).json({ error: 'Error en la API de Resend', details: resendError.message });
            }
            infoMessageId = resendData.id;
            console.log('[send-email] Resend Success:', infoMessageId);

        } else {
            console.log(`[send-email] Using NODEMAILER for SMTP (${smtp.host})`);
            const port = parseInt(smtp.port);
            let isSecure = smtp.secure === true;
            if (port === 465) isSecure = true;
            if (port === 587 || port === 25 || port === 2525) isSecure = false;

            const transporter = nodemailer.createTransport({
                host: smtp.host,
                port: port,
                secure: isSecure,
                auth: { user: smtp.user, pass: smtp.pass },
                connectionTimeout: 15000,
                tls: { rejectUnauthorized: false, ciphers: 'SSLv3' }
            });

            console.log('[send-email] Verifying SMTP...');
            await transporter.verify();

            const mailOptions = {
                from: `"${smtp.from_name || 'Mil Luces'}" <${smtp.from_email || smtp.user}>`,
                to: to,
                subject: finalSubject,
                html: finalHtml,
                text: finalText
            };

            const info = await transporter.sendMail(mailOptions);
            infoMessageId = info.messageId;
            console.log('[send-email] Nodemailer Success:', infoMessageId);
        }

        return res.status(200).json({ success: true, messageId: infoMessageId });

    } catch (err) {
        console.error('[send-email] FATAL CATCH:', err.message);
        return res.status(500).json({
            error: 'Error catastrófico en el servidor de email.',
            details: err.message,
            stack: err.stack?.split('\n')[0] // Solo la primera línea por seguridad
        });
    }
}
