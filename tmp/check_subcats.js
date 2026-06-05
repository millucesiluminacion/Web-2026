import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSubcats() {
    const { data: cats } = await supabase.from('categories').select('*');
    const neonCat = cats.find(c => c.name.toLowerCase() === 'neon');

    if (neonCat) {
        console.log(`Neon Category ID: ${neonCat.id}`);
        const subcats = cats.filter(c => c.parent_id === neonCat.id);
        console.log(`Subcategories of Neon (${subcats.length}):`);
        subcats.forEach(s => {
            console.log(`- ID: ${s.id}, Name: ${s.name}, Slug: ${s.slug}`);
        });
    } else {
        console.log("Neon category not found");
    }
}

checkSubcats();
