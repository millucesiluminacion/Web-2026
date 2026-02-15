import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Filter, Star, ShoppingCart, ChevronDown, Loader2, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
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
                <Link to="/" className="hover:text-blue-600">Inicio</Link> / <span className="text-gray-900 font-medium capitalize">{category || 'Todos los productos'}</span>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Filters Sidebar */}
                <aside className={`lg:w-64 flex-shrink-0 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 sticky top-24">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Filter className="w-5 h-5" /> Filtros
                        </h3>
                        {/* Filters logic can be expanded later */}
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2">Categorías</h4>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    {['Bombillas', 'Tubos', 'Paneles', 'Tiras', 'Downlights'].map(cat => (
                                        <li key={cat} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                checked={category?.toLowerCase() === cat.toLowerCase()}
                                                readOnly
                                                onClick={() => window.location.href = `/search?category=${cat.toLowerCase()}`}
                                            />
                                            <span>{cat}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-semibold text-sm mb-2">Estancias</h4>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    {rooms.map(room => (
                                        <li key={room.id} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                checked={roomId === room.id}
                                                readOnly
                                                onClick={() => window.location.href = `/search?room=${room.id}`}
                                            />
                                            <span>{room.name}</span>
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

                        <span className="text-gray-500 text-sm">Mostrando {products.length} productos</span>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 text-gray-500">
                            <Loader2 className="w-10 h-10 animate-spin mb-4" />
                            <p>Buscando los mejores productos por ti...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.length > 0 ? products.map(product => (
                                <div key={product.id} className="group relative bg-white rounded-[2rem] overflow-hidden shadow-luxury hover:shadow-luxury-hover transition-all duration-500 border border-gray-100/50">
                                    {/* Image Section - Edge to Edge Boutique Style */}
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
                                        {/* Discount Badge */}
                                        {product.discount_price && parseFloat(product.discount_price) > 0 && parseFloat(product.discount_price) < parseFloat(product.price) && (
                                            <div className="absolute top-4 left-4">
                                                <span className="px-2.5 py-1 bg-red-500 text-white text-[9px] font-black uppercase tracking-wider rounded-lg italic shadow-lg">
                                                    -{Math.round(((parseFloat(product.price) - parseFloat(product.discount_price)) / parseFloat(product.price)) * 100)}%
                                                </span>
                                            </div>
                                        )}
                                        {/* Stock Badge */}
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
                                    <div className="p-8 pt-0">
                                        <div className="flex items-center gap-1.5 mb-3">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-2.5 h-2.5 ${i < 4 ? 'text-primary fill-primary' : 'text-gray-200'}`} />
                                            ))}
                                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest ml-1">4.8 Review</span>
                                        </div>

                                        <Link to={`/product/${product.id}`}>
                                            <h3 className="text-sm font-black text-brand-carbon uppercase italic leading-tight mb-4 group-hover:text-primary transition-colors line-clamp-1">
                                                {product.name}
                                            </h3>
                                        </Link>

                                        <div className="flex items-center justify-between border-t border-gray-50 pt-6">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">Inversión</span>
                                                {product.discount_price && parseFloat(product.discount_price) > 0 && parseFloat(product.discount_price) < parseFloat(product.price) ? (
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-xl font-black text-red-600 italic">{parseFloat(product.discount_price).toFixed(2)} €</span>
                                                        <span className="text-xs text-gray-300 line-through">{parseFloat(product.price).toFixed(2)} €</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xl font-black text-brand-carbon italic">{parseFloat(product.price).toFixed(2)} €</span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => addToCart({ ...product, price: parseFloat(product.discount_price && parseFloat(product.discount_price) > 0 ? product.discount_price : product.price) })}
                                                className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-110 active:scale-95 transition-all"
                                            >
                                                <ShoppingCart className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full p-20 text-center bg-gray-50 rounded-lg">
                                    <p className="text-gray-500">No encontramos productos en esta categoría.</p>
                                    <Link to="/search" className="text-blue-600 hover:underline mt-2 inline-block">Ver todos los productos</Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
