import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, ShoppingBag, Percent, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { optimizeImage } from '../lib/imageUtils';

export default function NotFoundPage() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [categories, setCategories] = useState([]);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    useEffect(() => {
        document.title = "404 - Página no encontrada | Mil Luces Boutique";
        const metaRobots = document.querySelector('meta[name="robots"]') || document.createElement('meta');
        metaRobots.setAttribute('name', 'robots');
        metaRobots.setAttribute('content', 'noindex, follow');
        document.head.appendChild(metaRobots);

        fetchRealCategories();
        fetchFeaturedProducts();
    }, []);

    const fetchRealCategories = async () => {
        try {
            setLoadingCategories(true);
            const { data } = await supabase
                .from('categories')
                .select('id, name, slug, image_url')
                .is('parent_id', null)
                .order('order_index', { ascending: true })
                .order('name', { ascending: true })
                .limit(6);

            if (data && data.length > 0) {
                setCategories(data);
            }
        } catch (err) {
            console.error('Error loading categories:', err);
        } finally {
            setLoadingCategories(false);
        }
    };

    const fetchFeaturedProducts = async () => {
        try {
            const { data } = await supabase
                .from('products')
                .select('id, name, slug, price, offer_price, image_url')
                .eq('is_active', true)
                .limit(4);
            if (data) setFeaturedProducts(data);
        } catch (err) {
            console.error('Error loading featured products:', err);
        }
    };

    // Live Search
    useEffect(() => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const { data } = await supabase
                    .from('products')
                    .select('id, name, slug, price, image_url')
                    .ilike('name', `%${searchTerm}%`)
                    .limit(5);
                setSearchResults(data || []);
            } catch (e) {
                console.error('Search error:', e);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/catalogo?q=${encodeURIComponent(searchTerm)}`);
        }
    };

    return (
        <div className="bg-[#FDFDFD] min-h-screen font-outfit text-brand-carbon py-10 md:py-16">
            {/* Same width as Home Page: max-w-[1600px] */}
            <div className="container mx-auto px-6 max-w-[1600px] space-y-16">

                {/* Relative Hero Container: Centered 404 in middle, Pinned Coupon Top-Right */}
                <div className="relative min-h-[420px] flex flex-col items-center justify-center">

                    {/* Centered 404 & Search Area */}
                    <div className="text-center max-w-2xl mx-auto space-y-6 w-full py-4">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] block">
                            UPS, ESTA PAGINA YA NO ESTA DISPONIBLE...
                        </span>

                        {/* Clean Centered 404 Title */}
                        <h1 className="text-8xl md:text-[10rem] font-black text-brand-carbon uppercase italic leading-none tracking-tighter select-none">
                            404
                        </h1>

                        <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-brand-carbon">
                            ¿Buscabas un enlace de nuestra antigua web?
                        </h2>

                        <p className="text-xs md:text-sm text-gray-500 font-bold uppercase tracking-wider max-w-xl mx-auto leading-relaxed">
                            Nos hemos actualizado. El contenido que buscas ha cambiado de enlace, pero puedes encontrarlo fácilmente en nuestro buscador o colecciones.
                        </p>

                        {/* Live Search Input */}
                        <div className="relative max-w-xl mx-auto pt-2">
                            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                                <Search className="absolute left-6 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Escribe lo que estabas buscando..."
                                    className="w-full h-16 bg-white border border-gray-200 rounded-2xl pl-16 pr-36 text-sm font-bold text-brand-carbon placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/10 shadow-sm transition-all"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-2 h-12 px-6 bg-brand-carbon text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary hover:text-brand-carbon transition-all flex items-center gap-2 italic"
                                >
                                    Buscar <ArrowRight className="w-4 h-4 text-primary" />
                                </button>
                            </form>

                            {/* Live Dropdown Results */}
                            {searchTerm.trim().length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-luxury z-50 text-left">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">
                                        {isSearching ? 'Buscando en catálogo...' : `Sugerencias de productos (${searchResults.length})`}
                                    </p>
                                    <div className="space-y-2">
                                        {searchResults.map((item) => (
                                            <Link
                                                key={item.id}
                                                to={`/product/${item.slug}`}
                                                className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-gray-50 transition-all group"
                                            >
                                                <img src={item.image_url} alt={item.name} className="w-10 h-10 object-cover rounded-lg bg-gray-100" />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-brand-carbon truncate group-hover:text-primary transition-colors">{item.name}</h4>
                                                    <span className="text-[10px] font-black text-primary">{item.price} €</span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-brand-carbon" />
                                            </Link>
                                        ))}
                                        {searchResults.length === 0 && !isSearching && (
                                            <p className="text-xs text-gray-400 italic py-2">No se encontraron coincidencias exactas. Pulsa Buscar para ver más catálogo.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pinned Top-Right Compact Coupon Card (Span 3/4 width ~ 300px pinned to right) */}
                    <div className="w-full lg:w-80 lg:absolute lg:top-2 lg:right-0 bg-gradient-to-br from-amber-50/90 via-white to-amber-100/40 border-2 border-amber-200/80 rounded-[2.5rem] p-5 md:p-6 shadow-luxury space-y-4 text-left z-20">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-[.2em] text-amber-800 bg-amber-200/60 px-3 py-1 rounded-full">
                                Descuento Especial
                            </span>
                            {/* % Icon in White on Black Background */}
                            <div className="w-9 h-9 bg-brand-carbon text-white rounded-xl flex items-center justify-center font-black shadow-md shrink-0">
                                <Percent className="w-4 h-4 text-white" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-lg font-black uppercase italic text-brand-carbon leading-tight">
                                10% Dto. en tu pedido
                            </h3>
                            <p className="text-xs text-gray-600 font-medium leading-snug">
                                Por los cambios en nuestra web, usa este código al finalizar tu compra:
                            </p>
                        </div>

                        {/* Coupon Code Pill: White text on Black background */}
                        <div className="bg-brand-carbon text-white rounded-2xl p-3 flex items-center justify-between shadow-md border border-brand-carbon">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">Código Cupón:</span>
                            <code className="text-white font-mono font-black text-xs tracking-wider px-2 py-0.5 rounded-lg bg-white/10">
                                NUEVAWEB10
                            </code>
                        </div>

                        <Link
                            to="/catalogo"
                            className="w-full h-11 bg-brand-carbon text-white rounded-2xl font-black text-[9px] uppercase italic tracking-widest hover:bg-primary hover:text-brand-carbon transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                            Ir al Catálogo <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                </div>

                {/* Real Store Categories */}
                <div className="space-y-8">
                    <div className="text-center max-w-2xl mx-auto">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-1 block">Explora la Tienda</span>
                        <h3 className="text-3xl md:text-4xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">
                            Nuestras Categorías Principales
                        </h3>
                    </div>

                    {loadingCategories ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-30" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {categories.map((cat) => (
                                <Link
                                    key={cat.id}
                                    to={`/catalogo?category=${cat.slug}`}
                                    className="group bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-luxury hover:border-primary/30 transition-all duration-300 text-center flex flex-col items-center"
                                >
                                    <div className="w-full aspect-square bg-gray-50 rounded-2xl p-3 mb-3 overflow-hidden border border-gray-100 flex items-center justify-center">
                                        <img
                                            src={optimizeImage(cat.image_url || 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-6_desktop.png', 200, 200)}
                                            alt={cat.name}
                                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                    <h4 className="text-[11px] font-black text-brand-carbon uppercase italic tracking-wider group-hover:text-primary transition-colors">
                                        {cat.name}
                                    </h4>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Featured Products Grid */}
                {featuredProducts.length > 0 && (
                    <div className="space-y-8 pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] block">Sugerencias para ti</span>
                                <h3 className="text-2xl md:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Productos Destacados</h3>
                            </div>
                            <Link to="/catalogo" className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1">
                                Ver todo el catálogo <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {featuredProducts.map((p) => (
                                <Link
                                    key={p.id}
                                    to={`/product/${p.slug}`}
                                    className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm hover:shadow-luxury hover:border-primary/30 transition-all group flex flex-col justify-between"
                                >
                                    <div className="aspect-square rounded-2xl overflow-hidden mb-3 bg-gray-50 p-2">
                                        <img src={p.image_url} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                    <h4 className="text-xs font-bold text-brand-carbon truncate group-hover:text-primary transition-colors mb-2">{p.name}</h4>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-black text-brand-carbon">{p.offer_price || p.price} €</span>
                                        <span className="w-8 h-8 rounded-xl bg-gray-50 group-hover:bg-primary group-hover:text-brand-carbon flex items-center justify-center text-gray-400 transition-all">
                                            <ShoppingBag className="w-4 h-4" />
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
