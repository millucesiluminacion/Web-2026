import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function TopBanner() {
    return (
        <div className="bg-primary hover:bg-primary-light transition-colors text-white py-2 hidden md:block border-b border-white/10">
            <div className="container mx-auto px-6 max-w-[1400px]">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[.2em] italic">
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse"></div>
                            Envío Gratuito en pedidos de +100€
                        </span>
                        <span className="opacity-30">|</span>
                        <span>Asesoramiento Experto</span>
                        <span className="opacity-30">|</span>
                        <span>2 Años de Garantía</span>
                    </div>
                    <div className="hidden xl:flex items-center gap-6">
                        <Link to="/register-pro" className="hover:text-secondary-light transition-colors group flex items-center gap-2">
                            Área Profesional <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
