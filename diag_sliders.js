
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnostic() {
    const { data } = await supabase.from('sliders').select('*').limit(1);
    if (data && data[0]) {
        console.log("Columnas en 'sliders':", Object.keys(data[0]));
    } else {
        console.log("No se pudieron obtener columnas (tabla vacía o error).");
    }
}

diagnostic();
