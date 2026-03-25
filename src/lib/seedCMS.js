import { supabase } from './supabaseClient';

export async function seedCMS() {
    const pages = [
        {
            title: 'Aviso Legal',
            slug: 'aviso-legal',
            content: { body: '<h2>Aviso Legal</h2><p>Contenido del aviso legal para cumplimiento normativo...</p>' },
            meta_title: 'Aviso Legal | Mil Luces Boutique',
            meta_description: 'Información legal sobre Mil Luces Boutique.'
        },
        {
            title: 'Política de Privacidad',
            slug: 'politica-privacidad',
            content: { body: '<h2>Política de Privacidad</h2><p>Información sobre el tratamiento de tus datos personales conforme al RGPD...</p>' },
            meta_title: 'Política de Privacidad | Mil Luces Boutique',
            meta_description: 'Cómo tratamos tus datos en Mil Luces.'
        },
        {
            title: 'Política de Cookies',
            slug: 'politica-cookies',
            content: { body: '<h2>Política de Cookies</h2><p>Detalle de las cookies utilizadas en nuestra web...</p>' },
            meta_title: 'Política de Cookies | Mil Luces Boutique',
            meta_description: 'Información sobre el uso de cookies.'
        },
        {
            title: 'Envíos y Devoluciones',
            slug: 'envios-y-devoluciones',
            content: { body: '<h2>Envíos y Devoluciones</h2><p>Información detallada sobre plazos de entrega y política de devoluciones...</p>' },
            meta_title: 'Envíos y Devoluciones | Mil Luces Boutique',
            meta_description: 'Todo lo que necesitas saber sobre el envío de tus productos.'
        },
        {
            title: 'Garantía y RMA',
            slug: 'garantia-y-rma',
            content: { body: '<h2>Garantía y RMA</h2><p>Condiciones de garantía y proceso para gestionar devoluciones por RMA...</p>' },
            meta_title: 'Garantía y RMA | Mil Luces Boutique',
            meta_description: 'Gestión de garantías en Mil Luces.'
        },
        {
            title: 'Preguntas Frecuentes',
            slug: 'faq',
            content: { body: '<h2>Preguntas Frecuentes (FAQ)</h2><h3>¿Cuál es el plazo de entrega?</h3><p>Nuestro plazo estándar es de 48-72h...</p>' },
            meta_title: 'FAQ | Preguntas Frecuentes | Mil Luces Boutique',
            meta_description: 'Resolvemos tus dudas sobre iluminación boutique.'
        },
        {
            title: 'Descargar Catálogos',
            slug: 'catalogos',
            content: { body: '<h2>Descargar Catálogos</h2><p>Accede a nuestras colecciones exclusivas en formato PDF...</p>' },
            meta_title: 'Catálogos | Mil Luces Boutique',
            meta_description: 'Descarga nuestros catálogos de iluminación.'
        },
        {
            title: 'Mapa del Sitio',
            slug: 'mapa-del-sitio',
            content: { body: '<h2>Mapa del Sitio</h2><ul><li><a href="/">Inicio</a></li><li><a href="/catalogo">Catálogo</a></li><li><a href="/blog">Blog</a></li></ul>' },
            meta_title: 'Mapa del Sitio | Mil Luces Boutique',
            meta_description: 'Guía de navegación de Mil Luces.'
        },
        {
            title: 'Contacto',
            slug: 'contacto',
            content: { body: '<h2>Atención al Cliente</h2><p>Nuestro equipo está listo para ayudarte...</p>' },
            meta_title: 'Contacto | Mil Luces Boutique',
            meta_description: 'Ponte en contacto con nosotros.'
        }
    ];

    console.log('🌱 Iniciando siembra de Páginas CMS...');

    for (const page of pages) {
        const { error } = await supabase
            .from('cms_pages')
            .upsert(page, { onConflict: 'slug' });

        if (error) {
            console.error(`❌ Error en {page.slug}:`, error.message);
        } else {
            console.log(`✅ Página {page.slug} sincronizada.`);
        }
    }

    console.log('✨ Siembra de CMS completada.');
}
