import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkNeonProducts() {
    const parentId = '1e603d97-431a-4d95-9f01-73d7e82fdf64'; // Neon
    const sub1Id = 'e64d85e4-ef44-46e6-b2c2-ba6eb44dd3f8'; // 1º Generacion
    const sub2Id = 'a75c40e2-5f15-4c6a-a600-97873f2fe134'; // 2º Generacion

    const { data: products } = await supabase.from('products')
        .select('name, category_id, attributes')
        .in('category_id', [parentId, sub1Id, sub2Id]);

    console.log(`Total products in Neon or subcats: ${products?.length || 0}`);

    const groups = {
        'Parent (Neon)': products.filter(p => p.category_id === parentId),
        '1º Generacion': products.filter(p => p.category_id === sub1Id),
        '2º Generacion': products.filter(p => p.category_id === sub2Id)
    };

    for (const [group, prods] of Object.entries(groups)) {
        console.log(`\nGroup: ${group} (${prods.length} products)`);
        prods.forEach(p => {
            console.log(`- ${p.name} (Cat ID: ${p.category_id})`);
        });
    }
}

checkNeonProducts();
