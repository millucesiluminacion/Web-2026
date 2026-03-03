import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function seedSettings() {
    console.log("Seeding missing app_settings...");

    const settings = [
        {
            key: 'seo_pages',
            value: {
                home: { title: 'Mil Luces | Boutique de Iluminación', description: 'Venta de iluminación de diseño' }
            },
            description: 'Metadatos SEO para páginas estáticas'
        },
        {
            key: 'seo_global',
            value: {
                site_name: 'Mil Luces',
                home_title: 'Mil Luces | Boutique de Iluminación',
                home_description: 'Eksperience the best lighting.'
            },
            description: 'Ajustes SEO globales'
        }
    ];

    for (const s of settings) {
        const { error } = await supabase.from('app_settings').upsert(s, { onConflict: 'key' });
        if (error) console.error(`Error seeding ${s.key}:`, error.message);
        else console.log(`Successfully seeded ${s.key}`);
    }
}

seedSettings();
