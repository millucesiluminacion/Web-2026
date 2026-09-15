import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://millucesiluminacion.com';
const STORE_NAME = 'Mil Luces';
const CURRENCY = 'EUR';
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
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function stripHtml(str) {
    return String(str ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000);
}

function getAvailability(stock) {
    if (stock === null || stock === undefined) return 'in stock';
    return stock > 0 ? 'in stock' : 'out of stock';
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

// Google Merchant Center Feed generator
async function generateGoogleMerchantFeed(res, supabase) {
    const [productsRes, categoriesRes, brandsRes] = await Promise.all([
        supabase
            .from('products')
            .select('id, name, slug, description, price, discount_price, stock, image_url, reference, category_id, brand_id')
            .is('parent_id', null)
            .neq('is_active', false)
            .order('created_at', { ascending: false }),
        supabase
            .from('categories')
            .select('id, name'),
        supabase
            .from('brands')
            .select('id, name')
    ]);

    if (productsRes.error) throw productsRes.error;

    const categoryMap = new Map((categoriesRes.data || []).map(c => [c.id, c.name]));
    const brandMap = new Map((brandsRes.data || []).map(b => [b.id, b.name]));

    const items = (productsRes.data ?? []).map(p => {
        const url = `${SITE_URL}/product/${xmlEscape(p.slug || p.id)}`;
        const salePrice = p.discount_price ? parseFloat(p.discount_price).toFixed(2) : null;
        const basePrice = parseFloat(p.price || 0).toFixed(2);
        const displayPrice = salePrice || basePrice;
        const avail = getAvailability(p.stock);
        const catName = xmlEscape(categoryMap.get(p.category_id) || 'Iluminación');
        const brand = xmlEscape(brandMap.get(p.brand_id) || STORE_NAME);
        const desc = xmlEscape(stripHtml(p.description || p.name));
        const title = xmlEscape(p.name);

        return `
    <item>
      <g:id>${xmlEscape(p.id)}</g:id>
      <g:title>${title}</g:title>
      <g:description>${desc}</g:description>
      <g:link>${url}</g:link>
      ${p.image_url ? `<g:image_link>${xmlEscape(p.image_url)}</g:image_link>` : ''}
      <g:availability>${avail}</g:availability>
      <g:price>${displayPrice} ${CURRENCY}</g:price>
      ${salePrice ? `<g:sale_price>${salePrice} ${CURRENCY}</g:sale_price>` : ''}
      <g:brand>${brand}</g:brand>
      <g:condition>new</g:condition>
      <g:product_type>${catName}</g:product_type>
      ${p.reference ? `<g:mpn>${xmlEscape(p.reference)}</g:mpn>` : ''}
      <g:identifier_exists>${p.reference ? 'yes' : 'no'}</g:identifier_exists>
      <g:shipping>
        <g:country>ES</g:country>
        <g:service>Estándar</g:service>
        <g:price>0.00 EUR</g:price>
      </g:shipping>
    </item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${STORE_NAME} – Catálogo</title>
    <link>${SITE_URL}</link>
    <description>Catálogo de iluminación de diseño – ${STORE_NAME}</description>
    <language>es</language>
${items}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=3600');
    return res.status(200).send(xml);
}

// Standard Sitemap generator
async function generateStandardSitemap(res, supabase) {
    const [productsRes, categoriesRes, blogRes, brandsRes, roomsRes] = await Promise.all([
        supabase
            .from('products')
            .select('slug, created_at')
            .is('parent_id', null)
            .neq('is_active', false)
            .not('slug', 'is', null)
            .order('created_at', { ascending: false })
            .limit(5000),
        supabase
            .from('categories')
            .select('slug, created_at')
            .not('slug', 'is', null),
        supabase
            .from('blog_posts')
            .select('slug, created_at')
            .not('slug', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1000),
        supabase
            .from('brands')
            .select('name, created_at'),
        supabase
            .from('rooms')
            .select('slug, created_at')
            .not('slug', 'is', null),
    ]);

    const entries = [];

    for (const route of staticRoutes) {
        entries.push(urlEntry(route));
    }

    for (const cat of (categoriesRes.data || [])) {
        entries.push(urlEntry({
            loc: `/catalogo?category=${xmlEscape(cat.slug)}`,
            lastmod: cat.created_at ? cat.created_at.split('T')[0] : undefined,
            changefreq: 'weekly',
            priority: '0.7',
        }));
    }

    for (const prod of (productsRes.data || [])) {
        entries.push(urlEntry({
            loc: `/product/${xmlEscape(prod.slug)}`,
            lastmod: prod.created_at ? prod.created_at.split('T')[0] : undefined,
            changefreq: 'weekly',
            priority: '0.8',
        }));
    }

    for (const post of (blogRes.data || [])) {
        entries.push(urlEntry({
            loc: `/blog/${xmlEscape(post.slug)}`,
            lastmod: post.created_at ? post.created_at.split('T')[0] : undefined,
            changefreq: 'monthly',
            priority: '0.6',
        }));
    }

    for (const brand of (brandsRes.data || [])) {
        if (brand.name) {
            entries.push(urlEntry({
                loc: `/catalogo?brand=${xmlEscape(brand.name.toLowerCase())}`,
                lastmod: brand.created_at ? brand.created_at.split('T')[0] : undefined,
                changefreq: 'weekly',
                priority: '0.6',
            }));
        }
    }

    for (const room of (roomsRes.data || [])) {
        entries.push(urlEntry({
            loc: `/catalogo?room=${xmlEscape(room.slug)}`,
            lastmod: room.created_at ? room.created_at.split('T')[0] : undefined,
            changefreq: 'weekly',
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
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).end('Method Not Allowed');
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        return res.status(500).send('<?xml version="1.0"?><error>Supabase configuration missing</error>');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const parsedUrl = new URL(req.url, 'http://localhost');
    const type = req.query?.type || parsedUrl.searchParams.get('type');

    try {
        if (type === 'google-merchant' || type === 'products') {
            return await generateGoogleMerchantFeed(res, supabase);
        } else {
            return await generateStandardSitemap(res, supabase);
        }
    } catch (err) {
        console.error('Feed generation error:', err);
        const errMsg = err?.message || err?.details || (typeof err === 'object' ? JSON.stringify(err) : String(err));
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        return res.status(500).send(`<?xml version="1.0"?><error>${xmlEscape(errMsg)}</error>`);
    }
}
