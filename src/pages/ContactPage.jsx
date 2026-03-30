import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle2, MessageSquare, Clock, Globe, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import SEOManager from '../components/common/SEOManager';

export default function ContactPage() {
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [cmsContent, setCmsContent] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    useEffect(() => {
        const fetchCmsContent = async () => {
            const { data } = await supabase
                .from('cms_pages')
                .select('*')
                .eq('slug', 'contacto')
                .maybeSingle();
            if (data) setCmsContent(data);
        };
        fetchCmsContent();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simular envío o guardar en una tabla de 'messages' si existiera
        // Por ahora, solo simulamos éxito
        setTimeout(() => {
            setLoading(false);
            setSubmitted(true);
            setFormData({ name: '', email: '', subject: '', message: '' });
        }, 1500);
    };

    return (
        <div className="bg-[#FDFDFD] min-h-screen pt-8 pb-12 font-outfit">
            <SEOManager
                title={cmsContent?.meta_title || "Contacto | Mil Luces Boutique"}
                description={cmsContent?.meta_description || "Contacta con los expertos en iluminación de Mil Luces Boutique."}
            />

            <div className="container mx-auto px-6 max-w-[1400px]">
                {/* Simplified Header */}
                <header className="mb-16 text-center relative group">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.45em] mb-4 block animate-slide-right">
                        {cmsContent?.content?.header_subtitle || 'Concierge & Client Relations'}
                    </span>
                    <h1 className="text-4xl md:text-7xl font-black text-brand-carbon uppercase italic leading-[0.85] tracking-tighter mb-8 animate-reveal-up drop-shadow-sm">
                        {cmsContent?.content?.header_title || (
                            <>Contacto <span className="text-primary/40">Exclusivo</span></>
                        )}
                    </h1>
                    <p className="text-gray-500 text-lg font-medium leading-relaxed max-w-2xl mx-auto font-outfit animate-fade-in delay-300">
                        {cmsContent?.meta_description || 'Estamos aquí para iluminar tus proyectos. Nuestro equipo de expertos te brindará asesoramiento técnico y estético de alta gama.'}
                    </p>
                    <div className="w-20 h-1 bg-primary/20 mx-auto mt-10 rounded-full"></div>
                </header>
            </div>

            <section className="py-24 md:py-32">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                        {/* Info Column */}
                        <div className="lg:col-span-5 space-y-12">
                            <div className="space-y-8">
                                <div className="group">
                                    <div className="flex items-start gap-6">
                                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-brand-carbon group-hover:bg-primary group-hover:text-white transition-all duration-500 border border-gray-100 group-hover:border-primary shadow-sm group-hover:shadow-xl group-hover:shadow-primary/20">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">Sede Central & Showroom</h4>
                                            <p className="text-lg font-black text-brand-carbon uppercase italic leading-tight font-outfit">
                                                {cmsContent?.content?.address || (
                                                    <>{'Calle de la Luz, 12, Planta Noble'}<br />{'28001 Madrid, España'}</>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="group">
                                    <div className="flex items-start gap-6">
                                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-brand-carbon group-hover:bg-primary group-hover:text-white transition-all duration-500 border border-gray-100 group-hover:border-primary shadow-sm group-hover:shadow-xl group-hover:shadow-primary/20">
                                            <Mail className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">Gestión de Proyectos</h4>
                                            <p className="text-lg font-black text-brand-carbon uppercase italic leading-tight font-outfit">
                                                {cmsContent?.content?.email || 'boutique@milluces.com'}
                                            </p>
                                            <p className="text-[10px] text-primary font-bold uppercase mt-1 tracking-widest">Respuesta en menos de 2h (L-V)</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="group">
                                    <div className="flex items-start gap-6">
                                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-brand-carbon group-hover:bg-primary group-hover:text-white transition-all duration-500 border border-gray-100 group-hover:border-primary shadow-sm group-hover:shadow-xl group-hover:shadow-primary/20">
                                            <Phone className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">Línea Directa Boutique</h4>
                                            <p className="text-lg font-black text-brand-carbon uppercase italic leading-tight font-outfit">
                                                {cmsContent?.content?.phone || '+34 900 123 456'}
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest leading-none">Lunes a Viernes: 10:00 - 19:00</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional CMS Content if exists */}
                            {cmsContent && (
                                <div
                                    className="prose prose-sm prose-gray font-outfit pt-8 border-t border-gray-50"
                                    dangerouslySetInnerHTML={{ __html: cmsContent.content.body }}
                                />
                            )}

                            {/* Social Accents */}
                            <div className="pt-8 flex items-center gap-6">
                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Sigue la Iluminación:</span>
                                <div className="flex gap-4">
                                    {['instagram', 'linkedin', 'pinterest'].map(social => (
                                        <div key={social} className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary transition-all cursor-pointer">
                                            <Globe className="w-3.5 h-3.5" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Form Column */}
                        <div className="lg:col-span-1 border-l border-gray-50 hidden lg:block"></div>

                        <div className="lg:col-span-6">
                            <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-gray-100 shadow-luxury relative overflow-hidden">
                                {submitted ? (
                                    <div className="py-20 text-center animate-in zoom-in-95 duration-500">
                                        <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center text-emerald-500 mx-auto mb-8 border border-emerald-100">
                                            <CheckCircle2 className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter mb-4 font-outfit">Mensaje Enviado</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-10 leading-loose mx-auto max-w-xs">
                                            Tu solicitud ha entrado en nuestra secuencia de prioridad. Un asesor boutique contactará contigo en breve.
                                        </p>
                                        <button
                                            onClick={() => setSubmitted(false)}
                                            className="h-14 px-10 bg-brand-carbon text-white rounded-2xl font-black uppercase italic text-[11px] tracking-widest hover:bg-primary transition-all shadow-xl shadow-brand-carbon/10 font-outfit"
                                        >
                                            Enviar otro mensaje
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-10">
                                            <h3 className="text-2xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter mb-2 font-outfit">Canal de Consulta Express</h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Completa el formulario y activa la respuesta inmediata</p>
                                        </div>

                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Etimología / Nombre</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={formData.name}
                                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                        className="w-full h-14 bg-gray-50 border-none rounded-2xl px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all font-outfit"
                                                        placeholder="Juan Pérez"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email de Contacto</label>
                                                    <input
                                                        type="email"
                                                        required
                                                        value={formData.email}
                                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                        className="w-full h-14 bg-gray-50 border-none rounded-2xl px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all font-outfit"
                                                        placeholder="juan@ejemplo.com"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Motivo de la Consulta</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.subject}
                                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                                    className="w-full h-14 bg-gray-50 border-none rounded-2xl px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all font-outfit"
                                                    placeholder="Ej: Presupuesto para Proyecto Hotelero"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Explica tu Visión</label>
                                                <textarea
                                                    required
                                                    rows="6"
                                                    value={formData.message}
                                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                                    className="w-full bg-gray-50 border-none rounded-[2rem] p-6 text-sm font-medium text-gray-600 focus:ring-4 focus:ring-primary/10 transition-all resize-none leading-relaxed font-outfit"
                                                    placeholder="Cuéntanos más sobre tus necesidades de iluminación..."
                                                />
                                            </div>

                                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                <input type="checkbox" required className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                                                <p className="text-[9px] text-gray-400 font-bold uppercase leading-tight tracking-wider">
                                                    He leído y acepto la <a href="/politica-privacidad" className="text-primary hover:underline">Política de Privacidad</a> y el aviso legal.
                                                </p>
                                            </div>

                                            <button
                                                disabled={loading}
                                                type="submit"
                                                className="w-full h-16 bg-brand-carbon text-white rounded-[2.5rem] font-black uppercase italic tracking-widest hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-4 shadow-xl shadow-brand-carbon/30 group relative overflow-hidden font-outfit"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                {loading ? (
                                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                                ) : (
                                                    <Send className="w-5 h-5 text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                                )}
                                                <span className="text-lg">{loading ? 'Transmitiendo...' : 'Activar Contacto Maestro'}</span>
                                            </button>
                                        </form>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
