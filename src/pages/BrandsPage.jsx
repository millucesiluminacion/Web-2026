import { supabase } from '../lib/supabaseClient';
import { Loader2, Search, ArrowRight, MessageSquare, Headphones, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATIC_BRANDS = [
    { name: 'Philips', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Philips_logo_new.svg/200px-Philips_logo_new.svg.png', bg: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=400&h=200&fit=crop' },
    { name: 'Osram', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/OSRAM_logo.svg/200px-OSRAM_logo.svg.png', bg: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&h=200&fit=crop' },
    { name: 'Ledvance', img: 'https://www.ledvance.com/media/template/logo-ledvance.png', bg: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&h=200&fit=crop' },
    { name: 'Simon', img: 'https://www.simon.com/static/logos/simon-logo.png', bg: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=200&fit=crop' },
    { name: 'Legrand', img: 'https://www.legrand.com/etc.clientlibs/legrand/clientlibs/clientlib-base/resources/images/base/logo-legrand.png', bg: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=200&fit=crop' },
];

export default function BrandsPage() {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [counts, setCounts] = useState({});

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                // Fetch Brands
                const { data: brandsData, error: brandsError } = await supabase
                    .from('brands')
                    .select('*')
                    .order('order_index', { ascending: true })
                    .order('name', { ascending: true });

                if (brandsError) throw brandsError;

                // Fetch Product Counts per Brand
                const { data: productsData, error: productsError } = await supabase
                    .from('products')
                    .select('brand_id')
                    .is('parent_id', null)
                    .neq('is_active', false);

                if (productsError) {
                    // Fallback if is_active doesn't exist yet
                    const { data: fallbackData } = await supabase.from('products').select('brand_id').is('parent_id', null);
                    const brandCounts = (fallbackData || []).reduce((acc, p) => {
                        if (p.brand_id) acc[p.brand_id] = (acc[p.brand_id] || 0) + 1;
                        return acc;
                    }, {});
                    setCounts(brandCounts);
                } else {
                    const brandCounts = (productsData || []).reduce((acc, p) => {
                        if (p.brand_id) acc[p.brand_id] = (acc[p.brand_id] || 0) + 1;
                        return acc;
                    }, {});
                    setCounts(brandCounts);
                }

                if (brandsData && brandsData.length > 0) {
                    const formatted = brandsData.map(brand => ({
                        id: brand.id,
                        name: brand.name,
                        img: brand.image_url || '',
                        bg: brand.bg_image_url || 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=80&w=2000'
                    }));
                    setBrands(formatted);
                } else {
                    setBrands(STATIC_BRANDS);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
                setBrands(STATIC_BRANDS);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    const filteredBrands = brands.filter(brand =>
        brand.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-brand-porcelain min-h-screen pt-32 pb-20">
            <div className="container mx-auto px-6 max-w-[1400px]">
                <header className="mb-12 text-center relative">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-4 block">Mil Luces Boutique</span>
                    <h1 className="text-5xl lg:text-7xl font-black text-brand-carbon uppercase italic leading-tight tracking-tighter">
                        Nuestras <span className="text-primary/40">Marcas</span> <br /> <span className="text-brand-carbon">Boutique</span>
                    </h1>
                    <div className="w-20 h-1 bg-primary/20 mx-auto mt-8 rounded-full"></div>
                </header>

                {/* Minimalist Search */}
                <div className="mb-16 max-w-md mx-auto relative group">
                    <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative flex items-center bg-white border border-gray-100 rounded-2xl px-6 py-4 shadow-luxury focus-within:shadow-luxury-hover focus-within:border-primary/20 transition-all">
                        <Search className="w-5 h-5 text-gray-300 mr-4" />
                        <input
                            type="text"
                            placeholder="Buscar marca..."
                            className="bg-transparent border-none outline-none w-full text-sm font-medium text-brand-carbon placeholder:text-gray-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20 bg-white rounded-[3rem] shadow-luxury border border-gray-100/50">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(250px,1fr))] xl:gap-7 mb-24">
                        {filteredBrands.length > 0 ? filteredBrands.map((brand, i) => (
                            <li key={i} className="group relative rounded-md overflow-hidden border w-full text-center bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="absolute top-4 right-4 z-10">
                                    <span className="bg-white/90 backdrop-blur-md border border-gray-100 px-3 py-1 rounded-full text-[9px] font-black text-brand-carbon uppercase italic shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                        {counts[brand.id] || 0} Modelos
                                    </span>
                                </div>
                                <div className="relative h-[80px] md:h-[150px] overflow-hidden">
                                    <img
                                        src={brand.bg}
                                        alt={brand.name}
                                        className="w-full h-full object-cover group-hover:scale-110 duration-300"
                                        loading="lazy"
                                    />
                                    <div className="absolute bottom-0 text-white bg-gradient-to-b from-transparent to-gray-950 w-full h-16"></div>
                                </div>
                                <div className="flex p-4 pt-14 md:pt-16 justify-center">
                                    <div className="rounded-full w-[80px] h-[80px] md:w-[100px] md:h-[100px] absolute top-[40px] md:top-[100px] left-1/2 -translate-x-1/2 bg-blue-50 flex items-center justify-center border-2 border-gray-300 overflow-hidden shadow-sm">
                                        <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center p-2">
                                            <img src={brand.img} alt={brand.name} className="max-w-full max-h-full object-contain" />
                                        </div>
                                    </div>
                                    <Link to={`/search?brand=${brand.id || brand.name.toLowerCase()}`} className="self-end text-md md:text-xl font-black italic text-brand-carbon uppercase tracking-tighter mt-4 hover:text-primary transition-colors">
                                        {brand.name}
                                    </Link>
                                </div>
                            </li>
                        )) : (
                            <div className="col-span-full py-20 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">No se encontraron marcas con "{searchTerm}"</p>
                            </div>
                        )}
                    </ul>
                )}

                {/* Consultancy Banner */}
                <div className="relative group overflow-hidden bg-brand-carbon rounded-[2.5rem] p-12 md:p-20 shadow-3xl">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 justify-between">
                        <div className="max-w-xl text-center md:text-left">
                            <span className="flex items-center justify-center md:justify-start gap-2 text-[9px] font-black text-primary uppercase tracking-[0.4em] mb-6">
                                <Zap className="w-3 h-3 animate-pulse" /> Boutique Technical Advice
                            </span>
                            <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic leading-tight tracking-tighter mb-8">
                                ¿Necesitas una solución <br /> <span className="text-primary/60">técnica a medida?</span>
                            </h2>
                            <p className="text-gray-400 text-sm md:text-base font-medium leading-relaxed mb-0">
                                Nuestro departamento de proyectos colabora directamente con las marcas para ofrecerte la mejor solución lumínica y técnica para tu espacio comercial o residencial.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                            <Link to="/contacto" className="inline-flex items-center gap-4 px-10 py-5 bg-white text-brand-carbon rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl shadow-black/20 group">
                                Solicitar Asesoría <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                            </Link>
                            <a href="tel:+34900000000" className="inline-flex items-center gap-4 px-10 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-white/10 transition-all">
                                <Headphones className="w-4 h-4" /> Consultar Experto
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
