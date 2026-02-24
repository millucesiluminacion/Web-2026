import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Briefcase, Zap, Layout } from 'lucide-react';
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
    const [proSlider, setProSlider] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, []);

    async function fetchAllData() {
        try {
            setLoading(true);
            const [prodRes, sliderRes, seoRes] = await Promise.all([
                supabase.from('products').select('*').order('created_at', { ascending: false }).limit(3),
                supabase.from('sliders').select('*').eq('is_active', true).order('order_index', { ascending: true }),
                supabase.from('site_settings').select('*').eq('key', 'seo_global').single()
            ]);

            if (prodRes.error) throw prodRes.error;
            if (sliderRes.error) throw sliderRes.error;

            setFeaturedProducts(prodRes.data || []);

            const allSliders = sliderRes.data || [];
            setSliders(allSliders.filter(s => s.type === 'main_slider'));
            setSideBanners(allSliders.filter(s => s.type === 'side_banner'));

            // SEO Implementation
            if (seoRes.data?.value) {
                const seo = seoRes.data.value;
                document.title = seo.home_title || 'Mil Luces | Boutique de Iluminación';
                const metaDesc = document.querySelector('meta[name="description"]');
                if (metaDesc) {
                    metaDesc.setAttribute('content', seo.home_description || '');
                } else {
                    const meta = document.createElement('meta');
                    meta.name = 'description';
                    meta.content = seo.home_description || '';
                    document.head.appendChild(meta);
                }
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
        const timer = setInterval(() => {
            setProSlider(prev => (prev + 1) % 2);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    const proSlides = [
        {
            title: "Expertos\nRotulistas",
            desc: "Acceso directo a Tiras LED, Módulos y Perfiles para tus luminosos.",
            link: "/search?category=tiras",
            image: "/assets/pro/rotulistas.png",
            icon: Zap
        },
        {
            title: "Reformas &\nInteriorismo",
            desc: "Lámparas y Downlights con tarifas especiales para tus obras.",
            link: "/search?category=lamparas",
            image: "/assets/pro/reformas.png",
            icon: Layout
        }
    ];

    // Default Fallbacks (Empty to avoid FOUC with external images)
    const defaultSliders = [];
    const defaultSideBanner = { image_url: '', link_url: '/profesionales' };

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
                                {activeSliders[currentSlider]?.image_url && (
                                    <img
                                        src={activeSliders[currentSlider].image_url}
                                        alt="Luxury Lighting"
                                        className="w-full h-full object-cover opacity-60"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-brand-carbon via-brand-carbon/20 to-transparent"></div>
                            </div>

                            {/* Content Overlay */}
                            <div className="absolute inset-0 p-12 lg:p-20 flex flex-col justify-end">
                                <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                                    {activeSliders[currentSlider]?.subtitle && (
                                        <span className="inline-block px-4 py-1.5 bg-primary/10 backdrop-blur-md text-primary rounded-full text-[10px] font-black uppercase tracking-[.3em] mb-6 border border-primary/20">
                                            {activeSliders[currentSlider].subtitle}
                                        </span>
                                    )}
                                    <h1 className="text-4xl md:text-5xl lg:text-8xl font-black text-white uppercase italic leading-[0.85] tracking-tighter mb-8 lg:mb-12">
                                        {activeSliders[currentSlider]?.title ? (
                                            activeSliders[currentSlider].title.split('<br />').map((text, i) => (
                                                <span key={i}>
                                                    {i > 0 && <br />}
                                                    {text}
                                                </span>
                                            ))
                                        ) : (
                                            <>La Luz que <br /><span className="text-white/40 italic">Define Tu</span> <br className="md:hidden" /> <span className="text-primary italic">Estilo</span></>
                                        )}
                                    </h1>
                                    <div className="flex flex-wrap gap-4">
                                        <Link
                                            to={activeSliders[currentSlider]?.link_url || '/search'}
                                            className="px-8 lg:px-12 py-4 lg:py-6 bg-white text-brand-carbon rounded-xl lg:rounded-2xl font-black uppercase italic text-[10px] lg:text-xs hover:bg-primary hover:text-white transition-all shadow-xl shadow-black/30"
                                        >
                                            {activeSliders[currentSlider]?.button_text || 'Ver Boutique'}
                                        </Link>
                                        {activeSliders[currentSlider]?.secondary_button_text && (
                                            <Link
                                                to={activeSliders[currentSlider]?.secondary_button_link || '#'}
                                                className="px-8 lg:px-12 py-4 lg:py-6 glass text-white rounded-xl lg:rounded-2xl font-black uppercase italic text-[10px] lg:text-xs hover:bg-white/10 transition-all border border-white/20"
                                            >
                                                {activeSliders[currentSlider].secondary_button_text}
                                            </Link>
                                        )}
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

                        {/* Side Narrative Feature (3%) - Mini Slider PRO */}
                        <div className="lg:col-span-3 lg:flex flex-col gap-8 hidden">
                            <Link
                                to={proSlides[proSlider].link}
                                className="flex-1 bg-brand-carbon rounded-[2.5rem] shadow-luxury border border-white/5 flex flex-col justify-between group cursor-pointer hover:border-primary/40 transition-all relative overflow-hidden"
                            >
                                {/* Background Image with Overlay */}
                                <div className="absolute inset-0 z-0">
                                    <img
                                        src={proSlides[proSlider].image}
                                        alt={proSlides[proSlider].title}
                                        className="w-full h-full object-cover opacity-40 transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-brand-carbon via-brand-carbon/20 to-transparent"></div>
                                </div>

                                <div className="relative z-10 p-10 h-full flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="w-12 h-12 bg-primary/20 backdrop-blur-md text-primary rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12 border border-primary/20">
                                                {proSlider === 0 ? <Zap className="w-6 h-6" /> : <Layout className="w-6 h-6" />}
                                            </div>
                                            <div className="flex gap-1">
                                                <div className={`w-1 h-1 rounded-full transition-all ${proSlider === 0 ? 'bg-primary w-4' : 'bg-white/20'}`}></div>
                                                <div className={`w-1 h-1 rounded-full transition-all ${proSlider === 1 ? 'bg-primary w-4' : 'bg-white/20'}`}></div>
                                            </div>
                                        </div>

                                        <div className="min-h-[140px] animate-in fade-in slide-in-from-right-4 duration-500" key={proSlider}>
                                            <h3 className="text-2xl font-black uppercase italic leading-none mb-4 whitespace-pre-line text-white">
                                                {proSlides[proSlider].title.split('\n')[0]} <br />
                                                <span className="text-primary italic">{proSlides[proSlider].title.split('\n')[1]}</span>
                                            </h3>
                                            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest leading-relaxed">
                                                {proSlides[proSlider].desc}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-[10px] font-black text-white uppercase italic tracking-widest group-hover:gap-4 transition-all group-hover:text-primary transition-all">
                                        Selección Profesional <div className="w-4 h-[2px] bg-primary"></div>
                                    </div>
                                </div>
                            </Link>

                            <a
                                href={activeSideBanner.link_url || '#'}
                                className="h-[300px] relative rounded-[2.5rem] overflow-hidden shadow-luxury group"
                            >
                                {activeSideBanner.image_url && (
                                    <img
                                        src={activeSideBanner.image_url}
                                        alt="Side Banner"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                )}
                                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="absolute top-8 left-8">
                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/10">
                                        {activeSideBanner.title || activeSideBanner.subtitle || 'New Arrival'}
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
                                                to={`/product/${featuredProducts[0].slug || featuredProducts[0].id}`}
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
                                            to={`/product/${prod.slug || prod.id}`}
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
