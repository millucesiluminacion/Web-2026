
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple .env parser
const env = fs.readFileSync('.env', 'utf8')
    .split('\n')
    .reduce((acc, line) => {
        const [key, ...val] = line.split('=');
        if (key && val) acc[key.trim()] = val.join('=').trim();
        return acc;
    }, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function auditAttributes() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('name, attributes')
            .not('attributes', 'is', null)
            .limit(200);

        if (error) {
            console.error('Error supabase:', error);
            return;
        }

        const keys = {};
        data.forEach(p => {
            if (p.attributes) {
                Object.keys(p.attributes).forEach(k => {
                    if (!keys[k]) keys[k] = new Set();
                    const val = p.attributes[k];
                    if (Array.isArray(val)) val.forEach(v => keys[k].add(String(v)));
                    else if (val) keys[k].add(String(val));
                });
            }
        });

        console.log('--- ATRIBUTOS ENCONTRADOS EN DB ---');
        Object.keys(keys).sort().forEach(k => {
            const values = Array.from(keys[k]);
            console.log(`${k}: ${values.slice(0, 5).join(', ')}${values.length > 5 ? '...' : ''}`);
        });
    } catch (e) {
        console.error('Error script:', e);
    }
}

auditAttributes();
