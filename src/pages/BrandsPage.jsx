import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATIC_BRANDS = [
    { name: 'Philips', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Philips_logo_new.svg/200px-Philips_logo_new.svg.png', bg: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=400&h=200&fit=crop' },
    { name: 'Osram', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/OSRAM_logo.svg/200px-OSRAM_logo.svg.png', bg: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&h=200&fit=crop' },
    { name: 'Ledvance', img: 'https://www.ledvance.com/media/template/logo-ledvance.png', bg: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&h=200&fit=crop' },
    { name: 'Simon', img: 'https://www.simon.com/static/logos/simon-logo.png', bg: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=200&fit=crop' },
    { name: 'Legrand', img: 'https://www.legrand.com/etc.clientlibs/legrand/clientlibs/clientlib-base/resources/images/base/logo-legrand.png', bg: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=200&fit=crop' },
];

export default function BrandsPage() {
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
                        id: brand.id,
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

    return (
        <div className="bg-brand-porcelain min-h-screen pt-32 pb-20">
            <div className="container mx-auto px-6 max-w-[1400px]">
                <header className="mb-16 text-center relative">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-4 block">Mil Luces Boutique</span>
                    <h1 className="text-5xl lg:text-7xl font-black text-brand-carbon uppercase italic leading-tight tracking-tighter">
                        Nuestras <span className="text-primary/40">Marcas</span> <br /> <span className="text-brand-carbon">Boutique</span>
                    </h1>
                    <div className="w-20 h-1 bg-primary/20 mx-auto mt-8 rounded-full"></div>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20 bg-white rounded-[3rem] shadow-luxury border border-gray-100/50">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(250px,1fr))] xl:gap-7">
                        {brands.map((brand, i) => (
                            <li key={i} className="group relative rounded-md overflow-hidden border w-full text-center bg-white shadow-sm hover:shadow-md transition-shadow">
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
                                    <div className="rounded-full w-[80px] h-[80px] md:w-[100px] md:h-[100px] absolute top-[40px] md:top-[100px] left-1/2 -translate-x-1/2 bg-blue-50 flex items-center justify-center border-2 border-gray-300 overflow-hidden shadow-sm">
                                        <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center p-2">
                                            <img src={brand.img} alt={brand.name} className="max-w-full max-h-full object-contain" />
                                        </div>
                                    </div>
                                    <Link to={`/search?brand=${brand.id || brand.name.toLowerCase()}`} className="self-end text-md md:text-xl font-black italic text-brand-carbon uppercase tracking-tighter mt-4 hover:text-primary transition-colors">
                                        {brand.name}
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
