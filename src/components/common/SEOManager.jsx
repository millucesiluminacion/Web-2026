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
                .single();

            const staticPages = pageSettings?.value || {};

            // Mapear rutas a claves de página
            const routeMap = {
                '/': 'home',
                '/ofertas': 'ofertas',
                '/listing': 'tienda',
                '/proyectos': 'proyectos',
                '/profesionales': 'profesionales',
                '/blog': 'blog_index'
            };

            const pageKey = routeMap[path];
            if (pageKey && staticPages[pageKey]) {
                seoData = staticPages[pageKey];
            }

            // 2. Si es una página dinámica (Producto, Categoría, Blog Post)
            if (!seoData) {
                if (path.startsWith('/product/')) {
                    const slugOrId = path.split('/').pop();
                    let { data } = await supabase.from('products').select('meta_title, meta_description, name').eq('slug', slugOrId).single();
                    if (!data) {
                        const { data: dataById } = await supabase.from('products').select('meta_title, meta_description, name').eq('id', slugOrId).single();
                        data = dataById;
                    }
                    if (data) seoData = {
                        title: data.meta_title || `${data.name} | Mil Luces`,
                        description: data.meta_description
                    };
                } else if (path.startsWith('/blog/')) {
                    const slug = path.split('/').pop();
                    const { data } = await supabase.from('blog_posts').select('meta_title, meta_description, title').eq('slug', slug).single();
                    if (data) seoData = {
                        title: data.meta_title || `${data.title} | Blog Mil Luces`,
                        description: data.meta_description
                    };
                }
            }

            // 3. Fallback: Ajustes Globales de la Home si nada coincide
            if (!seoData) {
                const { data: globalRes } = await supabase
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'seo_global')
                    .single();

                const globalVal = globalRes?.value || {};

                // Si estamos en la home, usamos los específicos de la home
                if (path === '/') {
                    seoData = {
                        title: globalVal.home_title || globalVal.site_name || 'Mil Luces',
                        description: globalVal.home_description
                    };
                } else {
                    // Fallback genérico manteniendo el nombre del sitio
                    const siteName = globalVal.site_name || 'Mil Luces';
                    const pageTitle = path.split('/').pop()?.replace(/-/g, ' ');
                    seoData = {
                        title: pageTitle ? `${pageTitle.toUpperCase()} | ${siteName}` : siteName,
                        description: globalVal.home_description
                    };
                }
            }

            // 4. Aplicar cambios al DOM
            if (seoData) {
                document.title = seoData.title || 'Mil Luces';

                // Actualizar meta descripción
                updateOrCreateMeta('description', seoData.description);

                // Open Graph
                updateOrCreateMeta('og:title', seoData.title);
                updateOrCreateMeta('og:description', seoData.description);

                // Canonical (Opcional pero recomendado)
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
