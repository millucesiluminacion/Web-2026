import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function diagnose() {
    const { data: cats } = await supabase.from('categories').select('*');
    const { data: prods } = await supabase.from('products').select('name, category_id').limit(100);

    console.log("Categories total:", cats.length);
    console.log("Products total (sampled):", prods.length);

    // Check if any product has a category_id that is a subcategory
    const subcats = cats.filter(c => c.parent_id !== null);
    const prodsInSubcats = prods.filter(p => subcats.some(s => s.id === p.category_id));
    console.log("Products in subcategories (sample):", prodsInSubcats.length);

    if (prodsInSubcats.length > 0) {
        const sample = prodsInSubcats[0];
        const cat = cats.find(c => c.id === sample.category_id);
        const parent = cats.find(c => c.id === cat.parent_id);
        console.log(`Product "${sample.name}" is in subcat "${cat.name}", parent is "${parent.name}" (${parent.id})`);

        // TEST RECURSION LOGIC
        const getChildIds = (parentId, allCats) => {
            let ids = [parentId];
            allCats.filter(c => c.parent_id === parentId).forEach(child => {
                ids = [...ids, ...getChildIds(child.id, allCats)];
            });
            return ids;
        };

        const ids = getChildIds(parent.id, cats);
        console.log(`Recursion for "${parent.name}" found ${ids.length} IDs:`, ids);

        const { count, error } = await supabase.from('products')
            .select('*', { count: 'exact', head: true })
            .in('category_id', ids);

        console.log(`Query result for parent "${parent.name}": ${count} products. Error:`, error);
    }
}

diagnose();
