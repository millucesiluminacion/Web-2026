import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testAdminQuery() {
    const q = "genova"; // Real name
    let query = supabase.from('products')
        .select('*, categories(name), brands(name), product_rooms(room_id), product_professions(profession_id), product_badges(badges(*))', { count: 'exact' });

    if (q) {
        query = query.or(`name.ilike.%${q}%,reference.ilike.%${q}%`);
    }

    const { data, error, count } = await query.limit(5);

    if (error) {
        console.error("QUERY ERROR:", error.message);
    } else {
        console.log(`Query successful. Found ${count} products matching "${q}".`);
    }
}

testAdminQuery();
