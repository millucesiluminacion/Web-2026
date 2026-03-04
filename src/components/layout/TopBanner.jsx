import { ArrowRight, Star, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function TopBanner({ onOpenAuthModal }) {
    const { isPro, isPartner, user, profile } = useAuth();

    // Style and content based on role
    const bannerConfig = isPartner ? {
        bgClass: 'bg-brand-carbon border-b border-white/5',
        textColor: 'text-yellow-400',
        accentColor: 'text-yellow-400/80',
        messages: [
            { icon: <Star className="w-3.5 h-3.5" />, text: "Estatus Socio VIP" },
            { icon: <Zap className="w-3.5 h-3.5" />, text: "Tarifa Socio Mil Luces Activada" },
            { icon: <ShieldCheck className="w-3.5 h-3.5" />, text: "Gestor de Cuenta Prioritario" }
        ],
        cta: `Bienvenido, ${profile?.full_name?.split(' ')[0] || 'Socio'}`
    } : isPro ? {
        bgClass: 'bg-slate-900 border-b border-white/5',
        textColor: 'text-blue-400',
        accentColor: 'text-blue-400/80',
        messages: [
            { icon: <Zap className="w-3.5 h-3.5" />, text: "Sesión Profesional Activa" },
            { icon: <ShieldCheck className="w-3.5 h-3.5" />, text: "Precios B2B Aplicados" },
            { icon: <Zap className="w-3.5 h-3.5" />, text: "Soporte Técnico Directo" }
        ],
        cta: profile?.company_name || 'Área Profesional'
    } : {
        bgClass: 'bg-primary hover:bg-primary-light transition-colors',
        textColor: 'text-white/90',
        accentColor: 'text-white/60',
        messages: [
            { text: "Envío Gratuito en pedidos de +100€" },
            { text: "Asesoramiento Experto" },
            { text: "2 Años de Garantía" }
        ],
        cta: "Área Profesional"
    };

    return (
        <div className={`${bannerConfig.bgClass} transition-all duration-500 text-white py-2 hidden md:block`}>
            <div className="container mx-auto px-6 max-w-[1400px]">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[.2em] italic">
                    <div className="flex items-center gap-8">
                        {bannerConfig.messages.map((msg, idx) => (
                            <div key={idx} className="flex items-center gap-8">
                                <span className={`flex items-center gap-2.5 ${bannerConfig.textColor}`}>
                                    <span className={bannerConfig.accentColor}>{msg.icon}</span>
                                    <span className="text-white normal-case font-bold">{msg.text}</span>
                                </span>
                                {idx < bannerConfig.messages.length - 1 && <span className="opacity-10 text-white font-thin">|</span>}
                            </div>
                        ))}
                    </div>
                    <div className="hidden xl:flex items-center gap-6">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <div className="h-4 w-[1px] bg-white/10"></div>
                                <span className={`flex items-center gap-2.5 ${bannerConfig.textColor}`}>
                                    <Zap className={`w-3 h-3 ${isPartner ? 'animate-pulse' : ''}`} />
                                    <span className="text-white normal-case font-black tracking-wider">{bannerConfig.cta}</span>
                                </span>
                            </div>
                        ) : (
                            <button
                                onClick={() => onOpenAuthModal('register', 'profesional')}
                                className="hover:text-secondary-light transition-colors group flex items-center gap-2"
                            >
                                {bannerConfig.cta} <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
