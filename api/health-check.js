import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    // 1. Validar Admin (Seguridad)
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ error: 'Base configuration missing' });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) throw new Error('Sesión inválida.');

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') throw new Error('Permisos insuficientes.');

        // 2. Realizar chequeos de salud (Health Checks)
        const health = {
            timestamp: new Date().toISOString(),
            environment: {
                platform: process.env.VERCEL ? 'Vercel' : 'Node.js (Custom)',
                supabase_url: !!process.env.VITE_SUPABASE_URL || !!process.env.SUPABASE_URL,
                supabase_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.VITE_SUPABASE_SERVICE_KEY,
            },
            database: {
                reachable: false,
                profiles_table: false,
                app_settings_table: false,
            },
            smtp: {
                configured: false
            }
        };

        // Check DB Connectivity & Tables
        const { data: tablesCheck, error: dbError } = await supabase.from('app_settings').select('key').limit(1);
        if (!dbError) {
            health.database.reachable = true;
            health.database.app_settings_table = true;
        }

        const { error: pError } = await supabase.from('profiles').select('id').limit(1);
        if (!pError) health.database.profiles_table = true;

        // Check SMTP configuration in DB
        const { data: smtpSet } = await supabase.from('app_settings').select('value').eq('key', 'smtp_config').single();
        if (smtpSet?.value?.host && smtpSet?.value?.user) {
            health.smtp.configured = true;
        }

        return res.status(200).json(health);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
