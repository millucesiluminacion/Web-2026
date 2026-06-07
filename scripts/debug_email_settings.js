import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSettings() {
    const { data: smtp } = await supabase.from('app_settings').select('*').eq('key', 'smtp_config').single();
    const { data: branding } = await supabase.from('app_settings').select('*').eq('key', 'site_branding').single();
    const { data: admins } = await supabase.from('profiles').select('email, full_name, role').eq('role', 'admin');

    console.log('--- SMTP CONFIG ---');
    console.log(JSON.stringify(smtp?.value, null, 2));
    console.log('\n--- BRANDING CONFIG ---');
    console.log(JSON.stringify(branding?.value, null, 2));
    console.log('\n--- ADMIN USERS ---');
    console.log(JSON.stringify(admins, null, 2));
}

checkSettings();
