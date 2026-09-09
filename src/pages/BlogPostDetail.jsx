import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, User, ArrowLeft, ArrowRight, Loader2, BookOpen, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import RichBlogContent from '../components/blog/RichBlogContent';
import { getBreadcrumbs, getCategoriaBySlug } from '../data/blogTaxonomy';

// Tiempo de lectura estimado
function calcularLectura(content) {
    const text = typeof content === 'string'
        ? content.replace(/<[^>]*>/g, '').replace(/[{}"[\]]/g, '')
        : String(content || '');
    const palabras = text.trim().split(/\s+/).length;
    return Math.max(1, Math.round(palabras / 200));
}

export default function BlogPostDetail() {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [relatedPosts, setRelatedPosts] = useState([]);

    // SEO dinámico
    useEffect(() => {
        if (post) {
            document.title = post.meta_title || `${post.title} | Blog Mil Luces`;
            const metaDesc = document.querySelector('meta[name="description"]');
            const content = post.meta_description || post.excerpt || '';
            if (metaDesc) {
                metaDesc.setAttribute('content', content.substring(0, 160));
            } else {
                const meta = document.createElement('meta');
                meta.name = 'description';
                meta.content = content.substring(0, 160);
                document.head.appendChild(meta);
            }
        }
    }, [post]);

    useEffect(() => {
        async function fetchPost() {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('blog_posts')
                    .select('*')
                    .eq('slug', slug)
                    .maybeSingle();

                if (error) throw error;
                setPost(data);

                // Posts relacionados por categoría
                const { data: related } = await supabase
                    .from('blog_posts')
                    .select('*')
                    .neq('id', data.id)
                    .or(`category.eq.${data.category},subcategory.eq.${data.subcategory || data.category}`)
                    .limit(3);

                setRelatedPosts(related || []);

            } catch (err) {
                console.error('Error fetching post:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchPost();
        window.scrollTo(0, 0);
    }, [slug]);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFDFD]">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[.4em] text-gray-400">Cargando artículo...</p>
        </div>
    );

    if (!post) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFDFD] px-6">
            <BookOpen className="w-16 h-16 text-gray-200 mb-6" />
            <h1 className="text-2xl font-black text-brand-carbon uppercase italic text-center mb-4">Artículo no encontrado</h1>
            <Link to="/blog" className="text-[10px] font-black uppercase text-primary border-b-2 border-primary pb-1">Volver al Blog</Link>
        </div>
    );

    // Parsear contenido estructurado si está en JSON
    let contentBlocks = null;
    let contentHtml = post.content;
    try {
        const parsed = JSON.parse(post.content);
        if (Array.isArray(parsed)) contentBlocks = parsed;
    } catch { }

    const breadcrumbs = getBreadcrumbs(post.subcategory || post.category);
    const catData = getCategoriaBySlug(post.category) || getCategoriaBySlug(post.subcategory);
    const minutosLectura = calcularLectura(post.content);

    return (
        <div className="bg-[#FDFDFD] min-h-screen pb-20">
            {/* ── HERO ── */}
            <section className="relative h-[60vh] md:h-[70vh] overflow-hidden bg-brand-carbon">
                <img
                    src={post.image_url || 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?q=80&w=2000&auto=format&fit=crop'}
                    className="w-full h-full object-cover opacity-60 scale-105"
                    alt={post.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#FDFDFD] via-brand-carbon/20 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end pb-20">
                    <div className="container mx-auto px-6 max-w-[900px]">
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                            <Link to="/blog" className="inline-flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest mb-6 hover:text-primary transition-colors group">
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al Blog
                            </Link>
                            <div className="flex items-center gap-3 mb-6 flex-wrap">
                                {catData && (
                                    <span className="px-3 py-1 text-white text-[9px] font-black uppercase tracking-widest rounded-lg"
                                        style={{ background: catData.color }}>
                                        {catData.nombre}
                                    </span>
                                )}
                                {!catData && post.category && (
                                    <span className="px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-lg">
                                        {post.category}
                                    </span>
                                )}
                                <div className="flex items-center gap-2 text-[9px] font-bold text-white/60 uppercase tracking-widest">
                                    <Clock className="w-3 h-3" /> {minutosLectura} min lectura
                                </div>
                            </div>
                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white uppercase italic leading-[0.9] tracking-tighter drop-shadow-2xl">
                                {post.title}
                            </h1>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CONTENIDO ── */}
            <article className="container mx-auto px-6 max-w-[900px] -mt-10 relative z-10">
                <div className="bg-white rounded-[3rem] p-8 md:p-16 shadow-luxury border border-gray-100">

                    {/* Breadcrumbs */}
                    {breadcrumbs.length > 0 && (
                        <nav className="flex items-center gap-1 mb-8 text-[9px] font-black uppercase tracking-widest text-gray-400 flex-wrap">
                            <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
                            {breadcrumbs.map((b, i) => (
                                <span key={i} className="flex items-center gap-1">
                                    <ChevronRight className="w-3 h-3" />
                                    <Link to={`/blog?categoria=${b.slug}`} className="hover:text-primary transition-colors">
                                        {b.nombre}
                                    </Link>
                                </span>
                            ))}
                            <span className="flex items-center gap-1 text-primary">
                                <ChevronRight className="w-3 h-3" />
                                <span className="line-clamp-1 max-w-[200px]">{post.title}</span>
                            </span>
                        </nav>
                    )}

                    {/* Meta autor / fecha */}
                    <div className="flex flex-wrap items-center justify-between gap-6 mb-12 pb-12 border-b border-gray-50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-primary border border-gray-100">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Escrito por</p>
                                <p className="text-sm font-black text-brand-carbon uppercase italic">{post.author || 'Equipo Mil Luces'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Publicado el</p>
                                <p className="text-sm font-black text-brand-carbon uppercase italic">
                                    {new Date(post.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Extracto destacado */}
                    {post.excerpt && (
                        <div className="mb-12">
                            <p className="text-xl md:text-2xl font-bold text-brand-carbon/80 leading-relaxed italic border-l-4 border-primary pl-8">
                                {post.excerpt}
                            </p>
                        </div>
                    )}

                    {/* Contenido rico */}
                    <RichBlogContent
                        blocks={contentBlocks}
                        html={contentBlocks ? undefined : contentHtml}
                        mostrarTOC={true}
                    />
                </div>
            </article>

            {/* ── ARTÍCULOS RELACIONADOS ── */}
            {relatedPosts.length > 0 && (
                <section className="container mx-auto px-6 max-w-[1200px] mt-24">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block">Seguir explorando</span>
                            <h2 className="text-3xl font-black text-brand-carbon uppercase italic tracking-tighter">
                                Artículos <span className="text-gray-300">Relacionados</span>
                            </h2>
                        </div>
                        <Link to="/blog" className="text-[10px] font-black uppercase text-gray-400 hover:text-primary transition-colors flex items-center gap-1">
                            Ver todos <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {relatedPosts.map(rel => {
                            const relCat = getCategoriaBySlug(rel.category);
                            return (
                                <Link key={rel.id} to={`/blog/${rel.slug}`} className="group bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100">
                                    <div className="aspect-video overflow-hidden relative">
                                        <img src={rel.image_url} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        {relCat && (
                                            <span className="absolute top-3 left-3 px-2 py-1 text-white text-[8px] font-black uppercase rounded-lg"
                                                style={{ background: relCat.color }}>
                                                {relCat.nombre}
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-sm font-black text-brand-carbon uppercase italic leading-tight group-hover:text-primary transition-colors">
                                            {rel.title}
                                        </h3>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
