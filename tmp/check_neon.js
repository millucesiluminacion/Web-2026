import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkNeon() {
    const { data: cats } = await supabase.from('categories').select('*');
    const neonCats = cats.filter(c => c.name.toLowerCase().includes('neon') || c.slug.toLowerCase().includes('neon'));

    console.log("Neon related categories:");
    neonCats.forEach(c => {
        const parent = cats.find(pc => pc.id === c.parent_id);
        console.log(`- ID: ${c.id}, Name: ${c.name}, Slug: ${c.slug}, Parent: ${parent ? parent.name : 'None'}`);
    });

    const neonIds = neonCats.map(c => c.id);
    const { data: products } = await supabase.from('products')
        .select('id, name, category_id, attributes')
        .in('category_id', neonIds);

    console.log(`\nProducts in these categories (${products?.length || 0}):`);
    products?.forEach(p => {
        const cat = neonCats.find(c => c.id === p.category_id);
        console.log(`- Product: ${p.name}, Category: ${cat.name}, Attrs: ${JSON.stringify(p.attributes)}`);
    });
}

checkNeon();
