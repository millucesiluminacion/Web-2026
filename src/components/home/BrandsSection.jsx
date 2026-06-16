import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATIC_BRANDS = [
    { name: 'Philips', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Philips_logo_new.svg/200px-Philips_logo_new.svg.png', bg: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=400&h=200&fit=crop' },
    { name: 'Osram', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/OSRAM_logo.svg/200px-OSRAM_logo.svg.png', bg: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&h=200&fit=crop' },
    { name: 'Ledvance', img: 'https://www.ledvance.com/media/template/logo-ledvance.png', bg: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&h=200&fit=crop' },
    { name: 'Simon', img: 'https://www.simon.com/static/logos/simon-logo.png', bg: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=200&fit=crop' },
    { name: 'Legrand', img: 'https://www.legrand.com/etc.clientlibs/legrand/clientlibs/clientlib-base/resources/images/base/logo-legrand.png', bg: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=200&fit=crop' },
];

export function BrandsSection() {
    const [brands, setBrands] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    useEffect(() => {
        async function fetchBrands() {
            try {
                const { data, error } = await supabase
                    .from('brands')
                    .select('*')
                    .order('order_index', { ascending: true })
                    .order('name', { ascending: true });

                if (error) throw error;

                if (data && data.length > 0) {
                    const formatted = data.map(brand => ({
                        name: brand.name,
                        img: brand.image_url || '',
                        bg: brand.bg_image_url || 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=80&w=2000'
                    }));
                    setBrands(formatted);
                } else {
                    setBrands(STATIC_BRANDS);
                }
            } catch (err) {
                console.error('Error fetching brands:', err);
                setBrands(STATIC_BRANDS);
            } finally {
                setLoading(false);
            }
        }

        fetchBrands();
    }, []);

    const nextBrand = useCallback(() => {
        if (brands.length > 5) {
            setCurrentIndex((prev) => (prev + 1) % brands.length);
        }
    }, [brands.length]);

    const prevBrand = useCallback(() => {
        if (brands.length > 5) {
            setCurrentIndex((prev) => (prev - 1 + brands.length) % brands.length);
        }
    }, [brands.length]);

    // Rotation effect
    useEffect(() => {
        if (brands.length <= 5 || !isAutoPlaying) return;
        const interval = setInterval(nextBrand, 5000);
        return () => clearInterval(interval);
    }, [brands.length, isAutoPlaying, nextBrand]);

    const handleManualAction = (action) => {
        setIsAutoPlaying(false);
        action();
        // Resume autoplay after 10 seconds of inactivity
        setTimeout(() => setIsAutoPlaying(true), 10000);
    };

    const displayedBrands = brands.length > 5
        ? [...brands, ...brands].slice(currentIndex, currentIndex + 5)
        : brands;

    return (
        <section className="mb-12 max-w-[1440px] mx-auto px-4 group/section" style={{ width: 'calc(100% - 60px)' }}>
            <div className="flex justify-between mb-6 items-center">
                <div>
                    <h2 className="max-sm:max-w-[70%] text-xl xl:text-3xl">Compra por marcas</h2>
                    <p className="mt-2 text-sm text-gray-500 hidden md:block">Luminarias de calidad y eficiencia de marcas líderes.</p>
                </div>
                <div className="flex items-center gap-4">
                    {brands.length > 5 && (
                        <div className="flex items-center gap-2 mr-4">
                            <button
                                onClick={() => handleManualAction(prevBrand)}
                                className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-blue-300 transition-all text-gray-400 hover:text-blue-600 shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleManualAction(nextBrand)}
                                className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-blue-300 transition-all text-gray-400 hover:text-blue-600 shadow-sm"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <Link to="/marcas" className="text-base font-medium text-blue-600 hover:underline">
                        Ver marcas
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="relative">
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:gap-7 transition-all duration-500">
                        {displayedBrands.map((brand, i) => (
                            <li key={`${brand.name}-${currentIndex}-${i}`} className="group relative rounded-md overflow-hidden border w-full text-center animate-in fade-in duration-700 slide-in-from-right-4">
                                <div className="relative h-[80px] md:h-[150px] overflow-hidden">
                                    <img
                                        src={brand.bg}
                                        alt={brand.name}
                                        className="w-full h-full object-cover group-hover:scale-110 duration-300"
                                        loading="lazy"
                                    />
                                    <div className="absolute bottom-0 text-white bg-gradient-to-b from-transparent to-gray-950 w-full h-16"></div>
                                </div>
                                <div className="flex p-4 pt-14 md:pt-16 justify-center">
                                    <div className="rounded-full w-[80px] h-[80px] md:w-[100px] md:h-[100px] absolute top-[40px] md:top-[100px] left-1/2 -translate-x-1/2 bg-blue-50 flex items-center justify-center border-2 border-gray-300 overflow-hidden shadow-md">
                                        <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center p-2">
                                            <img src={brand.img} alt={brand.name} className="max-w-full max-h-full object-contain" />
                                        </div>
                                    </div>
                                    <Link to={`/catalogo?brand=${brand.name.toLowerCase()}`} className="self-end text-sm md:text-lg font-medium mt-4 line-clamp-1">
                                        {brand.name}
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
