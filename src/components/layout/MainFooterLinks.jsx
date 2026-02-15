import { MapPin, Phone, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export function MainFooterLinks() {
    return (
        <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Contact Info */}
            <div>
                <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest border-b border-blue-600 inline-block pb-1">Mil Luces Iluminación</h4>
                <p className="mb-4 text-xs leading-relaxed">
                    Líderes en distribución de iluminación LED profesional y doméstica. Calidad certificada y los mejores precios del mercado.
                </p>
                <ul className="space-y-3 text-sm">
                    <li className="flex gap-3 items-start">
                        <MapPin className="w-5 h-5 text-blue-500 shrink-0" />
                        <span>Polígono Industrial Los Olivos,<br />C/ Principal 12, 28900 Getafe, Madrid</span>
                    </li>
                    <li className="flex gap-3 items-center">
                        <Phone className="w-5 h-5 text-blue-500 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-white font-bold hover:text-blue-400 cursor-pointer">+34 900 123 456</span>
                            <span className="text-xs">L-V: 08:30 - 18:30</span>
                        </div>
                    </li>
                    <li className="flex gap-3 items-center">
                        <Mail className="w-5 h-5 text-blue-500 shrink-0" />
                        <a href="mailto:info@milluces.com" className="hover:text-blue-400">info@milluces.com</a>
                    </li>
                </ul>
            </div>

            {/* Categories Links */}
            <div>
                <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest border-b border-blue-600 inline-block pb-1">Categorías Destacadas</h4>
                <ul className="grid grid-cols-1 gap-2 text-xs">
                    {['Bombillas LED E27', 'Tubos LED T8', 'Paneles LED 60x60', 'Proyectores Exterior', 'Tiras LED 12V', 'Tiras LED 24V', 'Downlight LED', 'Farolas LED', 'Iluminación Decorativa', 'Smart Home'].map(item => (
                        <li key={item}><a href="#" className="hover:text-blue-400 transition-colors flex items-center gap-1"><span className="text-blue-800">›</span> {item}</a></li>
                    ))}
                </ul>
            </div>

            {/* Customer Service */}
            <div>
                <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest border-b border-blue-600 inline-block pb-1">Atención al Cliente</h4>
                <ul className="space-y-2 text-xs">
                    {['Contacto', 'Envíos y Devoluciones', 'Garantía y RMA', 'Preguntas Frecuentes', 'Descargar Catálogos', 'Aviso Legal', 'Política de Privacidad', 'Política de Cookies', 'Mapa del Sitio'].map(item => (
                        <li key={item}><a href="#" className="hover:text-blue-400 transition-colors">{item}</a></li>
                    ))}
                </ul>
            </div>

            {/* Newsletter & Social (Simplified for this component) */}
            <div>
                <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest border-b border-blue-600 inline-block pb-1">Newsletter</h4>
                <p className="text-xs mb-3">Suscríbete para recibir ofertas exclusivas.</p>
                <div className="flex">
                    <input type="email" placeholder="Tu email" className="bg-neutral-800 border-none text-white text-xs px-3 py-2 w-full focus:ring-1 focus:ring-blue-600" />
                    <button className="bg-blue-600 px-4 py-2 hover:bg-blue-700 text-white text-xs font-bold uppercase">OK</button>
                </div>
            </div>
        </div>
    );
}
