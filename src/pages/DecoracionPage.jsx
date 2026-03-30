import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2 } from 'lucide-react';

const DecoracionPage = () => {
    const [cmsData, setCmsData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchContent() {
            try {
                const { data } = await supabase
                    .from('cms_pages')
                    .select('*')
                    .eq('slug', 'decoracion')
                    .maybeSingle();
                if (data) setCmsData(data);
            } catch (err) {
                console.error("Error fetching Decoracion CMS:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchContent();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="bg-[#FDFDFD] min-h-screen pt-8 pb-12 font-outfit">
            <div className="container mx-auto px-6 max-w-[1400px]">
                {/* Dynamic Boutique Header */}
                <header className="mb-16 text-center relative group">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.45em] mb-4 block animate-slide-right">
                        {cmsData?.content?.header_subtitle || 'Lifestyle & Design Selection'}
                    </span>
                    <h1 className="text-5xl lg:text-7xl font-black text-brand-carbon uppercase italic leading-tight tracking-tighter animate-reveal-up drop-shadow-sm">
                        {cmsData?.content?.header_title ? cmsData.content.header_title.split('\n').map((t, i) => (
                            <span key={i}>{i > 0 && <br />}{t}</span>
                        )) : (
                            <>Iluminación <span className="text-primary/40">Decorativa</span> <br /> <span className="text-brand-carbon">Exclusiva</span></>
                        )}
                    </h1>
                    <div className="w-20 h-1 bg-primary/20 mx-auto mt-8 rounded-full"></div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Mock Category Cards - Keeping existing structure but with boutique spacing */}
                    <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden group cursor-pointer hover:shadow-luxury transition-all duration-500">
                        <img src="https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-111_desktop.png" alt="Lámparas" className="w-full h-64 object-contain p-8 group-hover:scale-105 transition-transform duration-700" />
                        <div className="p-8 bg-gray-50/50 text-center border-t border-gray-50">
                            <span className="font-black uppercase italic text-xs tracking-widest text-brand-carbon">Lámparas de Diseño</span>
                        </div>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden group cursor-pointer hover:shadow-luxury transition-all duration-500">
                        <img src="https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-10_desktop.png" alt="Tiras LED" className="w-full h-64 object-contain p-8 group-hover:scale-105 transition-transform duration-700" />
                        <div className="p-8 bg-gray-50/50 text-center border-t border-gray-50">
                            <span className="font-black uppercase italic text-xs tracking-widest text-brand-carbon">Tiras LED Decorativas</span>
                        </div>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden group cursor-pointer hover:shadow-luxury transition-all duration-500">
                        <img src="https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-9_desktop.png" alt="Guirnaldas" className="w-full h-64 object-contain p-8 group-hover:scale-105 transition-transform duration-700" />
                        <div className="p-8 bg-gray-50/50 text-center border-t border-gray-50">
                            <span className="font-black uppercase italic text-xs tracking-widest text-brand-carbon">Guirnaldas y Eventos</span>
                        </div>
                    </div>
                </div>

                <div className="mt-20 max-w-3xl mx-auto text-center">
                    <div className="prose prose-sm font-bold uppercase tracking-widest text-gray-400 leading-relaxed animate-reveal-up border-t border-gray-100 pt-12">
                        {cmsData?.content?.body ? (
                            <div dangerouslySetInnerHTML={{ __html: cmsData.content.body }} />
                        ) : (
                            <p>
                                Transforma tus espacios con nuestra selección de iluminación decorativa. Desde elegantes lámparas de techo hasta versátiles tiras LED, tenemos todo lo que necesitas para crear ambientes únicos y acogedores.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DecoracionPage;
