import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

export const config = {
    api: { bodyParser: true }
};

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // 1. Check environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ error: 'Faltan variables de entorno (Supabase Service Role) en el servidor.' });
    }

    // 2. Validate admin session
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseUrl.includes('placeholder') ? 'placeholder' : process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) throw new Error('Sesión inválida.');

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') throw new Error('Permisos insuficientes.');

        // 3. Fetch SMTP config using SERVICE ROLE (privileged)
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const { data: setting, error: settingsError } = await supabaseAdmin
            .from('app_settings')
            .select('value')
            .eq('key', 'smtp_config')
            .single();

        if (settingsError || !setting) throw new Error('Configuración SMTP no encontrada en la base de datos.');

        const smtp = setting.value;
        const { to, subject, html, text } = req.body;

        if (!to || !subject || !html) {
            return res.status(400).json({ error: 'Faltan campos obligatorios (to, subject, html).' });
        }

        // 4. Send Email via Nodemailer
        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: parseInt(smtp.port),
            secure: smtp.port === '465' || smtp.secure === true,
            auth: {
                user: smtp.user,
                pass: smtp.pass
            },
            connectionTimeout: 10000, // 10 seconds
            greetingTimeout: 10000,
            socketTimeout: 10000,
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from: `"${smtp.from_name || 'Mil Luces'}" <${smtp.from_email || smtp.user}>`,
            to,
            subject,
            html,
            text: text || 'Este correo requiere visualización HTML.'
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[send-email] Success:', info.messageId);

        return res.status(200).json({ success: true, messageId: info.messageId });

    } catch (err) {
        console.error('[send-email] Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
