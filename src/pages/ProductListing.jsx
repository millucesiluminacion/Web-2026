import { useState, useEffect, useMemo, memo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
    Filter, Star, ShoppingCart, ChevronDown, Loader2, Package,
    BoxSelect, Square, Grid, Zap, Lightbulb, Tag, X, Settings,
    ChevronLeft, ChevronRight, ArrowUpDown, SlidersHorizontal,
    Droplets, Sun
} from 'lucide-react';
import { BadgeRenderer, StarRating } from '../components/commerce/BoutiqueUI';
import { CategoryGrid } from '../components/home/CategoryGrid';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabaseClient';
import { calculateProductPrice } from '../lib/pricingUtils';
import { optimizeImage } from '../lib/imageUtils';

const ICON_MAP = { BoxSelect, Square, Grid, Zap, Lightbulb, Tag, Settings };

const COLOR_MAP = {
    "Blanco": "#FFFFFF",
    "Negro": "#1a1a1a",
    "Gris": "#808080",
    "Dorado": "linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)",
    "Plateado": "linear-gradient(135deg, #757575, #e0e0e0, #757575)",
    "Cobre": "linear-gradient(135deg, #b87333, #f4a460, #b87333)",
    "Rojo": "#DC2626",
    "Azul": "#2563EB",
    "Verde": "#16A34A",
    "Madera": "#8B4513",
    "Beige": "#F5F5DC",
    "Rosa": "#F472B6",
    "Morado": "#A855F7",
    "Naranja": "linear-gradient(135deg, #FF6B00, #FF9E00)",
    "RGB": "conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)",
    "Multicolor": "conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)",
    "CCT (Tricolor)": "linear-gradient(135deg, #FFF1DC 0%, #F3F4F6 50%, #EEF4FF 100%)",
    "Blanco Cálido": "#FFF1DC",
    "Blanco Neutro": "#F3F4F6",
    "Blanco Frío": "#EEF4FF"
};

const SORT_OPTIONS = [
    { value: 'price_asc', label: 'Precio: Menor a Mayor' },
    { value: 'price_desc', label: 'Precio: Mayor a Menor' },
    { value: 'name_asc', label: 'Nombre: A → Z' },
    { value: 'newest', label: 'Novedades Primero' },
    { value: 'power_asc', label: 'Potencia: Menor a Mayor' },
    { value: 'power_desc', label: 'Potencia: Mayor a Menor' },
];

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

const ProductCard = memo(({ product, profile, addToCart, isLCP = false }) => {
    const pricing = calculateProductPrice(product, profile);
    const [isHovered, setIsHovered] = useState(false);
    const [currentImgIndex, setCurrentImgIndex] = useState(0);

    const images = useMemo(() => {
        const imgs = [product.image_url];
        if (product.variants) product.variants.forEach(v => {
            if (v.image_url && v.image_url !== product.image_url && !imgs.includes(v.image_url)) imgs.push(v.image_url);
        });
        return imgs.filter(img => img);
    }, [product]);

    const variantOptions = useMemo(() => {
        const options = new Set();
        if (product.variants) product.variants.forEach(v => {
            const tone = v.attributes?.['Tono'] || v.attributes?.['Luz'] || v.attributes?.['Color'] || v.attributes?.['Temperatura'];
            if (tone) options.add(String(tone).trim());
        });
        return Array.from(options).sort();
    }, [product.variants]);

    useEffect(() => {
        if (!isHovered || images.length <= 1) { setCurrentImgIndex(0); return; }
        const interval = setInterval(() => setCurrentImgIndex(prev => (prev + 1) % images.length), 1500);
        return () => clearInterval(interval);
    }, [isHovered, images.length]);

    const displayImage = useMemo(() => optimizeImage(images[currentImgIndex], 400, 400), [images, currentImgIndex]);

    return (
        <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
            className="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-luxury hover:shadow-luxury-hover transition-all duration-700 border border-gray-100/50 flex flex-col">
            <Link to={`/product/${product.slug || product.id}`} className="block relative aspect-square p-8 overflow-hidden group/img">
                <div className="absolute inset-0 bg-gray-50/20 opacity-0 group-hover/img:opacity-100 transition-opacity" />
                <BadgeRenderer product={product} />
                <div className="w-full h-full relative">
                    <img src={displayImage} alt={product.name} loading={isLCP ? "eager" : "lazy"} width={400} height={400} className="absolute inset-0 w-full h-full object-contain transition-all duration-700 group-hover/img:scale-110" />
                </div>
            </Link>
            <div className="p-8 pt-0 flex-1 flex flex-col">
                <div className="mb-4">
                    <StarRating rating={product.rating_avg} count={product.reviews_count} />
                    <Link to={`/product/${product.slug || product.id}`}>
                        <h3 className="text-sm font-black text-brand-carbon uppercase italic leading-tight group-hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
                    </Link>
                </div>
                {variantOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {variantOptions.map(opt => <span key={opt} className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-md text-[7px] font-black uppercase text-gray-500">{opt}</span>)}
                    </div>
                )}
                <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-6">
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase mb-1 ${pricing.isPartnerPrice ? 'text-yellow-500' : pricing.isProPrice ? 'text-primary' : 'text-gray-300'}`}>
                            {pricing.isPartnerPrice ? '★ Socio VIP' : pricing.isProPrice ? '✦ Precio Pro' : 'Precio'}
                        </span>
                        <span className="text-xl font-black italic text-brand-carbon">{pricing.finalPrice.toFixed(2)}€</span>
                    </div>
                    <button onClick={(e) => { e.preventDefault(); addToCart({ ...product, price: pricing.finalPrice }); }}
                        className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-110 transition-all">
                        <ShoppingCart className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
});

export default function ProductListing() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const categoryQuery = searchParams.get('category');
    const subcategoryQuery = searchParams.get('subcategory');
    const roomId = searchParams.get('room');
    const brandQuery = searchParams.get('brand');
    const professionSlug = searchParams.get('profession');
    const searchQuery = searchParams.get('q');

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [brands, setBrands] = useState([]);
    const [professions, setProfessions] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [priceRange, setPriceRange] = useState([0, 2000]);
    const [priceLimits, setPriceLimits] = useState([0, 2000]);
    const [selectedDynamicFilters, setSelectedDynamicFilters] = useState({});
    const [availableDynamicFilters, setAvailableDynamicFilters] = useState({});
    const [filterValueMap, setFilterValueMap] = useState({});
    const [filterIdMap, setFilterIdMap] = useState({});
    const [dynamicFiltersConfig, setDynamicFiltersConfig] = useState([]);
    const [sortBy, setSortBy] = useState('price_asc');
    const [itemsPerPage, setItemsPerPage] = useState(12);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [availability, setAvailability] = useState({ inStock: false, onOffer: false, isNew: false });

    const { addToCart } = useCart();
    const { profile } = useAuth();

    const isCatalogHome = !categoryQuery && !subcategoryQuery && !roomId && !brandQuery && !professionSlug && !searchQuery;

    // Reset filters and page when main section changes
    useEffect(() => {
        setSelectedDynamicFilters({});
        setAvailability({ inStock: false, onOffer: false, isNew: false });
        setCurrentPage(1);
    }, [categoryQuery, roomId, brandQuery, professionSlug, searchQuery]);

    const normalizeFilterValue = (val) => {
        if (!val) return '';
        let v = String(val).trim();
        let clean = v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        // Unificación de Blancos (Solicitud del usuario)
        if (/^3000k?$/i.test(v) || clean.includes('calido') || clean.includes('caliido') || clean.includes('3000')) return 'Blanco Cálido';
        if (/^4000k?$/i.test(v) || clean.includes('neutro') || clean.includes('4000')) return 'Blanco Neutro';
        if (/^6000k?$/i.test(v) || clean.includes('frio') || clean.includes('6000')) return 'Blanco Frío';

        if (v.toUpperCase() === 'CCT' || v.toUpperCase() === 'TRICOLOR' || (v.toUpperCase().includes('CCT') && !v.toUpperCase().includes('VALOR'))) return 'CCT (Tricolor)';

        // Si tiene números (Potencia, Voltaje, etc.), mantener mayúsculas
        if (/\d/.test(v)) return v.toUpperCase();

        return v.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };

    useEffect(() => {
        async function init() {
            if (categories.length === 0) {
                const [c, r, b, p] = await Promise.all([
                    supabase.from('categories').select('*').order('order_index'),
                    supabase.from('rooms').select('*').order('name'),
                    supabase.from('brands').select('*').order('name'),
                    supabase.from('professions').select('*').order('order_index')
                ]);
                setCategories(c.data || []); setRooms(r.data || []); setBrands(b.data || []); setProfessions(p.data || []);
            }
        }
        init();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [categoryQuery, subcategoryQuery, roomId, brandQuery, professionSlug, searchQuery, currentPage, itemsPerPage, sortBy, priceRange, selectedDynamicFilters, availability]);

    async function fetchProducts() {
        try {
            setLoading(true);
            const allCats = categories.length > 0 ? categories : (await supabase.from('categories').select('*')).data || [];
            const currentCat = allCats.find(c => c.slug === categoryQuery?.toLowerCase());

            // 1. Fetch Dynamic Filter Config for this category
            const { data: allF } = await supabase.from('dynamic_filters').select('*, associations:dynamic_filter_categories(category_id)').eq('is_active', true).order('order_index');
            const catF = (allF || []).filter(f => {
                const assocs = f.associations || [];
                return assocs.length === 0 || (currentCat && assocs.some(a => a.category_id === currentCat.id));
            });
            setDynamicFiltersConfig(catF);

            // 2. Build and Execute Meta Query (Hibrido - Trae todos los atributos)
            let qSelect = '*, variants:products(image_url, attributes), product_rooms(room_id), product_professions(profession_id), product_badges(badges(*))';
            if (roomId) qSelect = '*, variants:products(image_url, attributes), product_rooms!inner(room_id), product_professions(profession_id), product_badges(badges(*))';

            let buildQ = (isMeta = false) => {
                let q = supabase.from('products').select(isMeta ? 'id, attributes, price, parent_id' : qSelect, { count: 'exact' });
                if (!isMeta) q = q.is('parent_id', null);
                q = q.neq('is_active', false);
                if (currentCat) {
                    const getIds = (id, cats) => {
                        let ids = [id];
                        cats.filter(c => c.parent_id === id).forEach(child => ids = [...ids, ...getIds(child.id, cats)]);
                        return ids;
                    };
                    q = q.in('category_id', getIds(currentCat.id, allCats));
                }
                if (subcategoryQuery) {
                    const sub = allCats.find(c => c.slug === subcategoryQuery.toLowerCase());
                    if (sub) q = q.eq('category_id', sub.id);
                }
                if (searchQuery) q = q.or(`name.ilike.%${searchQuery}%,reference.ilike.%${searchQuery}%`);
                if (roomId) q = q.eq('product_rooms.room_id', roomId);
                return q;
            };

            const { data: metaData } = await buildQ(true).limit(5000);
            const newValueMap = {}; const newIdMap = {}; const newAttrFilters = {};
            let minP = Infinity; let maxP = -Infinity;

            if (metaData) {
                const keys = catF.map(f => f.attribute_key);
                metaData.forEach(p => {
                    const attrs = p.attributes || {}; const price = p.price || 0; const targetId = p.parent_id || p.id;
                    if (price < minP) minP = price; if (price > maxP) maxP = price;
                    Object.entries(attrs).forEach(([k, v]) => {
                        if (!keys.includes(k)) return;
                        if (!newAttrFilters[k]) newAttrFilters[k] = new Set();
                        if (!newIdMap[k]) newIdMap[k] = {};
                        const proc = (val) => {
                            const orig = String(val).trim(); const norm = normalizeFilterValue(orig);
                            newAttrFilters[k].add(norm);
                            if (!newIdMap[k][norm]) newIdMap[k][norm] = new Set();
                            newIdMap[k][norm].add(targetId);
                        };
                        if (Array.isArray(v)) v.forEach(proc); else if (v) proc(v);
                    });
                });
                setAvailableDynamicFilters(newAttrFilters); setFilterIdMap(newIdMap);
                const fMin = minP === Infinity ? 0 : Math.floor(minP);
                const fMax = maxP === -Infinity ? 2000 : Math.ceil(maxP);
                if (priceLimits[0] !== fMin || priceLimits[1] !== fMax) setPriceLimits([fMin, fMax]);
            }

            // 3. In-memory Filter Logic
            let filteredIds = null;
            const activeF = Object.entries(selectedDynamicFilters).filter(([_, v]) => v && v.length > 0);
            if (activeF.length > 0) {
                activeF.forEach(([key, values]) => {
                    const groupIds = new Set();
                    values.forEach(v => {
                        const ids = (newIdMap[key] || filterIdMap[key] || {})[v];
                        if (ids) ids.forEach(id => groupIds.add(id));
                    });
                    if (filteredIds === null) filteredIds = groupIds;
                    else filteredIds = new Set([...filteredIds].filter(id => groupIds.has(id)));
                });
            }

            if (filteredIds !== null && filteredIds.size === 0) {
                setProducts([]); setTotalResults(0); setLoading(false); return;
            }

            // 4. Final Query
            let dataQ = buildQ(false);
            if (filteredIds) dataQ = dataQ.in('id', Array.from(filteredIds));
            if (priceRange[0] > 0) dataQ = dataQ.gte('price', priceRange[0]);
            if (priceRange[1] < (maxP === -Infinity ? 2000 : maxP)) dataQ = dataQ.lte('price', priceRange[1]);

            switch (sortBy) {
                case 'price_asc': dataQ = dataQ.order('price', { ascending: true }); break;
                case 'price_desc': dataQ = dataQ.order('price', { ascending: false }); break;
                default: dataQ = dataQ.order('created_at', { ascending: false }); break;
            }

            const from = (currentPage - 1) * itemsPerPage; const to = from + itemsPerPage - 1;
            const { data, count, error } = await dataQ.range(from, to);
            if (error) throw error;
            setProducts(data || []); setTotalResults(count || 0);
            setActiveCategory(currentCat);
            setSubcategories(allCats.filter(c => c.parent_id === currentCat?.id));

        } catch (e) { console.error(e); } finally { setLoading(false); }
    }

    const clearFilters = () => { setPriceRange([priceLimits[0], priceLimits[1]]); setSelectedDynamicFilters({}); };

    const totalPages = Math.max(1, Math.ceil(totalResults / itemsPerPage));
    const pageNumbers = useMemo(() => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages = new Set([1, totalPages, currentPage]);
        if (currentPage > 1) pages.add(currentPage - 1);
        if (currentPage < totalPages) pages.add(currentPage + 1);
        return [...pages].sort((a, b) => a - b);
    }, [totalPages, currentPage]);

    return (
        <div className="container mx-auto px-4 py-8">
            {!isCatalogHome && (
                <div className="text-sm text-gray-500 mb-8">
                    <Link to="/" className="hover:text-primary transition-colors">Inicio</Link> /
                    <span className="text-gray-900 font-medium ml-2">{activeCategory?.name || 'Catálogo'}</span>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
                {!isCatalogHome && (
                    <aside className={`lg:w-72 flex-shrink-0 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
                        <div className="bg-white p-7 rounded-[2.5rem] shadow-luxury border border-gray-100 sticky top-24 space-y-8">
                            <h3 className="font-black text-brand-carbon uppercase italic text-xs tracking-[.2em] flex items-center gap-3">
                                <Filter className="w-4 h-4 text-primary" /> Filtros
                            </h3>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio</h4>
                                <input type="range" min={priceLimits[0]} max={priceLimits[1]} value={priceRange[1]}
                                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                    className="w-full accent-primary h-1.5 bg-gray-100 rounded-lg appearance-none" />
                                <div className="flex justify-between text-[10px] font-black italic"><span>{priceRange[0]}€</span><span className="text-primary">{priceRange[1]}€</span></div>
                            </div>

                            {Object.entries(availableDynamicFilters).map(([k, set]) => {
                                const config = dynamicFiltersConfig.find(f => f.attribute_key === k);
                                const label = config ? config.label : k;

                                // Ordenamiento inteligente: Ascendente si tiene números (Potencia, Kelvin...), sino alfabético
                                const values = Array.from(set).sort((a, b) => {
                                    const numA = parseFloat(String(a).replace(/[^\d.-]/g, '')) || 0;
                                    const numB = parseFloat(String(b).replace(/[^\d.-]/g, '')) || 0;
                                    if (numA !== 0 || numB !== 0) return numA - numB;
                                    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
                                });

                                return (
                                    <div key={label} className="space-y-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {values.map(val => {
                                                const isSel = (selectedDynamicFilters[k] || []).includes(val);
                                                const cCode = COLOR_MAP[val] || COLOR_MAP[Object.keys(COLOR_MAP).find(ck => ck.toLowerCase() === val.toLowerCase())];
                                                if (cCode) return (
                                                    <button key={val} onClick={() => setSelectedDynamicFilters(prev => {
                                                        const cur = prev[k] || [];
                                                        return { ...prev, [k]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] };
                                                    })} title={val} className={`w-10 h-10 rounded-full border-2 transition-all duration-500 flex items-center justify-center relative
                                                        ${isSel ? 'ring-4 ring-primary scale-125 border-primary z-10 shadow-2xl' : 'border-white shadow-md hover:scale-110'}`}
                                                        style={{ background: cCode, boxShadow: isSel ? `0 0 30px rgba(59,130,246,0.6)` : '0 4px 10px rgba(0,0,0,0.05)' }} />
                                                );
                                                return (
                                                    <button key={val} onClick={() => setSelectedDynamicFilters(prev => {
                                                        const cur = prev[k] || [];
                                                        return { ...prev, [k]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] };
                                                    })} className={`px-4 py-2 rounded-xl text-[10px] font-black italic border transition-all duration-300
                                                        ${isSel ? 'bg-primary border-primary text-white shadow-[0_10px_30px_rgba(59,130,246,0.6)] ring-4 ring-primary/30 scale-110 z-10' : 'bg-white border-gray-100 text-gray-400 hover:border-primary/30'}`}>
                                                        {val}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                            <button onClick={clearFilters} className="w-full py-3 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black uppercase italic border border-gray-100">Limpiar Todo</button>
                        </div>
                    </aside>
                )}

                <div className="flex-1 min-w-0">
                    {isCatalogHome ? <div className="pt-4"><CategoryGrid /></div> : (
                        <>
                            {activeCategory && <h2 className="text-3xl md:text-5xl font-black text-brand-carbon uppercase italic leading-none mb-10">{activeCategory.name} <br /><span className="text-gray-300">Colección</span></h2>}

                            <div className="flex items-center justify-between mb-8 p-5 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setFiltersOpen(true)} className="lg:hidden text-[10px] font-black uppercase px-4 py-2 bg-gray-50 rounded-xl">Filtros</button>
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest italic">{totalResults} piezas encontradas</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {PAGE_SIZE_OPTIONS.map(n => (
                                        <button key={n} onClick={() => setItemsPerPage(n)} className={`w-8 h-8 rounded-lg text-[9px] font-black border transition-all ${itemsPerPage === n ? 'bg-brand-carbon text-white' : 'bg-white text-gray-400'}`}>{n}</button>
                                    ))}
                                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-gray-50 border-none rounded-xl text-[10px] font-black uppercase italic px-4 py-2">
                                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center p-20 text-gray-300"><Loader2 className="w-10 h-10 animate-spin mb-4" /><p className="text-[9px] font-black uppercase">Cargando selección boutique...</p></div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {products.map((p, i) => <ProductCard key={p.id} product={p} profile={profile} addToCart={addToCart} isLCP={i < 4} />)}
                                        {products.length === 0 && <div className="col-span-full py-20 text-center text-[10px] font-black uppercase text-gray-400">Sin piezas disponibles para esta selección</div>}
                                    </div>
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between mt-12 bg-white p-5 rounded-[2rem] border border-gray-100">
                                            <span className="text-[10px] font-black text-gray-300 uppercase">Pág. {currentPage} de {totalPages}</span>
                                            <div className="flex gap-1.5">
                                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100"><ChevronLeft className="w-4 h-4" /></button>
                                                {pageNumbers.map(n => <button key={n} onClick={() => setCurrentPage(n)} className={`w-9 h-9 flex items-center justify-center rounded-xl text-[10px] font-black border ${currentPage === n ? 'bg-primary text-white border-primary' : 'bg-white border-gray-100 text-gray-400'}`}>{n}</button>)}
                                                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100"><ChevronRight className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
