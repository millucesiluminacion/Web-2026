import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ CRITICAL: Supabase credentials are missing!");
    console.log("Current VITE_SUPABASE_URL:", supabaseUrl || "MISSING");
    console.log("Make sure your .env file exists in the root and you have restarted the dev server.");
}

// Initialize client
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('❌ CRITICAL: Supabase credentials are missing! Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
