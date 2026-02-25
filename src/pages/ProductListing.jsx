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
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const roomId = searchParams.get('room');
    const professionSlug = searchParams.get('profession');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [professions, setProfessions] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();
    const { profile } = useAuth();

    useEffect(() => {
        fetchProducts();
    }, [category, subcategory, roomId, professionSlug]);

    useEffect(() => {
        // SEO centralized via SEOManager
    }, [activeCategory, roomId, rooms]);

    async function fetchProducts() {
        try {
            setLoading(true);

            // 1. Fetch all categories, rooms and professions
            const [catRes, roomsRes, profsRes] = await Promise.all([
                supabase.from('categories').select('*').order('order_index', { ascending: true }),
                supabase.from('rooms').select('*').order('name'),
                supabase.from('professions').select('*').order('order_index', { ascending: true })
            ]);

            const allCategories = catRes.data || [];
            setCategories(allCategories);
            setRooms(roomsRes.data || []);
            setProfessions(profsRes.data || []);

            // 2. Identify active category and subcategories
            if (category && category !== 'all') {
                const catData = allCategories.find(c => c.slug === category.toLowerCase());

                if (catData) {
                    setActiveCategory(catData);
                    const subData = allCategories.filter(c => c.parent_id === catData.id);
                    setSubcategories(subData);
                } else {
                    setActiveCategory(null);
                    setSubcategories([]);
                }
            } else {
                setActiveCategory(null);
                setSubcategories([]);
            }

            // 3. Build Product Query
            let querySelect = '*, product_rooms(room_id), product_professions(profession_id)';

            if (roomId) querySelect = '*, product_rooms!inner(room_id), product_professions(profession_id)';
            if (professionSlug) querySelect = '*, product_rooms(room_id), product_professions!inner(profession_id)';

            let productQuery = supabase.from('products').select(querySelect).is('parent_id', null);

            if (subcategory) {
                // Hybrid filter for subcategory: ID or legacy slug/name match
                const subCatData = allCategories.find(c => c.slug === subcategory.toLowerCase());
                if (subCatData) {
                    productQuery = productQuery.or(`category_id.eq.${subCatData.id},category.ilike.%${subcategory}%,category.ilike.%${subCatData.name}%`);
                } else {
                    productQuery = productQuery.eq('category', subcategory.toLowerCase());
                }
            } else if (category && category !== 'all') {
                const currentCat = allCategories.find(c => c.slug === category.toLowerCase());
                if (currentCat) {
                    // Find all associated IDs (parent + children)
                    const relatedIds = allCategories
                        .filter(c => c.id === currentCat.id || c.parent_id === currentCat.id)
                        .map(c => c.id);

                    // Also gather slugs/names for broader matching
                    const relatedSlugs = allCategories
                        .filter(c => c.id === currentCat.id || c.parent_id === currentCat.id)
                        .map(c => c.slug.toLowerCase());

                    const idInClause = `category_id.in.(${relatedIds.map(id => `"${id}"`).join(',')})`;
                    const slugInClause = `category.in.(${relatedSlugs.map(s => `"${s}"`).join(',')})`;

                    productQuery = productQuery.or(`${idInClause},${slugInClause},category.ilike.%${category}%`);
                } else {
                    productQuery = productQuery.eq('category', category.toLowerCase());
                }
            }

            if (roomId) {
                productQuery = productQuery.eq('product_rooms.room_id', roomId);
            }

            if (professionSlug) {
                const prof = profsRes.data?.find(p => p.slug === professionSlug.toLowerCase());
                if (prof) {
                    productQuery = productQuery.eq('product_professions.profession_id', prof.id);
                }
            }

            const productsRes = await productQuery.order('created_at', { ascending: false });

            if (productsRes.error) throw productsRes.error;
            setProducts(productsRes.data || []);
            setRooms(roomsRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error.message);
        } finally {
            setLoading(false);
        }
    }

    const handleSubcategoryClick = (subSlug) => {
        const newParams = new URLSearchParams(searchParams);
        if (subcategory === subSlug) {
            newParams.delete('subcategory');
        } else {
            newParams.set('subcategory', subSlug);
        }
        navigate(`/search?${newParams.toString()}`);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Breadcrumbs */}
            <div className="text-sm text-gray-500 mb-8">
                <Link to="/" className="hover:text-blue-600 transition-colors">Inicio</Link> /{' '}
                <span className="text-gray-900 font-medium capitalize">
                    {category && category !== 'all' ? category :
                        roomId ? rooms.find(r => r.id === roomId)?.name :
                            professionSlug ? professions.find(p => p.slug === professionSlug)?.name :
                                'Todos los productos'}
                </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Filters Sidebar */}
                <aside className={`lg:w-64 flex-shrink-0 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 sticky top-24">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Filter className="w-5 h-5" /> Filtros
                        </h3>
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4">Arquitectura</h4>
                                <ul className="space-y-4 text-[11px] text-gray-600 font-bold uppercase tracking-wide">
                                    <li>
                                        <Link
                                            to="/search"
                                            className={`flex items-center gap-3 transition-all ${!category ? 'text-primary' : 'text-gray-400 hover:text-brand-carbon'}`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${!category ? 'bg-primary scale-125' : 'bg-gray-200'}`}></div>
                                            Todos los productos
                                        </Link>
                                    </li>
                                    {/* Main Categories & their subcategories */}
                                    {categories.filter(c => !c.parent_id).map(mainCat => (
                                        <li key={mainCat.id} className="space-y-3">
                                            <Link
                                                to={`/search?category=${mainCat.slug}`}
                                                className={`flex items-center gap-3 transition-all ${category?.toLowerCase() === mainCat.slug ? 'text-brand-carbon' : 'text-gray-400 hover:text-brand-carbon'}`}
                                            >
                                                <div className={`w-1.5 h-1.5 rounded-full ${category?.toLowerCase() === mainCat.slug ? 'bg-primary scale-125 shadow-lg shadow-primary/20' : 'bg-gray-200'}`}></div>
                                                {mainCat.name}
                                            </Link>

                                            {/* Subcategories - REMOVED from sidebar as per user request */}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-semibold text-sm mb-2">Estancias</h4>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    {rooms.map(room => (
                                        <li key={room.id}>
                                            <Link
                                                to={`/search?room=${room.id}`}
                                                className={`flex items-center gap-2 hover:text-primary transition-colors ${roomId === room.id ? 'text-primary font-bold' : ''}`}
                                            >
                                                <div className={`w-3 h-3 rounded-full border ${roomId === room.id ? 'bg-primary border-primary' : 'border-gray-300'}`}></div>
                                                {room.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Product Grid */}
                <div className="flex-1">
                    {/* Category Header & Subcategories Filter */}
                    {activeCategory && (
                        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <h2 className="text-3xl md:text-5xl font-black text-brand-carbon uppercase italic tracking-tighter mb-8 leading-none">
                                {activeCategory.name} <br />
                                <span className="text-gray-300">Colección</span>
                            </h2>

                            {subcategories.length > 0 && (
                                <div className="flex flex-wrap gap-4 mb-4 pb-2 overflow-x-auto no-scrollbar">
                                    {subcategories.map(sub => {
                                        const IconComp = ICON_MAP[sub.icon_name] || Tag;
                                        const isActive = subcategory === sub.slug;
                                        return (
                                            <button
                                                key={sub.id}
                                                onClick={() => handleSubcategoryClick(sub.slug)}
                                                className={`flex flex-col items-center justify-center min-w-[100px] p-6 rounded-[2rem] border transition-all duration-300 group ${isActive
                                                    ? 'bg-brand-carbon border-brand-carbon text-white shadow-xl shadow-brand-carbon/20 scale-105'
                                                    : 'bg-white border-gray-100 text-gray-400 hover:border-primary/20 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {sub.image_url ? (
                                                    <div className="w-8 h-8 mb-3 overflow-hidden rounded-lg">
                                                        <img
                                                            src={sub.image_url}
                                                            alt={sub.name}
                                                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                    </div>
                                                ) : (
                                                    <IconComp className={`w-6 h-6 mb-3 transition-transform duration-500 group-hover:scale-110 ${isActive ? 'text-primary' : 'text-primary/40 group-hover:text-primary'}`} />
                                                )}
                                                <span className={`text-[9px] font-black uppercase tracking-widest text-center leading-tight ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                                    {sub.name}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between mb-6 gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 transition-all">
                        <button onClick={() => setFiltersOpen(!filtersOpen)} className="lg:hidden flex items-center gap-3 text-brand-carbon font-black uppercase italic text-[10px] tracking-widest px-6 py-3 bg-gray-50 rounded-xl hover:bg-gray-100">
                            <Filter className="w-4 h-4 text-primary" /> Filtros
                        </button>
                        <div className="flex items-center gap-4">
                            {subcategory && (
                                <button
                                    onClick={() => handleSubcategoryClick(subcategory)}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-[9px] font-black uppercase tracking-widest border border-primary/20 animate-in zoom-in-95"
                                >
                                    <X className="w-3 h-3" /> Limpiar Subcategoría
                                </button>
                            )}
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-[.2em] italic">Mostrando {products.length} piezas exclusivas</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 text-gray-500">
                            <Loader2 className="w-10 h-10 animate-spin mb-4" />
                            <p className="uppercase tracking-widest text-[10px] font-black">Buscando los mejores productos por ti...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.length > 0 ? products.map(product => {
                                const {
                                    originalPrice,
                                    finalPrice,
                                    isShowingProDiscount,
                                    displayDiscountPercent,
                                    hasAnyDiscount
                                } = calculateProductPrice(product, profile);

                                return (
                                    <div key={product.id} className="group relative bg-white rounded-[2rem] overflow-hidden shadow-luxury hover:shadow-luxury-hover transition-all duration-500 border border-gray-100/50 flex flex-col">
                                        {/* Image Section */}
                                        <Link to={`/product/${product.slug || product.id}`} className="block relative aspect-square bg-white flex items-center justify-center p-8 overflow-hidden group">
                                            <div className="absolute inset-0 bg-gray-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="text-7xl transition-transform duration-500 group-hover:scale-125">💡</div>
                                            )}

                                            {/* Top Badges */}
                                            {(isShowingProDiscount || hasAnyDiscount) && (
                                                <div className="absolute top-4 left-4">
                                                    <span className={`px-2.5 py-1 text-white text-[9px] font-black uppercase tracking-wider rounded-lg italic shadow-lg ${isShowingProDiscount ? 'bg-primary' : 'bg-red-500'}`}>
                                                        -{displayDiscountPercent}% {isShowingProDiscount ? 'PRO' : ''}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="absolute top-4 right-4">
                                                <span className={`flex items-center gap-1 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full ${parseInt(product.stock) > 0
                                                    ? 'bg-emerald-50 text-emerald-500 border border-emerald-100'
                                                    : 'bg-amber-50 text-amber-500 border border-amber-100'
                                                    }`}>
                                                    <Package className="w-2.5 h-2.5" />
                                                    {parseInt(product.stock) > 0 ? 'Stock' : 'Pedido'}
                                                </span>
                                            </div>
                                        </Link>

                                        {/* Content Section */}
                                        <div className="p-8 pt-0 flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-3">
                                                    {[1, 2, 3, 4, 5].map(i => (
                                                        <Star key={i} className={`w-2.5 h-2.5 ${i <= 4 ? 'text-primary fill-primary' : 'text-gray-200'}`} />
                                                    ))}
                                                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest ml-1">4.8 Review</span>
                                                </div>

                                                <Link to={`/product/${product.slug || product.id}`}>
                                                    <h3 className="text-sm font-black text-brand-carbon uppercase italic leading-tight mb-4 group-hover:text-primary transition-colors line-clamp-2 min-h-[2.5rem]">
                                                        {product.name}
                                                    </h3>
                                                </Link>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-gray-50 pt-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">
                                                        {isShowingProDiscount ? 'Inversión Pro' : 'Inversión'}
                                                    </span>
                                                    {(isShowingProDiscount || hasAnyDiscount) ? (
                                                        <div className="flex items-baseline gap-2">
                                                            <span className={`text-xl font-black italic ${isShowingProDiscount ? 'text-brand-carbon' : 'text-red-600'}`}>
                                                                {finalPrice.toFixed(2)} €
                                                            </span>
                                                            <span className="text-xs text-gray-300 line-through">{originalPrice.toFixed(2)} €</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xl font-black text-brand-carbon italic">{originalPrice.toFixed(2)} €</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => addToCart({ ...product, price: finalPrice })}
                                                    className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-110 active:scale-95 transition-all"
                                                >
                                                    <ShoppingCart className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="col-span-full p-20 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-100">
                                    <p className="text-gray-500 uppercase tracking-widest text-[10px] font-black mb-4 text-center">No encontramos productos en esta selección.</p>
                                    <Link to="/search" className="px-6 py-3 bg-brand-carbon text-white rounded-xl text-[10px] font-black uppercase italic hover:bg-primary transition-colors">
                                        Ver todos los productos
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
