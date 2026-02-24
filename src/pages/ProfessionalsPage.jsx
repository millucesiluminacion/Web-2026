import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Building2, Percent, Headphones, Truck, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const ICON_MAP = {
    Percent: <Percent className="w-6 h-6" />,
    Building2: <Building2 className="w-6 h-6" />,
    Zap: <Zap className="w-6 h-6" />,
    Truck: <Truck className="w-6 h-6" />,
    ShieldCheck: <ShieldCheck className="w-6 h-6" />,
    Headphones: <Headphones className="w-6 h-6" />,
};

const DEFAULT_BENEFITS = [
    { icon_name: 'Percent', title: "Tarifas Exclusivas B2B", description: "Accede a descuentos directos por volumen y precios especiales." },
    { icon_name: 'Building2', title: "Facturación VIES", description: "Gestión automática de impuestos intracomunitarios." },
    { icon_name: 'Zap', title: "Proyectos a Medida", description: "Asesoramiento técnico lumínico y cálculos Dialux." }
];

export default function ProfessionalsPage() {
    const [benefits, setBenefits] = useState([]);
    const [content, setContent] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProData() {
            try {
                const [benefitsRes, contentRes] = await Promise.all([
                    supabase.from('pro_benefits').select('*').eq('is_active', true).order('order_index', { ascending: true }),
                    supabase.from('pro_content').select('*')
                ]);

                if (benefitsRes.data && benefitsRes.data.length > 0) {
                    setBenefits(benefitsRes.data);
                } else {
                    setBenefits(DEFAULT_BENEFITS);
                }

                if (contentRes.data) {
                    const contentMap = {};
                    contentRes.data.forEach(item => {
                        contentMap[item.key] = item.value;
                    });
                    setContent(contentMap);
                }
            } catch (err) {
                console.error("Error loading Pro data:", err);
                setBenefits(DEFAULT_BENEFITS);
            } finally {
                setLoading(false);
            }
        }
        loadProData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFDFD]">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-outfit">Sincronizando Boutique Pro...</p>
            </div>
        );
    }

    return (
        <div className="bg-[#FDFDFD] min-h-screen py-20 font-outfit">
            <div className="container mx-auto px-6 max-w-[1200px]">
                {/* Hero Section */}
                <header className="mb-24 text-center">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.5em] mb-6 block animate-in fade-in slide-in-from-bottom-2 duration-700">
                        {content.subtitle || 'Service for Architects & Contractors'}
                    </span>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-brand-carbon uppercase italic leading-[0.85] tracking-tighter mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        {content.title ? content.title.split('\n').map((t, i) => (
                            <span key={i}>{i > 0 && <br />}{t}</span>
                        )) : (
                            <>La Alianza <br /><span className="text-primary italic">Perfecta</span> para <br /><span className="text-gray-300">Tus Proyectos</span></>
                        )}
                    </h1>
                    <p className="max-w-xl mx-auto text-gray-400 font-bold uppercase tracking-widest text-xs leading-relaxed mb-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        {content.description || 'Impulsamos tu negocio con tecnología lumínica de vanguardia, precios directos de fábrica y un soporte técnico que habla tu mismo idioma.'}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <Link
                            to="/register-pro"
                            className="w-full sm:w-auto px-12 py-6 bg-brand-carbon text-white rounded-2xl font-black uppercase italic text-xs hover:bg-primary transition-all shadow-2xl shadow-brand-carbon/30 group"
                        >
                            Alta Gratuita Profesional <ArrowRight className="inline-block ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <a
                            href="mailto:pro@milluces.com"
                            className="w-full sm:w-auto px-12 py-6 border-2 border-brand-carbon/10 text-brand-carbon rounded-2xl font-black uppercase italic text-xs hover:bg-gray-50 transition-all font-black"
                        >
                            Contactar con Asesor
                        </a>
                    </div>
                </header>

                {/* Benefits Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-32">
                    {benefits.map((benefit, index) => (
                        <div
                            key={index}
                            className="group p-10 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-luxury hover:border-primary/20 transition-all duration-500"
                        >
                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform duration-500 overflow-hidden">
                                {benefit.image_url ? (
                                    <img src={benefit.image_url} alt={benefit.title} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl">{ICON_MAP[benefit.icon_name] || <span>✦</span>}</span>
                                )}
                            </div>
                            <h3 className="text-lg font-black text-brand-carbon uppercase italic leading-tight mb-4 group-hover:text-primary transition-colors">
                                {benefit.title}
                            </h3>
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wide leading-relaxed">
                                {benefit.description}
                            </p>
                        </div>
                    ))}
                </section>

                {/* Call to Action Section */}
                <section className="relative overflow-hidden bg-brand-carbon rounded-[4rem] p-12 md:p-24 text-center">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full filter blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary rounded-full filter blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
                    </div>

                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-8 leading-none">
                            {(content.cta_title || 'Únete al ProClub\nde Mil Luces').split('\n').map((t, i) => (
                                <span key={i}>{i > 0 && <br />}{t}</span>
                            ))}
                        </h2>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-12">
                            {['Sin cuotas mensuales', 'Acceso a stock real', 'Descarga de fichas t\u00e9cnicas', 'Facturaci\u00f3n consolidada'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-[10px] font-black text-white/70 uppercase tracking-widest">
                                    <CheckCircle2 className="w-4 h-4 text-primary" /> {item}
                                </li>
                            ))}
                        </ul>
                        <Link
                            to="/register-pro"
                            className="inline-flex items-center gap-4 px-12 py-6 bg-primary text-white rounded-2xl font-black uppercase italic text-xs hover:shadow-[0_0_30px_rgba(255,184,0,0.3)] transition-all"
                        >
                            Crear Cuenta de Empresa <div className="w-8 h-[1px] bg-white/40"></div>
                        </Link>
                    </div>
                </section>
            </div>
        </div>
    );
}
