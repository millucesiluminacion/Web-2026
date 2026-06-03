import { useState, useEffect } from 'react';
import { Shield, X, ChevronRight, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [showConfig, setShowConfig] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent-v1');
        if (!consent) {
            // Delay appearance for better UX
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAcceptAll = () => {
        localStorage.setItem('cookie-consent-v1', JSON.stringify({
            essential: true,
            analytics: true,
            marketing: true,
            date: new Date().toISOString()
        }));
        setIsVisible(false);
    };

    const handleRejectAll = () => {
        localStorage.setItem('cookie-consent-v1', JSON.stringify({
            essential: true,
            analytics: false,
            marketing: false,
            date: new Date().toISOString()
        }));
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-10 md:w-[450px] z-[9999] animate-in slide-in-from-bottom-10 duration-700">
            <div className="bg-brand-carbon text-white rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden relative group">
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40"></div>

                <div className="p-8 md:p-10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 text-primary shadow-inner">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest italic leading-none text-gray-500">Tu Privacidad, <span className="text-primary">Nuestra Prioridad</span></h3>
                            <p className="text-[8px] font-bold uppercase tracking-[.3em] text-white/30 mt-2">Seguridad & Transparencia Boutique</p>
                        </div>
                    </div>

                    {!showConfig ? (
                        <>
                            <p className="text-[11px] leading-loose text-white/60 font-medium mb-8">
                                Utilizamos cookies propias y de terceros para asegurar la mejor experiencia en nuestra boutique digital, analizar el tráfico y personalizar contenido. Cumplimos estrictamente con la normativa europea <span className="text-white font-bold">RGPD</span>.
                            </p>

                            <div className="space-y-3 mb-6">
                                <button
                                    onClick={handleAcceptAll}
                                    className="w-full h-14 bg-primary text-brand-carbon rounded-2xl font-black uppercase italic text-[11px] tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
                                >
                                    Aceptar Selección Maestra
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleRejectAll}
                                        className="h-12 bg-white/5 text-white/60 rounded-xl font-bold uppercase text-[9px] tracking-widest hover:bg-white/10 transition-all border border-white/5"
                                    >
                                        Solo Esenciales
                                    </button>
                                    <button
                                        onClick={() => setShowConfig(true)}
                                        className="h-12 bg-white/5 text-white/60 rounded-xl font-bold uppercase text-[9px] tracking-widest hover:bg-white/10 transition-all border border-white/5 flex items-center justify-center gap-2"
                                    >
                                        <Settings className="w-3 h-3" /> Configurar
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6 mb-8 animate-in fade-in duration-300">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Cookies Técnicas</p>
                                        <p className="text-[8px] text-white/40 font-bold uppercase">Necesarias para el funcionamiento</p>
                                    </div>
                                    <div className="w-10 h-6 bg-primary/20 rounded-full relative">
                                        <div className="absolute top-1 left-5 w-4 h-4 rounded-full bg-primary"></div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/80 mb-1">Analíticas</p>
                                        <p className="text-[8px] text-white/40 font-bold uppercase">Medición de rendimiento</p>
                                    </div>
                                    <div className="w-10 h-6 bg-white/10 rounded-full relative cursor-pointer group/toggle">
                                        <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white/40 group-hover/toggle:bg-white transition-all"></div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/80 mb-1">Marketing</p>
                                        <p className="text-[8px] text-white/40 font-bold uppercase">Publicidad personalizada</p>
                                    </div>
                                    <div className="w-10 h-6 bg-white/10 rounded-full relative cursor-pointer group/toggle">
                                        <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white/40 group-hover/toggle:bg-white transition-all"></div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleAcceptAll}
                                className="w-full h-12 bg-white text-brand-carbon rounded-xl font-black uppercase italic text-[10px] tracking-widest hover:bg-primary transition-all"
                            >
                                Guardar Configuración
                            </button>
                            <button
                                onClick={() => setShowConfig(false)}
                                className="w-full text-[8px] font-black uppercase tracking-[.3em] text-white/20 hover:text-white/40 transition-colors"
                            >
                                ← Volver a la vista general
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/5">
                        <Link to="/politica-cookies" className="text-[8px] font-bold uppercase tracking-widest text-white/20 hover:text-primary transition-colors">Política de Cookies</Link>
                        <div className="w-1 h-1 rounded-full bg-white/5"></div>
                        <Link to="/aviso-legal" className="text-[8px] font-bold uppercase tracking-widest text-white/20 hover:text-primary transition-colors">Aviso Legal</Link>
                    </div>
                </div>

                {/* Close Button - Discrete */}
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-4 right-4 p-2 text-white/10 hover:text-white/40 transition-colors rounded-full"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
