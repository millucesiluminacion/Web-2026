import { useState, useEffect } from 'react';
import { MapPin, ArrowUpRight, Loader2, Sparkles, Package, ShoppingCart, Plus, X, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';

const HotspotMarker = ({ x, y, product, active, onClick }) => (
    <div
        className="absolute z-10 -ml-4 -mt-4 transition-all duration-500"
        style={{ left: `${x}%`, top: `${y}%` }}
    >
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${active ? 'bg-primary scale-125 shadow-luxury' : 'bg-white/20 backdrop-blur-md border border-white/40 hover:bg-white/40'}`}
        >
            <div className={`absolute inset-0 rounded-full bg-primary animate-ping opacity-20 ${active ? 'block' : 'hidden'}`}></div>
            {active ? <X className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
        </button>

        {active && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 z-50">
                <div className="p-4 flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0">
                        <img src={product.product_image} alt="" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase text-brand-carbon truncate">{product.product_name}</p>
                        <p className="text-sm font-black text-primary mt-1">{product.product_price}€</p>
                        <Link
                            to={`/product/${product.product_id}`}
                            className="text-[8px] font-black uppercase tracking-[.1em] text-gray-400 hover:text-brand-carbon flex items-center gap-1 mt-2 transition-colors"
                        >
                            Ver Producto <ChevronRight className="w-2.5 h-2.5" />
                        </Link>
                    </div>
                </div>
                <Link
                    to={`/product/${product.product_id}`}
                    className="w-full bg-brand-carbon text-white py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary transition-colors"
                >
                    <ShoppingCart className="w-3 h-3" /> Comprar Ahora
                </Link>
            </div>
        )}
    </div>
);

export default function ProyectosPage() {
    const [projects, setProjects] = useState([]);
    const [cmsData, setCmsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeHotspot, setActiveHotspot] = useState({ projectId: null, hotspotIndex: null });

    useEffect(() => {
        async function fetchData() {
            try {
                const [projectsRes, cmsRes] = await Promise.all([
                    supabase.from('projects').select('*').order('order_index', { ascending: true }),
                    supabase.from('cms_pages').select('*').in('slug', ['inspirate', 'proyectos']).maybeSingle()
                ]);

                if (projectsRes.error) throw projectsRes.error;
                setProjects(projectsRes.data || []);
                if (cmsRes.data) setCmsData(cmsRes.data);
            } catch (err) {
                console.error('Error fetching inspiration data:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    const toggleHotspot = (projectId, index) => {
        if (activeHotspot.projectId === projectId && activeHotspot.hotspotIndex === index) {
            setActiveHotspot({ projectId: null, hotspotIndex: null });
        } else {
            setActiveHotspot({ projectId, hotspotIndex: index });
        }
    };

    return (
        <div className="bg-[#FDFDFD] min-h-screen pt-8 pb-32 font-outfit" onClick={() => setActiveHotspot({ projectId: null, hotspotIndex: null })}>
            <div className="container mx-auto px-6 max-w-[1400px]">
                <header className="mb-32 text-center relative">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full mb-8">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-black text-primary uppercase tracking-[.5em]">
                            {cmsData?.content?.header_subtitle || 'Boutique Lookbook'}
                        </span>
                    </div>
                    <h1 className="text-6xl lg:text-9xl font-black text-brand-carbon uppercase italic leading-[.85] tracking-tighter drop-shadow-sm mb-10">
                        {cmsData?.content?.header_title || (
                            <>Inspírate <br /> <span className="text-primary/40 italic">Para Tu</span> <span className="text-brand-carbon">Hogar</span></>
                        )}
                    </h1>
                    <p className="max-w-2xl mx-auto text-gray-500 text-sm font-medium uppercase tracking-[.25em] leading-relaxed">
                        Explora ambientes exclusivos y <span className="text-brand-carbon font-black">compra el look</span> directamente desde la escena.
                    </p>
                </header>

                {loading ? (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-gray-400 glass rounded-[3rem]">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-widest italic">Cargando Universos...</p>
                    </div>
                ) : projects.length > 0 ? (
                    <div className="space-y-40 lg:space-y-64">
                        {projects.map((project, i) => (
                            <section
                                key={project.id}
                                className={`flex flex-col lg:flex-row items-center gap-16 lg:gap-24 ${i % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}
                            >
                                {/* Image Area */}
                                <div className="w-full lg:w-[60%] group relative rounded-[3rem] overflow-hidden shadow-luxury transition-all duration-1000 bg-white border border-gray-100 aspect-[4/5] lg:aspect-[16/11]">
                                    <img
                                        src={project.image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop'}
                                        alt={project.name}
                                        className="w-full h-full object-cover grayscale-0 group-hover:scale-105 transition-all duration-1000"
                                    />

                                    {/* Hotspots Overlay */}
                                    <div className="absolute inset-0 z-10 pointer-events-none">
                                        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                        {project.hotspots?.map((hs, idx) => (
                                            <div key={idx} className="pointer-events-auto">
                                                <HotspotMarker
                                                    {...hs}
                                                    product={hs}
                                                    active={activeHotspot.projectId === project.id && activeHotspot.hotspotIndex === idx}
                                                    onClick={() => toggleHotspot(project.id, idx)}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Floating Label on Image */}
                                    <div className="absolute top-8 left-8 z-20">
                                        <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/40 shadow-xl flex items-center gap-3">
                                            <MapPin className="w-4 h-4 text-primary" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-carbon">
                                                {project.location} · {project.year}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Content Area */}
                                <div className="w-full lg:w-[40%] flex flex-col items-start text-left">
                                    <div className="flex items-center gap-4 text-primary font-black uppercase tracking-[.3em] text-[10px] mb-6">
                                        <span className="w-8 h-px bg-primary/30"></span>
                                        {project.category}
                                    </div>

                                    <h2 className="text-4xl lg:text-6xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter mb-10 drop-shadow-sm">
                                        {project.name}
                                    </h2>

                                    {project.description_rich && (
                                        <div
                                            className="prose prose-luxury font-medium text-gray-500 max-w-none prose-p:leading-relaxed prose-strong:text-brand-carbon prose-strong:font-black text-base lg:text-lg tracking-normal mb-12"
                                            dangerouslySetInnerHTML={{ __html: project.description_rich }}
                                        />
                                    )}

                                    {/* Shop the Scene Shelf */}
                                    {project.hotspots?.length > 0 && (
                                        <div className="w-full space-y-6 pt-10 border-t border-gray-100">
                                            <h3 className="text-[10px] font-black uppercase tracking-[.4em] text-brand-carbon flex items-center gap-3">
                                                <ShoppingCart className="w-4 h-4 text-primary" /> Productos de la Imagen
                                            </h3>
                                            <div className="flex flex-wrap gap-4">
                                                {project.hotspots.map((hs, idx) => (
                                                    <Link
                                                        key={idx}
                                                        to={`/product/${hs.product_id}`}
                                                        className="group/item flex items-center gap-4 p-3 bg-white hover:bg-gray-50 rounded-2xl border border-gray-100 transition-all duration-300 shadow-sm hover:shadow-md max-w-full lg:max-w-none overflow-hidden"
                                                    >
                                                        <div className="w-14 h-14 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100 p-2">
                                                            <img src={hs.product_image} alt="" className="w-full h-full object-contain group-hover/item:scale-110 transition-transform" />
                                                        </div>
                                                        <div className="min-w-0 pr-4">
                                                            <p className="text-[9px] font-black text-brand-carbon uppercase truncate tracking-widest">{hs.product_name}</p>
                                                            <p className="text-xs font-black text-primary mt-1">{hs.product_price}€</p>
                                                        </div>
                                                        <ArrowUpRight className="w-4 h-4 text-gray-200 group-hover/item:text-primary group-hover/item:translate-x-0.5 group-hover/item:-translate-y-0.5 transition-all" />
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="py-32 text-center glass rounded-[3rem] border border-gray-100">
                        <Sparkles className="w-12 h-12 mx-auto mb-6 text-primary/30" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[.5em] italic">Cultivando nuevas fuentes<br />de inspiración...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
