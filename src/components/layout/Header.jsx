import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, X, Phone, Mic, ChevronDown, LayoutDashboard, LogOut, Grid3x3, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

const STATIC_CATEGORIES = [
    { name: 'Bombillas', slug: 'bombillas' },
    { name: 'Tubos LED', slug: 'tubos' },
    { name: 'Downlights', slug: 'downlights' },
    { name: 'Paneles LED', slug: 'paneles' },
    { name: 'Tiras LED', slug: 'tiras' },
    { name: 'Solar', slug: 'solar' },
    { name: 'Proyectores', slug: 'proyectores' },
    { name: 'Ventiladores', slug: 'ventiladores' },
    { name: 'Farolas', slug: 'farolas' },
    { name: 'Comercial', slug: 'comercial' },
    { name: 'Industrial', slug: 'industrial' },
    { name: 'Lámparas', slug: 'lamparas' },
];

const STATIC_ROOMS = [
    { name: 'Salón / Comedor', slug: 'salon' },
    { name: 'Cocina', slug: 'cocina' },
    { name: 'Dormitorio', slug: 'dormitorio' },
    { name: 'Baño', slug: 'bano' },
    { name: 'Exterior', slug: 'exterior' },
    { name: 'Pasillos', slug: 'pasillos' },
];

export function Header({ onOpenAuthModal }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showMegaMenu, setShowMegaMenu] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [categories, setCategories] = useState(STATIC_CATEGORIES);
    const [rooms, setRooms] = useState(STATIC_ROOMS);
    const [professions, setProfessions] = useState([]);
    const [megaBanner, setMegaBanner] = useState(null);

    const { totalItems } = useCart();
    const { profile, isPro, user, signOut } = useAuth();
    const navigate = useNavigate();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';
    const menuRef = useRef(null);
    const megaRef = useRef(null);
    const megaTimeout = useRef(null);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    };

    useEffect(() => {
        // Fetch categories for mega-menu
        async function fetchMegaData() {
            try {
                const [{ data: cats }, { data: rms }, { data: profs }, { data: banner }] = await Promise.all([
                    supabase.from('categories').select('name, slug').is('parent_id', null).order('order_index').limit(12),
                    supabase.from('rooms').select('name, slug').order('order_index').limit(6),
                    supabase.from('professions').select('name, slug').order('order_index').limit(6),
                    supabase.from('sliders')
                        .select('*')
                        .eq('type', 'megamenu_featured')
                        .eq('is_active', true)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single()
                ]);

                if (cats?.length) setCategories(cats);
                if (rms?.length) setRooms(rms);
                if (profs?.length) setProfessions(profs);
                if (banner) setMegaBanner(banner);
            } catch (_) { }
        }
        fetchMegaData();

        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);

        const handleClickOutside = (e) => {
            // Close mega-menu when clicking outside the header
            if (megaRef.current && !megaRef.current.contains(e.target)) {
                setShowMegaMenu(false);
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('mousedown', handleClickOutside);
            clearTimeout(megaTimeout.current);
        };
    }, []);

    const handleMegaEnter = () => {
        clearTimeout(megaTimeout.current);
        setShowMegaMenu(true);
    };
    const handleMegaLeave = () => {
        megaTimeout.current = setTimeout(() => setShowMegaMenu(false), 120);
    };

    return (
        <header
            ref={megaRef}
            className={`relative z-40 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-lg shadow-luxury py-2' : 'bg-white/80 py-4'}`}
            onMouseLeave={handleMegaLeave}
        >
            {/* Top bar */}
            <div className="max-w-[1600px] mx-auto px-6 md:px-10 flex items-center justify-between gap-8">

                {/* Left: Logo + Nav */}
                <div className="flex items-center gap-12">
                    <Link to="/" className="flex-shrink-0 group">
                        <img src="/logo.jpg" alt="Mil Luces" className="h-6 md:h-8 w-auto object-contain transition-transform group-hover:scale-105" />
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden xl:flex items-center gap-10">
                        {/* Colecciones trigger */}
                        <button
                            onMouseEnter={handleMegaEnter}
                            className={`relative group flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[.2em] italic transition-colors ${showMegaMenu ? 'text-brand-carbon' : 'text-brand-carbon/60 hover:text-brand-carbon'}`}
                        >
                            <Grid3x3 className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                            Colecciones
                            <ChevronDown className={`w-3 h-3 opacity-40 transition-transform duration-200 ${showMegaMenu ? 'rotate-180' : ''}`} />
                            <span className={`absolute -bottom-1 left-0 h-[2px] bg-primary transition-all duration-200 ${showMegaMenu ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                        </button>

                        {/* Other nav items */}
                        {[
                            { label: 'Proyectos', path: '/proyectos' },
                            { label: 'Ofertas', path: '/ofertas', highlight: true },
                            { label: 'Blog', path: '/blog' },
                        ].map((item) => (
                            <Link
                                key={item.label}
                                to={item.path}
                                className={`relative group text-[11px] font-black uppercase tracking-[.2em] italic transition-colors ${item.highlight ? 'text-primary' : 'text-brand-carbon/60 hover:text-brand-carbon'}`}
                            >
                                {item.label}
                                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-primary transition-all group-hover:w-full"></span>
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Center: Search */}
                <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-[450px] relative group">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Encuentra la luz perfecta..."
                        className="premium-input pl-14 w-full h-12 bg-gray-50/50 hover:bg-white border-transparent focus:border-primary/20 focus:bg-white"
                    />
                    <div className="absolute inset-y-0 right-5 flex items-center">
                        <Mic className="w-4 h-4 text-gray-300 hover:text-primary cursor-pointer transition-colors" />
                    </div>
                </form>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 md:gap-6">
                    <a href="tel:900000000" className="hidden md:flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                            <Phone className="w-4 h-4" />
                        </div>
                        <div className="hidden lg:block">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Atención Boutique</p>
                            <p className="text-[10px] font-black italic text-brand-carbon group-hover:text-primary transition-colors">900 123 456</p>
                        </div>
                    </a>

                    <div className="h-8 w-[1px] bg-gray-100 hidden md:block"></div>

                    <div className="flex items-center gap-3">
                        {isPro && (
                            <div className="hidden sm:flex flex-col items-end">
                                <span className="text-[7px] font-black text-primary uppercase tracking-[.2em] animate-pulse">Sesión Profesional</span>
                                <span className="text-[10px] font-black italic text-brand-carbon truncate max-w-[130px]">
                                    {profile?.company_name || profile?.full_name}
                                </span>
                            </div>
                        )}

                        {isAdmin && (
                            <Link to="/admin" className="hidden md:flex items-center gap-2 h-10 px-4 bg-brand-carbon text-white rounded-2xl text-[9px] font-black uppercase italic tracking-widest hover:bg-primary transition-all shadow-lg">
                                <LayoutDashboard className="w-3.5 h-3.5 text-primary" />
                                Panel Admin
                            </Link>
                        )}

                        {user ? (
                            <button onClick={signOut} title="Cerrar sesión"
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-brand-carbon bg-gray-50/50 hover:bg-red-50 hover:text-red-500 transition-all relative">
                                <LogOut className="w-5 h-5" />
                                {isPro && <span className="absolute -top-1 -right-1 bg-brand-carbon text-primary text-[8px] font-black px-1.5 py-0.5 rounded-md border-2 border-white">PRO</span>}
                            </button>
                        ) : (
                            <button onClick={() => onOpenAuthModal('login')} className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-brand-carbon bg-gray-50/50 hover:bg-white hover:shadow-lg transition-all">
                                <User className="w-5 h-5" />
                            </button>
                        )}

                        <Link to="/cart" className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center relative bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                            <ShoppingCart className="w-5 h-5" />
                            {totalItems > 0 && (
                                <span className="absolute -top-1 -right-1 bg-brand-carbon text-white text-[9px] font-black flex items-center justify-center rounded-full w-5 h-5 border-2 border-white">
                                    {totalItems}
                                </span>
                            )}
                        </Link>
                    </div>

                    {/* Mobile toggle */}
                    <button className="xl:hidden w-10 h-10 flex items-center justify-center rounded-full bg-gray-50" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X className="w-5 h-5" /> : (
                            <div className="space-y-1">
                                <div className="w-5 h-[2px] bg-brand-carbon"></div>
                                <div className="w-3 h-[2px] bg-brand-carbon"></div>
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* ─── MEGA-MENU — positioned relative to <header>, full width ─── */}
            {showMegaMenu && (
                <div
                    className="absolute top-full left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-2xl"
                    onMouseEnter={handleMegaEnter}
                    onMouseLeave={handleMegaLeave}
                >
                    <div className="max-w-[1600px] mx-auto px-10 py-10">
                        <div className="grid grid-cols-12 gap-0 divide-x divide-gray-100">

                            {/* Col 1: Categorías (6 cols) */}
                            <div className="col-span-6 pr-10">
                                <p className="text-[9px] font-black text-primary uppercase tracking-[.4em] mb-6">Shop por Categoría</p>
                                <div className="grid grid-cols-3 gap-x-8 gap-y-4">
                                    {categories.map((cat) => (
                                        <Link
                                            key={cat.slug}
                                            to={`/search?category=${cat.slug}`}
                                            onClick={() => setShowMegaMenu(false)}
                                            className="flex items-center gap-2 group"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-200 group-hover:bg-primary transition-colors flex-shrink-0"></span>
                                            <span className="text-[11px] font-bold text-gray-500 group-hover:text-brand-carbon uppercase italic tracking-wide transition-colors duration-150">
                                                {cat.name}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                                <Link
                                    to="/search"
                                    onClick={() => setShowMegaMenu(false)}
                                    className="inline-flex items-center gap-2 mt-8 text-[9px] font-black text-primary/70 hover:text-primary uppercase tracking-widest italic transition-all group"
                                >
                                    Ver todo el catálogo
                                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>

                            {/* Col 2: Por Ambiente (2 cols) */}
                            <div className="col-span-2 px-10">
                                <p className="text-[9px] font-black text-primary uppercase tracking-[.4em] mb-6">Ambiente</p>
                                <ul className="space-y-4">
                                    {rooms.map((room) => (
                                        <li key={room.slug}>
                                            <Link
                                                to={`/search?room=${room.slug}`}
                                                onClick={() => setShowMegaMenu(false)}
                                                className="flex items-center gap-2 group"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-200 group-hover:bg-primary transition-colors flex-shrink-0"></span>
                                                <span className="text-[11px] font-bold text-gray-500 group-hover:text-brand-carbon uppercase italic tracking-wide transition-colors duration-150">
                                                    {room.name}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Col 3: Sectores B2B (2 cols) */}
                            <div className="col-span-2 px-10">
                                <p className="text-[9px] font-black text-primary uppercase tracking-[.4em] mb-6">Profesionales</p>
                                <ul className="space-y-4">
                                    {professions.map((prof) => (
                                        <li key={prof.slug}>
                                            <Link
                                                to={`/search?profession=${prof.slug}`}
                                                onClick={() => setShowMegaMenu(false)}
                                                className="flex items-center gap-2 group"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-200 group-hover:bg-primary transition-colors flex-shrink-0"></span>
                                                <span className="text-[11px] font-bold text-gray-500 group-hover:text-brand-carbon uppercase italic tracking-wide transition-colors duration-150">
                                                    {prof.name}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Col 4: Destacado (2 cols) */}
                            <div className="col-span-2 pl-10">
                                <p className="text-[9px] font-black text-primary uppercase tracking-[.4em] mb-6">Destacado</p>
                                <Link
                                    to={megaBanner?.link_url || "/ofertas"}
                                    onClick={() => setShowMegaMenu(false)}
                                    className="block relative rounded-2xl overflow-hidden group h-[200px] border border-gray-100 hover:border-primary/40 transition-all bg-brand-carbon shadow-luxury"
                                >
                                    {megaBanner?.image_url && (
                                        <img
                                            src={megaBanner.image_url}
                                            alt="Featured"
                                            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-brand-carbon via-transparent to-transparent opacity-80"></div>
                                    <div className="absolute inset-0 p-6 flex flex-col justify-end">
                                        <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                            <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">
                                                {megaBanner?.subtitle || 'Oferta Exclusiva'}
                                            </p>
                                            <p className="text-xl font-black text-white uppercase italic leading-none mb-3">
                                                {megaBanner?.title || 'Descubre Mil Luces'}
                                            </p>
                                            <div className="inline-flex items-center gap-2 text-[9px] font-black text-primary uppercase italic transition-all">
                                                {megaBanner?.button_text || 'Ver Selección'} <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* Mobile menu */}
            {isMenuOpen && (
                <div className="xl:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-100 shadow-2xl p-8 z-50">
                    <div className="max-w-[1600px] mx-auto">
                        <p className="text-[9px] font-black text-primary uppercase tracking-[.4em] mb-5">Categorías</p>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-6 mb-8">
                            {categories.map((cat) => (
                                <Link key={cat.slug} to={`/search?category=${cat.slug}`} onClick={() => setIsMenuOpen(false)}
                                    className="text-[11px] font-bold text-gray-500 hover:text-brand-carbon uppercase italic tracking-wide transition-colors flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-gray-200 group-hover:bg-primary flex-shrink-0"></span>
                                    {cat.name}
                                </Link>
                            ))}
                        </div>
                        <div className="border-t border-gray-100 pt-6 flex flex-col gap-5">
                            {[
                                { label: 'Proyectos', path: '/proyectos' },
                                { label: 'Ofertas', path: '/ofertas' },
                                { label: 'Blog', path: '/blog' },
                            ].map((item) => (
                                <Link key={item.label} to={item.path} onClick={() => setIsMenuOpen(false)}
                                    className="text-[11px] font-black text-gray-500 hover:text-brand-carbon uppercase italic tracking-[.2em] transition-colors">
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
