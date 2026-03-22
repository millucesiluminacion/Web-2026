
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSEO() {
    const { data: global } = await supabase.from('app_settings').select('*').eq('key', 'seo_global').maybeSingle();
    const { data: pages } = await supabase.from('app_settings').select('*').eq('key', 'seo_pages').maybeSingle();

    console.log('--- GLOBAL SEO ---');
    console.log(JSON.stringify(global?.value, null, 2));

    console.log('--- PAGES SEO ---');
    console.log(JSON.stringify(pages?.value, null, 2));
}

checkSEO();
