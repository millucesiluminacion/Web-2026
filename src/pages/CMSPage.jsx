import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import SEOManager from '../components/common/SEOManager';

export default function CMSPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPage = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('cms_pages')
                    .select('*')
                    .eq('slug', slug)
                    .eq('is_active', true)
                    .maybeSingle();

                if (error) throw error;
                if (!data) {
                    setError('Página no encontrada');
                    return;
                }

                setPage(data);
            } catch (err) {
                console.error('Error fetching CMS page:', err);
                setError('Error al cargar el contenido');
            } finally {
                setLoading(false);
            }
        };

        fetchPage();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-12">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
                <p className="text-[10px] font-black uppercase tracking-[.4em] text-gray-400 font-outfit">Sincronizando Contenido Digital...</p>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-red-50 rounded-[2.5rem] flex items-center justify-center text-red-500 mb-8 border border-red-100">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter mb-4 font-outfit">
                    {error || 'Secuencia Interrumpida'}
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-10 leading-loose">
                    La página que buscas no está disponible en nuestra base de datos actual o ha sido desactivada.
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="h-14 px-10 bg-brand-carbon text-white rounded-2xl font-black uppercase italic text-[11px] tracking-widest hover:bg-primary transition-all flex items-center gap-3 shadow-xl shadow-brand-carbon/10 font-outfit"
                >
                    <ChevronLeft className="w-4 h-4" /> Volver al Inicio
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen font-outfit">
            <SEOManager
                title={page.meta_title || page.title}
                description={page.meta_description}
            />

            {/* Premium Boutique Header */}
            <header className="relative pt-24 pb-32 md:pt-32 md:pb-40 bg-brand-carbon overflow-hidden">
                {/* 1. Backdrop Layers */}
                <div className="absolute inset-0">
                    {/* Spotlight effect */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(234,179,8,0.15),transparent_50%)] animate-pulse-slow"></div>

                    {/* Noise/Texture filter overlay (SVG-based for premium feel) */}
                    <div className="absolute inset-0 opacity-[0.03] contrast-150 brightness-100 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                    {/* Architectural Grid */}
                    <div className="absolute inset-0 opacity-[0.07]">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                        <div className="grid grid-cols-12 h-full w-full">
                            {Array(12).fill(0).map((_, i) => (
                                <div key={i} className="border-r border-white/5 h-full w-full"></div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. Floating Outline Text (Background Depth) */}
                <div className="absolute right-[-5%] top-1/2 -translate-y-1/2 select-none pointer-events-none opacity-[0.04] hidden lg:block">
                    <span className="text-[18rem] font-black uppercase italic leading-none text-white tracking-tighter" style={{ WebkitTextStroke: '1px rgba(255,255,255,1)', color: 'transparent' }}>
                        {page.title.split(' ')[0]}
                    </span>
                </div>

                {/* 3. Foreground Content */}
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-4xl">
                        {/* Glass Breadcrumbs */}
                        <nav className="flex items-center gap-3 mb-8 animate-fade-in">
                            <button onClick={() => navigate('/')} className="px-3 py-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-[9px] font-black text-white/40 uppercase tracking-widest hover:text-primary hover:border-primary/30 transition-all">Inicio</button>
                            <ChevronRight className="w-3 h-3 text-white/10" />
                            <span className="px-3 py-1.5 bg-primary/10 backdrop-blur-md border border-primary/20 rounded-full text-[9px] font-black text-primary uppercase tracking-widest">Información</span>
                        </nav>

                        <div className="flex items-start gap-8">
                            {/* Vertical Signature Line */}
                            <div className="w-1.5 self-stretch bg-gradient-to-b from-primary via-primary to-transparent hidden md:block rounded-full shadow-[0_0_20px_rgba(234,179,8,0.4)]"></div>

                            <div className="flex-1">
                                <span className="text-[10px] font-black text-primary uppercase tracking-[.5em] mb-4 block italic opacity-80 animate-slide-right">
                                    Boutique Information System
                                </span>
                                <h1 className="text-4xl md:text-7xl font-black text-white uppercase italic leading-[0.85] tracking-tighter mb-8 animate-reveal-up drop-shadow-2xl">
                                    {page.title}
                                </h1>
                                <div className="flex items-center gap-4 text-white/30 font-bold text-[9px] uppercase tracking-[.2em] fade-in delay-500">
                                    <span className="w-8 h-px bg-white/10"></span>
                                    Última sincronización: {new Date(page.updated_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* 4. Overlapping Content Card */}
            <main className="container mx-auto px-6 relative z-20">
                <div className="-mt-16 md:-mt-24 bg-white rounded-[3.5rem] p-12 md:p-20 shadow-2xl shadow-brand-carbon/20 border border-gray-100 animate-slide-up">
                    <div className="max-w-3xl mx-auto">
                        <div
                            className="cms-content prose prose-lg prose-gray max-w-none text-brand-carbon"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content.body) }}
                        />
                    </div>
                </div>
            </main>

            <style dangerouslySetInnerHTML={{
                __html: `
                .cms-content h2 { 
                    font-size: 2rem; 
                    font-weight: 900; 
                    text-transform: uppercase; 
                    font-style: italic; 
                    letter-spacing: -0.05em;
                    margin-top: 3rem;
                    margin-bottom: 1.5rem;
                    line-height: 1;
                }
                .cms-content h3 { 
                    font-size: 1.5rem; 
                    font-weight: 900; 
                    text-transform: uppercase; 
                    margin-top: 2.5rem;
                    margin-bottom: 1rem;
                    letter-spacing: -0.025em;
                }
                .cms-content p { 
                    font-size: 1.125rem; 
                    line-height: 1.8; 
                    color: #4b5563; 
                    margin-bottom: 1.5rem;
                }
                .cms-content ul { 
                    list-style: none; 
                    padding: 0; 
                    margin-bottom: 2rem;
                }
                .cms-content li { 
                    position: relative;
                    padding-left: 1.5rem;
                    margin-bottom: 1rem;
                    font-weight: 500;
                    color: #4b5563;
                }
                .cms-content li::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0.75rem;
                    width: 0.5rem;
                    height: 2px;
                    background-color: #EAB308;
                }
                .cms-content a {
                    color: #EAB308;
                    text-decoration: none;
                    font-weight: 700;
                    border-bottom: 2px solid rgba(234, 179, 8, 0.1);
                    transition: all 0.3s;
                }
                .cms-content a:hover {
                    border-color: #EAB308;
                    background-color: rgba(234, 179, 8, 0.05);
                }
            `}} />
        </div>
    );
}
