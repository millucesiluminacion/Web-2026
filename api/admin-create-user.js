import { createClient } from '@supabase/supabase-js';

export const config = {
    api: { bodyParser: true }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // 1. Get requester token from header
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
    const token = authHeader.replace('Bearer ', '');

    try {
        // Create client with the REQUESTER'S token to verify identity
        const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) throw new Error('Sesión inválida o expirada.');

        // Check if requester is admin in profiles
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || profile?.role !== 'admin') {
            return res.status(403).json({ error: 'No tienes permisos suficientes para crear usuarios.' });
        }

        // 2. Extract new user data
        const { email, password, full_name, role, user_type, company_name, vat_id, discount_percent, is_partner } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
        }

        // 3. Use service role to create the new user (skipping confirmation)
        const supabaseAdmin = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // a. Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError) throw authError;

        const newUserId = authData.user.id;

        // b. Upsert profile
        const { error: profileUpdateError } = await supabaseAdmin.from('profiles').upsert({
            id: newUserId,
            email,
            full_name: full_name || '',
            role: role || 'editor',
            user_type: user_type || 'persona',
            company_name: company_name || '',
            vat_id: vat_id || '',
            discount_percent: discount_percent || 0,
            is_partner: is_partner || false,
            created_at: new Date().toISOString(),
        });

        if (profileUpdateError) throw profileUpdateError;

        return res.status(200).json({ success: true, userId: newUserId });

    } catch (err) {
        console.error('[admin-create-user] Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
