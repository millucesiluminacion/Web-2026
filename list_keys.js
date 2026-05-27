import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function listAllAttrKeys() {
    const { data, error } = await supabase.from('products').select('attributes');
    if (error) {
        console.error(error);
        return;
    }

    const keys = new Set();
    data.forEach(p => {
        if (p.attributes) {
            Object.keys(p.attributes).forEach(k => keys.add(k));
        }
    });

    console.log("Unique Attribute Keys:", Array.from(keys));
}

listAllAttrKeys();
