const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync('.env', 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
    const [key, ...val] = line.split('=');
    if (key && val.length > 0) acc[key.trim()] = val.join('=').trim();
    return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function auditStrips() {
    console.log('--- Iniciando Auditoría de Tiras (Múltiples Categorías) ---');
    try {
        // 1. Encontrar todas las categorías relacionadas
        const { data: cats } = await supabase.from('categories').select('id, name, slug').ilike('name', '%Tira%');
        if (!cats || cats.length === 0) {
            console.log('No se encontraron categorías con Tira/Tiras');
            return;
        }
        console.log(`Categorías encontradas: ${cats.map(c => c.name).join(', ')}`);
        const catIds = cats.map(c => c.id);

        // 2. Traer productos de esas categorías (incluyendo hijos)
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, attributes, parent_id, category_id')
            .or(`category_id.in.(${catIds.join(',')}),parent_id.not.is.null`)
            .limit(3000);

        if (error) throw error;

        // Filtrar relevantes
        const relevantCatIds = new Set(catIds);
        const stripIdsFromCats = new Set(products.filter(p => relevantCatIds.has(p.category_id)).map(p => p.id));
        const relevantProducts = products.filter(p => stripIdsFromCats.has(p.id) || stripIdsFromCats.has(p.parent_id));

        console.log(`Productos relevantes encontrados: ${relevantProducts.length}`);

        const attrValues = {};
        relevantProducts.forEach(p => {
            const attrs = p.attributes || {};
            Object.entries(attrs).forEach(([key, val]) => {
                if (!attrValues[key]) attrValues[key] = new Set();
                if (Array.isArray(val)) val.forEach(v => attrValues[key].add(String(v)));
                else if (val) attrValues[key].add(String(val));
            });
        });

        console.log('\n--- Valores encontrados por Atributo ---');
        Object.keys(attrValues).sort().forEach(key => {
            const values = Array.from(attrValues[key]);
            if (key.toLowerCase().includes('watio') || key.toLowerCase().includes('metro') || key.toLowerCase().includes('potencia')) {
                console.log(`>>> ${key}: ${values.join(', ')}`);
            } else {
                // Para otros atributos solo mostrar resumen si son muchos
                console.log(`${key}: ${values.length} valores únicos`);
            }
        });

    } catch (e) {
        console.error('Error:', e.message);
    }
}

auditStrips();
