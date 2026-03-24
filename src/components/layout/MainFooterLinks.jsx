import { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, CalendarClock, ChevronRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export function MainFooterLinks() {
    const [categories, setCategories] = useState([]);
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success

    useEffect(() => {
        async function fetchFooterCats() {
            const { data } = await supabase
                .from('categories')
                .select('name, slug')
                .eq('show_in_footer', true)
                .is('parent_id', null)
                .order('order_index');
            if (data) setCategories(data);
        }
        fetchFooterCats();
    }, []);

    const handleNewsletter = (e) => {
        e.preventDefault();
        if (!email) return;
        setStatus('loading');
        setTimeout(() => {
            setStatus('success');
            setEmail('');
            setTimeout(() => setStatus('idle'), 3000);
        }, 1000);
    };

    return (
        <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Contact Info */}
            <div>
                <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest border-b border-blue-600 inline-block pb-1">Mil Luces Iluminación</h4>
                <p className="mb-4 text-xs leading-relaxed">
                    Líderes en distribución de iluminación LED profesional y doméstica. Calidad certificada y los mejores precios del mercado.
                </p>
                <ul className="space-y-3 text-xs">
                    <li className="flex gap-3 items-start">
                        <MapPin className="w-5 h-5 text-blue-500 shrink-0" />
                        <span>Polígono Industrial Cobo Calleja,<br />C/ Rio Tormes 5, 28943 Fuenlabrada, Madrid</span>
                    </li>
                    <li className="flex gap-3 items-center">
                        <CalendarClock className="w-5 h-5 text-blue-500 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-white font-bold">De Domingo a Viernes: 09:30 - 19:00</span>
                            <span className="text-xs">Sabado: Cerrado por descanso</span>
                        </div>
                    </li>
                    <li className="flex gap-3 items-center">
                        <Phone className="w-5 h-5 text-blue-500 shrink-0" />
                        <div className="flex flex-col">
                            <a href="https://wa.me/+34689935436" className="text-white font-bold hover:text-blue-400 cursor-pointer">+34 689 935 436</a>
                            <a href="https://callto:+34917654062" className="text-white font-bold hover:text-blue-400 cursor-pointer">+34 917 654 062</a>
                        </div>
                    </li>
                    <li className="flex gap-3 items-center">
                        <Mail className="w-5 h-5 text-blue-500 shrink-0" />
                        <a href="mailto:millucesiluminacion@hotmail.com" className="hover:text-blue-400">millucesiluminacion@hotmail.com</a>
                    </li>
                </ul>
            </div>

            {/* Categories Links */}
            <div>
                <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest border-b border-blue-600 inline-block pb-1">Categorías Destacadas</h4>
                <ul className="grid grid-cols-1 gap-2 text-xs">
                    {categories.length > 0 ? (
                        categories.map(cat => (
                            <li key={cat.slug}>
                                <Link to={`/search?category=${cat.slug}`} className="hover:text-blue-400 transition-colors flex items-center gap-1">
                                    <span className="text-blue-800">›</span> {cat.name}
                                </Link>
                            </li>
                        ))
                    ) : (
                        ['Iluminación Interior', 'Tiras LED', 'Exterior', 'Bombillas'].map(item => (
                            <li key={item} className="text-gray-600 italic opacity-40">{item}</li>
                        ))
                    )}
                </ul>
            </div>

            {/* Customer Service */}
            <div>
                <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest border-b border-blue-600 inline-block pb-1">Atención al Cliente</h4>
                <ul className="space-y-2 text-xs">
                    <li><Link to="/profesionales" className="text-primary font-black uppercase hover:text-white transition-colors">Área Profesional / B2B</Link></li>
                    {[
                        { label: 'Contacto', path: '/contacto' },
                        { label: 'Envíos y Devoluciones', path: '/envios-y-devoluciones' },
                        { label: 'Garantía y RMA', path: '/garantia-y-rma' },
                        { label: 'Preguntas Frecuentes', path: '/faq' },
                        { label: 'Descargar Catálogos', path: '/catalogos' },
                        { label: 'Aviso Legal', path: '/aviso-legal' },
                        { label: 'Política de Privacidad', path: '/politica-privacidad' },
                        { label: 'Política de Cookies', path: '/politica-cookies' },
                        { label: 'Mapa del Sitio', path: '/mapa-del-sitio' }
                    ].map(item => (
                        <li key={item.label}>
                            <Link to={item.path} className="hover:text-blue-400 transition-colors">
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Newsletter & Social (Simplified for this component) */}
            <div>
                <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest border-b border-blue-600 inline-block pb-1">Newsletter</h4>
                <p className="text-xs mb-3">Suscríbete para recibir ofertas exclusivas.</p>
                <form onSubmit={handleNewsletter} className="flex relative">
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Tu email"
                        className="bg-neutral-800 border-none text-white text-xs px-3 py-2 w-full focus:ring-1 focus:ring-blue-600 placeholder:text-gray-600"
                    />
                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="bg-blue-600 px-4 py-2 hover:bg-blue-700 text-white text-xs font-bold uppercase disabled:opacity-50"
                    >
                        {status === 'loading' ? '...' : status === 'success' ? <Check className="w-4 h-4" /> : 'OK'}
                    </button>
                    {status === 'success' && (
                        <p className="absolute -top-6 left-0 text-[10px] text-blue-400 font-bold animate-bounce">¡Bienvenido!</p>
                    )}
                </form>
            </div>
        </div>
    );
}
