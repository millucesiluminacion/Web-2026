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
        const systemKey = req.headers['x-api-key'];
        const expectedSystemKey = process.env.EMAIL_SYSTEM_KEY || process.env.VITE_EMAIL_SYSTEM_KEY;
        let isAuthorized = false;

        console.log('[send-email] Auth Header present:', !!authHeader);
        console.log('[send-email] System Key present:', !!systemKey);

        if (systemKey && expectedSystemKey && systemKey === expectedSystemKey) {
            console.log('[send-email] Authorized via System Key');
            isAuthorized = true;
        }

        if (!isAuthorized && authHeader) {
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
        const { to, subject, html, text } = req.body;

        if (!to || !subject || !html) {
            return res.status(400).json({ error: 'Faltan campos (to, subject, html).' });
        }

        // 4. Nodemailer
        // 4. Nodemailer
        const port = parseInt(smtp.port);
        console.log(`[send-email] Preparing transporter for ${smtp.host} on port ${port}`);

        // Auto-corrección de protocolos comunes para evitar 'wrong version number'
        let isSecure = smtp.secure === true;
        if (port === 465) isSecure = true;   // 465 SIEMPRE es seguro (SSL directo)
        if (port === 587 || port === 25 || port === 2525) isSecure = false; // Estos puertos SIEMPRE empiezan en texto plano (STARTTLS)

        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: port,
            secure: isSecure,
            auth: { user: smtp.user, pass: smtp.pass },
            connectionTimeout: 15000,
            tls: {
                rejectUnauthorized: false,
                ciphers: 'SSLv3' // Algunos servidores antiguos o mal configurados lo necesitan
            }
        });

        console.log('[send-email] Verifying SMTP connection...');
        await transporter.verify();

        const mailOptions = {
            from: `"${smtp.from_name || 'Mil Luces'}" <${smtp.from_email || smtp.user}>`,
            to,
            subject,
            html,
            text: text || 'HTML required'
        };

        console.log('[send-email] Sending mail...');
        const info = await transporter.sendMail(mailOptions);
        console.log('[send-email] Success:', info.messageId);

        return res.status(200).json({ success: true, messageId: info.messageId });

    } catch (err) {
        console.error('[send-email] FATAL CATCH:', err.message);
        return res.status(500).json({
            error: 'Error catastrófico en el servidor de email.',
            details: err.message,
            stack: err.stack?.split('\n')[0] // Solo la primera línea por seguridad
        });
    }
}
