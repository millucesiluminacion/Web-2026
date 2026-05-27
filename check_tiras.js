import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTirasHierarchy() {
    const { data: allCats } = await supabase.from('categories').select('*');

    const tiras = allCats.filter(c => c.name.toLowerCase().includes('tira'));
    console.log("Found categories with 'tira':", tiras.map(t => `${t.name} (${t.id}) parent: ${t.parent_id}`));

    const getChildIds = (parentId, cats) => {
        let ids = [parentId];
        cats.filter(c => c.parent_id === parentId).forEach(child => {
            ids = [...ids, ...getChildIds(child.id, cats)];
        });
        return ids;
    };

    tiras.forEach(t => {
        if (!t.parent_id) {
            const ids = getChildIds(t.id, allCats);
            console.log(`\nFull hierarchy for parent "${t.name}":`, ids.length, "categories");
            ids.forEach(id => {
                const c = allCats.find(cat => cat.id === id);
                console.log(` - ${c.name} (${c.id})`);
            });
        }
    });

    // Count products in "Tiras" hierarchy
    const mainTira = tiras.find(t => !t.parent_id);
    if (mainTira) {
        const ids = getChildIds(mainTira.id, allCats);
        const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).in('category_id', ids);
        console.log(`\nTOTAL Products in "${mainTira.name}" hierarchy:`, count);
    }
}

checkTirasHierarchy();
