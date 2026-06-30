import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://2026.millucesiluminacion.com';
const CACHE_SECONDS = 86400; // 24h

const staticRoutes = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/catalogo', changefreq: 'daily', priority: '0.9' },
    { loc: '/ofertas', changefreq: 'daily', priority: '0.8' },
    { loc: '/blog', changefreq: 'weekly', priority: '0.7' },
    { loc: '/inspirate', changefreq: 'weekly', priority: '0.6' },
    { loc: '/profesionales', changefreq: 'monthly', priority: '0.6' },
    { loc: '/marcas', changefreq: 'weekly', priority: '0.6' },
    { loc: '/estancias', changefreq: 'weekly', priority: '0.6' },
    { loc: '/contacto', changefreq: 'monthly', priority: '0.5' },
];

function xmlEscape(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
    return [
        '  <url>',
        `    <loc>${SITE_URL}${xmlEscape(loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
        changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
        priority ? `    <priority>${priority}</priority>` : '',
        '  </url>',
    ].filter(Boolean).join('\n');
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).end('Method Not Allowed');
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).end('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Fetch dynamic data in parallel
        const [productsRes, categoriesRes, blogRes] = await Promise.all([
            supabase
                .from('products')
                .select('slug, updated_at')
                .is('parent_id', null)
                .neq('is_active', false)
                .not('slug', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(5000),
            supabase
                .from('categories')
                .select('slug, updated_at')
                .not('slug', 'is', null),
            supabase
                .from('blog_posts')
                .select('slug, updated_at')
                .not('slug', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(1000),
        ]);

        const entries = [];

        // Static pages
        for (const route of staticRoutes) {
            entries.push(urlEntry(route));
        }

        // Categories → /catalogo?category=slug
        for (const cat of (categoriesRes.data || [])) {
            entries.push(urlEntry({
                loc: `/catalogo?category=${xmlEscape(cat.slug)}`,
                lastmod: cat.updated_at ? cat.updated_at.split('T')[0] : undefined,
                changefreq: 'weekly',
                priority: '0.7',
            }));
        }

        // Products → /product/slug
        for (const prod of (productsRes.data || [])) {
            entries.push(urlEntry({
                loc: `/product/${xmlEscape(prod.slug)}`,
                lastmod: prod.updated_at ? prod.updated_at.split('T')[0] : undefined,
                changefreq: 'weekly',
                priority: '0.8',
            }));
        }

        // Blog posts → /blog/slug
        for (const post of (blogRes.data || [])) {
            entries.push(urlEntry({
                loc: `/blog/${xmlEscape(post.slug)}`,
                lastmod: post.updated_at ? post.updated_at.split('T')[0] : undefined,
                changefreq: 'monthly',
                priority: '0.6',
            }));
        }

        const xml = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ...entries,
            '</urlset>',
        ].join('\n');

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`);
        return res.status(200).send(xml);

    } catch (err) {
        console.error('Sitemap generation error:', err);
        return res.status(500).end('Error generating sitemap');
    }
}
