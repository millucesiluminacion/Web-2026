import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function WhatsAppFloatingButton() {
    const location = useLocation();

    // No mostrar en panel de administración para no estorbar
    if (location.pathname.startsWith('/admin')) {
        return null;
    }

    const handleClick = () => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'whatsapp_click', {
                event_category: 'Contact',
                event_label: 'Floating Button',
                page_location: window.location.href,
            });
        }
    };

    const baseMessage = encodeURIComponent(
        `Hola Mil Luces, os contacto desde la web (${location.pathname}) para hacer una consulta sobre iluminación / pedidos.`
    );
    const whatsappUrl = `https://wa.me/34689935436?text=${baseMessage}`;

    return (
        <aside
            aria-label="Contacto directo por WhatsApp"
            className="fixed bottom-6 right-6 z-40 flex items-center group pointer-events-auto"
        >
            {/* Tooltip elegante al pasar el cursor */}
            <span className="hidden md:inline-flex items-center mr-3 px-3 py-1.5 rounded-full bg-brand-carbon text-white text-[10px] font-bold uppercase tracking-wider shadow-lg opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none border border-white/10">
                ¿Dudas? Escríbenos por WhatsApp
            </span>

            {/* Botón Flotante */}
            <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClick}
                aria-label="Contactar por WhatsApp con Mil Luces Iluminación"
                className="w-13 h-13 p-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 flex items-center justify-center hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-400/30 relative"
            >
                {/* Punto indicador de actividad / online */}
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-300 border-2 border-white rounded-full animate-pulse"></span>
                <MessageCircle className="w-6 h-6 fill-current stroke-none" />
            </a>
        </aside>
    );
}
