import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Briefcase, Zap, Layout, ShoppingBag, Plus } from 'lucide-react';
import { CategoryGrid } from '../components/home/CategoryGrid';
import { BrandsSection } from '../components/home/BrandsSection';
import { RoomsSection } from '../components/home/RoomsSection';
import { WhyChooseUsSection } from '../components/home/WhyChooseUsSection';
import { BadgeRenderer, StarRating } from '../components/commerce/BoutiqueUI';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabaseClient';
import { calculateProductPrice, IVA_RATE } from '../lib/pricingUtils';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
    const { addToCart } = useCart();
    const { profile } = useAuth();
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [sliders, setSliders] = useState([]);
    const [sideBanners, setSideBanners] = useState([]);
    const [currentSlider, setCurrentSlider] = useState(0);
    const [proSlider, setProSlider] = useState(0);
    const [professions, setProfessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, []);

    async function fetchAllData() {
        try {
            setLoading(true);

            // Try fetching products with badges join, fallback without if table missing
            let prodRes;
            const prodQuery = supabase.from('products')
                .select('*, product_badges(badges(*))')
                .neq('is_active', false)
                .order('created_at', { ascending: false })
                .limit(7);

            prodRes = await prodQuery;

            // Resilience: is_active column may missing
            if (prodRes.error && prodRes.error.message.includes('is_active')) {
                prodRes = await supabase.from('products')
                    .select('*, product_badges(badges(*))')
                    .order('created_at', { ascending: false })
                    .limit(7);
            }

            // Resilience: badges table may missing
            if (prodRes.error && prodRes.error.message.includes('product_badges')) {
                prodRes = await supabase.from('products')
                    .select('*')
                    .neq('is_active', false)
                    .order('created_at', { ascending: false })
                    .limit(7);

                if (prodRes.error && prodRes.error.message.includes('is_active')) {
                    prodRes = await supabase.from('products')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(7);
                }
            }

            const [sliderRes, profRes] = await Promise.all([
                supabase.from('sliders').select('*').eq('is_active', true).order('order_index', { ascending: true }),
                supabase.from('professions').select('*').order('order_index', { ascending: true })
            ]);

            if (prodRes.data) setFeaturedProducts(prodRes.data);
            if (profRes.data) setProfessions(profRes.data);

            if (sliderRes.data) {
                const allSliders = sliderRes.data;
                setSliders(allSliders.filter(s => s.type === 'main_slider'));
                setSideBanners(allSliders.filter(s => s.type === 'side_banner'));
            }

        } catch (error) {
            console.error('Error fetching data:', error.message);
        } finally {
            setLoading(false);
        }
    }

    // Auto-advance slider
    useEffect(() => {
        if (sliders.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentSlider(prev => (prev + 1) % sliders.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [sliders]);

    const nextSlider = () => setCurrentSlider(prev => (prev + 1) % sliders.length);
    const prevSlider = () => setCurrentSlider(prev => (prev - 1 + sliders.length) % sliders.length);

    // Auto-advance mini pro slider
    useEffect(() => {
        if (professions.length <= 1) return;
        const timer = setInterval(() => {
            setProSlider(prev => (prev + 1) % professions.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [professions]);

    // Default Fallbacks
    const activeSliders = sliders.length > 0 ? sliders : [];
    const activeSideBanner = sideBanners.length > 0 ? sideBanners[0] : { image_url: '', link_url: '/profesionales' };

    return (
        <div className="js-main-container">
            {/* Premium Hero Section */}
            <section className="relative pt-8 pb-12 overflow-hidden">
                <div className="container mx-auto px-4 md:px-6 max-w-[1600px]">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch">

                        {/* Main Cinematic Feature (75%) */}
                        <div className="lg:col-span-9 relative group rounded-[2rem] lg:rounded-[3.5rem] overflow-hidden shadow-luxury h-[48vh] min-h-[320px] max-h-[480px] lg:h-[500px] lg:min-h-0 lg:max-h-none bg-brand-carbon">
                            <div className="absolute inset-0 transition-transform duration-1000 group-hover:scale-105">
                                {activeSliders[currentSlider]?.image_url && (
                                    <img
                                        src={activeSliders[currentSlider].image_url}
                                        alt="Luxury Lighting"
                                        className="w-full h-full object-cover opacity-90"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-brand-carbon/40 via-transparent to-transparent"></div>
                            </div>

                            <div className="absolute inset-0 p-6 sm:p-10 lg:p-20 flex flex-col justify-end">
                                <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                                    {activeSliders[currentSlider]?.subtitle && (
                                        <span className="inline-block px-4 py-1.5 bg-primary/10 backdrop-blur-md text-primary rounded-full text-[10px] font-black uppercase tracking-[.3em] mb-6 border border-primary/20">
                                            {activeSliders[currentSlider].subtitle}
                                        </span>
                                    )}
                                    <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic leading-[0.85] tracking-tighter mb-5 lg:mb-12">
                                        {activeSliders[currentSlider]?.title ? (
                                            activeSliders[currentSlider].title.replace(/<br\s*\/?>/gi, ' ')
                                        ) : (
                                            <>La Luz que <span className="text-primary/60 italic">Define Tu</span> <span className="text-white italic">Estilo</span></>
                                        )}
                                    </h1>
                                    <div className="flex flex-wrap gap-4">
                                        <Link
                                            to={activeSliders[currentSlider]?.link_url || '/catalogo'}
                                            className="px-6 lg:px-12 py-3 lg:py-6 bg-white text-brand-carbon rounded-xl lg:rounded-2xl font-black uppercase italic text-[10px] lg:text-xs hover:bg-primary hover:text-white transition-all shadow-xl shadow-black/30"
                                        >
                                            {activeSliders[currentSlider]?.button_text || 'Ver Boutique'}
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-4 right-4 sm:bottom-10 sm:right-10 flex gap-3">
                                {activeSliders.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentSlider(i)}
                                        className={`w-12 h-1 rounded-full transition-all duration-500 ${i === currentSlider ? 'bg-primary w-20' : 'bg-white/20 hover:bg-white/40'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Side Narrative Feature - Mini Slider PRO */}
                        <div className="lg:col-span-3 lg:flex flex-col gap-6 hidden lg:h-[500px]">
                            <Link
                                to={professions.length > 0 ? `/catalogo?profession=${professions[proSlider]?.slug}` : "/profesionales"}
                                className="flex-1 bg-brand-carbon rounded-[2.5rem] shadow-luxury border border-white/5 flex flex-col justify-between group cursor-pointer hover:border-primary/40 transition-all relative overflow-hidden"
                            >
                                <div className="absolute inset-0 z-0">
                                    {professions.length > 0 && professions[proSlider]?.image_url ? (
                                        <img
                                            src={professions[proSlider].image_url}
                                            alt={professions[proSlider].name}
                                            className="w-full h-full object-cover opacity-100 transition-transform duration-700 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-brand-carbon/20"></div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-brand-carbon/50 via-transparent to-transparent"></div>
                                </div>

                                <div className="relative z-10 p-10 h-full flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="w-12 h-12 bg-primary/20 backdrop-blur-md text-primary rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12 border border-primary/20">
                                                <Briefcase className="w-6 h-6" />
                                            </div>
                                            <div className="flex gap-1">
                                                {professions.map((_, i) => (
                                                    <div key={i} className={`w-1 h-1 rounded-full transition-all ${i === proSlider ? 'bg-primary w-4' : 'bg-white/20'}`}></div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="min-h-[140px]" key={proSlider}>
                                            <h3 className="text-2xl font-black uppercase italic leading-none mb-4 whitespace-pre-line text-white">
                                                {professions.length > 0 ? professions[proSlider].name : 'Cargando...'}
                                            </h3>
                                            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest leading-relaxed line-clamp-3">
                                                {professions.length > 0 ? professions[proSlider].description : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-[10px] font-black text-white uppercase italic tracking-widest group-hover:gap-4 transition-all group-hover:text-primary transition-all">
                                        Explorar Selección <div className="w-4 h-[2px] bg-primary"></div>
                                    </div>
                                </div>
                            </Link>

                            <a
                                href={activeSideBanner.link_url || '#'}
                                className="flex-1 relative rounded-[2.5rem] overflow-hidden shadow-luxury group"
                            >
                                {activeSideBanner.image_url && (
                                    <img
                                        src={activeSideBanner.image_url}
                                        alt="Side Banner"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                )}
                                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <CategoryGrid />

            {/* Featured Section */}
            <section className="mb-12 max-w-[1600px] mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                    <div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block">Ultimas Llegadas</span>
                        <h2 className="text-4xl lg:text-5xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Novedades <span className="text-primary/60">Destacadas</span></h2>
                    </div>
                    <Link to="/catalogo" className="text-[10px] font-black text-brand-carbon uppercase italic tracking-widest hover:text-primary transition-all flex items-center gap-2 border-b-2 border-brand-carbon pb-1 group">
                        Ver Colección Completa <div className="w-6 h-[1px] bg-brand-carbon group-hover:w-10 transition-all"></div>
                    </Link>
                </div>

                {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center text-gray-400 glass rounded-[3rem]">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Tienda...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {featuredProducts.length > 0 ? (
                            <>
                                {/* MASTERPIECE */}
                                {(() => {
                                    const prod = featuredProducts[0];
                                    const pricing = calculateProductPrice(prod, profile);
                                    return (
                                        <div className="lg:col-span-1 lg:row-span-2 group relative bg-white rounded-3xl overflow-hidden shadow-luxury hover:shadow-luxury-hover transition-all duration-700 border border-gray-100 flex flex-col p-8 min-h-[450px]">
                                            <BadgeRenderer product={prod} />

                                            <div className="z-10 relative mb-6">
                                                <div className="mb-2">
                                                    <StarRating rating={prod.rating_avg} count={prod.reviews_count} />
                                                </div>
                                                <h3 className="text-xl font-black text-brand-carbon uppercase italic leading-tight mt-2 line-clamp-2">
                                                    {prod.name}
                                                </h3>
                                            </div>

                                            <div className="flex-1 flex items-center justify-center p-6 relative">
                                                {prod.image_url ? (
                                                    <img
                                                        src={prod.image_url}
                                                        alt={prod.name}
                                                        className="max-h-64 object-contain group-hover:scale-110 transition-transform duration-700"
                                                    />
                                                ) : (
                                                    <div className="text-8xl opacity-10">💡</div>
                                                )}

                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-white/10 backdrop-blur-[2px]">
                                                    <Link
                                                        to={`/product/${prod.slug || prod.id}`}
                                                        className="px-6 py-2 bg-brand-carbon text-white rounded-full font-black uppercase italic text-[9px] hover:bg-primary transition-all shadow-xl"
                                                    >
                                                        Ver Detalles
                                                    </Link>
                                                </div>
                                            </div>

                                            <div className="mt-4 space-y-4">
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-2xl font-black text-brand-carbon italic">
                                                        {pricing.displayPrice.toFixed(2)} €
                                                    </p>
                                                    {pricing.showPriceWithoutVat && (
                                                        <span className="text-[10px] font-black text-primary uppercase italic">+IVA</span>
                                                    )}
                                                    {pricing.originalPrice > pricing.finalPrice && (
                                                        <p className="text-sm text-gray-400 line-through font-bold">
                                                            {(pricing.showPriceWithoutVat ? pricing.originalPrice / (1 + IVA_RATE) : pricing.originalPrice).toFixed(2)} €
                                                        </p>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => addToCart({ ...prod, price: pricing.finalPrice })}
                                                    disabled={prod.stock <= 0}
                                                    className={`
                                                        w-full rounded-2xl py-4 px-6 font-black uppercase italic text-[10px] transition-all shadow-xl flex items-center justify-center gap-3 group
                                                        ${prod.stock <= 0
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            : 'bg-brand-carbon text-white hover:bg-primary shadow-black/10 hover:shadow-primary/20 active:scale-95'
                                                        }
                                                    `}
                                                >
                                                    <ShoppingBag className="w-4 h-4 transition-transform group-hover:scale-110" />
                                                    {prod.stock > 0 ? 'Añadir a la Cesta' : 'Agotado'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* OTHERS */}
                                {featuredProducts.slice(1, 7).map((prod) => {
                                    const pricing = calculateProductPrice(prod, profile);
                                    return (
                                        <div key={prod.id} className="group relative bg-white rounded-3xl p-5 overflow-hidden shadow-sm hover:shadow-luxury transition-all duration-500 border border-gray-50 flex flex-col justify-between">
                                            <BadgeRenderer product={prod} />

                                            <div className="h-32 flex items-center justify-center p-2 mb-4 relative overflow-hidden">
                                                {prod.image_url ? (
                                                    <img
                                                        src={prod.image_url}
                                                        alt={prod.name}
                                                        className="max-h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="text-4xl opacity-10">💡</div>
                                                )}
                                            </div>

                                            <div className="flex flex-col flex-1">
                                                <div className="mb-2">
                                                    <StarRating rating={prod.rating_avg} count={prod.reviews_count} />
                                                </div>
                                                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-1">{prod.category || 'Iluminación'}</p>
                                                <h3 className="text-[11px] font-black text-brand-carbon uppercase italic leading-tight mb-3 group-hover:text-primary transition-colors line-clamp-1">
                                                    <Link to={`/product/${prod.slug || prod.id}`}>{prod.name}</Link>
                                                </h3>

                                                <div className="mt-auto">
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            addToCart({ ...prod, price: pricing.finalPrice });
                                                        }}
                                                        disabled={prod.stock <= 0}
                                                        className={`
                                                            w-full rounded-xl py-2.5 px-4 font-black uppercase italic text-[8px] transition-all flex items-center justify-between group/btn mb-3
                                                            ${prod.stock <= 0
                                                                ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                                                : 'bg-brand-carbon text-white hover:bg-primary shadow-lg shadow-black/5 active:scale-95'
                                                            }
                                                        `}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <ShoppingBag className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                                                            {prod.stock > 0 ? 'Comprar' : 'Agotado'}
                                                        </span>
                                                        <span className="font-bold">
                                                            {pricing.displayPrice.toFixed(2)}€
                                                            {pricing.showPriceWithoutVat && <span className="ml-1 text-[7px]">+IVA</span>}
                                                        </span>
                                                    </button>

                                                    <div className="flex items-center gap-2 opacity-60">
                                                        {pricing.originalPrice > pricing.finalPrice && (
                                                            <p className="text-[9px] text-gray-400 line-through font-bold">
                                                                {(pricing.showPriceWithoutVat ? pricing.originalPrice / (1 + IVA_RATE) : pricing.originalPrice).toFixed(2)} €
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        ) : (
                            <div className="lg:col-span-4 py-20 text-center glass rounded-3xl border-dashed border-2 border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No hay novedades disponibles en este momento.</p>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <BrandsSection />
            <RoomsSection />
            <WhyChooseUsSection />
        </div>
    );
}
