import { ArrowRight, Star, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function TopBanner({ onOpenAuthModal }) {
    const { userTier, user, profile, isPartner } = useAuth();

    // Style and content based on role
    const bannerConfig = userTier === 'vip' ? {
        // VIP (Socio)
        bgClass: 'bg-brand-carbon border-b border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]',
        textColor: 'text-yellow-400',
        accentColor: 'text-yellow-400',
        messages: [
            { icon: <Star className="w-3.5 h-3.5 animate-pulse" />, text: "ESTATUS VIP MIL LUCES" },
            { icon: <Zap className="w-3.5 h-3.5" />, text: "Tarifa Socio Activada" },
            { icon: <ShieldCheck className="w-3.5 h-3.5" />, text: "Gestor Prioritario" }
        ],
        cta: `Bienvenido, VIP - ${profile?.full_name?.split(' ')[0] || 'Socio'}`
    } : userTier === 'pro' ? {
        // Logged-in (Pro) - Dark Navy (between blue and black)
        bgClass: 'bg-[#0f172a] border-b border-primary/20 shadow-lg',
        textColor: 'text-primary-light',
        accentColor: 'text-primary-light/80',
        messages: [
            { icon: <Zap className="w-3.5 h-3.5" />, text: "PERFIL PROFESIONAL ACTIVO" },
            { icon: <ShieldCheck className="w-3.5 h-3.5" />, text: "Precios con Descuento B2B" },
            { icon: <Zap className="w-3.5 h-3.5" />, text: "Soporte Técnico Prioritario" }
        ],
        cta: `Panel Pro - ${profile?.full_name?.split(' ')[0] || 'Profesional'}`
    } : user ? {
        // Logged-in (Standard) - BLUE
        bgClass: 'bg-primary border-b border-white/10 shadow-lg',
        textColor: 'text-white',
        accentColor: 'text-white/80',
        messages: [
            { icon: <Star className="w-3.5 h-3.5" />, text: "BOUTIQUE EXPERIENCE" },
            { icon: <Zap className="w-3.5 h-3.5" />, text: "Envío Prioritario" },
            { icon: <ShieldCheck className="w-3.5 h-3.5" />, text: "Garantía Extendida" }
        ],
        cta: `Bienvenido, ${profile?.full_name?.split(' ')[0] || 'Cliente'}`
    } : {
        // Default (Anonymous) - BLUE
        bgClass: 'bg-primary border-b border-white/10 transition-colors',
        textColor: 'text-white/90',
        accentColor: 'text-white/60',
        messages: [
            { text: "Tu Tienda online de Iluminación lineal" },
            { text: "Tu espacio Luminotécnico" },
            { text: "Envíos en 24/48h" }
        ],
        cta: "Acceso Profesionales"
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
                                    <Zap className={`w-3 h-3 ${userTier === 'vip' ? 'animate-pulse' : ''}`} />
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
