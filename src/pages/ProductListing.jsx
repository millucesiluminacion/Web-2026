import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Filter, Star, ShoppingCart, ChevronDown, Loader2, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function ProductListing() {
    const [searchParams] = useSearchParams();
    const category = searchParams.get('category');
    const roomId = searchParams.get('room');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();
    const { isPro, discountPercent: proDiscountPercent } = useAuth();

    useEffect(() => {
        fetchProducts();
    }, [category, roomId]);

    async function fetchProducts() {
        try {
            setLoading(true);
            let productQuery = supabase.from('products').select('*, product_rooms!inner(room_id)').is('parent_id', null);

            if (category && category !== 'all') {
                productQuery = productQuery.eq('category', category.toLowerCase());
            }

            if (roomId) {
                productQuery = productQuery.eq('product_rooms.room_id', roomId);
            }

            const [productsRes, roomsRes] = await Promise.all([
                productQuery.order('created_at', { ascending: false }),
                supabase.from('rooms').select('*').order('name')
            ]);

            if (productsRes.error) throw productsRes.error;
            setProducts(productsRes.data || []);
            setRooms(roomsRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Breadcrumbs */}
            <div className="text-sm text-gray-500 mb-8">
                <Link to="/" className="hover:text-blue-600 transition-colors">Inicio</Link> / <span className="text-gray-900 font-medium capitalize">{category || 'Todos los productos'}</span>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Filters Sidebar */}
                <aside className={`lg:w-64 flex-shrink-0 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 sticky top-24">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Filter className="w-5 h-5" /> Filtros
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2">Categorías</h4>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    {['Bombillas', 'Tubos', 'Downlights', 'Paneles', 'Tiras', 'Solar', 'Proyectores', 'Ventiladores', 'Farolas', 'Comercial', 'Industrial', 'Lámparas'].map(cat => (
                                        <li key={cat} className="flex items-center gap-2">
                                            <Link
                                                to={`/search?category=${cat.toLowerCase()}`}
                                                className={`flex items-center gap-2 hover:text-primary transition-colors ${category?.toLowerCase() === cat.toLowerCase() ? 'text-primary font-bold' : ''}`}
                                            >
                                                <div className={`w-3 h-3 rounded-full border ${category?.toLowerCase() === cat.toLowerCase() ? 'bg-primary border-primary' : 'border-gray-300'}`}></div>
                                                {cat}
                                            </Link>
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
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between mb-6 gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <button onClick={() => setFiltersOpen(!filtersOpen)} className="lg:hidden flex items-center gap-2 text-gray-700 font-medium">
                            <Filter className="w-5 h-5" /> Filtros
                        </button>
                        <span className="text-gray-500 text-sm italic">Mostrando {products.length} piezas exclusivas</span>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 text-gray-500">
                            <Loader2 className="w-10 h-10 animate-spin mb-4" />
                            <p className="uppercase tracking-widest text-[10px] font-black">Buscando los mejores productos por ti...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.length > 0 ? products.map(product => {
                                const originalPrice = parseFloat(product.price || 0);
                                const dbDiscountPrice = parseFloat(product.discount_price || 0);
                                const hasDbDiscount = dbDiscountPrice > 0 && dbDiscountPrice < originalPrice;

                                // Pro logic
                                const proPrice = isPro ? originalPrice * (1 - proDiscountPercent / 100) : originalPrice;
                                const isShowingProDiscount = isPro && proDiscountPercent > 0;
                                const finalPrice = isPro ? proPrice : (hasDbDiscount ? dbDiscountPrice : originalPrice);
                                const displayDiscountPercent = isShowingProDiscount ? proDiscountPercent : (hasDbDiscount ? Math.round(((originalPrice - dbDiscountPrice) / originalPrice) * 100) : 0);

                                return (
                                    <div key={product.id} className="group relative bg-white rounded-[2rem] overflow-hidden shadow-luxury hover:shadow-luxury-hover transition-all duration-500 border border-gray-100/50 flex flex-col">
                                        {/* Image Section */}
                                        <Link to={`/product/${product.id}`} className="block relative aspect-square bg-white flex items-center justify-center p-8 overflow-hidden group">
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
                                            {(isShowingProDiscount || hasDbDiscount) && (
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

                                                <Link to={`/product/${product.id}`}>
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
                                                    {(isShowingProDiscount || hasDbDiscount) ? (
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
