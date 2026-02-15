import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Loader2 } from 'lucide-react';

const STATIC_BRANDS = [
    { name: 'Philips', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Philips_logo_new.svg/200px-Philips_logo_new.svg.png', bg: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=400&h=200&fit=crop' },
    { name: 'Osram', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/OSRAM_logo.svg/200px-OSRAM_logo.svg.png', bg: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&h=200&fit=crop' },
    { name: 'Ledvance', img: 'https://www.ledvance.com/media/template/logo-ledvance.png', bg: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&h=200&fit=crop' },
    { name: 'Simon', img: 'https://www.simon.com/static/logos/simon-logo.png', bg: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=200&fit=crop' },
    { name: 'Legrand', img: 'https://www.legrand.com/etc.clientlibs/legrand/clientlibs/clientlib-base/resources/images/base/logo-legrand.png', bg: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=200&fit=crop' },
];

export function BrandsSection() {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);

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
                        img: brand.image_url || 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Philips_logo_new.svg/200px-Philips_logo_new.svg.png',
                        bg: brand.bg_image_url || 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=400&h=200&fit=crop'
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

    return (
        <section className="mb-12 max-w-[1440px] mx-auto px-4" style={{ width: 'calc(100% - 60px)' }}>
            <div className="flex justify-between mb-6 items-center">
                <h2 className="max-sm:max-w-[70%] text-xl xl:text-3xl">Compra por marcas</h2>
                <a href="/marcas" className="text-base font-medium text-blue-600 hover:underline">
                    Ver marcas
                </a>
            </div>
            <p className="mb-6">Luminarias de calidad y eficiencia de marcas líderes en iluminación profesional y decorativa.</p>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(250px,1fr))] xl:gap-7">
                    {brands.map((brand, i) => (
                        <li key={i} className="group relative rounded-md overflow-hidden border w-full text-center">
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
                                <div className="rounded-full w-[80px] h-[80px] md:w-[100px] md:h-[100px] absolute top-[40px] md:top-[100px] left-1/2 -translate-x-1/2 bg-blue-50 flex items-center justify-center border-2 border-gray-300 overflow-hidden">
                                    <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center p-2">
                                        <img src={brand.img} alt={brand.name} className="max-w-full max-h-full object-contain" />
                                    </div>
                                </div>
                                <a href={`/brand/${brand.name.toLowerCase()}`} className="self-end text-md md:text-xl font-medium mt-4">
                                    {brand.name}
                                </a>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
