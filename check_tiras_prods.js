import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTirasProducts() {
    const { data: allCats } = await supabase.from('categories').select('*');
    const mainTira = allCats.find(c => c.name === 'Tiras');

    const getChildIds = (parentId, cats) => {
        let ids = [parentId];
        cats.filter(c => c.parent_id === parentId).forEach(child => {
            ids = [...ids, ...getChildIds(child.id, cats)];
        });
        return ids;
    };

    const ids = getChildIds(mainTira.id, allCats);
    const { data: prods } = await supabase.from('products').select('name, parent_id').in('category_id', ids);

    const parents = prods.filter(p => !p.parent_id);
    const variants = prods.filter(p => p.parent_id);

    console.log(`In "Tiras" hierarchy:`);
    console.log(` - Parents: ${parents.length}`);
    console.log(` - Variants: ${variants.length}`);

    if (parents.length > 0) console.log("Example Parent:", parents[0].name);
    if (variants.length > 0) console.log("Example Variant:", variants[0].name);
}

checkTirasProducts();
