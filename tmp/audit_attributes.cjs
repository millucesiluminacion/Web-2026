
const { createClient } = require('@supabase/supabase-client');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function audit() {
    console.log('Fetching categories...');
    const { data: categories } = await supabase.from('categories').select('*');

    const fundaCat = categories.find(c => c.name.toLowerCase().includes('funda de silicona') || c.slug?.includes('funda-silicona'));

    if (fundaCat) {
        console.log('Found category:', fundaCat);
        console.log('Fetching products in this category...');
        const { data: products } = await supabase.from('products')
            .select('*')
            .eq('category_id', fundaCat.id)
            .limit(5);

        products.forEach(p => {
            console.log(`Product: ${p.name}`);
            console.log(`Attributes:`, JSON.stringify(p.attributes, null, 2));
        });
    } else {
        console.log('Category "Funda de silicona" not found by name.');
        // Try searching by name in products
        const { data: products } = await supabase.from('products')
            .select('*')
            .ilike('name', '%Funda de silicona%')
            .limit(5);

        products.forEach(p => {
            console.log(`Product: ${p.name}`);
            console.log(`Attributes:`, JSON.stringify(p.attributes, null, 2));
            console.log(`Category ID: ${p.category_id}`);
        });
    }
}

audit();
