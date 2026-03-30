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
        <div className="bg-[#FDFDFD] min-h-screen pt-8 pb-12 font-outfit">
            <SEOManager
                title={page.meta_title || page.title}
                description={page.meta_description}
            />

            <div className="container mx-auto px-6 max-w-4xl">
                {/* Simplified Header */}
                <header className="mb-12 text-center relative group">

                    <span className="text-[10px] font-black text-primary uppercase tracking-[.45em] mb-4 block animate-slide-right">
                        Mil Luces Boutique Experience
                    </span>
                    <h1 className="text-4xl md:text-7xl font-black text-brand-carbon uppercase italic leading-[0.85] tracking-tighter mb-8 animate-reveal-up drop-shadow-sm">
                        {page.title}
                    </h1>
                    <div className="w-20 h-1 bg-primary/20 mx-auto mt-8 rounded-full"></div>
                </header>

                <main className="relative z-10 animate-slide-up">
                    <div className="bg-white rounded-[2.5rem] p-10 md:p-16 shadow-luxury border border-gray-100/50">
                        <div
                            className="cms-content prose prose-lg prose-gray max-w-none text-brand-carbon"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content.body) }}
                        />
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-4 text-gray-300 font-bold text-[9px] uppercase tracking-[.3em] opacity-40">
                        <span className="w-8 h-px bg-gray-200"></span>
                        Última sincronización: {new Date(page.updated_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                        <span className="w-8 h-px bg-gray-200"></span>
                    </div>
                </main>
            </div>

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
