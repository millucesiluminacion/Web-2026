import { Link } from 'react-router-dom';
import { Youtube, Instagram, Linkedin, Facebook } from 'lucide-react';

export function FooterBottom() {
    return (
        <section className="mx-auto text-center py-6 border-t border-neutral-800" style={{ maxWidth: '1440px', width: 'calc(100% - 60px)' }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-y-8 md:gap-12 lg:gap-20 mb-8 xl:justify-between">
                <div className="flex flex-wrap justify-center gap-6 md:justify-between items-center w-full xl:w-auto">
                    <Link to="/" className="inline-block" title="Mil Luces Logo">
                        <img
                            src="/Logo-MilLuces.png"
                            alt="Mil Luces"
                            className="h-[25px] md:h-[30px]"
                            loading="lazy"
                        />
                    </Link>
                    <ul className="flex gap-4">
                        {[
                            { name: 'Youtube', href: '#', icon: Youtube },
                            { name: 'Instagram', href: '#', icon: Instagram },
                            { name: 'Linkedin', href: '#', icon: Linkedin },
                            { name: 'Facebook', href: '#', icon: Facebook },
                        ].map((social) => (
                            <li key={social.name} className="bg-gray-efl-100 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-efl-200 transition-all duration-500">
                                <a href={social.href} target="_blank" title={social.name} className="flex">
                                    <social.icon className="w-5 h-5 text-gray-700" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

            </div>

            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2 mb-2 xl:mb-0 justify-center">
                    {[
                        { label: 'Condiciones generales', slug: 'condiciones-generales' },
                        { label: 'Política de Privacidad', slug: 'politica-privacidad' },
                        { label: 'Política de Cookies', slug: 'politica-cookies' },
                        { label: 'Preferencias de cookies', action: () => window.dispatchEvent(new CustomEvent('open-cookie-settings')) },
                        { label: 'Servicio Postventa', slug: 'contacto' },
                        { label: 'Aviso Legal', slug: 'aviso-legal' }
                    ].map((item) => (
                        item.action ? (
                            <button
                                key={item.label}
                                onClick={item.action}
                                className="px-3 border-r border-gray-600 text-xs text-gray-500 hover:text-white last:border-r-0"
                            >
                                {item.label}
                            </button>
                        ) : (
                            <Link
                                key={item.label}
                                to={`/${item.slug}`}
                                className="px-3 border-r border-gray-600 text-xs text-gray-500 hover:text-white last:border-r-0"
                            >
                                {item.label}
                            </Link>
                        )
                    ))}
                </div>
                <div className="text-xs text-gray-600">
                    © {new Date().getFullYear()} All rights reserved | Mil Luces Iluminación | IntegralPlas24 S.L.
                </div>
            </div>
        </section>
    );
}
