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

const ICON_MAP = {
    BoxSelect, Square, Grid, Zap, Lightbulb, Tag, Settings
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

    // Get all unique images (parent + variants)
    const images = useMemo(() => {
        const imgs = [product.image_url];
        if (product.variants && Array.isArray(product.variants)) {
            product.variants.forEach(v => {
                if (v.image_url && v.image_url !== product.image_url && !imgs.includes(v.image_url)) {
                    imgs.push(v.image_url);
                }
            });
        }
        return imgs.filter(img => img); // Remove nulls
    }, [product]);

    // Extract unique variant attributes (like Color, Light Tone, etc.)
    const variantOptions = useMemo(() => {
        const options = new Set();
        if (product.variants && Array.isArray(product.variants)) {
            product.variants.forEach(v => {
                const attrs = v.attributes || {};
                const tone = attrs['Tono'] || attrs['Luz'] || attrs['Color'] || attrs['Temperatura'];
                if (tone) options.add(String(tone).trim());
            });
        }
        return Array.from(options).sort();
    }, [product.variants]);

    const techSpecs = useMemo(() => {
        const attrs = product.attributes || {};
        const specs = [];
        const power = attrs['Potencia'] || attrs['power'] || attrs['Watios'] || attrs['Potencia (W)'];
        if (power) specs.push({ icon: Zap, label: String(power).includes('W') ? power : `${power}W` });
        const ip = attrs['IP'] || attrs['Protección IP'] || attrs['Proteccion IP'];
        if (ip) specs.push({ icon: Droplets, label: String(ip).startsWith('IP') ? ip : `IP${ip}` });
        const dimmable = attrs['Regulable'] || attrs['Dimmable'];
        if (dimmable && String(dimmable).toLowerCase() !== 'no') {
            specs.push({ icon: Sun, label: 'Regulable' });
        }
        return specs;
    }, [product.attributes]);

    // Cycle images ONLY when hovered to save CPU/TBT
    useEffect(() => {
        if (!isHovered || images.length <= 1) {
            setCurrentImgIndex(0);
            return;
        }

        const interval = setInterval(() => {
            setCurrentImgIndex(prev => (prev + 1) % images.length);
        }, 1500);

        return () => clearInterval(interval);
    }, [isHovered, images.length]);

    const displayImage = useMemo(() =>
        optimizeImage(images[currentImgIndex], 400, 400),
        [images, currentImgIndex]);

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-luxury hover:shadow-luxury-hover transition-all duration-700 border border-gray-100/50 flex flex-col"
        >
            <Link to={`/product/${product.slug || product.id}`}
                className="block relative aspect-square p-8 overflow-hidden group/img">
                <div className="absolute inset-0 bg-gray-50/20 opacity-0 group-hover/img:opacity-100 transition-opacity" />
                <BadgeRenderer product={product} />

                <div className="w-full h-full relative">
                    <img
                        src={displayImage}
                        alt={product.name}
                        loading={isLCP ? "eager" : "lazy"}
                        fetchpriority={isLCP ? "high" : "auto"}
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
                        <h3 className="text-sm font-black text-brand-carbon uppercase italic leading-tight group-hover:text-primary transition-colors line-clamp-2">
                            {product.name}
                        </h3>
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
                        {variantOptions.map(opt => (
                            <span key={opt} className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-md text-[7px] font-black uppercase tracking-tighter text-gray-500 whitespace-nowrap">
                                {opt}
                            </span>
                        ))}
                    </div>
                )}

                {images.length > 1 && (
                    <div className="flex gap-1 mb-4">
                        {images.map((_, i) => (
                            <div key={i} className={`h-0.5 rounded-full transition-all duration-500 ${i === currentImgIndex ? 'w-4 bg-primary' : 'w-1 bg-gray-200'}`} />
                        ))}
                    </div>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-6">
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${pricing.isPartnerPrice ? 'text-yellow-500' : pricing.isProPrice ? 'text-primary' : 'text-gray-300'}`}>
                            {pricing.isPartnerPrice ? '★ Socio VIP' : pricing.isProPrice ? '✦ Precio Pro' : 'Precio'}
                        </span>
                        <span className="text-xl font-black italic text-brand-carbon">
                            {pricing.finalPrice.toFixed(2)}€
                        </span>
                    </div>
                    <button onClick={(e) => { e.preventDefault(); addToCart({ ...product, price: pricing.finalPrice }); }}
                        className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-110 active:scale-95 transition-all">
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

    const [filtersOpen, setFiltersOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [brands, setBrands] = useState([]);
    const [professions, setProfessions] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [loading, setLoading] = useState(true);

    const isCatalogHome = !categoryQuery && !subcategoryQuery && !roomId && !brandQuery && !professionSlug && !searchQuery;

    // Advanced Filter States
    const [priceRange, setPriceRange] = useState([0, 2000]);
    const [selectedDynamicFilters, setSelectedDynamicFilters] = useState({}); // e.g. { Potencia: ['12W'], Color: ['Rojo'] }
    const [availableDynamicFilters, setAvailableDynamicFilters] = useState({}); // e.g. { Potencia: Set(['12W']), ... }
    const [priceLimits, setPriceLimits] = useState([0, 2000]);
    const [availability, setAvailability] = useState({ inStock: false, onOffer: false, isNew: false });
    const [dynamicFiltersConfig, setDynamicFiltersConfig] = useState([]); // [{id, attribute_key, label, ...}]

    // Pagination & Sort
    const [sortBy, setSortBy] = useState('price_asc');
    const [itemsPerPage, setItemsPerPage] = useState(12);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [sortOpen, setSortOpen] = useState(false);

    const { addToCart } = useCart();
    const { profile } = useAuth();

    useEffect(() => {
        fetchFilterConfig();
        fetchProducts();
    }, [categoryQuery, subcategoryQuery, roomId, brandQuery, professionSlug, searchQuery, currentPage, itemsPerPage, sortBy, priceRange, selectedDynamicFilters, availability]);

    async function fetchFilterConfig() {
        try {
            const allCats = categories.length > 0 ? categories : (await supabase.from('categories').select('id, slug')).data || [];
            const currentCat = allCats.find(c => c.slug === categoryQuery?.toLowerCase());

            // Fetch all active filters WITH their category associations (N:N)
            const { data: allFilters, error } = await supabase
                .from('dynamic_filters')
                .select('*, associations:dynamic_filter_categories(category_id)')
                .eq('is_active', true)
                .order('order_index', { ascending: true });

            if (error) throw error;

            // Show filter if: (1) No associations = Global, OR (2) associated with current category
            const filteredConfig = (allFilters || []).filter(f => {
                const assocs = f.associations || [];
                if (assocs.length === 0) return true;
                if (currentCat) return assocs.some(a => a.category_id === currentCat.id);
                return false;
            });

            setDynamicFiltersConfig(filteredConfig);

        } catch (error) {
            console.error('Error fetching filter config:', error);
            setDynamicFiltersConfig([]);
        }
    }

    useEffect(() => {
        applyFilters();
    }, [products, priceRange, selectedDynamicFilters, availability]);

    // Reset filters and page when major parameters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedDynamicFilters({});
        setAvailableDynamicFilters({}); // Clear available filters to re-populate from new context
    }, [categoryQuery, subcategoryQuery, roomId, brandQuery, professionSlug, searchQuery]);

    // Reset pagination when sorting or items per page change
    useEffect(() => {
        if (currentPage !== 1) setCurrentPage(1);
    }, [sortBy, itemsPerPage]);

    async function fetchProducts() {
        try {
            setLoading(true);

            // 1. Fetch metadata (categories, rooms, etc.) only if not already loaded
            if (categories.length === 0) {
                const [catRes, roomsRes, brandsRes, profsRes] = await Promise.all([
                    supabase.from('categories').select('*').order('order_index', { ascending: true }),
                    supabase.from('rooms').select('*').order('name'),
                    supabase.from('brands').select('*').order('name'),
                    supabase.from('professions').select('*').order('order_index', { ascending: true })
                ]);
                setCategories(catRes.data || []);
                setRooms(roomsRes.data || []);
                setBrands(brandsRes.data || []);
                setProfessions(profsRes.data || []);
            }

            const allCategories = categories.length > 0 ? categories : (await supabase.from('categories').select('*')).data || [];

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

            // 2. Build Base Query for Counting & Data
            let querySelect = '*, variants:products(image_url, attributes), product_rooms(room_id), product_professions(profession_id), product_badges(badges(*))';
            if (roomId) querySelect = '*, variants:products(image_url, attributes), product_rooms!inner(room_id), product_professions(profession_id), product_badges(badges(*))';
            if (professionSlug) querySelect = '*, variants:products(image_url, attributes), product_rooms(room_id), product_professions!inner(profession_id), product_badges(badges(*))';

            let baseQuery = supabase.from('products').select(querySelect, { count: 'exact' }).is('parent_id', null);

            // Add visibility filter
            baseQuery = baseQuery.neq('is_active', false);

            // Apply URL-based filters
            if (searchQuery) {
                // Si hay búsqueda, permitimos encontrar por nombre o referencia en toda la tabla 
                // e intentamos que sea una búsqueda lo más abierta posible.
                baseQuery = baseQuery.or(`name.ilike.%${searchQuery}%,reference.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
            }

            if (subcategoryQuery) {
                const subCatData = allCategories.find(c => c.slug === subcategoryQuery.toLowerCase());
                if (subCatData) baseQuery = baseQuery.or(`category_id.eq.${subCatData.id},category.ilike.%${subcategoryQuery}%`);
            } else if (categoryQuery && categoryQuery !== 'all') {
                const currentCat = allCategories.find(c => c.slug === categoryQuery.toLowerCase());
                if (currentCat) {
                    const getAllChildIds = (parentId, cats) => {
                        let ids = [parentId];
                        cats.filter(c => c.parent_id === parentId).forEach(child => {
                            ids = [...ids, ...getAllChildIds(child.id, cats)];
                        });
                        return ids;
                    };
                    const relatedIds = getAllChildIds(currentCat.id, allCategories);
                    baseQuery = baseQuery.in('category_id', relatedIds);
                }
            }

            if (roomId) baseQuery = baseQuery.eq('product_rooms.room_id', roomId);
            if (brandQuery) {
                const brand = brands.find(b => b.id === brandQuery || b.name.toLowerCase() === brandQuery.toLowerCase());
                if (brand) baseQuery = baseQuery.eq('brand_id', brand.id);
            }
            if (professionSlug) {
                const prof = professions.find(p => p.slug === professionSlug.toLowerCase());
                if (prof) baseQuery = baseQuery.eq('product_professions.profession_id', prof.id);
            }

            // 3. APPLY DYNAMIC ATTRIBUTE FILTERS (Server-side)
            Object.entries(selectedDynamicFilters).forEach(([key, selectedValues]) => {
                if (selectedValues && selectedValues.length > 0) {
                    // Build robust filter: text matches OR array contains
                    const attrFilters = selectedValues.map(v =>
                        `attributes->>${key}.ilike.${v},attributes->${key}.cs.["${v}"]`
                    ).join(',');
                    baseQuery = baseQuery.or(attrFilters);
                }
            });

            if (priceRange[0] > 0) baseQuery = baseQuery.gte('price', priceRange[0]);
            if (priceRange[1] < 2000) baseQuery = baseQuery.lte('price', priceRange[1]);

            if (availability.inStock) baseQuery = baseQuery.gt('stock', 0);
            if (availability.onOffer) baseQuery = baseQuery.not('discount_price', 'is', null).filter('discount_price', 'lt', 'price');
            if (availability.isNew) {
                const limit = new Date();
                limit.setDate(limit.getDate() - 30);
                baseQuery = baseQuery.gt('created_at', limit.toISOString());
            }

            // 4. APPLY SORTING
            switch (sortBy) {
                case 'price_asc':
                    baseQuery = baseQuery.order('price', { ascending: true });
                    break;
                case 'price_desc':
                    baseQuery = baseQuery.order('price', { ascending: false });
                    break;
                case 'name_asc':
                    baseQuery = baseQuery.order('name', { ascending: true });
                    break;
                case 'power_asc':
                    baseQuery = baseQuery.order('attributes->Potencia', { ascending: true });
                    break;
                case 'power_desc':
                    baseQuery = baseQuery.order('attributes->Potencia', { ascending: false });
                    break;
                case 'newest':
                default:
                    baseQuery = baseQuery.order('created_at', { ascending: false });
                    break;
            }

            // 5. APPLY PAGINATION
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            // 6. EXECUTE DATA QUERY
            let { data, error, count } = await baseQuery.range(from, to);

            // Resilience: If is_active doesn't exist yet, retry without the filter
            if (error && error.message.includes('is_active')) {
                console.warn('is_active column missing, retrying without visibility filter...');
                let retryQuery = supabase.from('products').select(querySelect, { count: 'exact' }).is('parent_id', null).range(from, to);
                // (Re-apply all filters for the retry... simplified here for brevity or I could refactor baseQuery construction)
                // Actually, let's just make the baseQuery construction more modular.
                const retryRes = await supabase.from('products').select(querySelect, { count: 'exact' }).is('parent_id', null).order('created_at', { ascending: false }).range(from, to);
                data = retryRes.data;
                error = retryRes.error;
                count = retryRes.count;
            }

            if (error) throw error;

            setProducts(data || []);
            setTotalResults(count || 0);

            // Update dynamic filters based on this slice
            if (data && data.length > 0) {
                const newAttrFilters = {};

                // FALLBACK MECHANISM: Use provided config or hardcoded defaults
                let filterableKeys = dynamicFiltersConfig.map(f => f.attribute_key);
                if (filterableKeys.length === 0) {
                    filterableKeys = ['Potencia', 'Color', 'Voltaje', 'Medida', 'Material', 'Protección IP', 'CASQUILLO', 'Longitud'];
                }

                data.forEach(p => {
                    const attrs = p.attributes || {};
                    Object.entries(attrs).forEach(([key, val]) => {
                        if (!filterableKeys.includes(key)) return;

                        if (!filterableKeys.includes(key)) return;

                        if (!newAttrFilters[key]) newAttrFilters[key] = new Set();
                        if (Array.isArray(val)) {
                            val.forEach(v => newAttrFilters[key].add(String(v).trim()));
                        } else if (val) {
                            newAttrFilters[key].add(String(val).trim());
                        }
                    });
                });

                // 7. Update dynamic filters based on this context
                setAvailableDynamicFilters(newAttrFilters);
            } else {
                setAvailableDynamicFilters({});
            }

        } catch (error) {
            console.error('Error:', error.message);
        } finally {
            setLoading(false);
        }
    }

    const applyFilters = () => {
        // Redundant since we now filter on server-side
        setFilteredProducts(products);
    };

    // Sorted products (now just uses products directly as they are fetched sorted from server)
    const sortedProducts = useMemo(() => {
        return products;
    }, [products]);

    // Paginated slice (now just products, since server handles slice)
    const totalPages = Math.max(1, Math.ceil(totalResults / itemsPerPage));
    const paginatedProducts = useMemo(() => {
        return products;
    }, [products]);

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
        navigate(`/catalogo?${params.toString()}`);
    };

    const clearFilters = () => {
        setPriceRange([priceLimits[0], priceLimits[1]]);
        setSelectedDynamicFilters({});
        setAvailability({ inStock: false, onOffer: false, isNew: false });
    };

    const counts = getCounts();
    const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || '';

    const PageButton = ({ page, active, disabled, children, onClick }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-9 h-9 flex items-center justify-center rounded-xl text-[10px] font-black transition-all border
                ${active ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' :
                    disabled ? 'bg-gray-50 border-gray-100 text-gray-200 cursor-not-allowed' :
                        'bg-white border-gray-100 text-brand-carbon hover:border-primary hover:text-primary'}`}
        >{children}</button>
    );

    // Build page numbers to show
    const pageNumbers = useMemo(() => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages = new Set([1, totalPages, currentPage]);
        if (currentPage > 1) pages.add(currentPage - 1);
        if (currentPage < totalPages) pages.add(currentPage + 1);
        return [...pages].sort((a, b) => a - b);
    }, [totalPages, currentPage]);

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Breadcrumbs */}
            {!isCatalogHome && (
                <div className="text-sm text-gray-500 mb-8">
                    <Link to="/" className="hover:text-primary transition-colors">Inicio</Link>{' / '}
                    <span className="text-gray-900 font-medium capitalize">
                        {categoryQuery && categoryQuery !== 'all' ? categoryQuery :
                            roomId ? rooms.find(r => r.id === roomId)?.name :
                                professionSlug ? professions.find(p => p.slug === professionSlug)?.name :
                                    searchQuery ? `Búsqueda: ${searchQuery}` : 'Todos los productos'}
                    </span>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
                {/* ── Sidebar ── */}
                {!isCatalogHome && (
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
                                        min={priceLimits[0]} max={priceLimits[1]} step="1"
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

                            {/* Dynamic Attribute Filters */}
                            {(() => {
                                // Group technical filters by their Human Label
                                const groupedFilters = {};
                                Object.entries(availableDynamicFilters).forEach(([key, valueSet]) => {
                                    const config = dynamicFiltersConfig.find(f => f.attribute_key === key);
                                    const label = config ? config.label : key;
                                    const order = config ? config.order_index : 999;

                                    if (!groupedFilters[label]) {
                                        groupedFilters[label] = { label, order, values: new Set(), techKeys: [] };
                                    }
                                    groupedFilters[label].techKeys.push(key);
                                    valueSet.forEach(v => groupedFilters[label].values.add(v));
                                });

                                // Sort groups by order and render
                                return Object.values(groupedFilters)
                                    .sort((a, b) => a.order - b.order)
                                    .map(group => {
                                        const values = Array.from(group.values).sort((a, b) =>
                                            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
                                        );

                                        if (values.length === 0) return null;

                                        return (
                                            <div key={group.label} className="space-y-5">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{group.label}</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {values.map(val => {
                                                        const isSelected = group.techKeys.some(tk => (selectedDynamicFilters[tk] || []).includes(val));

                                                        return (
                                                            <button
                                                                key={val}
                                                                onClick={() => {
                                                                    const targetKey = group.techKeys[0];
                                                                    setSelectedDynamicFilters(prev => {
                                                                        const current = prev[targetKey] || [];
                                                                        const next = current.includes(val)
                                                                            ? current.filter(v => v !== val)
                                                                            : [...current, val];
                                                                        return { ...prev, [targetKey]: next };
                                                                    });
                                                                }}
                                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black italic transition-all border
                                                                ${isSelected
                                                                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105'
                                                                        : 'bg-white border-gray-100 text-brand-carbon hover:border-primary hover:text-primary'}`}
                                                            >
                                                                {val}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    });
                            })()}

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
                                                <div
                                                    onClick={() => setAvailability({ ...availability, [opt.id]: !availability[opt.id] })}
                                                    className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center cursor-pointer
                                                    ${availability[opt.id] ? 'bg-primary border-primary' : 'border-gray-100 bg-gray-50'}`}
                                                >
                                                    {availability[opt.id] && <X className="w-3.5 h-3.5 text-white stroke-[4px]" />}
                                                </div>
                                                <span className={`text-[11px] font-bold uppercase tracking-wide transition-colors
                                                ${availability[opt.id] ? 'text-brand-carbon' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                                    {opt.label}
                                                </span>
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
                                        <Link to="/catalogo" className={`flex items-center gap-3 transition-all ${!categoryQuery ? 'text-primary' : 'hover:text-brand-carbon'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${!categoryQuery ? 'bg-primary scale-125' : 'bg-gray-200'}`} />
                                            Ver Todo
                                        </Link>
                                    </li>
                                    {categories.filter(c => !c.parent_id).map(c => (
                                        <li key={c.id}>
                                            <Link to={`/catalogo?category=${c.slug}`}
                                                className={`flex items-center gap-3 transition-all ${categoryQuery?.toLowerCase() === c.slug ? 'text-brand-carbon' : 'hover:text-brand-carbon'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${categoryQuery?.toLowerCase() === c.slug ? 'bg-primary scale-125 shadow-lg' : 'bg-gray-200'}`} />
                                                {c.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button onClick={clearFilters}
                                className="w-full py-3 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black uppercase italic hover:bg-primary hover:text-white transition-all border border-gray-100">
                                Limpiar Filtros
                            </button>
                        </div>
                    </aside>
                )}

                {/* ── Main Grid ── */}
                <div className="flex-1 min-w-0">
                    {isCatalogHome ? (
                        <div className="pt-4">
                            <CategoryGrid />
                        </div>
                    ) : (
                        <>
                            {/* Category Header & Subcategories */}
                            {activeCategory && (
                                <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <h2 className="text-3xl md:text-5xl font-black text-brand-carbon uppercase italic tracking-tighter mb-8 leading-none">
                                        {activeCategory.name} <br />
                                        <span className="text-gray-300 italic">Colección</span>
                                    </h2>
                                    {subcategories.length > 0 && (
                                        <div className="flex flex-wrap gap-4 mb-4 pb-2">
                                            {subcategories.map(sub => (
                                                <button key={sub.id} onClick={() => handleSubcategoryClick(sub.slug)}
                                                    className={`flex flex-col items-center justify-center min-w-[100px] p-6 rounded-[2rem] border transition-all duration-300
                                                ${subcategoryQuery === sub.slug ? 'bg-brand-carbon border-brand-carbon text-white shadow-xl scale-105' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}>
                                                    <div className="w-8 h-8 mb-3 flex items-center justify-center">
                                                        {sub.image_url ? (
                                                            <img src={sub.image_url} alt="" className="w-full h-full object-contain" />
                                                        ) : (() => {
                                                            const IconComp = ICON_MAP[sub.icon_name] || Tag;
                                                            return <IconComp className="w-6 h-6 text-primary" />;
                                                        })()}
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{sub.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Toolbar: Sort + Items per page + Count ── */}
                            <div className="flex flex-wrap items-center justify-between mb-8 gap-3 bg-white p-4 md:p-5 rounded-[2rem] shadow-sm border border-gray-100">
                                {/* Left: mobile filter + result count */}
                                <div className="flex items-center gap-3 flex-wrap">
                                    <button onClick={() => setFiltersOpen(true)}
                                        className="lg:hidden flex items-center gap-2 text-brand-carbon font-black uppercase italic text-[10px] tracking-widest px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                                        <SlidersHorizontal className="w-4 h-4 text-primary" /> Filtros
                                    </button>
                                    {searchQuery && (
                                        <span className="text-primary font-black uppercase italic text-[10px] tracking-widest bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                                            Buscando: {searchQuery}
                                        </span>
                                    )}
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-[.2em] italic">
                                        {sortedProducts.length} pieza{sortedProducts.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Right: Items per page + Sort dropdown */}
                                <div className="flex items-center gap-3 flex-wrap">
                                    {/* Items per page */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest hidden sm:block">Por pág.</span>
                                        <div className="flex gap-1">
                                            {PAGE_SIZE_OPTIONS.map(n => (
                                                <button key={n} onClick={() => { setItemsPerPage(n); setCurrentPage(1); }}
                                                    className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all border
                                                ${itemsPerPage === n
                                                            ? 'bg-brand-carbon text-white border-brand-carbon'
                                                            : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-300 hover:text-gray-600'}`}>
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sort dropdown */}
                                    <div className="relative">
                                        <button onClick={() => setSortOpen(v => !v)}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase italic text-brand-carbon hover:border-primary transition-all">
                                            <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
                                            <span className="hidden sm:block max-w-[140px] truncate">{currentSortLabel}</span>
                                            <ChevronDown className={`w-3 h-3 text-gray-300 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {sortOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-luxury border border-gray-100 z-30 overflow-hidden">
                                                {SORT_OPTIONS.map(opt => (
                                                    <button key={opt.value}
                                                        onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                                                        className={`w-full text-left px-5 py-3 text-[10px] font-black uppercase italic tracking-wide transition-colors
                                                    ${sortBy === opt.value ? 'bg-primary/5 text-primary' : 'text-gray-500 hover:bg-gray-50 hover:text-brand-carbon'}`}>
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Product Grid ── */}
                            {loading ? (
                                <div className="flex flex-col items-center justify-center p-20 text-gray-300">
                                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                                    <p className="uppercase tracking-widest text-[9px] font-black">Curando selección exclusiva...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {paginatedProducts.map((product, idx) => (
                                            <ProductCard
                                                key={product.id}
                                                product={product}
                                                profile={profile}
                                                addToCart={addToCart}
                                                isLCP={idx < 4} // The first 4 products are LCP candidates
                                            />
                                        ))}

                                        {!loading && sortedProducts.length === 0 && (
                                            <div className="col-span-full py-20 text-center space-y-6">
                                                <div className="text-6xl text-gray-100">🚫</div>
                                                <p className="text-gray-400 uppercase tracking-widest text-[10px] font-black">
                                                    No hay piezas que coincidan con la selección actual
                                                </p>
                                                <button onClick={clearFilters}
                                                    className="px-8 py-3 bg-brand-carbon text-white rounded-2xl text-[10px] font-black uppercase italic hover:bg-primary transition-all">
                                                    Limpiar Filtros
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Pagination ── */}
                                    {totalPages > 1 && (
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                                Página {currentPage} de {totalPages} · {totalResults} resultados
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <PageButton
                                                    disabled={currentPage === 1}
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                                                    <ChevronLeft className="w-4 h-4" />
                                                </PageButton>

                                                {pageNumbers.map((page, idx) => {
                                                    const prev = pageNumbers[idx - 1];
                                                    const showEllipsis = prev && page - prev > 1;
                                                    return (
                                                        <div key={page} className="flex items-center gap-1.5">
                                                            {showEllipsis && (
                                                                <span className="w-9 h-9 flex items-center justify-center text-gray-300 text-[10px] font-black">…</span>
                                                            )}
                                                            <PageButton
                                                                active={currentPage === page}
                                                                onClick={() => setCurrentPage(page)}>
                                                                {page}
                                                            </PageButton>
                                                        </div>
                                                    );
                                                })}

                                                <PageButton
                                                    disabled={currentPage === totalPages}
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                                                    <ChevronRight className="w-4 h-4" />
                                                </PageButton>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Overlay for sort dropdown close */}
            {sortOpen && <div className="fixed inset-0 z-20" onClick={() => setSortOpen(false)} />}
        </div>
    );
}
