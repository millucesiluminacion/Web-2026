import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function inspectProfiles() {
    console.log("--- Inspecting 'profiles' table constraints ---");
    // We can't easily query information_schema from the anon client if RLS is on, 
    // but we can try a simple select to see columns at least.
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.error("Error selecting from profiles:", error.message);
    } else {
        console.log("Columns:", Object.keys(data[0] || {}));
    }

    // To check foreign keys, we'd normally need a more privileged client or SQL access.
    // Let's try to query auth.users if possible (unlikely with anon key).
    const { data: authData, error: authError } = await supabase.auth.getUser();
    console.log("Auth connection test:", authError ? authError.message : "Success");
}

inspectProfiles();
