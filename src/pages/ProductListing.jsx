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
    "Dorado": "linear-gradient(135deg, #FFD700, #FFFACD, #B8860B, #FFD700)",
    "Plateado": "linear-gradient(135deg, #C0C0C0, #FFFFFF, #808080)",
    "Cobre": "linear-gradient(135deg, #B87333, #FF7F50, #8B4513)",
    "Rojo": "#FF0000",
    "Azul": "#0047AB",
    "Azul Claro": "#00CCFF",
    "Cian": "#00CCFF",
    "Azul Hielo": "#ACE5EE",
    "Verde": "#00FF66",
    "Madera": "#A0522D",
    "Beige": "#F5F5DC",
    "Rosa": "#FF00FF",
    "Morado": "#BF00FF",
    "Naranja": "#FF6600",
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
const MAX_P_FALLBACK = 2000;

// Aliases for unified filtering (case-insensitive)
const ATTRIBUTE_ALIASES = {
    'Potencia': ['potencia', 'power', 'watios', 'potencia (w)', 'w'],
    'Color': ['color', 'tono', 'luz', 'temperatura', 'cct'],
    'Voltaje': ['voltaje', 'voltage', 'tension', 'v'],
    'Protección IP': ['protección ip', 'proteccion ip', 'ip'],
    'Medida': ['medida', 'medidas', 'dimensiones', 'tamaño'],
};

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

const ProductCard = memo(({ product, profile, addToCart, selectedDynamicFilters = {}, isLCP = false }) => {
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

    const techSpecs = useMemo(() => {
        const attrs = product.attributes || {};
        const specs = [];
        const power = attrs['Potencia'] || attrs['power'] || attrs['Watios'] || attrs['Potencia (W)'];
        if (power) specs.push({ icon: Zap, label: String(power).includes('W') ? power : `${power}W` });
        const ip = attrs['IP'] || attrs['Protección IP'] || attrs['Proteccion IP'];
        if (ip) specs.push({ icon: Droplets, label: String(ip).startsWith('IP') ? ip : `IP${ip}` });

        const measurements = attrs['Medidas'] || attrs['Medida'] || attrs['Dimensiones'];
        if (measurements) {
            const label = Array.isArray(measurements) ? measurements[0] : measurements;
            specs.push({ icon: BoxSelect, label: String(label).toLowerCase().includes('mm') || String(label).includes('x') ? label : `${label}mm` });
        }

        const dimmable = attrs['Regulable'] || attrs['Dimmable'];
        if (dimmable && String(dimmable).toLowerCase() !== 'no') {
            specs.push({ icon: Sun, label: 'Regulable' });
        }
        return specs;
    }, [product.attributes]);

    useEffect(() => {
        if (!isHovered || images.length <= 1) { setCurrentImgIndex(0); return; }
        const interval = setInterval(() => setCurrentImgIndex(prev => (prev + 1) % images.length), 1500);
        return () => clearInterval(interval);
    }, [isHovered, images.length]);

    const activeVariantImg = useMemo(() => {
        if (!product.variants || product.variants.length === 0) return null;
        const activeColors = selectedDynamicFilters['Color'] || selectedDynamicFilters['Tono'] || [];
        if (activeColors.length === 0) return null;

        // Find a variant that matches one of the active colors
        const match = product.variants.find(v => {
            const tone = v.attributes?.['Tono'] || v.attributes?.['Luz'] || v.attributes?.['Color'] || v.attributes?.['Temperatura'];
            if (!tone) return false;
            const normTone = normalizeFilterValue(String(tone).trim());
            return activeColors.includes(normTone);
        });

        return match?.image_url || null;
    }, [product.variants, selectedDynamicFilters]);

    const displayImage = useMemo(() => {
        const rawImg = activeVariantImg || images[currentImgIndex];
        return optimizeImage(rawImg, 400, 400);
    }, [images, currentImgIndex, activeVariantImg]);

    const [localQty, setLocalQty] = useState(product.is_by_meter ? (product.min_meters || 1) : 1);

    return (
        <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
            className="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-luxury hover:shadow-luxury-hover transition-all duration-700 border border-gray-100/50 flex flex-col">
            <Link to={`/product/${product.slug || product.id}`} className="block relative aspect-square p-8 overflow-hidden group/img">
                <div className="absolute inset-0 bg-gray-50/20 opacity-0 group-hover/img:opacity-100 transition-opacity" />
                <BadgeRenderer product={product} />
                <div className="w-full h-full relative">
                    <img
                        src={displayImage}
                        alt={product.name}
                        loading={isLCP ? "eager" : "lazy"}
                        fetchpriority={isLCP ? "high" : "auto"}
                        decoding="async"
                        width={400}
                        height={400}
                        className="absolute inset-0 w-full h-full object-contain transition-all duration-700 group-hover/img:scale-110"
                    />
                </div>
            </Link>
            <div className="p-8 pt-0 flex-1 flex flex-col">
                <div className="mb-4">
                    <StarRating rating={product.rating_avg} count={product.reviews_count} />
                    <Link to={`/product/${product.slug || product.id}`}>
                        <h3 className="text-sm font-black text-brand-carbon uppercase italic leading-tight group-hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
                    </Link>
                </div>

                {techSpecs.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-3">
                        {techSpecs.map((spec, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-gray-400 group/spec">
                                <spec.icon className="w-3 h-3 text-primary/60 group-hover/spec:text-primary transition-colors" />
                                <span className="text-[9px] font-bold uppercase tracking-tight">{spec.label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {variantOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {variantOptions.map(opt => <span key={opt} className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-md text-[7px] font-black uppercase text-gray-500">{opt}</span>)}
                    </div>
                )}

                {/* Sellos & Eficiencia */}
                {(product.energy_labels || (product.product_quality_seals && product.product_quality_seals.length > 0)) && (
                    <div className="flex items-center flex-wrap gap-3 mb-4">
                        {product.energy_labels && (
                            <div className="h-6 flex items-center">
                                {product.energy_labels.image_url ? (
                                    <img src={product.energy_labels.image_url} alt={product.energy_labels.name} className="h-full object-contain" title={`Etiqueta Energética: ${product.energy_labels.name}`} />
                                ) : (
                                    <span className="px-2 h-full flex items-center justify-center rounded text-[8px] font-black text-white" style={{ backgroundColor: product.energy_labels.color }}>
                                        {product.energy_labels.name}
                                    </span>
                                )}
                            </div>
                        )}
                        {product.product_quality_seals?.map((pqs, idx) => (
                            <img
                                key={idx}
                                src={pqs.quality_seals.image_url}
                                alt={pqs.quality_seals.name}
                                className="h-5 object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all"
                                title={pqs.quality_seals.name}
                            />
                        ))}
                    </div>
                )}
                <div className="mt-auto border-t border-gray-50 pt-6">
                    <div className="relative flex items-center justify-between h-12 lg:h-14">
                        {/* Price Section - Fades on hover to make room for absolute buy-bar */}
                        <div className="flex flex-col transition-all duration-300 group-hover:opacity-0 lg:group-hover:opacity-0 pointer-events-none group-hover:translate-x-[-10px]">
                            <span className={`text-[10px] font-black uppercase mb-1 ${pricing.isPartnerPrice ? 'text-yellow-500' : pricing.isProPrice ? 'text-primary' : 'text-gray-300'}`}>
                                {pricing.isPartnerPrice ? '★ Socio VIP' : pricing.isProPrice ? '✦ Precio Pro' : 'Precio'}
                            </span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black italic text-brand-carbon">{pricing.displayPrice.toFixed(2)}€</span>
                                {pricing.showPriceWithoutVat && (
                                    <span className="text-[10px] font-black text-primary uppercase italic">+IVA</span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center ml-auto">
                            {/* Special configuration products (except by-meter which we now handle) */}
                            {(!product.is_by_meter && (product.is_by_measurement || (product.mandatory_accessory_ids && product.mandatory_accessory_ids.length > 0))) ? (
                                <button
                                    onClick={(e) => { e.preventDefault(); navigate(`/product/${product.slug || product.id}`); }}
                                    className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-110 transition-all"
                                    title="Personalizar Producto"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                </button>
                            ) : product.is_by_meter ? (
                                <div className="absolute right-0 flex items-center bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:border-primary/20 p-1 group/buy shadow-sm max-w-full">
                                    {/* Meter Slider UI - Expanding on hover */}
                                    <div className="flex items-center overflow-hidden transition-all duration-300 lg:w-0 lg:opacity-0 group-hover:lg:w-40 group-hover:lg:opacity-100 lg:px-0 group-hover:lg:px-3 flex-grow sm:flex-grow-0 whitespace-nowrap">
                                        <div className="flex flex-col justify-center min-w-[120px]">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="text-[7px] font-black uppercase text-gray-400 italic">Metros</span>
                                                <span className="text-[10px] font-black text-primary italic leading-none">{localQty}m</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={product.min_meters || 1}
                                                max={product.max_meters || 100}
                                                step={product.meter_step || 1}
                                                value={localQty}
                                                onChange={(e) => {
                                                    e.preventDefault();
                                                    setLocalQty(parseFloat(e.target.value));
                                                }}
                                                onClick={(e) => e.preventDefault()}
                                                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                        <div className="w-px h-5 bg-gray-200 mx-2 hidden lg:block" />
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            addToCart({ ...product, price: pricing.finalPrice }, localQty || 1);
                                        }}
                                        className="w-10 h-10 lg:w-11 lg:h-11 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-all flex-shrink-0"
                                    >
                                        <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="absolute right-0 flex items-center bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:border-primary/20 p-1 group/buy shadow-sm">
                                    {/* Quantity Stepper */}
                                    <div className="flex items-center overflow-hidden transition-all duration-300 lg:w-0 lg:opacity-0 group-hover:lg:w-32 group-hover:lg:opacity-100 lg:px-0 group-hover:lg:px-2 flex-grow sm:flex-grow-0 whitespace-nowrap">
                                        <button
                                            onClick={(e) => { e.preventDefault(); setLocalQty(Math.max(1, localQty - 1)); }}
                                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-carbon font-black transition-colors"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            value={localQty}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (!isNaN(val) && val >= 1) setLocalQty(val);
                                                else if (e.target.value === '') setLocalQty('');
                                            }}
                                            onBlur={() => {
                                                if (localQty === '' || localQty < 1) setLocalQty(1);
                                            }}
                                            onClick={(e) => e.preventDefault()}
                                            className="w-10 bg-transparent text-center font-black italic text-brand-carbon border-none focus:outline-none text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <button
                                            onClick={(e) => { e.preventDefault(); setLocalQty((prev) => (prev === '' ? 1 : prev + 1)); }}
                                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-carbon font-black transition-colors"
                                        >
                                            +
                                        </button>
                                        <div className="w-px h-5 bg-gray-200 mx-2 hidden lg:block" />
                                    </div>
                                    <button
                                        onClick={(e) => { e.preventDefault(); addToCart({ ...product, price: pricing.finalPrice }, localQty || 1); }}
                                        className="w-10 h-10 lg:w-11 lg:h-11 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-all flex-shrink-0"
                                    >
                                        <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
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
    const [relationships, setRelationships] = useState([]);
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
    const [availabilityCounts, setAvailabilityCounts] = useState({ inStock: 0, onOffer: 0, isNew: 0 });

    const { addToCart } = useCart();
    const { profile } = useAuth();

    const isCatalogHome = !categoryQuery && !subcategoryQuery && !roomId && !brandQuery && !professionSlug && !searchQuery;

    // Reset filters and page when main section changes
    useEffect(() => {
        setSelectedDynamicFilters({});
        setAvailability({ inStock: false, onOffer: false, isNew: false });
        setCurrentPage(1);
        setProducts([]);
        setLoading(true);
    }, [categoryQuery, subcategoryQuery, roomId, brandQuery, professionSlug, searchQuery]);

    // Sync price slider to real product limits when they load
    useEffect(() => {
        setPriceRange([priceLimits[0], priceLimits[1]]);
    }, [priceLimits[0], priceLimits[1]]);



    useEffect(() => {
        async function init() {
            if (categories.length === 0) {
                const [c, r, b, p, rels] = await Promise.all([
                    supabase.from('categories').select('*').order('order_index'),
                    supabase.from('rooms').select('*').order('order_index'),
                    supabase.from('brands').select('*').order('order_index'),
                    supabase.from('professions').select('*').order('order_index'),
                    supabase.from('category_relationships').select('*')
                ]);
                setCategories(c.data || []);
                setRooms(r.data || []);
                setBrands(b.data || []);
                setProfessions(p.data || []);
                setRelationships(rels.data || []);
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
            const allCats = categories.length > 0 ? categories : (await supabase.from('categories').select('*').order('order_index')).data || [];
            const currentCat = allCats.find(c => c.slug?.toLowerCase() === categoryQuery?.toLowerCase());

            // 1. Gather all category IDs in scope (using many-to-many relationships)
            const gatherCatIds = (id, cats, rels) => {
                const ids = [id];
                // Find all children in relationships table
                const childrenIds = rels.filter(r => r.parent_id === id).map(r => r.child_id);
                childrenIds.forEach(childId => {
                    ids.push(...gatherCatIds(childId, cats, rels));
                });
                return [...new Set(ids)]; // Prevent duplicates if any
            };
            const scopedCatIds = currentCat ? gatherCatIds(currentCat.id, allCats, relationships.length > 0 ? relationships : (await supabase.from('category_relationships').select('*')).data || []) : [];

            // 2. Fetch Filter Config
            const { data: allF } = await supabase.from('dynamic_filters').select('*, associations:dynamic_filter_categories(category_id)').eq('is_active', true).order('order_index');
            const catF = (allF || []).filter(f => {
                const assocs = f.associations || [];
                return assocs.length === 0 || (scopedCatIds.length > 0 && assocs.some(a => scopedCatIds.includes(a.category_id)));
            });
            setDynamicFiltersConfig(catF);

            // 3. Build Query
            let qSelect = '*, variants:products(image_url, attributes), product_rooms(room_id), product_professions(profession_id), product_badges(badges(*)), energy_labels(*), product_quality_seals(quality_seals(*))';
            if (roomId) qSelect = '*, variants:products(image_url, attributes), product_rooms!inner(room_id), product_professions(profession_id), product_badges(badges(*)), energy_labels(*), product_quality_seals(quality_seals(*))';

            let buildQ = (isMeta = false) => {
                let q = supabase.from('products').select(isMeta ? 'id, attributes, price, discount_price, created_at, parent_id, stock' : qSelect, { count: 'exact' });
                if (!isMeta) q = q.is('parent_id', null);
                q = q.neq('is_active', false);

                if (currentCat && scopedCatIds.length > 0) {
                    q = q.in('category_id', scopedCatIds);
                }

                if (subcategoryQuery) {
                    const sub = allCats.find(c => c.slug?.toLowerCase() === subcategoryQuery.toLowerCase());
                    if (sub) q = q.eq('category_id', sub.id);
                }

                if (searchQuery) q = q.or(`name.ilike.%${searchQuery}%,reference.ilike.%${searchQuery}%`);
                if (roomId) q = q.eq('product_rooms.room_id', roomId);
                return q;
            };

            // 4. Meta Data for Filters and Availability
            let newAttrFilters = {};
            let newIdMap = {};
            let availableGroups = { inStock: new Set(), onOffer: new Set(), isNew: new Set() };
            let minP = Infinity;
            let maxP = 0;

            const { data: rpcData, error: rpcErr } = await supabase.rpc('get_catalog_metadata', {
                p_category_id: currentCat?.id,
                p_room_id: roomId,
                p_brand_id: brandQuery ? brands.find(b => b.slug === brandQuery)?.id : null,
                p_profession_id: professionSlug ? professions.find(p => p.slug === professionSlug)?.id : null,
                p_search_query: searchQuery
            });

            if (!rpcErr && rpcData) {
                // SUCCESS: Use server-side data for UI immediate update
                let filterableKeys = catF.length > 0 ? catF.map(f => f.attribute_key) : ['Potencia', 'Color', 'Voltaje', 'Medida', 'Material', 'Protección IP', 'CASQUILLO', 'Longitud', 'IP'];

                Object.entries(rpcData.attributes || {}).forEach(([k, vals]) => {
                    const kLower = k.toLowerCase();
                    const matchingKey = filterableKeys.find(fk => fk.toLowerCase() === kLower || (ATTRIBUTE_ALIASES[fk] || []).includes(kLower));
                    if (!matchingKey) return;

                    if (!newAttrFilters[matchingKey]) newAttrFilters[matchingKey] = new Set();
                    if (Array.isArray(vals)) {
                        vals.forEach(v => {
                            const norm = normalizeFilterValue(String(v).trim());
                            if (norm && norm.toLowerCase() !== 'n/a') newAttrFilters[matchingKey].add(norm);
                        });
                    }
                });
                setAvailableDynamicFilters(newAttrFilters);
                setAvailabilityCounts(rpcData.availability);
                setPriceLimits([Math.floor(rpcData.min_price), Math.ceil(rpcData.max_price)]);
                minP = Math.floor(rpcData.min_price);
                maxP = Math.ceil(rpcData.max_price);
            }

            // 5. Populate ID Maps (Needed for client-side filtering intersection)
            // Even if RPC worked, we still need the list of IDs for each filter if the user has active filters.
            // In a future phase, we will move the intersection to the server too.
            const needsMetaData = rpcErr || !rpcData || Object.keys(selectedDynamicFilters).length > 0 || availability.inStock || availability.onOffer || availability.isNew;

            if (needsMetaData) {
                const { data: metaData, error: metaErr } = await buildQ(true).limit(5000);
                if (!metaErr && metaData) {
                    let filterableKeys = catF.length > 0 ? catF.map(f => f.attribute_key) : ['Potencia', 'Color', 'Voltaje', 'Medida', 'Material', 'Protección IP', 'CASQUILLO', 'Longitud', 'IP'];
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    metaData.forEach(p => {
                        const targetId = p.parent_id || p.id;
                        const price = parseFloat(p.price || 0);
                        const salePrice = parseFloat(p.discount_price || 0);
                        const stock = parseInt(p.stock || 0);

                        if (rpcErr || !rpcData) {
                            if (price > 0 && price < minP) minP = price;
                            if (price > maxP) maxP = price;
                            if (stock > 0) availableGroups.inStock.add(targetId);
                            if (salePrice > 0 && salePrice < price) availableGroups.onOffer.add(targetId);
                            if (p.created_at && new Date(p.created_at) > thirtyDaysAgo) availableGroups.isNew.add(targetId);
                        } else {
                            // If RPC already gave us counts, we only need ID lists for active filters
                            if (stock > 0) availableGroups.inStock.add(targetId);
                            if (salePrice > 0 && salePrice < price) availableGroups.onOffer.add(targetId);
                            if (p.created_at && new Date(p.created_at) > thirtyDaysAgo) availableGroups.isNew.add(targetId);
                        }

                        // Attributes Mapping
                        const attrs = p.attributes || {};
                        Object.entries(attrs).forEach(([k, v]) => {
                            const kLower = k.toLowerCase();
                            const matchingKey = filterableKeys.find(fk => fk.toLowerCase() === kLower || (ATTRIBUTE_ALIASES[fk] || []).includes(kLower));
                            if (!matchingKey) return;

                            if (!newAttrFilters[matchingKey]) newAttrFilters[matchingKey] = new Set();
                            if (!newIdMap[matchingKey]) newIdMap[matchingKey] = {};

                            const proc = (val) => {
                                const norm = normalizeFilterValue(String(val).trim());
                                if (!norm || norm.toLowerCase() === 'n/a') return;
                                newAttrFilters[matchingKey].add(norm);
                                if (!newIdMap[matchingKey][norm]) newIdMap[matchingKey][norm] = new Set();
                                newIdMap[matchingKey][norm].add(targetId);
                            };
                            if (Array.isArray(v)) v.forEach(proc); else if (v) proc(v);
                        });
                    });

                    if (rpcErr || !rpcData) {
                        const finalMax = maxP > 0 ? Math.ceil(maxP) : MAX_P_FALLBACK;
                        const finalMin = minP !== Infinity ? Math.floor(minP) : 0;
                        setAvailableDynamicFilters(newAttrFilters);
                        setFilterIdMap(newIdMap);
                        setAvailabilityCounts({ inStock: availableGroups.inStock.size, onOffer: availableGroups.onOffer.size, isNew: availableGroups.isNew.size });
                        setPriceLimits([finalMin, finalMax]);
                    } else {
                        setFilterIdMap(newIdMap); // Support intersection even when RPC is main source
                    }
                }
            }

            // 6. Intersect Filter Results
            let combinedIds = null;
            if (availability.inStock) combinedIds = new Set(availableGroups.inStock);
            if (availability.onOffer) combinedIds = combinedIds ? new Set([...combinedIds].filter(id => availableGroups.onOffer.has(id))) : new Set(availableGroups.onOffer);
            if (availability.isNew) combinedIds = combinedIds ? new Set([...combinedIds].filter(id => availableGroups.isNew.has(id))) : new Set(availableGroups.isNew);

            const activeF = Object.entries(selectedDynamicFilters).filter(([_, v]) => v?.length > 0);
            activeF.forEach(([key, values]) => {
                const groupIds = new Set();
                values.forEach(v => (newIdMap[key]?.[v] || []).forEach(id => groupIds.add(id)));
                combinedIds = combinedIds ? new Set([...combinedIds].filter(id => groupIds.has(id))) : groupIds;
            });

            if (combinedIds !== null && combinedIds.size === 0) {
                setProducts([]); setTotalResults(0); setLoading(false); return;
            }

            // 6. Fetch Page
            let dataQ = buildQ(false);
            if (combinedIds) dataQ = dataQ.in('id', Array.from(combinedIds));
            if (priceRange[0] > 0) dataQ = dataQ.gte('price', priceRange[0]);
            if (priceRange[1] < maxP) dataQ = dataQ.lte('price', priceRange[1]);

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

            // Subcategories are those that have currentCat as one of their parents in relationships
            const rels = relationships.length > 0 ? relationships : (await supabase.from('category_relationships').select('*')).data || [];
            const subIds = rels.filter(r => r.parent_id === currentCat?.id).map(r => r.child_id);
            const subs = allCats.filter(c => subIds.includes(c.id)).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            setSubcategories(subs);

        } catch (e) { console.error('Product Fetch Error:', e); } finally { setLoading(false); }
    }

    const clearFilters = () => { setPriceRange([priceLimits[0], priceLimits[1]]); setSelectedDynamicFilters({}); setAvailability({ inStock: false, onOffer: false, isNew: false }); };

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

                            {/* 1. Precio */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio</h4>
                                <input type="range" min={priceLimits[0]} max={priceLimits[1]} value={priceRange[1]}
                                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                    className="w-full accent-primary h-1.5 bg-gray-100 rounded-lg appearance-none" />
                                <div className="flex justify-between text-[10px] font-black italic"><span>{priceRange[0]}€</span><span className="text-primary">{priceRange[1]}€</span></div>
                            </div>

                            {/* 2. Filtros dinámicos */}
                            {Object.entries(availableDynamicFilters).map(([k, set]) => {
                                const config = dynamicFiltersConfig.find(f => f.attribute_key === k);
                                const label = config ? config.label : k;

                                // Custom Sorting: Whites first, then numeric/alpha
                                const priority = ["Blanco Cálido", "Blanco Neutro", "Blanco Frío"];
                                const values = Array.from(set).sort((a, b) => {
                                    const idxA = priority.indexOf(a);
                                    const idxB = priority.indexOf(b);
                                    if (idxA !== -1 || idxB !== -1) {
                                        if (idxA === -1) return 1;
                                        if (idxB === -1) return -1;
                                        return idxA - idxB;
                                    }
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

                                                if (cCode) {
                                                    const isWhite = val.toLowerCase().includes('blanco');
                                                    const glowColor = cCode.startsWith('linear') || cCode.startsWith('conic') ? 'rgba(255,255,255,0.2)' : cCode;
                                                    const glow = !isWhite ? `0 0 15px ${glowColor}${isSel ? 'aa' : '44'}` : '0 4px 10px rgba(0,0,0,0.05)';

                                                    return (
                                                        <button key={val} onClick={() => setSelectedDynamicFilters(prev => {
                                                            const cur = prev[k] || [];
                                                            return { ...prev, [k]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] };
                                                        })} title={val} className={`w-10 h-10 rounded-full border-2 transition-all duration-500 flex items-center justify-center relative
                                                            ${isSel ? 'ring-4 ring-primary scale-125 border-primary z-10 shadow-2xl' : 'border-white shadow-md hover:scale-110'}`}
                                                            style={{
                                                                background: cCode,
                                                                boxShadow: isSel ? `0 0 30px ${isWhite ? 'rgba(59,130,246,0.6)' : glowColor}` : glow
                                                            }} />
                                                    );
                                                }

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

                            {/* 3. Disponibilidad */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Disponibilidad</h4>
                                {[
                                    { key: 'inStock', label: 'En Stock', count: availabilityCounts.inStock },
                                    { key: 'onOffer', label: 'En Oferta', count: availabilityCounts.onOffer },
                                    { key: 'isNew', label: 'Novedades', count: availabilityCounts.isNew },
                                ].map(({ key, label, count }) => (
                                    <label key={key} className="flex items-center gap-3 cursor-pointer group">
                                        <span
                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${availability[key] ? 'bg-primary border-primary' : 'border-gray-200 group-hover:border-primary/40'
                                                }`}
                                            onClick={() => setAvailability(prev => ({ ...prev, [key]: !prev[key] }))}
                                        >
                                            {availability[key] && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </span>
                                        <span className="text-[10px] font-black uppercase italic text-gray-500 group-hover:text-brand-carbon transition-colors flex-1">{label}</span>
                                        <span className="text-[9px] font-black text-gray-300">{count}</span>
                                    </label>
                                ))}
                            </div>

                            {/* 4. Limpiar */}
                            <button onClick={clearFilters} className="w-full py-3 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black uppercase italic border border-gray-100">Limpiar Todo</button>

                            {/* 5. Catálogo nav */}
                            <div className="space-y-1 border-t border-gray-100 pt-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Catálogo</h4>
                                <button onClick={() => navigate('/catalogo')}
                                    className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all duration-200 text-gray-400 hover:bg-gray-50 hover:text-brand-carbon">
                                    Ver Todo
                                </button>
                                {categories.filter(c => !relationships.some(r => r.child_id === c.id)).map(cat => (
                                    <button key={cat.id}
                                        onClick={() => navigate(`/catalogo?category=${cat.slug}`)}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all duration-200 ${categoryQuery === cat.slug ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-brand-carbon'
                                            }`}>
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>
                )}

                <div className="flex-1 min-w-0">
                    {isCatalogHome ? <div className="pt-4"><CategoryGrid /></div> : (
                        <>
                            {activeCategory && <h2 className="text-3xl md:text-5xl font-black text-brand-carbon uppercase italic leading-none mb-10">{activeCategory.name} <br /><span className="text-gray-300">Colección</span></h2>}

                            {/* Subcategorías — Unificadas e Iconográficas */}
                            {subcategories.length > 0 && (
                                <div className="mb-10 flex flex-wrap gap-4 overflow-x-auto pb-4 hide-scrollbar">
                                    {subcategories.map(sub => {
                                        const isActive = subcategoryQuery === sub.slug;
                                        return (
                                            <button
                                                key={sub.id}
                                                onClick={() => {
                                                    if (isActive) navigate(`/catalogo?category=${categoryQuery}`);
                                                    else navigate(`/catalogo?category=${categoryQuery}&subcategory=${sub.slug}`);
                                                }}
                                                className={`group flex flex-col items-center justify-center min-w-[80px] py-3 px-1 border-b-2 transition-all duration-300
                                                    ${isActive ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-brand-carbon'}`}
                                            >
                                                <div className="w-8 h-8 mb-2 flex items-center justify-center">
                                                    {sub.image_url ? (
                                                        <img src={sub.image_url} alt={sub.name} className={`w-full h-full object-contain transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'}`} />
                                                    ) : (() => {
                                                        const IconComp = ICON_MAP[sub.icon_name] || Tag;
                                                        return <IconComp className={`w-5 h-5 transition-colors duration-300 ${isActive ? 'text-primary' : 'text-gray-300 group-hover:text-primary'}`} />;
                                                    })()}
                                                </div>
                                                <span className={`text-[8px] font-black uppercase tracking-tight transition-colors duration-300 ${isActive ? 'text-primary' : 'text-gray-400'}`}>{sub.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-8 p-5 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setFiltersOpen(true)} className="lg:hidden text-[10px] font-black uppercase px-4 py-2 bg-gray-50 rounded-xl">Filtros</button>
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest italic">{totalResults} piezas encontradas</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {PAGE_SIZE_OPTIONS.map(n => (
                                        <button key={n} onClick={() => { setItemsPerPage(n); setCurrentPage(1); }} className={`w-8 h-8 rounded-lg text-[9px] font-black border transition-all ${itemsPerPage === n ? 'bg-brand-carbon text-white' : 'bg-white text-gray-400'}`}>{n}</button>
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
                                        {products.map((p, i) => <ProductCard key={p.id} product={p} profile={profile} addToCart={addToCart} selectedDynamicFilters={selectedDynamicFilters} isLCP={i < 4} />)}
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
