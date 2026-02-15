import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
    console.log("--- Checking Products Table Schema ---");

    // 1. Try to fetch one product to see returned keys
    const { data, error } = await supabase.from('products').select('*').limit(1);

    if (error) {
        console.error("Error fetching products:", error.message);
    } else if (data.length > 0) {
        console.log("Existing Columns in 'products':");
        console.log(Object.keys(data[0]).join(', '));
    } else {
        console.log("No products found. Cannot infer columns from SELECT *.");

        // 2. Try to insert a dummy product with category_id to see if it fails specifically on that
        console.log("Attempting test insert with category_id...");
        const { error: insertError } = await supabase.from('products').insert({
            name: 'Schema Test',
            price: 10,
            category_id: null // Try sending explicit null first
        });

        if (insertError) {
            console.log("Insert failed:", insertError.message);
        } else {
            console.log("Insert successful (category_id exists).");
            // Cleanup
            await supabase.from('products').delete().eq('name', 'Schema Test');
        }
    }
}

checkColumns();
