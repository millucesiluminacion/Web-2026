import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, X, Phone, Mic, ChevronDown } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export function Header() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { totalItems } = useCart();
    const navigate = useNavigate();
    const menuRef = useRef(null);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
        }
    };

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);

        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header
            className={`transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-lg shadow-luxury py-2' : 'bg-white/80 py-4'
                }`}
        >
            <div className="container mx-auto max-w-[1400px]">
                <div className="px-6 md:px-10 flex items-center justify-between gap-8">
                    {/* Logo Section */}
                    <div className="flex items-center gap-12">
                        <Link to="/" className="flex-shrink-0 group">
                            <img
                                src="/logo.jpg"
                                alt="Mil Luces"
                                className="h-6 md:h-8 w-auto object-contain transition-transform group-hover:scale-105"
                            />
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden xl:flex items-center gap-10">
                            {[
                                { label: 'Colecciones', path: '/search', hasDrop: true },
                                { label: 'Proyectos', path: '/proyectos' },
                                { label: 'Ofertas', path: '/ofertas', highlight: true },
                                { label: 'Blog', path: '/blog' }
                            ].map((item) => (
                                <Link
                                    key={item.label}
                                    to={item.path}
                                    className={`relative group flex items-center gap-1 text-[11px] font-black uppercase tracking-[.2em] italic transition-colors ${item.highlight ? 'text-primary' : 'text-brand-carbon/60 hover:text-brand-carbon'
                                        }`}
                                >
                                    {item.label}
                                    {item.hasDrop && <ChevronDown className="w-3 h-3 opacity-30 group-hover:rotate-180 transition-transform" />}
                                    <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-primary transition-all group-hover:w-full"></span>
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* Search Section - Centered & Premium */}
                    <form
                        onSubmit={handleSearch}
                        className="hidden lg:flex flex-1 max-w-[450px] relative group"
                    >
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

                    {/* Action Group */}
                    <div className="flex items-center gap-3 md:gap-6">
                        {/* Support - Hidden on Mobile */}
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

                        {/* Account & Cart */}
                        <div className="flex items-center gap-2">
                            <Link
                                to="/login"
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-brand-carbon bg-gray-50/50 hover:bg-white hover:shadow-lg transition-all"
                            >
                                <User className="w-5 h-5" />
                            </Link>

                            <Link
                                to="/cart"
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center relative bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                {totalItems > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-brand-carbon text-white text-[9px] font-black flex items-center justify-center rounded-full w-5 h-5 border-2 border-white">
                                        {totalItems}
                                    </span>
                                )}
                            </Link>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            className="xl:hidden w-10 h-10 flex items-center justify-center rounded-full bg-gray-50"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X className="w-5 h-5" /> : (
                                <div className="space-y-1">
                                    <div className="w-5 h-[2px] bg-brand-carbon"></div>
                                    <div className="w-3 h-[2px] bg-brand-carbon"></div>
                                </div>
                            )}
                        </button>
                    </div>
                </div>

                {/* Simplified MegaMenu Overlay */}
                {isMenuOpen && (
                    <div className="absolute top-full left-0 right-0 glass-dark text-white p-10 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-6xl mx-auto">
                            <div>
                                <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6">Interiorismo</h3>
                                <ul className="space-y-4">
                                    <li><Link className="text-sm font-bold uppercase italic hover:text-blue-300 transition-colors" to="/search?category=downlights">Lámparas de Diseño</Link></li>
                                    <li><Link className="text-sm font-bold uppercase italic hover:text-blue-300 transition-colors" to="/search?category=paneles">Iluminación Técnica</Link></li>
                                    <li><Link className="text-sm font-bold uppercase italic hover:text-blue-300 transition-colors" to="/search?category=plafones">Colección Minimal</Link></li>
                                </ul>
                            </div>
                            {/* Add other categories here... */}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
