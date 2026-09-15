/**
 * Google Merchant Center – Product Feed
 * URL pública: /feed/productos.xml
 * (rewrite en vercel.json: /feed/productos.xml → /api/product-feed)
 *
 * Google Merchant Center → Datos → Añadir fuente → Programada → URL del feed
 */

import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://millucesiluminacion.com';
const STORE_NAME = 'Mil Luces';
const CURRENCY = 'EUR';

function xe(val) {
    return String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function getAvailability(stock) {
    if (stock === null || stock === undefined) return 'in stock';
    return stock > 0 ? 'in stock' : 'out of stock';
}

function stripHtml(str) {
    return String(str ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000);
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).end('Method Not Allowed');
    }

    try {
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Solo productos padre (sin variantes), activos
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                id, name, slug, description,
                price, discount_price,
                stock, image_url,
                brand_name, reference,
                categories ( name )
            `)
            .is('parent_id', null)
            .neq('is_active', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const items = (products ?? []).map(p => {
            const url = `${SITE_URL}/product/${xe(p.slug || p.id)}`;
            const salePrice = p.discount_price ? parseFloat(p.discount_price).toFixed(2) : null;
            const basePrice = parseFloat(p.price || 0).toFixed(2);
            const displayPrice = salePrice || basePrice;
            const avail = getAvailability(p.stock);
            const catName = xe(p.categories?.name || 'Iluminación');
            const brand = xe(p.brand_name || STORE_NAME);
            const desc = xe(stripHtml(p.description || p.name));
            const title = xe(p.name);

            return `
    <item>
      <g:id>${xe(p.id)}</g:id>
      <g:title>${title}</g:title>
      <g:description>${desc}</g:description>
      <g:link>${url}</g:link>
      ${p.image_url ? `<g:image_link>${xe(p.image_url)}</g:image_link>` : ''}
      <g:availability>${avail}</g:availability>
      <g:price>${displayPrice} ${CURRENCY}</g:price>
      ${salePrice ? `<g:sale_price>${salePrice} ${CURRENCY}</g:sale_price>` : ''}
      <g:brand>${brand}</g:brand>
      <g:condition>new</g:condition>
      <g:product_type>${catName}</g:product_type>
      ${p.reference ? `<g:mpn>${xe(p.reference)}</g:mpn>` : ''}
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
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=3600');
        return res.status(200).send(xml);

    } catch (err) {
        console.error('[product-feed] Error:', err);
        // Devolver XML de error (nunca HTML) para que Google no confunda el formato
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        return res.status(500).send(`<?xml version="1.0"?><error>${xe(String(err))}</error>`);
    }
}
