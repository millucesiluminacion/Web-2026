import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing
const env = fs.readFileSync('.env', 'utf8')
    .split('\n')
    .reduce((acc, line) => {
        const [key, value] = line.split('=');
        if (key && value) acc[key.trim()] = value.trim();
        return acc;
    }, {});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
    console.log('Seeding Blog Posts...');
    const { error: blogError } = await supabase.from('blog_posts').insert([
        {
            title: 'Tendencias en Iluminación 2026: El minimalismo cálido',
            slug: 'tendencias-iluminacion-2026',
            excerpt: 'Descubre cómo la iluminación técnica se fusiona con el diseño de interiores para crear espacios acogedores.',
            content: 'El minimalismo cálido es la gran tendencia de este año...',
            image_url: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?q=80&w=1200',
            author: 'Marco Rossi',
            category: 'Diseño'
        }
    ]);
    if (blogError) console.error('Blog seed error:', blogError);
    else console.log('Blog seeded!');

    console.log('Seeding Projects...');
    const { error: projectError } = await supabase.from('projects').insert([
        {
            name: 'Villa Onyx',
            location: 'Marbella, ES',
            category: 'Residencial Luxury',
            image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200',
            year: '2025',
            order_index: 0
        }
    ]);
    if (projectError) console.error('Project seed error:', projectError);
    else console.log('Project seeded!');
}

seed();
