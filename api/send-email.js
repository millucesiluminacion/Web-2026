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

        // Cargar siempre datos de branding de app_settings para resolver {logo_url}, {site_name}, etc.
        const defaultBranding = {
            site_name: 'Mil Luces Iluminación',
            contact_email: 'milluces@millucesiluminacion.com',
            support_phone: '917654062',
            site_url: 'https://www.millucesiluminacion.com',
            logo_url: 'https://www.millucesiluminacion.com/logo_new.png'
        };

        try {
            const { data: brandSetting } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'site_branding').maybeSingle();
            if (brandSetting?.value) {
                if (brandSetting.value.site_name) defaultBranding.site_name = brandSetting.value.site_name;
                if (brandSetting.value.contact_email) defaultBranding.contact_email = brandSetting.value.contact_email;
                if (brandSetting.value.support_phone) defaultBranding.support_phone = brandSetting.value.support_phone;
                const rawSiteUrl = brandSetting.value.site_url ||
                    (brandSetting.value.contact_email
                        ? 'https://www.' + brandSetting.value.contact_email.split('@')[1]
                        : 'https://www.millucesiluminacion.com');
                const siteUrl = rawSiteUrl.replace('https://millucesiluminacion.com', 'https://www.millucesiluminacion.com');
                defaultBranding.site_url = siteUrl.replace(/\/$/, '');
                defaultBranding.logo_url = brandSetting.value.logo_url || (defaultBranding.site_url + '/logo_new.png');
            }
        } catch (e) {
            console.warn('[send-email] No se pudo cargar branding:', e.message);
        }

        // Variables consolidadas (las enviadas por el caller tienen prioridad sobre branding)
        const consolidatedVars = { ...defaultBranding, ...(variables || {}) };

        // Procesamiento inteligente de variables para order_status_update y estados de pedido
        if (templateKey === 'order_status_update' || consolidatedVars.status) {
            const rawStatus = String(consolidatedVars.status || '').toUpperCase();
            const statusMap = {
                'PENDING': { title: 'Tu pedido ha sido recibido', label: 'Pendiente de Pago', desc: 'Tu pedido está registrado y a la espera de la confirmación del pago para iniciar su preparación.', color: '#d97706' },
                'AWAITING_PAYMENT': { title: 'Esperando Pago', label: 'Pendiente de Pago', desc: 'Estamos a la espera de recibir la confirmación de pago para proceder al envío.', color: '#d97706' },
                'PAID': { title: '¡Pago Confirmado!', label: 'Pago Confirmado', desc: 'Hemos recibido tu pago con éxito. Tu pedido entra directamente a nuestra cola de preparación en almacén.', color: '#059669' },
                'PROCESSING': { title: 'Tu pedido se está preparando', label: 'En Preparación', desc: 'Nuestro equipo de almacén está empaquetando con mimo tus luminarias y preparando el envío.', color: '#2563eb' },
                'READY_TO_SHIP': { title: 'Tu pedido está listo', label: 'Listo para Envío', desc: 'Tus productos ya están embalados y protegidos, esperando la recogida de la empresa de transporte.', color: '#4f46e5' },
                'SHIPPED': { title: '¡Tu pedido ya está en camino!', label: 'Enviado — En Reparto', desc: '¡Buenas noticias! Tu paquete ha salido de nuestras instalaciones y se encuentra viajando hacia tu dirección.', color: '#1a3a8f' },
                'IN_TRANSIT': { title: 'Tu pedido está en tránsito', label: 'En Tránsito', desc: 'El transportista está gestionando la entrega de tu pedido.', color: '#0284c7' },
                'DELIVERED': { title: '¡Pedido Entregado!', label: 'Entregado con Éxito', desc: 'Tu pedido ha sido entregado en la dirección indicada. Esperamos que disfrutes de tu nueva iluminación. ¡Muchas gracias por tu confianza!', color: '#059669' },
                'CANCELLED': { title: 'Pedido Cancelado', label: 'Cancelado', desc: 'El pedido ha sido cancelado. Si tienes cualquier consulta o necesitas asistencia, contacta con nosotros.', color: '#dc2626' },
                'RETURNED': { title: 'Devolución Gestionada', label: 'Devuelto / Reembolsado', desc: 'Hemos procesado la devolución y el correspondiente abono de tu pedido.', color: '#64748b' }
            };

            const info = statusMap[rawStatus] || {
                title: 'Tu pedido ha sido actualizado',
                label: consolidatedVars.status || 'Actualizado',
                desc: 'El estado de tu pedido ha sido actualizado.',
                color: '#1a3a8f'
            };

            if (!consolidatedVars.status_title) consolidatedVars.status_title = info.title;
            if (!consolidatedVars.status_label) consolidatedVars.status_label = info.label;
            if (!consolidatedVars.status_description) consolidatedVars.status_description = info.desc;
            if (!consolidatedVars.status_color) consolidatedVars.status_color = info.color;
            if (statusMap[rawStatus]) {
                consolidatedVars.status = info.label;
            }

            // Tracking HTML generation
            if (!consolidatedVars.tracking_html) {
                const carrier = consolidatedVars.tracking_carrier || consolidatedVars.carrier || '';
                const trackingNumber = consolidatedVars.tracking_number || consolidatedVars.tracking || '';
                const trackingUrl = consolidatedVars.tracking_url || '';

                if (carrier || trackingNumber || trackingUrl) {
                    consolidatedVars.tracking_html = `
                    <div style="margin:28px 0;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:24px;text-align:center;">
                        <p style="margin:0 0 6px 0;font-size:11px;font-weight:800;color:#64748b;letter-spacing:2px;text-transform:uppercase;">
                            🚚 Información de Envío y Transporte
                        </p>
                        ${carrier ? `<p style="margin:0 0 6px 0;font-size:17px;font-weight:900;color:#0f172a;">${carrier}</p>` : ''}
                        ${trackingNumber ? `<p style="margin:0 0 16px 0;font-size:13px;color:#475569;">Localizador / Seguimiento: <strong style="font-family:monospace;color:#0f172a;font-size:14px;background:#e2e8f0;padding:3px 10px;border-radius:6px;letter-spacing:1px;">${trackingNumber}</strong></p>` : '<div style="height:12px;"></div>'}
                        ${trackingUrl ? `
                        <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:16px auto 0 auto;">
                          <tr>
                            <td align="center" bgcolor="#1a3a8f" style="border-radius:10px;background-color:#1a3a8f;">
                              <a href="${trackingUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:800;color:#ffffff !important;text-decoration:none;border-radius:10px;background-color:#1a3a8f;border:1px solid #1a3a8f;letter-spacing:0.5px;">
                                Rastrear mi paquete en tiempo real →
                              </a>
                            </td>
                          </tr>
                        </table>` : ''}
                    </div>`;
                } else {
                    consolidatedVars.tracking_html = '';
                }
            }
        }

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
                    const isLayoutOnly = templateKey === 'master_layout';
                    finalSubject = (isLayoutOnly && subject) ? subject : (template.subject || subject || '');
                    let rawBody = template.body || '';

                    // Inyectar variables en subject y body
                    Object.keys(consolidatedVars).forEach(key => {
                        const val = String(consolidatedVars[key] || '');
                        finalSubject = finalSubject.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
                        rawBody = rawBody.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
                    });

                    // Renderizar Markdown solo si es texto plano / markdown no HTML
                    let bodyHtml = rawBody;
                    if (!rawBody.trim().startsWith('<') && !rawBody.includes('</div>')) {
                        try {
                            const { marked } = await import('marked');
                            bodyHtml = marked.parse(rawBody);
                        } catch (e) {
                            console.warn('[send-email] Error compilando markdown:', e);
                        }
                    }

                    // Envolver en master_layout (Layout Maestro)
                    if (templates['master_layout'] && templates['master_layout'].body) {
                        let master = templates['master_layout'].body;
                        Object.keys(consolidatedVars).forEach(key => {
                            master = master.replace(new RegExp(`\\{${key}\\}`, 'g'), consolidatedVars[key] || '');
                        });
                        finalHtml = master.replace('{body}', () => bodyHtml);
                    } else {
                        finalHtml = bodyHtml;
                    }
                    finalText = rawBody.replace(/<[^>]*>?/gm, ''); // Fallback text básico
                } else {
                    console.warn(`[send-email] La plantilla ${templateKey} no existe en DB.`);
                }
            }
        }

        // Limpieza y sustitución universal para cualquier HTML o Subject recibido
        if (finalSubject) {
            Object.keys(consolidatedVars).forEach(key => {
                const val = String(consolidatedVars[key] || '');
                finalSubject = finalSubject.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
            });
        }
        if (finalHtml) {
            Object.keys(consolidatedVars).forEach(key => {
                const val = String(consolidatedVars[key] || '');
                finalHtml = finalHtml.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
            });
            // Garantía absoluta para logo_url y branding si quedaron como literales
            finalHtml = finalHtml
                .replace(/\{logo_url\}/g, consolidatedVars.logo_url || 'https://www.millucesiluminacion.com/logo_new.png')
                .replace(/\{site_name\}/g, consolidatedVars.site_name || 'Mil Luces')
                .replace(/\{contact_email\}/g, consolidatedVars.contact_email || 'milluces@millucesiluminacion.com')
                .replace(/\{support_phone\}/g, consolidatedVars.support_phone || '917654062')
                .replace(/\{site_url\}/g, consolidatedVars.site_url || 'https://www.millucesiluminacion.com');
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
