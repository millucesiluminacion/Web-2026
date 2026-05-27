import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testFilter() {
    const p = "12W";
    // Test OR with both text and array containment
    const filter = `attributes->>Potencia.eq.${p},attributes->Potencia.cs.["${p}"]`;
    console.log("Filter:", filter);

    const { data, error, count } = await supabase.from('products')
        .select('name, attributes', { count: 'exact' })
        .or(filter);

    if (error) console.error(error);
    else {
        console.log(`Found ${count} products`);
        console.log(JSON.stringify(data, null, 2));
    }
}

testFilter();
