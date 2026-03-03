import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkTables() {
    const tables = ['app_settings', 'site_settings', 'profiles'];

    for (const table of tables) {
        console.log(`\n--- Checking table: ${table} ---`);
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.error(`Error in ${table}:`, error.message);
        } else {
            console.log(`Table ${table} exists. Sample data:`, data);
        }
    }
}

checkTables();
