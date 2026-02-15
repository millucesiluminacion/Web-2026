import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { CategoryGrid } from '../components/home/CategoryGrid';
import { BrandsSection } from '../components/home/BrandsSection';
import { RoomsSection } from '../components/home/RoomsSection';
import { WhyChooseUsSection } from '../components/home/WhyChooseUsSection';
import { supabase } from '../lib/supabaseClient';

export default function HomePage() {
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [sliders, setSliders] = useState([]);
    const [sideBanners, setSideBanners] = useState([]);
    const [currentSlider, setCurrentSlider] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, []);

    async function fetchAllData() {
        try {
            setLoading(true);
            const [prodRes, sliderRes] = await Promise.all([
                supabase.from('products').select('*').order('created_at', { ascending: false }).limit(3),
                supabase.from('sliders').select('*').eq('is_active', true).order('order_index', { ascending: true })
            ]);

            if (prodRes.error) throw prodRes.error;
            if (sliderRes.error) throw sliderRes.error;

            setFeaturedProducts(prodRes.data || []);

            const allSliders = sliderRes.data || [];
            setSliders(allSliders.filter(s => s.type === 'main_slider'));
            setSideBanners(allSliders.filter(s => s.type === 'side_banner'));

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

    // Default Fallbacks
    const defaultSliders = [
        { image_url: 'https://www.efectoled.com/img/core/global/lighting/2026/home/campaigns/848_baliza-v16_prod177697_home-main_desktop_es.png', link_url: '/ofertas-baliza', title: 'Baliza V16' }
    ];
    const defaultSideBanner = { image_url: 'https://www.efectoled.com/img/core/global/lighting/2026/home/campaigns/644_proclub-b2c_cms343_home-service_desktop_es.png', link_url: '/register-pro' };

    const activeSliders = sliders.length > 0 ? sliders : defaultSliders;
    const activeSideBanner = sideBanners.length > 0 ? sideBanners[0] : defaultSideBanner;

    return (
        <div className="js-main-container">
            {/* Premium Hero Section */}
            <section className="relative pt-8 pb-12 overflow-hidden">
                <div className="container mx-auto px-4 md:px-6 max-w-[1400px]">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch">

                        {/* Main Cinematic Feature (75%) */}
                        <div className="lg:col-span-9 relative group rounded-[2.5rem] lg:rounded-[3.5rem] overflow-hidden shadow-luxury aspect-[16/10] lg:aspect-auto min-h-[450px] lg:h-[750px] bg-brand-carbon">
                            {/* Background Image with Overlay */}
                            <div className="absolute inset-0 transition-transform duration-1000 group-hover:scale-105">
                                <img
                                    src={activeSliders[currentSlider]?.image_url || 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?q=80&w=2070&auto=format&fit=crop'}
                                    alt="Luxury Lighting"
                                    className="w-full h-full object-cover opacity-60"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-brand-carbon via-brand-carbon/20 to-transparent"></div>
                            </div>

                            {/* Content Overlay */}
                            <div className="absolute inset-0 p-12 lg:p-20 flex flex-col justify-end">
                                <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                                    <span className="inline-block px-4 py-1.5 bg-primary/10 backdrop-blur-md text-primary rounded-full text-[10px] font-black uppercase tracking-[.3em] mb-6 border border-primary/20">
                                        Colección Exclusiva 2026
                                    </span>
                                    <h1 className="text-4xl md:text-5xl lg:text-8xl font-black text-white uppercase italic leading-[0.85] tracking-tighter mb-8 lg:mb-12">
                                        La Luz que <br />
                                        <span className="text-white/40 italic">Define Tu</span> <br className="md:hidden" /> <span className="text-primary italic">Estilo</span>
                                    </h1>
                                    <div className="flex flex-wrap gap-4">
                                        <Link
                                            to="/search"
                                            className="px-8 lg:px-12 py-4 lg:py-6 bg-white text-brand-carbon rounded-xl lg:rounded-2xl font-black uppercase italic text-[10px] lg:text-xs hover:bg-primary hover:text-white transition-all shadow-xl shadow-black/30"
                                        >
                                            Ver Boutique
                                        </Link>
                                        <Link
                                            to="/proyectos"
                                            className="px-8 lg:px-12 py-4 lg:py-6 glass text-white rounded-xl lg:rounded-2xl font-black uppercase italic text-[10px] lg:text-xs hover:bg-white/10 transition-all border border-white/20"
                                        >
                                            Proyectos
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation Micro-Dots */}
                            <div className="absolute bottom-10 right-10 flex gap-3">
                                {activeSliders.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentSlider(i)}
                                        className={`w-12 h-1 rounded-full transition-all duration-500 ${i === currentSlider ? 'bg-primary w-20' : 'bg-white/20 hover:bg-white/40'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Side Narrative Feature (3%) */}
                        <div className="lg:col-span-3 lg:flex flex-col gap-8 hidden">
                            <div className="flex-1 bg-white rounded-[2.5rem] p-10 shadow-luxury border border-gray-100 flex flex-col justify-between group cursor-pointer hover:border-primary/20 transition-all">
                                <div>
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-primary mb-6 transition-transform group-hover:scale-110">
                                        <Loader2 className="w-6 h-6 animate-spin-slow" />
                                    </div>
                                    <h3 className="text-xl font-black uppercase italic leading-tight mb-2">Proyectos <br />Luz & Arte</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Asesoramiento personalizado para estudios de arquitectura.</p>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase italic tracking-widest group-hover:gap-4 transition-all">
                                    Saber más <div className="w-4 h-[2px] bg-primary"></div>
                                </div>
                            </div>

                            <a
                                href={activeSideBanner.link_url || '#'}
                                className="h-[300px] relative rounded-[2.5rem] overflow-hidden shadow-luxury group"
                            >
                                <img
                                    src={activeSideBanner.image_url}
                                    alt="Side Banner"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="absolute top-8 left-8">
                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/10">
                                        New Arrival
                                    </span>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Category Grid Section */}
            <CategoryGrid />

            {/* Featured Section - Boutique Edit */}
            <section className="mb-12 max-w-[1400px] mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                    <div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block">Premium Selection</span>
                        <h2 className="text-4xl lg:text-5xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Novedades <br /><span className="text-gray-300">Destacadas</span></h2>
                    </div>
                    <Link to="/search" className="text-[10px] font-black text-brand-carbon uppercase italic tracking-widest hover:text-primary transition-all flex items-center gap-2 border-b-2 border-brand-carbon pb-1 group">
                        Ver Colección Completa <div className="w-6 h-[1px] bg-brand-carbon group-hover:w-10 transition-all"></div>
                    </Link>
                </div>

                {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center text-gray-400 glass rounded-[3rem]">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Boutique...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {featuredProducts.length > 0 ? (
                            <>
                                {/* Masterpiece Feature (First Product) */}
                                <div className="lg:col-span-7 group relative bg-white rounded-[3rem] overflow-hidden shadow-luxury hover:shadow-luxury-hover transition-all duration-700 border border-gray-100/50 min-h-[500px]">
                                    <div className="absolute inset-0 p-12 flex flex-col justify-between">
                                        <div className="z-10">
                                            <span className="px-3 py-1 bg-brand-carbon text-white text-[9px] font-black uppercase tracking-widest rounded-lg">
                                                Featured Masterpiece
                                            </span>
                                            <h3 className="text-3xl font-black text-brand-carbon uppercase italic leading-tight mt-6 mb-2 max-w-sm">
                                                {featuredProducts[0].name}
                                            </h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">{featuredProducts[0].category}</p>
                                            <p className="text-3xl font-black text-primary italic">{featuredProducts[0].price} €</p>
                                        </div>
                                        <div className="z-10">
                                            <Link
                                                to={`/product/${featuredProducts[0].id}`}
                                                className="inline-flex items-center gap-4 px-8 py-4 bg-brand-carbon text-white rounded-2xl font-black uppercase italic text-[10px] hover:bg-primary transition-all shadow-xl shadow-black/20"
                                            >
                                                Ver Detalles <div className="w-8 h-[1px] bg-white opacity-40"></div>
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 w-full h-full p-20 flex items-center justify-end pointer-events-none">
                                        {featuredProducts[0].image_url ? (
                                            <img
                                                src={featuredProducts[0].image_url}
                                                alt={featuredProducts[0].name}
                                                className="max-h-full object-contain group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                                            />
                                        ) : (
                                            <div className="text-[150px] opacity-10 group-hover:scale-110 transition-transform duration-700">💡</div>
                                        )}
                                    </div>
                                </div>

                                {/* Curated Pair (Next 2) */}
                                <div className="lg:col-span-5 flex flex-col gap-8">
                                    {featuredProducts.slice(1, 3).map((prod) => (
                                        <Link
                                            key={prod.id}
                                            to={`/product/${prod.id}`}
                                            className="flex-1 group relative bg-white rounded-[2.5rem] p-8 overflow-hidden shadow-luxury hover:shadow-luxury-hover transition-all duration-500 border border-gray-100/50 flex items-center"
                                        >
                                            <div className="w-1/2 relative z-10">
                                                <p className="text-[8px] font-black text-primary uppercase tracking-[.3em] mb-2">{prod.category}</p>
                                                <h3 className="text-lg font-black text-brand-carbon uppercase italic leading-tight mb-4 group-hover:text-primary transition-colors line-clamp-2">
                                                    {prod.name}
                                                </h3>
                                                <p className="text-xl font-black text-brand-carbon italic">{prod.price} €</p>
                                            </div>
                                            <div className="w-1/2 h-full flex items-center justify-center p-4">
                                                {prod.image_url ? (
                                                    <img
                                                        src={prod.image_url}
                                                        alt={prod.name}
                                                        className="max-h-full object-contain group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="text-5xl opacity-20">💡</div>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="lg:col-span-12 py-32 text-center glass rounded-[3rem] border-dashed border-2 border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">La galería de novedades está siendo preparada.</p>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Brands Section */}
            <BrandsSection />

            {/* Rooms Section */}
            <RoomsSection />

            {/* Why Choose Us Section */}
            <WhyChooseUsSection />
        </div>
    );
}
