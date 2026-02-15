import { supabase } from './supabaseClient';

const STATIC_CATEGORIES = [
    { name: 'Bombillas', slug: 'bombillas', image_url: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-6_desktop.png', description: 'Todo tipo de bombillas LED para el hogar y la industria.', order_index: 0 },
    { name: 'Tubos', slug: 'tubos', image_url: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-7_desktop.png', description: 'Tubos LED de alta eficiencia para sustitución directa.', order_index: 1 },
    { name: 'Downlights', slug: 'downlights', image_url: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-11_desktop.png', description: 'Downlights encastrados y de superficie para interiores.', order_index: 2 },
    { name: 'Paneles', slug: 'paneles', image_url: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-8_desktop.png', description: 'Paneles LED ideales para oficinas y espacios comerciales.', order_index: 3 },
    { name: 'Tiras', slug: 'tiras', image_url: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-10_desktop.png', description: 'Tiras LED flexibles para iluminación decorativa y técnica.', order_index: 4 },
    { name: 'Solar', slug: 'solar', image_url: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-126_desktop.png', description: 'Iluminación sostenible con energía solar.', order_index: 5 },
    { name: 'Proyectores', slug: 'proyectores', image_url: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-9_desktop.png', description: 'Proyectores LED de exterior para fachadas y jardines.', order_index: 6 },
    { name: 'Ventiladores', slug: 'ventiladores', image_url: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-888_desktop.png', description: 'Ventiladores de techo con iluminación LED integrada.', order_index: 7 },
    { name: 'Farolas', slug: 'farolas', image_url: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-47_desktop.png', description: 'Iluminación vial y pública.', order_index: 8 },
    { name: 'Comercial', slug: 'comercial', image_url: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-93_desktop.png', description: 'Soluciones lumínicas para tiendas y locales comerciales.', order_index: 9 },
    { name: 'Industrial', slug: 'industrial', image_url: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-55_desktop.png', description: 'Campanas y estancas LED para naves industriales.', order_index: 10 },
    { name: 'Lámparas', slug: 'lamparas', image_url: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-111_desktop.png', description: 'Lámparas de diseño y decorativas.', order_index: 11 },
];

const STATIC_BRANDS = [
    { name: 'Philips', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Philips_logo_new.svg/200px-Philips_logo_new.svg.png', description: 'Líder mundial en iluminación técnica.', order_index: 0 },
    { name: 'Osram', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/OSRAM_logo.svg/200px-OSRAM_logo.svg.png', description: 'Innovación en componentes de iluminación.', order_index: 1 },
    { name: 'Ledvance', image_url: 'https://www.ledvance.com/media/template/logo-ledvance.png', description: 'Expertos en soluciones de iluminación general.', order_index: 2 },
    { name: 'Simon', image_url: 'https://www.simon.com/static/logos/simon-logo.png', description: 'Mecanismos y control de iluminación.', order_index: 3 },
    { name: 'Legrand', image_url: 'https://www.legrand.com/etc.clientlibs/legrand/clientlibs/clientlib-base/resources/images/base/logo-legrand.png', description: 'Infraestructuras eléctricas de vanguardia.', order_index: 4 },
];

const STATIC_WHY_US = [
    {
        title: 'Más de 20.000 referencias',
        description: 'Amplia variedad de productos de iluminación y material eléctrico.',
        image_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=150&h=150&fit=crop',
        order_index: 0
    },
    {
        title: 'Calidad y seguridad',
        description: 'Productos certificados que cumplen con los estándares europeos.',
        image_url: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=150&h=150&fit=crop',
        order_index: 1
    },
    {
        title: 'Proyectos a medida',
        description: 'Soluciones personalizadas en manos de nuestros expertos.',
        image_url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=150&h=150&fit=crop',
        order_index: 2
    },
    {
        title: 'Descuentos profesionales',
        description: 'Precios competitivos para instaladores y profesionales del sector.',
        image_url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=150&h=150&fit=crop',
        order_index: 3
    }
];

const STATIC_SLIDERS = [
    {
        image_url: 'https://www.efectoled.com/img/core/global/lighting/2026/home/campaigns/848_baliza-v16_prod177697_home-main_desktop_es.png',
        link_url: '/ofertas-baliza',
        title: 'Baliza V16 Homologada',
        order_index: 0,
        type: 'main_slider'
    },
    {
        image_url: 'https://www.efectoled.com/img/core/global/lighting/2026/home/campaigns/644_proclub-b2c_cms343_home-service_desktop_es.png',
        link_url: '/register-pro',
        title: 'PRO CLUB',
        order_index: 0,
        type: 'side_banner'
    }
];

const STATIC_ROOMS = [
    { name: 'Salón / Comedor', slug: 'salon-comedor', image_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=500&fit=crop', description: 'Iluminación acogedora para tus momentos en familia.', order_index: 0 },
    { name: 'Cocina', slug: 'cocina', image_url: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=500&fit=crop', description: 'Luz funcional y brillante para cocinar con seguridad.', order_index: 1 },
    { name: 'Baño', slug: 'bano', image_url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=500&fit=crop', description: 'Soluciones resistentes a la humedad con estilo.', order_index: 2 },
    { name: 'Dormitorio', slug: 'dormitorio', image_url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&h=500&fit=crop', description: 'Ambientes relajantes para un descanso perfecto.', order_index: 3 },
    { name: 'Pasillos', slug: 'pasillos', image_url: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=400&h=500&fit=crop', description: 'Luz de paso eficiente y decorativa.', order_index: 4 },
];

const STATIC_BLOG = [
    {
        title: 'Tendencias en Iluminación 2026: El minimalismo cálido',
        slug: 'tendencias-iluminacion-2026',
        excerpt: 'Descubre cómo la iluminación técnica se fusiona con el diseño de interiores para crear espacios acogedores.',
        content: 'El minimalismo cálido es la gran tendencia de este año. Se trata de usar la luz no solo para ver, sino para sentir...',
        image_url: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?q=80&w=1200',
        author: 'Marco Rossi',
        category: 'Diseño'
    }
];

const STATIC_PROJECTS = [
    {
        name: 'Villa Onyx',
        location: 'Marbella, ES',
        category: 'Residencial Luxury',
        image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200',
        year: '2025',
        order_index: 0
    },
    {
        name: 'Hotel Lumina',
        location: 'Milán, IT',
        category: 'Hospitality',
        image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200',
        year: '2025',
        order_index: 1
    }
];

export async function seedDatabase() {
    console.log('Starting seed process...');

    // Seed Categories
    const { error: catError } = await supabase
        .from('categories')
        .upsert(STATIC_CATEGORIES, { onConflict: 'name' });
    if (catError) console.error('Error seeding categories:', catError);

    // Seed Brands
    const { error: brandError } = await supabase
        .from('brands')
        .upsert(STATIC_BRANDS, { onConflict: 'name' });
    if (brandError) console.error('Error seeding brands:', brandError);

    // Seed Rooms
    const { error: roomError } = await supabase
        .from('rooms')
        .upsert(STATIC_ROOMS, { onConflict: 'name' });
    if (roomError) console.error('Error seeding rooms:', roomError);

    // Seed Why Choosing us
    const { error: whyError } = await supabase
        .from('why_choose_us')
        .upsert(STATIC_WHY_US, { onConflict: 'title' });
    if (whyError) console.error('Error seeding why_choose_us:', whyError);

    // Seed Sliders
    const { error: sliderError } = await supabase
        .from('sliders')
        .upsert(STATIC_SLIDERS, { onConflict: 'image_url' });
    if (sliderError) console.error('Error seeding sliders:', sliderError);

    // Seed Blog
    const { error: blogError } = await supabase
        .from('blog_posts')
        .upsert(STATIC_BLOG, { onConflict: 'slug' });
    if (blogError) console.error('Error seeding blog:', blogError);

    // Seed Projects
    const { error: projectError } = await supabase
        .from('projects')
        .upsert(STATIC_PROJECTS, { onConflict: 'name' });
    if (projectError) console.error('Error seeding projects:', projectError);

    return {
        success: !catError && !brandError && !roomError && !whyError && !sliderError && !blogError && !projectError,
        errors: { catError, brandError, roomError, whyError, sliderError, blogError, projectError }
    };
}
