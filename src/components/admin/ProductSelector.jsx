import { useState, useEffect } from 'react';
import { Search, Loader2, Package, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function ProductSelector({ onSelect, excludeIds = [] }) {
    const [query, setQuery] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim().length > 2) {
                searchProducts();
            } else {
                setProducts([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    async function searchProducts() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select('id, name, reference, image_url, price')
                .ilike('name', `%${query}%`)
                .limit(5);

            if (error) throw error;
            setProducts(data || []);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Buscar producto por nombre..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {loading && <div className="text-center py-2"><Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" /></div>}
                {!loading && products.length === 0 && query.length > 2 && (
                    <p className="text-[10px] text-gray-400 text-center py-2">No se encontraron productos</p>
                )}
                {products.map(product => (
                    <button
                        key={product.id}
                        type="button"
                        onClick={() => onSelect(product)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all text-left group"
                    >
                        <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                            {product.image_url ? (
                                <img src={product.image_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                                <Package className="w-full h-full p-2 text-gray-300" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase text-brand-carbon truncate">{product.name}</p>
                            <p className="text-[8px] text-gray-400 font-bold tracking-widest">{product.reference || 'Sin Ref.'}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 text-primary">
                            <Check className="w-4 h-4" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
