import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnostic() {
    console.log("--- Supabase Diagnostic ---");

    // 1. Check if we can see the profiles
    const { data: profiles, error: pError } = await supabase.from('profiles').select('id, email, role').limit(5);
    if (pError) console.error("Error reading profiles:", pError.message);
    else console.log("Successfuly read profiles. Count:", profiles.length);

    // 2. Try to see if there's a conflict with a specific test email
    const testEmail = 'test_admin_creation@example.com';
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', testEmail).single();
    if (existing) console.log("Test email already has a profile record.");

    // 3. Check for app_settings again to ensure 406 is gone
    const { data: appSet, error: aError } = await supabase.from('app_settings').select('*').eq('key', 'seo_global').single();
    if (aError) console.error("Error reading app_settings (SEO):", aError.message);
    else console.log("SEO Settings OK:", !!appSet);
}

diagnostic();
