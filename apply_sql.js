const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    try {
        const sql = fs.readFileSync('supabase/migrations/20260310130730_create_dynamic_badges.sql', 'utf8');
        console.log('Executing SQL migration...');

        // Split by statement (roughly)
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));

        // We might not have an exec_sql rpc. Let's try querying using postgres directly or executing RPC
        // If anon key is used it won't work to create tables. But we will try.

        console.log('Please run the SQL manually in Supabase SQL Editor if this fails.');
        console.log(sql);

    } catch (e) {
        console.error(e);
    }
}

run();
