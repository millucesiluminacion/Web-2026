import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Loader2 } from 'lucide-react';

const STATIC_REASONS = [
    {
        title: 'Más de 20.000 referencias, siempre disponibles',
        description: 'Amplia variedad de productos de iluminación y material eléctrico, como lámparas, bombillas, tubos, paneles solares o cargadores para vehículos.',
        image_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=150&h=150&fit=crop'
    },
    {
        title: 'Calidad y seguridad',
        description: 'Nuestros productos cumplen con los estándares europeos de calidad y seguridad, incluyendo el marcado CE, así como otros certificados como RoHS y TUV.',
        image_url: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=150&h=150&fit=crop'
    },
    {
        title: 'Proyectos de iluminación',
        description: 'Soluciones personalizadas en manos de nuestros expertos. Ponte en contacto con nosotros y solicita tu presupuesto sin compromiso.',
        image_url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=150&h=150&fit=crop'
    },
    {
        title: 'Descuentos para profesionales',
        description: 'Alta calidad a precios competitivos para poder ofrecer el mejor servicio a tus clientes. Descuentos especiales respecto a la tarifa general.',
        image_url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=150&h=150&fit=crop'
    },
];

export function WhyChooseUsSection() {
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchReasons() {
            try {
                const { data, error } = await supabase
                    .from('why_choose_us')
                    .select('*')
                    .order('order_index', { ascending: true });

                if (error) throw error;

                if (data && data.length > 0) {
                    setReasons(data);
                } else {
                    setReasons(STATIC_REASONS);
                }
            } catch (err) {
                console.error('Error fetching reasons:', err);
                setReasons(STATIC_REASONS);
            } finally {
                setLoading(false);
            }
        }

        fetchReasons();
    }, []);

    return (
        <section className="relative overflow-hidden bg-gradient-to-b from-gray-100 to-white py-12">
            <div className="max-w-[1440px] mx-auto px-4 relative" style={{ width: 'calc(100% - 60px)' }}>
                <div className="absolute right-0 w-[300px] h-[300px] rounded-full opacity-90 filter blur-3xl right-[200px] top-36 bg-blue-100"></div>
                <div className="absolute w-[300px] h-[300px] rounded-full opacity-90 filter blur-3xl right-5 top-12 bg-yellow-100"></div>
                <h2 className="text-xl xl:text-3xl mb-8 relative">¿Por qué elegirnos?</h2>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <ul className="grid grid-rows-auto lg:grid-cols-2 gap-x-8 gap-y-5">
                        {reasons.map((item, i) => (
                            <li key={i} className="relative flex md:items-center rounded-md overflow-hidden duration-500 bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="max-md:p-4 max-md:pr-0 flex-shrink-0">
                                    <img
                                        src={item.image_url || 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=150&h=150&fit=crop'}
                                        alt={item.title}
                                        className="w-[85px] h-[85px] md:w-[120px] md:h-[120px] object-cover max-w-max rounded"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="p-4">
                                    <p className="text-sm xl:text-base mb-1 font-bold">{item.title}</p>
                                    <p className="text-xs xl:text-sm text-gray-600">{item.description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
