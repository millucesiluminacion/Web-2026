import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTemplates() {
    const { data: emails } = await supabase.from('app_settings').select('*').eq('key', 'email_templates').single();

    console.log('--- EMAIL TEMPLATES ---');
    console.log(JSON.stringify(emails?.value, null, 2));
}

checkTemplates();
