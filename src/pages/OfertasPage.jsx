import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Tag, ShoppingCart } from 'lucide-react';

const OfertasPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchOffers() {
            try {
                // Fetch products that have a price and a higher original price (simulating discount)
                // or where we have a specific 'discount_percentage' or 'is_on_sale' flag if added
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .not('price', 'is', null)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // For now, filter products that have "Oferta" in name or just show latest if no specific sale flag
                // Ideally, we'd have an 'is_offer' column or 'original_price'
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
        <div className="bg-[#FDFDFD] min-h-screen pt-8 pb-12">
            <div className="container mx-auto px-6 max-w-[1400px]">
                <header className="mb-12 text-center relative">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-4 block">MIL LUCES OUTLET</span>
                    <h1 className="text-4xl lg:text-7xl font-black text-brand-carbon uppercase italic leading-tight tracking-tighter">
                        Mega <span className="text-primary/40">Ofertas</span> <br /> <span className="text-brand-carbon">Boutique</span>
                    </h1>
                    <div className="w-20 h-1 bg-primary/10 mx-auto mt-8 rounded-full"></div>
                </header>

                {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center text-gray-400 glass rounded-[3rem]">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Ofertas...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {products.length > 0 ? products.map((product) => {
                            const discount = 15;
                            const originalPrice = (product.price / (1 - discount / 100)).toFixed(2);

                            return (
                                <div key={product.id} className="group relative bg-white rounded-[2.5rem] p-6 overflow-hidden shadow-sm hover:shadow-luxury transition-all duration-500 border border-gray-100/50 flex flex-col">
                                    <div className="absolute top-6 left-6 z-10">
                                        <span className="bg-primary text-white text-[9px] font-black px-3 py-1.5 rounded-lg uppercase italic tracking-widest shadow-xl shadow-primary/20">
                                            -{discount}% OFF
                                        </span>
                                    </div>

                                    <div className="aspect-square flex items-center justify-center mb-8 p-8 bg-gray-50/50 rounded-3xl group-hover:bg-white transition-colors duration-500 relative overflow-hidden">
                                        <img
                                            src={product.image_url || 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&h=400&fit=crop'}
                                            alt={product.name}
                                            className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>

                                    <div className="flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">REF: {product.id.slice(0, 8)}</span>
                                            <div className="h-[1px] flex-1 bg-gray-100"></div>
                                        </div>
                                        <h3 className="text-sm font-black text-brand-carbon uppercase italic leading-tight mb-4 group-hover:text-primary transition-colors line-clamp-2 h-10">
                                            {product.name}
                                        </h3>

                                        <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] text-gray-400 line-through font-bold mb-1">{originalPrice} €</p>
                                                <p className="text-2xl font-black text-brand-carbon italic tracking-tighter">{(product.price || 0).toFixed(2)} <span className="text-xs text-primary">€</span></p>
                                            </div>
                                            <button className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-brand-carbon hover:bg-primary hover:text-white transition-all shadow-sm hover:shadow-xl hover:shadow-primary/20">
                                                <ShoppingCart className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="col-span-full py-32 text-center bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
                                <Tag className="w-12 h-12 mx-auto mb-6 text-gray-200" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[.4em] italic leading-loose">Buscando oportunidades<br />exclusivas...</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OfertasPage;
