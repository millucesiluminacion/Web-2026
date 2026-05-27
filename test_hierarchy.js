import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testHierarchyLogic() {
    const filterCategory = "a6993afd-1051-4b97-82c1-ea38bf217c43"; // Downlights

    const [catRes] = await Promise.all([
        supabase.from('categories').select('id, name, parent_id, slug').order('name')
    ]);

    const getChildIds = (parentId, allCats) => {
        let ids = [parentId];
        allCats.filter(c => c.parent_id === parentId).forEach(child => {
            ids = [...ids, ...getChildIds(child.id, allCats)];
        });
        return ids;
    };

    const categoryIds = getChildIds(filterCategory, catRes.data || []);
    console.log("Category IDs:", categoryIds);

    const { data: allData, error, count } = await supabase.from('products')
        .select('*, categories(name), brands(name), product_rooms(room_id), product_professions(profession_id), product_badges(badges(*))', { count: 'exact' })
        .in('category_id', categoryIds)
        .limit(50);

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    console.log(`Fetched ${allData.length} products. Total count: ${count}`);

    // HIERARCHICAL LOGIC FROM ProductList.jsx
    const parents = allData.filter(p => !p.parent_id);
    const variants = allData.filter(p => p.parent_id);

    console.log(`Split into ${parents.length} parents and ${variants.length} variants.`);

    const hierarchicalProducts = [];
    parents.forEach(parent => {
        hierarchicalProducts.push({
            ...parent,
            room_ids: [] // Simplified
        });
        const children = variants.filter(v => v.parent_id === parent.id);
        children.forEach(child => {
            hierarchicalProducts.push({
                ...child,
                room_ids: []
            });
        });
    });

    const addedIds = new Set(hierarchicalProducts.map(p => p.id));
    const orphans = variants.filter(v => !addedIds.has(v.id));
    orphans.forEach(orphan => {
        hierarchicalProducts.push({
            ...orphan,
            room_ids: []
        });
    });

    console.log(`Final hierarchical list length: ${hierarchicalProducts.length}`);
    if (hierarchicalProducts.length > 0) {
        console.log("Sample product in final list:", hierarchicalProducts[0].name);
    } else {
        console.log("FINAL LIST IS EMPTY!");
    }
}

testHierarchyLogic();
