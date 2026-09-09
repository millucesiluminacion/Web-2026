// Taxonomía del Blog — Mil Luces
// Estructura oficial de categorías y subcategorías del blog de iluminación.

import { BookOpen, Zap, Home, Briefcase, Sun, Cpu } from 'lucide-react';

export const BLOG_CATEGORIES = [
    {
        id: 'guias-iluminacion',
        slug: 'guias-iluminacion',
        nombre: 'Guías de Iluminación',
        descripcion: 'Todo lo que necesitas saber para elegir la iluminación perfecta para cada situación.',
        icon: BookOpen,
        color: '#F59E0B',
        gradient: 'from-amber-50 to-orange-50',
        subcategorias: [
            { id: 'como-elegir-led', slug: 'como-elegir-iluminacion-led', nombre: 'Cómo elegir iluminación LED' },
            { id: 'lumenes-vatios', slug: 'lumenes-vs-vatios', nombre: 'Lúmenes vs Vatios' },
            { id: 'temperatura-color', slug: 'temperatura-de-color', nombre: 'Temperatura de color' },
            { id: 'indice-ip', slug: 'indice-ip', nombre: 'Índice IP' },
        ]
    },
    {
        id: 'tiras-led',
        slug: 'tiras-led',
        nombre: 'Tiras LED',
        descripcion: 'Guías técnicas sobre tiras LED: instalación, cálculos, perfiles y tipos de control.',
        icon: Zap,
        color: '#8B5CF6',
        gradient: 'from-violet-50 to-purple-50',
        subcategorias: [
            { id: 'elegir-tira-led', slug: 'como-elegir-tira-led', nombre: 'Cómo elegir tira LED' },
            { id: 'voltaje-tiras', slug: '12v-vs-24v-vs-220v', nombre: '12V vs 24V vs 220V' },
            { id: 'calcular-transformador', slug: 'como-calcular-transformador', nombre: 'Cómo calcular transformador' },
            { id: 'perfiles-aluminio', slug: 'perfiles-de-aluminio', nombre: 'Perfiles de aluminio' },
            { id: 'rgb-rgbw', slug: 'rgb-vs-rgbw', nombre: 'RGB vs RGBW' },
        ]
    },
    {
        id: 'iluminacion-estancias',
        slug: 'iluminacion-por-estancias',
        nombre: 'Iluminación por Estancias',
        descripcion: 'Soluciones de iluminación adaptadas a cada habitación y ambiente del hogar.',
        icon: Home,
        color: '#10B981',
        gradient: 'from-emerald-50 to-teal-50',
        subcategorias: [
            { id: 'cocina', slug: 'iluminacion-cocina', nombre: 'Cocina' },
            { id: 'salon', slug: 'iluminacion-salon', nombre: 'Salón' },
            { id: 'dormitorio', slug: 'iluminacion-dormitorio', nombre: 'Dormitorio' },
            { id: 'bano', slug: 'iluminacion-bano', nombre: 'Baño' },
            { id: 'exterior-hogar', slug: 'iluminacion-exterior-hogar', nombre: 'Exterior' },
        ]
    },
    {
        id: 'iluminacion-profesional',
        slug: 'iluminacion-profesional',
        nombre: 'Iluminación Profesional',
        descripcion: 'Iluminación técnica para comercios, oficinas, naves industriales y hostelería.',
        icon: Briefcase,
        color: '#3B82F6',
        gradient: 'from-blue-50 to-sky-50',
        subcategorias: [
            { id: 'tiendas', slug: 'iluminacion-tiendas', nombre: 'Tiendas' },
            { id: 'escaparates', slug: 'iluminacion-escaparates', nombre: 'Escaparates' },
            { id: 'oficinas', slug: 'iluminacion-oficinas', nombre: 'Oficinas' },
            { id: 'naves', slug: 'iluminacion-naves-industriales', nombre: 'Naves' },
            { id: 'restaurantes', slug: 'iluminacion-restaurantes', nombre: 'Restaurantes' },
        ]
    },
    {
        id: 'iluminacion-exterior',
        slug: 'iluminacion-exterior',
        nombre: 'Iluminación Exterior',
        descripcion: 'Alumbra jardines, terrazas, fachadas y espacios abiertos con seguridad y estilo.',
        icon: Sun,
        color: '#F97316',
        gradient: 'from-orange-50 to-amber-50',
        subcategorias: [
            { id: 'jardines', slug: 'iluminacion-jardines', nombre: 'Jardines' },
            { id: 'terrazas', slug: 'iluminacion-terrazas', nombre: 'Terrazas' },
            { id: 'fachadas', slug: 'iluminacion-fachadas', nombre: 'Fachadas' },
            { id: 'proyectores', slug: 'proyectores-led', nombre: 'Proyectores' },
        ]
    },
    {
        id: 'tecnologia-led',
        slug: 'tecnologia-led',
        nombre: 'Tecnología LED',
        descripcion: 'Profundiza en los fundamentos técnicos del LED: RGB, direccionamiento, controladores y transformadores.',
        icon: Cpu,
        color: '#EC4899',
        gradient: 'from-pink-50 to-rose-50',
        subcategorias: [
            { id: 'rgb', slug: 'tecnologia-rgb', nombre: 'RGB' },
            { id: 'rgbw', slug: 'tecnologia-rgbw', nombre: 'RGBW' },
            { id: 'led-direccionable', slug: 'led-direccionable', nombre: 'LED Direccionable' },
            { id: 'controladores', slug: 'controladores-led', nombre: 'Controladores' },
            { id: 'transformadores', slug: 'transformadores-led', nombre: 'Transformadores' },
        ]
    },
];

// Devuelve la categoría que contiene un slug de subcategoría dado.
export function getCategoriaBySubcategoria(subcatSlug) {
    return BLOG_CATEGORIES.find(cat =>
        cat.subcategorias.some(s => s.slug === subcatSlug)
    ) || null;
}

// Devuelve la categoría por su slug.
export function getCategoriaBySlug(catSlug) {
    return BLOG_CATEGORIES.find(c => c.slug === catSlug) || null;
}

// Devuelve la subcategoría por su slug.
export function getSubcategoriaBySlug(subcatSlug) {
    for (const cat of BLOG_CATEGORIES) {
        const sub = cat.subcategorias.find(s => s.slug === subcatSlug);
        if (sub) return { categoria: cat, subcategoria: sub };
    }
    return null;
}

// Resuelve la ruta de breadcrumbs dado el campo category de un post.
export function getBreadcrumbs(postCategory) {
    // El campo category puede ser un slug de categoría o subcategoría.
    const directa = getCategoriaBySlug(postCategory);
    if (directa) return [{ nombre: directa.nombre, slug: directa.slug }];

    const sub = getSubcategoriaBySlug(postCategory);
    if (sub) return [
        { nombre: sub.categoria.nombre, slug: sub.categoria.slug },
        { nombre: sub.subcategoria.nombre, slug: sub.subcategoria.slug },
    ];

    return [];
}

export default BLOG_CATEGORIES;
