import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testRecursion() {
    const { data: allCats } = await supabase.from('categories').select('id, name, parent_id');

    const getChildIds = (parentId, cats) => {
        let ids = [parentId];
        cats.filter(c => c.parent_id === parentId).forEach(child => {
            ids = [...ids, ...getChildIds(child.id, cats)];
        });
        return ids;
    };

    // Find a parent category that has children
    const parent = allCats.find(c => allCats.some(child => child.parent_id === c.id));
    if (!parent) {
        console.log("No parent categories with children found.");
        return;
    }

    console.log(`Testing with parent: ${parent.name} (${parent.id})`);
    const ids = getChildIds(parent.id, allCats);
    console.log("Found IDs:", ids);

    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).in('category_id', ids);
    console.log(`Products in these categories: ${count}`);
}

testRecursion();
