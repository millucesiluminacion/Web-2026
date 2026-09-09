import { useState, useEffect } from 'react';
import { ArrowRight, Calendar, User, Loader2, BookOpen, Search, ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import BLOG_CATEGORIES, { getCategoriaBySlug, getSubcategoriaBySlug } from '../data/blogTaxonomy';

export default function BlogPage() {
    const [posts, setPosts] = useState([]);
    const [cmsData, setCmsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [categoriaActiva, setCategoriaActiva] = useState(null); // slug de categoría
    const [subcategoriaActiva, setSubcategoriaActiva] = useState(null); // slug de subcategoría

    useEffect(() => {
        async function fetchData() {
            try {
                const [postsRes, cmsRes] = await Promise.all([
                    supabase.from('blog_posts').select('*').order('created_at', { ascending: false }),
                    supabase.from('cms_pages').select('*').eq('slug', 'blog').maybeSingle()
                ]);
                if (postsRes.error) throw postsRes.error;
                setPosts(postsRes.data || []);
                if (cmsRes.data) setCmsData(cmsRes.data);
            } catch (err) {
                console.error('Error fetching blog data:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Filtrado de posts
    const postsFiltrados = posts.filter(post => {
        const matchBusqueda = !busqueda ||
            post.title?.toLowerCase().includes(busqueda.toLowerCase()) ||
            post.excerpt?.toLowerCase().includes(busqueda.toLowerCase());

        const matchCategoria = !categoriaActiva ||
            post.category === categoriaActiva ||
            post.subcategory?.startsWith(categoriaActiva) || (() => {
                // Comprobar si la categoría del post pertenece a la categoría activa
                const catActiva = getCategoriaBySlug(categoriaActiva);
                if (!catActiva) return false;
                return catActiva.subcategorias.some(s => s.slug === post.category || s.slug === post.subcategory);
            })();

        const matchSub = !subcategoriaActiva ||
            post.subcategory === subcategoriaActiva ||
            post.category === subcategoriaActiva;

        return matchBusqueda && matchCategoria && matchSub;
    });

    const categoriaActivaData = getCategoriaBySlug(categoriaActiva);

    function seleccionarCategoria(slug) {
        if (categoriaActiva === slug) {
            setCategoriaActiva(null);
            setSubcategoriaActiva(null);
        } else {
            setCategoriaActiva(slug);
            setSubcategoriaActiva(null);
        }
    }

    function limpiarFiltros() {
        setCategoriaActiva(null);
        setSubcategoriaActiva(null);
        setBusqueda('');
    }

    return (
        <div className="bg-[#FDFDFD] min-h-screen pt-8 pb-20">
            <div className="container mx-auto px-6 max-w-[1200px]">

                {/* ── CABECERA ── */}
                <header className="mb-12 text-center relative">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.45em] mb-4 block animate-slide-right">
                        {cmsData?.content?.header_subtitle || 'Inspírate con Mil Luces'}
                    </span>
                    <h1 className="text-4xl lg:text-6xl font-black text-brand-carbon uppercase italic leading-tight tracking-tighter animate-reveal-up">
                        {cmsData?.content?.header_title || (
                            <>Nuestro <span className="text-primary/40">Blog</span> <br /> <span className="text-brand-carbon">Iluminación</span></>
                        )}
                    </h1>
                    <div className="w-20 h-1 bg-primary/10 mx-auto mt-8 rounded-full" />
                </header>

                {/* ── BUSCADOR ── */}
                <div className="max-w-lg mx-auto mb-10 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar artículos..."
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                    />
                    {busqueda && (
                        <button onClick={() => setBusqueda('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* ── CATEGORÍAS PRINCIPALES ── */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                    {BLOG_CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        const activa = categoriaActiva === cat.slug;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => seleccionarCategoria(cat.slug)}
                                className={`group flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border text-center transition-all duration-300 ${activa
                                        ? 'border-transparent text-white shadow-lg scale-[1.02]'
                                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md'
                                    }`}
                                style={activa ? { background: `linear-gradient(135deg, ${cat.color}dd, ${cat.color}99)` } : {}}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${activa ? 'bg-white/20' : 'bg-gray-50 group-hover:bg-gray-100'
                                    }`}
                                    style={!activa ? { color: cat.color } : {}}>
                                    <Icon className="w-4 h-4" style={activa ? { color: 'white' } : {}} />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest leading-tight ${activa ? 'text-white' : 'text-brand-carbon'
                                    }`}>
                                    {cat.nombre}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ── SUBCATEGORÍAS ── */}
                {categoriaActivaData && (
                    <div className={`mb-8 p-5 rounded-2xl bg-gradient-to-r ${categoriaActivaData.gradient} border border-gray-100`}>
                        <div className="flex items-center gap-2 mb-3">
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                {categoriaActivaData.nombre}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {categoriaActivaData.subcategorias.map(sub => {
                                const activa = subcategoriaActiva === sub.slug;
                                return (
                                    <button
                                        key={sub.id}
                                        onClick={() => setSubcategoriaActiva(activa ? null : sub.slug)}
                                        className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all ${activa
                                                ? 'bg-brand-carbon text-white border-transparent'
                                                : 'bg-white text-brand-carbon border-gray-200 hover:border-brand-carbon/30'
                                            }`}
                                    >
                                        {sub.nombre}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── ESTADO DE FILTROS ── */}
                {(categoriaActiva || subcategoriaActiva || busqueda) && (
                    <div className="flex items-center justify-between mb-6">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {postsFiltrados.length} {postsFiltrados.length === 1 ? 'artículo encontrado' : 'artículos encontrados'}
                        </p>
                        <button onClick={limpiarFiltros} className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1">
                            <X className="w-3 h-3" /> Limpiar filtros
                        </button>
                    </div>
                )}

                {/* ── CUADRÍCULA DE ARTÍCULOS ── */}
                {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center text-gray-400 glass rounded-[3rem]">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Cargando artículos...</p>
                    </div>
                ) : postsFiltrados.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {postsFiltrados.map(post => {
                            const catData = getCategoriaBySlug(post.category);
                            return (
                                <article key={post.id} className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-luxury transition-all duration-500 border border-gray-100/50 flex flex-col">
                                    <div className="aspect-[16/10] overflow-hidden relative">
                                        <img
                                            src={post.image_url || 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?q=80&w=1200&auto=format&fit=crop'}
                                            alt={post.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        {catData && (
                                            <div className="absolute top-3 left-3">
                                                <span className="text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg text-white"
                                                    style={{ background: catData.color }}>
                                                    {catData.nombre}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-8 flex-1 flex flex-col">
                                        <div className="flex items-center gap-4 mb-4">
                                            {!catData && (
                                                <span className="text-[9px] font-black uppercase text-primary bg-primary/5 px-2 py-1 rounded-md">
                                                    {post.category}
                                                </span>
                                            )}
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(post.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-black text-brand-carbon uppercase italic leading-tight mb-4 group-hover:text-primary transition-colors">
                                            {post.title}
                                        </h2>
                                        <p className="text-sm text-gray-500 line-clamp-2 mb-6">
                                            {post.excerpt}
                                        </p>
                                        <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <User className="w-3 h-3 text-gray-400" />
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">{post.author || 'Mil Luces'}</span>
                                            </div>
                                            <Link to={`/blog/${post.slug}`} className="p-2 bg-gray-50 rounded-full text-brand-carbon hover:bg-primary hover:text-white transition-all">
                                                <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="col-span-full py-32 text-center bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
                        <BookOpen className="w-12 h-12 mx-auto mb-6 text-gray-200" />
                        {(busqueda || categoriaActiva) ? (
                            <>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[.4em] italic">
                                    No hay artículos para esta búsqueda
                                </p>
                                <button onClick={limpiarFiltros} className="mt-4 text-[10px] font-black text-primary uppercase underline">
                                    Ver todos los artículos
                                </button>
                            </>
                        ) : (
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[.4em] italic leading-loose">
                                Próximamente nuevas<br />inspiraciones editorial...
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
