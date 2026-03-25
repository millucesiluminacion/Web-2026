import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

/**
 * SEOManager
 * 
 * Componente centralizado para la inyección de metadatos SEO.
 * Se encarga de actualizar el título y las meta-etiquetas del documento
 * basándose en la ruta actual y los datos de Supabase.
 */
export default function SEOManager() {
    const location = useLocation();

    useEffect(() => {
        updateMetaTags();
    }, [location]);

    async function updateMetaTags() {
        try {
            const path = location.pathname;
            let seoData = null;

            // 1. Prioridad: Ajustes Globales y Páginas Estáticas
            // Intentamos buscar una página específica en app_settings
            const { data: pageSettings } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'seo_pages')
                .maybeSingle();

            const staticPages = pageSettings?.value || {};

            // Mapear rutas a claves de página
            const routeMap = {
                '/': 'home',
                '/ofertas': 'ofertas',
                '/catalogo': 'tienda',       // ruta real del catálogo
                '/decoracion': 'tienda',   // alias de decoración
                '/proyectos': 'proyectos',
                '/profesionales': 'profesionales',
                '/blog': 'blog_index',
                '/cart': 'cart',
                '/contacto': 'contacto',
                '/login': 'login',
                '/register': 'register',
                '/register-pro': 'register',
                '/marcas': 'marcas',
                '/estancias': 'estancias'
            };

            const pageKey = routeMap[path];
            if (pageKey && staticPages[pageKey]) {
                seoData = staticPages[pageKey];
            }

            // 2. Si es una página dinámica (Producto, Categoría, Estancia, Blog Post, CMS)
            if (!seoData) {
                const searchParams = new URLSearchParams(location.search);

                if (path.startsWith('/product/')) {
                    const slugOrId = path.split('/').pop();
                    let { data } = await supabase.from('products').select('meta_title, meta_description, name, image_url').eq('slug', slugOrId).maybeSingle();
                    if (!data) {
                        const { data: dataById } = await supabase.from('products').select('meta_title, meta_description, name, image_url').eq('id', slugOrId).maybeSingle();
                        data = dataById;
                    }
                    if (data) seoData = {
                        title: data.meta_title || `${data.name} | Mil Luces`,
                        description: data.meta_description,
                        image: data.image_url
                    };
                } else if (path.startsWith('/blog/')) {
                    const slug = path.split('/').pop();
                    const { data } = await supabase.from('blog_posts').select('meta_title, meta_description, title, image_url').eq('slug', slug).maybeSingle();
                    if (data) seoData = {
                        title: data.meta_title || `${data.title} | Blog Mil Luces`,
                        description: data.meta_description,
                        image: data.image_url
                    };
                } else if (path === '/catalogo' || path === '/decoracion') {
                    const catSlug = searchParams.get('category');
                    const roomSlug = searchParams.get('room');

                    if (catSlug) {
                        const { data } = await supabase.from('categories').select('meta_title, meta_description, name').eq('slug', catSlug).maybeSingle();
                        if (data) seoData = {
                            title: data.meta_title || `${data.name} | Iluminación Mil Luces`,
                            description: data.meta_description
                        };
                    } else if (roomSlug) {
                        const { data } = await supabase.from('rooms').select('meta_title, meta_description, name').eq('slug', roomSlug).maybeSingle();
                        if (data) seoData = {
                            title: data.meta_title || `${data.name} | Iluminación Mil Luces`,
                            description: data.meta_description
                        };
                    }
                } else {
                    // Fallback para páginas CMS u otras rutas dinámicas sin prefijo
                    const slug = path.split('/').filter(Boolean).pop();
                    if (slug && !path.includes('/', 1)) {
                        const { data } = await supabase.from('cms_pages').select('meta_title, meta_description, title').eq('slug', slug).maybeSingle();
                        if (data) seoData = {
                            title: data.meta_title || `${data.title} | Mil Luces`,
                            description: data.meta_description
                        };
                    }
                }
            }

            // 3. Fallback: Ajustes Globales de la Home si nada coincide
            const { data: globalRes } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'seo_global')
                .maybeSingle();

            const globalVal = globalRes?.value || {};
            const siteName = globalVal.site_name || 'Mil Luces';
            const globalDesc = globalVal.home_description || '';

            // REGLA ESPECIAL PARA HOME: Priorizar ajustes globales
            if (path === '/') {
                const homeStatic = staticPages['home'] || {};
                seoData = {
                    title: globalVal.home_title || homeStatic.meta_title || homeStatic.title || siteName,
                    description: globalVal.home_description || homeStatic.meta_description || homeStatic.description || globalDesc
                };
            }

            // Normalizar seoData si viene de staticPages o BD (asegurar que tenga title y description)
            if (seoData) {
                seoData.title = seoData.meta_title || seoData.title || siteName;
                seoData.description = seoData.meta_description || seoData.description || globalDesc;
            }

            if (!seoData) {
                // Fallback genérico manteniendo el nombre del sitio
                const pageTitle = path.split('/').pop()?.replace(/-/g, ' ');
                seoData = {
                    title: pageTitle ? `${pageTitle.toUpperCase()} | ${siteName}` : siteName,
                    description: globalDesc
                };
            }

            // 4. Aplicar cambios al DOM
            if (seoData) {
                const finalTitle = seoData.title || siteName;
                const finalDesc = seoData.description || globalDesc;
                const finalImage = seoData.image || globalVal.og_image || '';

                console.log(`[SEOManager] Updating for ${path}:`, finalTitle);
                document.title = finalTitle;

                // Actualizar meta descripción
                updateOrCreateMeta('description', finalDesc);

                // Open Graph
                updateOrCreateMeta('og:title', finalTitle);
                updateOrCreateMeta('og:description', finalDesc);
                updateOrCreateMeta('og:image', finalImage);
                updateOrCreateMeta('og:site_name', siteName);

                // Canonical
                const canonical = document.querySelector('link[rel="canonical"]') || document.createElement('link');
                canonical.setAttribute('rel', 'canonical');
                canonical.setAttribute('href', window.location.origin + path);
                if (!document.querySelector('link[rel="canonical"]')) {
                    document.head.appendChild(canonical);
                }
            }

        } catch (error) {
            console.error('SEO Manager Error:', error);
        }
    }

    function updateOrCreateMeta(name, content) {
        if (!content) return;

        const selector = name.startsWith('og:') ? `meta[property="${name}"]` : `meta[name="${name}"]`;
        let meta = document.querySelector(selector);

        if (!meta) {
            meta = document.createElement('meta');
            if (name.startsWith('og:')) {
                meta.setAttribute('property', name);
            } else {
                meta.setAttribute('name', name);
            }
            document.head.appendChild(meta);
        }

        meta.setAttribute('content', content);
    }

    return null; // Componente invisible
}
