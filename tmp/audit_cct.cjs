
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
const env = fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .reduce((acc, line) => {
        const [key, ...val] = line.split('=');
        if (key && val.length > 0) acc[key.trim()] = val.join('=').trim();
        return acc;
    }, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function auditCCT() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('attributes')
            .not('attributes', 'is', null)
            .limit(1000);

        if (error) throw error;

        const colors = new Set();
        data.forEach(p => {
            const color = p.attributes['Color'] || p.attributes['Color / Acabado'];
            if (Array.isArray(color)) color.forEach(c => colors.add(c));
            else if (color) colors.add(color);
        });

        console.log('--- VARIACIONES DE COLOR ENCONTRADAS ---');
        Array.from(colors).sort().forEach(c => {
            if (String(c).toUpperCase().includes('CCT')) {
                console.log(`[CCT Match]: "${c}"`);
            } else {
                console.log(`Other: "${c}"`);
            }
        });
    } catch (e) {
        console.error(e);
    }
}

auditCCT();
