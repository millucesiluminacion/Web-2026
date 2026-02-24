import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Loader2 } from 'lucide-react';

const STATIC_CATEGORIES = [
    { name: 'Bombillas', img: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-6_desktop.png', link: '/search?category=bombillas' },
    { name: 'Tubos', img: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-7_desktop.png', link: '/search?category=tubos' },
    { name: 'Downlights', img: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-11_desktop.png', link: '/search?category=downlights' },
    { name: 'Paneles', img: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-8_desktop.png', link: '/search?category=paneles' },
    { name: 'Tiras', img: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-10_desktop.png', link: '/search?category=tiras' },
    { name: 'Solar', img: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-126_desktop.png', link: '/search?category=solar' },
    { name: 'Proyectores', img: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-9_desktop.png', link: '/search?category=proyectores' },
    { name: 'Ventiladores', img: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-888_desktop.png', link: '/search?category=ventiladores' },
    { name: 'Farolas', img: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-47_desktop.png', link: '/search?category=farolas' },
    { name: 'Comercial', img: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-93_desktop.png', link: '/search?category=comercial' },
    { name: 'Industrial', img: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-55_desktop.png', link: '/search?category=industrial' },
    { name: 'Lámparas', img: 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-111_desktop.png', link: '/search?category=lamparas' },
];

export function CategoryGrid() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCategories() {
            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select('*')
                    .is('parent_id', null)
                    .order('order_index', { ascending: true })
                    .order('name', { ascending: true });

                if (error) throw error;

                if (data && data.length > 0) {
                    const formatted = data.map(cat => ({
                        name: cat.name,
                        img: cat.image_url || 'https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-6_desktop.png',
                        link: `/search?category=${cat.slug || cat.name.toLowerCase()}`
                    }));
                    setCategories(formatted);
                } else {
                    setCategories(STATIC_CATEGORIES);
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
                setCategories(STATIC_CATEGORIES);
            } finally {
                setLoading(false);
            }
        }

        fetchCategories();
    }, []);

    return (
        <section className="mb-12">
            <div className="container mx-auto px-6 max-w-[1400px]">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                    <div className="max-w-xl">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block">Selección Mil Luces</span>
                        <h2 className="text-4xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Explora nuestro <br /><span className="text-primary/40">Universo de Luz</span></h2>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
                    </div>
                ) : (
                    <ul className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 xl:gap-10">
                        {categories.map((cat, i) => (
                            <li key={i} className="group relative">
                                <Link to={cat.link} className="block text-center">
                                    <div className="relative mb-6 mx-auto w-full aspect-square bg-gray-100 rounded-[1.5rem] p-4 shadow-sm group-hover:shadow-luxury-hover group-hover:border-primary/20 transition-all duration-500 overflow-hidden border border-gray-100">
                                        <div className="absolute inset-0 bg-primary/[0.01] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <img
                                            src={cat.img}
                                            alt={cat.name}
                                            className="w-full h-full object-contain relative z-10 transition-transform duration-700 group-hover:scale-110"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="relative overflow-hidden inline-block px-4">
                                        <p className="text-[10px] font-black text-brand-carbon uppercase italic tracking-[.2em] transition-transform duration-500 group-hover:-translate-y-full">
                                            {cat.name}
                                        </p>
                                        <p className="text-[10px] font-black text-primary uppercase italic tracking-[.2em] absolute top-0 left-0 w-full translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                                            Explorar
                                        </p>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
