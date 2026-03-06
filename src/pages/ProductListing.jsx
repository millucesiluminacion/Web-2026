import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
    Filter, Star, ShoppingCart, ChevronDown, Loader2, Package,
    BoxSelect, Square, Grid, Zap, Lightbulb, Tag, X, Settings,
    ChevronLeft, ChevronRight, ArrowUpDown, SlidersHorizontal
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { calculateProductPrice } from '../lib/pricingUtils';

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
    const [availability, setAvailability] = useState({ inStock: false, onOffer: false, isNew: false });

    // Pagination & Sort
    const [sortBy, setSortBy] = useState('price_asc');
    const [itemsPerPage, setItemsPerPage] = useState(12);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortOpen, setSortOpen] = useState(false);

    const { addToCart } = useCart();
    const { profile } = useAuth();

    useEffect(() => {
        fetchProducts();
    }, [categoryQuery, subcategoryQuery, roomId, professionSlug, searchQuery]);

    useEffect(() => {
        applyFilters();
    }, [products, priceRange, selectedPowers, availability]);

    // Reset to page 1 when filters/sort change
    useEffect(() => { setCurrentPage(1); }, [filteredProducts, sortBy, itemsPerPage]);

    async function fetchProducts() {
        try {
            setLoading(true);

            const [catRes, roomsRes, profsRes] = await Promise.all([
                supabase.from('categories').select('*').order('order_index', { ascending: true }),
                supabase.from('rooms').select('*').order('name'),
                supabase.from('professions').select('*').order('order_index', { ascending: true })
            ]);

            const allCategories = catRes.data || [];
            setCategories(allCategories);
            setRooms(roomsRes.data || []);
            setProfessions(profsRes.data || []);

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

                const sortedPowers = Array.from(pwrSet).sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
                setAvailablePowers(sortedPowers);

                const pMin = Math.floor(minP === Infinity ? 0 : minP);
                const pMax = Math.ceil(maxP === -Infinity ? 2000 : maxP);
                setPriceLimits([pMin, pMax]);
                setPriceRange([pMin, pMax]);
                setSelectedPowers([]);
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
            const { finalPrice } = calculateProductPrice(p, profile);
            return finalPrice >= priceRange[0] && finalPrice <= priceRange[1];
        });
        filtered = filtered.filter(p => {
            if (selectedPowers.length === 0) return true;
            const attrs = p.attributes || {};
            const pwrStr = attrs.Potencia || attrs.power || attrs.Watios || attrs['Potencia (W)'];
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

    // Sorted products (derive from filteredProducts + sortBy)
    const sortedProducts = useMemo(() => {
        const arr = [...filteredProducts];
        switch (sortBy) {
            case 'price_asc':
                return arr.sort((a, b) => calculateProductPrice(a, profile).finalPrice - calculateProductPrice(b, profile).finalPrice);
            case 'price_desc':
                return arr.sort((a, b) => calculateProductPrice(b, profile).finalPrice - calculateProductPrice(a, profile).finalPrice);
            case 'name_asc':
                return arr.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
            case 'newest':
                return arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            case 'power_asc':
            case 'power_desc': {
                const getPwr = p => {
                    const attrs = p.attributes || {};
                    const s = attrs.Potencia || attrs.power || attrs.Watios || attrs['Potencia (W)'];
                    return parseFloat(s) || 0;
                };
                return sortBy === 'power_asc'
                    ? arr.sort((a, b) => getPwr(a) - getPwr(b))
                    : arr.sort((a, b) => getPwr(b) - getPwr(a));
            }
            default: return arr;
        }
    }, [filteredProducts, sortBy, profile]);

    // Paginated slice
    const totalPages = Math.max(1, Math.ceil(sortedProducts.length / itemsPerPage));
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedProducts.slice(start, start + itemsPerPage);
    }, [sortedProducts, currentPage, itemsPerPage]);

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

    const clearFilters = () => {
        setPriceRange([priceLimits[0], priceLimits[1]]);
        setSelectedPowers([]);
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
            <div className="text-sm text-gray-500 mb-8">
                <Link to="/" className="hover:text-primary transition-colors">Inicio</Link>{' / '}
                <span className="text-gray-900 font-medium capitalize">
                    {categoryQuery && categoryQuery !== 'all' ? categoryQuery :
                        roomId ? rooms.find(r => r.id === roomId)?.name :
                            professionSlug ? professions.find(p => p.slug === professionSlug)?.name :
                                searchQuery ? `Búsqueda: ${searchQuery}` : 'Todos los productos'}
                </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* ── Sidebar ── */}
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

                        {/* Power Selection */}
                        {availablePowers.length > 0 && (
                            <div className="space-y-5">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Potencia</h4>
                                <div className="flex flex-wrap gap-2">
                                    {availablePowers.map(pwr => (
                                        <button
                                            key={pwr}
                                            onClick={() => setSelectedPowers(prev =>
                                                prev.includes(pwr) ? prev.filter(p => p !== pwr) : [...prev, pwr]
                                            )}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black italic transition-all border
                                                ${selectedPowers.includes(pwr)
                                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105'
                                                    : 'bg-white border-gray-100 text-brand-carbon hover:border-primary hover:text-primary'}`}
                                        >{pwr}</button>
                                    ))}
                                </div>
                            </div>
                        )}

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
                                    <Link to="/search" className={`flex items-center gap-3 transition-all ${!categoryQuery ? 'text-primary' : 'hover:text-brand-carbon'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${!categoryQuery ? 'bg-primary scale-125' : 'bg-gray-200'}`} />
                                        Ver Todo
                                    </Link>
                                </li>
                                {categories.filter(c => !c.parent_id).map(c => (
                                    <li key={c.id}>
                                        <Link to={`/search?category=${c.slug}`}
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

                {/* ── Main Grid ── */}
                <div className="flex-1 min-w-0">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {paginatedProducts.map(product => {
                                    const pricing = calculateProductPrice(product, profile);
                                    return (
                                        <div key={product.id}
                                            className="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-luxury hover:shadow-luxury-hover transition-all duration-700 border border-gray-100/50 flex flex-col">
                                            <Link to={`/product/${product.slug || product.id}`}
                                                className="block relative aspect-square p-8 overflow-hidden group/img">
                                                <div className="absolute inset-0 bg-gray-50/20 opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                                <img src={product.image_url || '/placeholder.jpg'} alt={product.name}
                                                    className="w-full h-full object-contain transition-transform duration-700 group-hover/img:scale-110" />
                                                {pricing.hasAnyDiscount && (
                                                    <div className="absolute top-6 left-6">
                                                        <span className="bg-red-500 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-xl italic shadow-xl">
                                                            -{pricing.displayDiscountPercent}% OFF
                                                        </span>
                                                    </div>
                                                )}
                                            </Link>
                                            <div className="p-8 pt-0 flex-1 flex flex-col">
                                                <div className="mb-4">
                                                    <div className="flex gap-1 mb-3">
                                                        {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-2 h-2 text-primary fill-primary" />)}
                                                    </div>
                                                    <Link to={`/product/${product.slug || product.id}`}>
                                                        <h3 className="text-sm font-black text-brand-carbon uppercase italic leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                                            {product.name}
                                                        </h3>
                                                    </Link>
                                                </div>
                                                <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">
                                                            {pricing.isPartnerPrice ? 'Socio VIP' : 'Precio'}
                                                        </span>
                                                        <span className="text-xl font-black italic text-brand-carbon">
                                                            {pricing.finalPrice.toFixed(2)}€
                                                        </span>
                                                    </div>
                                                    <button onClick={() => addToCart({ ...product, price: pricing.finalPrice })}
                                                        className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-110 active:scale-95 transition-all">
                                                        <ShoppingCart className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

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
                                        Página {currentPage} de {totalPages} · {sortedProducts.length} resultados
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
                </div>
            </div>

            {/* Overlay for sort dropdown close */}
            {sortOpen && <div className="fixed inset-0 z-20" onClick={() => setSortOpen(false)} />}
        </div>
    );
}
