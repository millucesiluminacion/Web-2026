import { supabase } from './supabaseClient';

export async function seedCMS() {
    const pages = [
        {
            title: 'Aviso Legal',
            slug: 'aviso-legal',
            content: {
                body: '<h2>Aviso Legal</h2><p>Contenido del aviso legal para cumplimiento normativo...</p>',
                header_title: 'Aviso Legal',
                header_subtitle: 'Normativa & Transparencia'
            },
            meta_title: 'Aviso Legal | Mil Luces Boutique',
            meta_description: 'Información legal sobre Mil Luces Boutique.'
        },
        {
            title: 'Política de Privacidad',
            slug: 'politica-privacidad',
            content: {
                body: '<h2>Política de Privacidad</h2><p>Información sobre el tratamiento de tus datos personales...</p>',
                header_title: 'Privacidad',
                header_subtitle: 'Protección de Datos'
            },
            meta_title: 'Política de Privacidad | Mil Luces Boutique',
            meta_description: 'Cómo tratamos tus datos en Mil Luces.'
        },
        {
            title: 'Blog',
            slug: 'blog',
            content: {
                body: '',
                header_title: 'Nuestro Blog Iluminación',
                header_subtitle: 'Inspírate con Mil Luces'
            },
            meta_title: 'Blog | Mil Luces Boutique',
            meta_description: 'Actualidad y consejos sobre iluminación.'
        },
        {
            title: 'Obras de Luz',
            slug: 'proyectos',
            content: {
                body: '',
                header_title: 'Obras de Luz Pura',
                header_subtitle: 'Archive Mil Luces'
            },
            meta_title: 'Proyectos | Mil Luces Boutique',
            meta_description: 'Nuestros proyectos de iluminación.'
        },
        {
            title: 'Ofertas Boutique',
            slug: 'ofertas',
            content: {
                body: '',
                header_title: 'Oportunidades Exclusivas',
                header_subtitle: 'Mil Luces Outlet'
            },
            meta_title: 'Ofertas | Mil Luces Boutique',
            meta_description: 'Descuentos exclusivos en iluminación.'
        },
        {
            title: 'Decoración Lux',
            slug: 'decoracion',
            content: {
                body: 'Transforma tus espacios con nuestra selección de iluminación decorativa. Desde elegantes lámparas de techo hasta versátiles tiras LED, tenemos todo lo que necesitas para crear ambientes únicos y acogedores.',
                header_title: 'Iluminación Decorativa',
                header_subtitle: 'Lifestyle & Design Selection'
            },
            meta_title: 'Decoración | Mil Luces Boutique',
            meta_description: 'Nuestra selección de iluminación decorativa.'
        },
        {
            title: 'Profesionales',
            slug: 'profesionales',
            content: {
                body: '',
                header_title: 'Área Profesional',
                header_subtitle: 'Partners & Proyectos'
            },
            meta_title: 'Profesionales | Mil Luces Boutique',
            meta_description: 'Contenido exclusivo para profesionales.'
        },
        {
            title: 'Contacto',
            slug: 'contacto',
            content: {
                body: '<h2>Atención al Cliente</h2><p>Nuestro equipo está listo para ayudarte...</p>',
                header_title: 'Contacto Exclusivo',
                header_subtitle: 'Concierge & Client Relations',
                address: 'Calle de la Luz, 12, Planta Noble, 28001 Madrid, España',
                phone: '+34 900 123 456',
                email: 'boutique@milluces.com'
            },
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
