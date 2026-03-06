import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
    Filter, Star, ShoppingCart, ChevronDown, Loader2, Package,
    BoxSelect, Square, Grid, Zap, Lightbulb, Tag, X, Settings
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { calculateProductPrice } from '../lib/pricingUtils';

const ICON_MAP = {
    BoxSelect: BoxSelect,
    Square: Square,
    Grid: Grid,
    Zap: Zap,
    Lightbulb: Lightbulb,
    Tag: Tag,
    Settings: Settings
};

export default function ProductListing() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const categoryQuery = searchParams.get('category');
    const subcategoryQuery = searchParams.get('subcategory');
    const roomId = searchParams.get('room');
    const professionSlug = searchParams.get('profession');
    const searchQuery = searchParams.get('q');

    const [filtersOpen, setFiltersOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [professions, setProfessions] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [loading, setLoading] = useState(true);

    // Advanced Filter States
    const [priceRange, setPriceRange] = useState([0, 2000]);
    const [selectedPowers, setSelectedPowers] = useState([]);
    const [availablePowers, setAvailablePowers] = useState([]);
    const [priceLimits, setPriceLimits] = useState([0, 2000]);
    const [availability, setAvailability] = useState({
        inStock: false,
        onOffer: false,
        isNew: false
    });

    const { addToCart } = useCart();
    const { profile } = useAuth();

    useEffect(() => {
        fetchProducts();
    }, [categoryQuery, subcategoryQuery, roomId, professionSlug, searchQuery]);

    useEffect(() => {
        applyFilters();
    }, [products, priceRange, selectedPowers, availability]);

    async function fetchProducts() {
        try {
            setLoading(true);

            // 1. Fetch metadata
            const [catRes, roomsRes, profsRes] = await Promise.all([
                supabase.from('categories').select('*').order('order_index', { ascending: true }),
                supabase.from('rooms').select('*').order('name'),
                supabase.from('professions').select('*').order('order_index', { ascending: true })
            ]);

            const allCategories = catRes.data || [];
            setCategories(allCategories);
            setRooms(roomsRes.data || []);
            setProfessions(profsRes.data || []);

            // 2. Identify active category
            if (categoryQuery && categoryQuery !== 'all') {
                const catData = allCategories.find(c => c.slug === categoryQuery.toLowerCase());
                if (catData) {
                    setActiveCategory(catData);
                    setSubcategories(allCategories.filter(c => c.parent_id === catData.id));
                }
            } else {
                setActiveCategory(null);
                setSubcategories([]);
            }

            // 3. Build Query
            let querySelect = '*, product_rooms(room_id), product_professions(profession_id)';
            if (roomId) querySelect = '*, product_rooms!inner(room_id), product_professions(profession_id)';
            if (professionSlug) querySelect = '*, product_rooms(room_id), product_professions!inner(profession_id)';

            let productQuery = supabase.from('products').select(querySelect).is('parent_id', null);

            if (searchQuery) {
                productQuery = productQuery.or(`name.ilike.%${searchQuery}%,reference.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
            }

            if (subcategoryQuery) {
                const subCatData = allCategories.find(c => c.slug === subcategoryQuery.toLowerCase());
                if (subCatData) {
                    productQuery = productQuery.or(`category_id.eq.${subCatData.id},category.ilike.%${subcategoryQuery}%`);
                }
            } else if (categoryQuery && categoryQuery !== 'all') {
                const currentCat = allCategories.find(c => c.slug === categoryQuery.toLowerCase());
                if (currentCat) {
                    const relatedIds = allCategories.filter(c => c.id === currentCat.id || c.parent_id === currentCat.id).map(c => c.id);
                    productQuery = productQuery.in('category_id', relatedIds);
                }
            }

            if (roomId) productQuery = productQuery.eq('product_rooms.room_id', roomId);
            if (professionSlug) {
                const prof = profsRes.data?.find(p => p.slug === professionSlug.toLowerCase());
                if (prof) productQuery = productQuery.eq('product_professions.profession_id', prof.id);
            }

            const { data, error } = await productQuery.order('created_at', { ascending: false });
            if (error) throw error;

            const fetchedProducts = data || [];
            setProducts(fetchedProducts);

            // Calculate dynamic ranges and available powers
            if (fetchedProducts.length > 0) {
                let minP = Infinity, maxP = -Infinity;
                const pwrSet = new Set();

                fetchedProducts.forEach(p => {
                    const pricing = calculateProductPrice(p, profile);
                    const price = pricing.finalPrice;
                    if (price < minP) minP = price;
                    if (price > maxP) maxP = price;

                    const attrs = p.attributes || {};
                    const pwrStr = attrs.Potencia || attrs.power || attrs.Watios || attrs['Potencia (W)'];
                    if (pwrStr) pwrSet.add(String(pwrStr).trim().toUpperCase());
                });

                const sortedPowers = Array.from(pwrSet).sort((a, b) => {
                    const valA = parseFloat(a) || 0;
                    const valB = parseFloat(b) || 0;
                    return valA - valB;
                });

                setAvailablePowers(sortedPowers);

                const pMin = Math.floor(minP === Infinity ? 0 : minP);
                const pMax = Math.ceil(maxP === -Infinity ? 2000 : maxP);

                setPriceLimits([pMin, pMax]);
                setPriceRange([pMin, pMax]);
                setSelectedPowers([]); // Reset power selection on new fetch
            }

        } catch (error) {
            console.error('Error:', error.message);
        } finally {
            setLoading(false);
        }
    }

    const applyFilters = () => {
        let filtered = [...products];
        filtered = filtered.filter(p => {
            const pricing = calculateProductPrice(p, profile);
            const actualPrice = pricing.finalPrice;
            return actualPrice >= priceRange[0] && actualPrice <= priceRange[1];
        });
        filtered = filtered.filter(p => {
            if (selectedPowers.length === 0) return true;
            const attrs = p.attributes || {};
            const pwrStr = attrs.Potencia || attrs.power || attrs.Watios || attrs['Potencia (W)'];
            // Normalize to match how chips were built (uppercase + trimmed)
            const normalized = pwrStr ? String(pwrStr).trim().toUpperCase() : null;
            return normalized && selectedPowers.includes(normalized);
        });
        if (availability.inStock) filtered = filtered.filter(p => p.stock > 0);
        if (availability.onOffer) filtered = filtered.filter(p => p.discount_price > 0 && p.discount_price < p.price);
        if (availability.isNew) {
            const limit = new Date();
            limit.setDate(limit.getDate() - 30);
            filtered = filtered.filter(p => new Date(p.created_at) > limit);
        }
        setFilteredProducts(filtered);
    };

    const getCounts = () => {
        const limit = new Date(); limit.setDate(limit.getDate() - 30);
        return {
            inStock: products.filter(p => p.stock > 0).length,
            onOffer: products.filter(p => p.discount_price > 0 && p.discount_price < p.price).length,
            isNew: products.filter(p => new Date(p.created_at) > limit).length
        };
    };

    const handleSubcategoryClick = (subSlug) => {
        const params = new URLSearchParams(searchParams);
        if (subcategoryQuery === subSlug) params.delete('subcategory');
        else params.set('subcategory', subSlug);
        navigate(`/search?${params.toString()}`);
    };

    const counts = getCounts();

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Breadcrumbs */}
            <div className="text-sm text-gray-500 mb-8">
                <Link to="/" className="hover:text-blue-600 transition-colors">Inicio</Link> /{' '}
                <span className="text-gray-900 font-medium capitalize">
                    {categoryQuery && categoryQuery !== 'all' ? categoryQuery :
                        roomId ? rooms.find(r => r.id === roomId)?.name :
                            professionSlug ? professions.find(p => p.slug === professionSlug)?.name :
                                searchQuery ? `Búsqueda: ${searchQuery}` : 'Todos los productos'}
                </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar */}
                <aside className={`lg:w-72 flex-shrink-0 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
                    <div className="bg-white p-7 rounded-[2.5rem] shadow-luxury border border-gray-100 sticky top-24 space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-brand-carbon uppercase italic text-xs tracking-[.2em] flex items-center gap-3">
                                <Filter className="w-4 h-4 text-primary" /> Filtros Avanzados
                            </h3>
                            {filtersOpen && <button onClick={() => setFiltersOpen(false)} className="lg:hidden p-2 bg-gray-50 rounded-full"><X className="w-4 h-4" /></button>}
                        </div>

                        {/* Price Range */}
                        <div className="space-y-5">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio</h4>
                            <div className="px-2">
                                <input
                                    type="range"
                                    min={priceLimits[0]}
                                    max={priceLimits[1]}
                                    step="1"
                                    value={priceRange[1]}
                                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                    className="w-full accent-primary h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between mt-3">
                                    <span className="text-[10px] font-black italic text-brand-carbon">{priceRange[0]}€</span>
                                    <span className="text-[10px] font-black italic text-primary">{priceRange[1]}€</span>
                                </div>
                            </div>
                        </div>

                        {/* Power Selection */}
                        <div className="space-y-5">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Potencia</h4>
                            <div className="flex flex-wrap gap-2">
                                {availablePowers.length > 0 ? availablePowers.map(pwr => (
                                    <button
                                        key={pwr}
                                        onClick={() => {
                                            setSelectedPowers(prev =>
                                                prev.includes(pwr) ? prev.filter(p => p !== pwr) : [...prev, pwr]
                                            );
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black italic transition-all border ${selectedPowers.includes(pwr)
                                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105'
                                            : 'bg-white border-gray-100 text-brand-carbon hover:border-primary hover:text-primary'
                                            }`}
                                    >
                                        {pwr}
                                    </button>
                                )) : (
                                    <p className="text-[9px] text-gray-400 italic">No disponible para esta selección</p>
                                )}
                            </div>
                        </div>

                        {/* Availability */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Disponibilidad</h4>
                            <div className="space-y-3">
                                {[
                                    { id: 'inStock', label: 'En Stock', count: counts.inStock },
                                    { id: 'onOffer', label: 'En Oferta', count: counts.onOffer },
                                    { id: 'isNew', label: 'Novedades', count: counts.isNew }
                                ].map(opt => (
                                    <label key={opt.id} className="flex items-center justify-between group cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={availability[opt.id]}
                                                    onChange={() => setAvailability({ ...availability, [opt.id]: !availability[opt.id] })}
                                                    className="sr-only"
                                                />
                                                <div className={`w-5 h-5 rounded-lg border-2 transition-all ${availability[opt.id] ? 'bg-primary border-primary' : 'border-gray-100 bg-gray-50'}`}>
                                                    {availability[opt.id] && <X className="w-3.5 h-3.5 text-white stroke-[4px]" />}
                                                </div>
                                            </div>
                                            <span className={`text-[11px] font-bold uppercase tracking-wide transition-colors ${availability[opt.id] ? 'text-brand-carbon' : 'text-gray-400 group-hover:text-gray-600'}`}>{opt.label}</span>
                                        </div>
                                        <span className="text-[9px] font-black text-gray-300 bg-gray-50 px-2 py-0.5 rounded-md">{opt.count}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="space-y-4 pt-4 border-t border-gray-50">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Catálogo</h4>
                            <ul className="space-y-4 text-[11px] text-gray-400 font-bold uppercase tracking-wide">
                                <li>
                                    <Link to="/search" className={`flex items-center gap-3 transition-all ${!categoryQuery ? 'text-primary' : 'hover:text-brand-carbon'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${!categoryQuery ? 'bg-primary scale-125' : 'bg-gray-200'}`}></div>
                                        Ver Todo
                                    </Link>
                                </li>
                                {categories.filter(c => !c.parent_id).map(c => (
                                    <li key={c.id}>
                                        <Link to={`/search?category=${c.slug}`} className={`flex items-center gap-3 transition-all ${categoryQuery?.toLowerCase() === c.slug ? 'text-brand-carbon' : 'hover:text-brand-carbon'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${categoryQuery?.toLowerCase() === c.slug ? 'bg-primary scale-125 shadow-lg' : 'bg-gray-200'}`}></div>
                                            {c.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </aside>

                {/* Grid */}
                <div className="flex-1">
                    {activeCategory && (
                        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <h2 className="text-3xl md:text-5xl font-black text-brand-carbon uppercase italic tracking-tighter mb-8 leading-none">
                                {activeCategory.name} <br />
                                <span className="text-gray-300 italic">Colección</span>
                            </h2>
                            {subcategories.length > 0 && (
                                <div className="flex flex-wrap gap-4 mb-4 pb-2">
                                    {subcategories.map(sub => (
                                        <button key={sub.id} onClick={() => handleSubcategoryClick(sub.slug)} className={`flex flex-col items-center justify-center min-w-[100px] p-6 rounded-[2rem] border transition-all duration-300 ${subcategoryQuery === sub.slug ? 'bg-brand-carbon border-brand-carbon text-white shadow-xl scale-105' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}>
                                            <div className="w-8 h-8 mb-3 flex items-center justify-center">
                                                {sub.image_url ? (
                                                    <img src={sub.image_url} alt="" className="w-full h-full object-contain" />
                                                ) : (
                                                    (() => {
                                                        const IconComp = ICON_MAP[sub.icon_name] || Tag;
                                                        return <IconComp className="w-6 h-6 text-primary" />;
                                                    })()
                                                )}
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest">{sub.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between mb-8 gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                        <button onClick={() => setFiltersOpen(true)} className="lg:hidden flex items-center gap-3 text-brand-carbon font-black uppercase italic text-[10px] tracking-widest px-6 py-3 bg-gray-50 rounded-xl">
                            <Filter className="w-4 h-4 text-primary" /> Filtros
                        </button>
                        <div className="flex items-center gap-4">
                            {searchQuery && <span className="text-primary font-black uppercase italic text-[10px] tracking-widest bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">Buscando: {searchQuery}</span>}
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-[.2em] italic">Mostrando {filteredProducts.length} piezas</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 text-gray-300">
                            <Loader2 className="w-10 h-10 animate-spin mb-4" />
                            <p className="uppercase tracking-widest text-[9px] font-black">Curando selección exclusiva...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {filteredProducts.map(product => {
                                const pricing = calculateProductPrice(product, profile);
                                return (
                                    <div key={product.id} className="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-luxury hover:shadow-luxury-hover transition-all duration-700 border border-gray-100/50 flex flex-col">
                                        <Link to={`/product/${product.slug || product.id}`} className="block relative aspect-square p-8 overflow-hidden group/img">
                                            <div className="absolute inset-0 bg-gray-50/20 opacity-0 group-hover/img:opacity-100 transition-opacity"></div>
                                            <img src={product.image_url || '/placeholder.jpg'} alt={product.name} className="w-full h-full object-contain transition-transform duration-700 group-hover/img:scale-110" />
                                            {pricing.hasAnyDiscount && (
                                                <div className="absolute top-6 left-6">
                                                    <span className="bg-red-500 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-xl italic shadow-xl">-{pricing.displayDiscountPercent}% OFF</span>
                                                </div>
                                            )}
                                        </Link>
                                        <div className="p-8 pt-0 flex-1 flex flex-col">
                                            <div className="mb-4">
                                                <div className="flex gap-1 mb-3">
                                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-2 h-2 ${i <= 5 ? 'text-primary fill-primary' : 'text-gray-100'}`} />)}
                                                </div>
                                                <Link to={`/product/${product.slug || product.id}`}>
                                                    <h3 className="text-sm font-black text-brand-carbon uppercase italic leading-tight group-hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
                                                </Link>
                                            </div>
                                            <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">{pricing.isPartnerPrice ? 'Socio VIP' : 'Precio'}</span>
                                                    <span className="text-xl font-black italic text-brand-carbon">{pricing.finalPrice.toFixed(2)}€</span>
                                                </div>
                                                <button onClick={() => addToCart({ ...product, price: pricing.finalPrice })} className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-110 active:scale-95 transition-all">
                                                    <ShoppingCart className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {!loading && filteredProducts.length === 0 && (
                                <div className="col-span-full py-20 text-center space-y-6">
                                    <div className="text-6xl text-gray-100">🚫</div>
                                    <p className="text-gray-400 uppercase tracking-widest text-[10px] font-black">No hay piezas que coincidan con la selección actual</p>
                                    <button onClick={() => {
                                        setPriceRange([priceLimits[0], priceLimits[1]]);
                                        setSelectedPowers([]);
                                        setAvailability({ inStock: false, onOffer: false, isNew: false });
                                    }} className="px-8 py-3 bg-brand-carbon text-white rounded-2xl text-[10px] font-black uppercase italic hover:bg-primary transition-all">Limpiar Filtros</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
