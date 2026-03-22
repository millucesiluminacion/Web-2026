
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTables() {
    const { data: brands, error: bErr } = await supabase.from('brands').select('*').limit(1);
    const { data: rooms, error: rErr } = await supabase.from('rooms').select('*').limit(1);
    const { data: products, error: pErr } = await supabase.from('products').select('*').limit(1);

    if (bErr) console.error('Brands Error:', bErr);
    else console.log('Brands Columns:', Object.keys(brands[0] || {}));

    if (rErr) console.error('Rooms Error:', rErr);
    else console.log('Rooms Columns:', Object.keys(rooms[0] || {}));

    if (pErr) console.error('Products Error:', pErr);
    else console.log('Products Columns:', Object.keys(products[0] || {}));
}

checkTables();
