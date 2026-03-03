import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkUsersTable() {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    if (error) {
        console.error("Error checking 'users' table:", error.message);
    } else {
        console.log("'users' table EXISTS in public schema.");
    }
}

checkUsersTable();
