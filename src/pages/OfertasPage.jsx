import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Tag, ShoppingCart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { calculateProductPrice } from '../lib/pricingUtils';

const OfertasPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();
    const { isPro, discountPercent: proDiscountPercent } = useAuth();

    useEffect(() => {
        async function fetchOffers() {
            try {
                // Fetch products that have a discount price or specific tag
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .is('parent_id', null)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setProducts(data || []);
            } catch (err) {
                console.error('Error fetching offers:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchOffers();
    }, []);

    return (
        <div className="bg-brand-porcelain min-h-screen pt-32 pb-20">
            <div className="container mx-auto px-6 max-w-[1400px]">
                <header className="mb-16 text-center relative">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-4 block">Mil Luces Outlet</span>
                    <h1 className="text-5xl lg:text-7xl font-black text-brand-carbon uppercase italic leading-tight tracking-tighter">
                        Oportunidades <span className="text-primary/40">Exclusivas</span> <br /> <span className="text-brand-carbon">Boutique</span>
                    </h1>
                    <div className="w-20 h-1 bg-primary/20 mx-auto mt-8 rounded-full"></div>
                </header>

                {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center text-gray-400 bg-white rounded-[3rem] shadow-luxury border border-gray-100/50">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-widest italic">Sincronizando Selección...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {products.length > 0 ? products.map((product) => {
                            const { profile } = useAuth();
                            const {
                                originalPrice,
                                finalPrice,
                                isShowingProDiscount,
                                displayDiscountPercent,
                                hasAnyDiscount
                            } = calculateProductPrice(product, profile);

                            // We only show products that have some kind of discount or if we want to show all here
                            // Let's only show if there's SOME discount for the user
                            if (!hasAnyDiscount) return null;

                            return (
                                <div key={product.id} className="group relative bg-white rounded-[2.5rem] p-8 overflow-hidden shadow-luxury hover:shadow-luxury-hover transition-all duration-500 border border-gray-100/50 flex flex-col">
                                    <div className="absolute top-6 left-6 z-10">
                                        <span className={`text-white text-[9px] font-black px-3 py-1.5 rounded-lg uppercase italic tracking-widest shadow-xl shadow-primary/20 ${isShowingProDiscount ? 'bg-primary' : 'bg-red-500'}`}>
                                            -{displayDiscountPercent}% {isShowingProDiscount ? 'PRO' : 'OFF'}
                                        </span>
                                    </div>

                                    <Link to={`/product/${product.slug || product.id}`} className="aspect-square flex items-center justify-center mb-8 p-8 bg-gray-50/50 rounded-3xl group-hover:bg-white transition-colors duration-500 relative overflow-hidden">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="text-7xl transition-transform duration-500 group-hover:scale-125">💡</div>
                                        )}
                                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </Link>

                                    <div className="flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Masterpiece Ref. {product.id.toString().slice(0, 8)}</span>
                                            <div className="h-[1px] flex-1 bg-gray-100"></div>
                                        </div>
                                        <Link to={`/product/${product.slug || product.id}`}>
                                            <h3 className="text-sm font-black text-brand-carbon uppercase italic leading-tight mb-6 group-hover:text-primary transition-colors line-clamp-2 min-h-[2.5rem]">
                                                {product.name}
                                            </h3>
                                        </Link>

                                        <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] text-gray-400 line-through font-bold mb-1">{originalPrice.toFixed(2)} €</p>
                                                <p className={`text-2xl font-black italic tracking-tighter ${isShowingProDiscount ? 'text-brand-carbon' : 'text-red-600'}`}>
                                                    {finalPrice.toFixed(2)} <span className="text-xs">€</span>
                                                </p>
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
                        }).filter(Boolean) : (
                            <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-luxury">
                                <Tag className="w-12 h-12 mx-auto mb-6 text-gray-200" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[.4em] italic leading-loose">Buscando nuevas oportunidades<br />de inversión exclusive...</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OfertasPage;
