import { X, ShoppingBag, Trash2, ArrowRight, Truck } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';

export function MiniCart() {
    const { cart, removeFromCart, updateQuantity, subtotal, isSideCartOpen, setIsSideCartOpen, currentShipping, shippingCost, totalPrice } = useCart();
    const navigate = useNavigate();

    if (!isSideCartOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-brand-carbon/40 backdrop-blur-sm animate-in fade-in duration-500"
                onClick={() => setIsSideCartOpen(false)}
            />

            {/* Sidebar */}
            <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-500 ease-out border-l border-gray-100 flex flex-col">
                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h3 className="text-xl font-black text-brand-carbon uppercase italic leading-none mb-1">Tu Carrito</h3>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{cart.length} Artículos Seleccionados</p>
                    </div>
                    <button
                        onClick={() => setIsSideCartOpen(false)}
                        className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-brand-carbon hover:text-white transition-all shadow-sm"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                            <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center">
                                <ShoppingBag className="w-10 h-10 text-gray-200" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-brand-carbon uppercase italic mb-2">Tu cesta está vacía</h4>
                                <p className="text-xs font-bold text-gray-400 leading-relaxed italic">
                                    Parece que aún no has descubierto <br />la luz perfecta para tu espacio.
                                </p>
                            </div>
                            <button
                                onClick={() => { setIsSideCartOpen(false); navigate('/search'); }}
                                className="px-8 py-4 bg-brand-carbon text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:bg-primary transition-all shadow-lg shadow-black/10"
                            >
                                Explorar Colecciones
                            </button>
                        </div>
                    ) : (
                        cart.map((item, idx) => (
                            <div key={item.id} className="flex gap-6 group animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                <div className="w-24 h-24 bg-gray-50 rounded-2xl border border-gray-100 p-3 flex-shrink-0 group-hover:shadow-md transition-shadow">
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black text-brand-carbon uppercase italic leading-tight mb-1 truncate">{item.name}</h4>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-3 truncate">
                                        {item.cartLabel || item.reference || 'Personalizado'}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-100">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="text-gray-400 hover:text-brand-carbon transition-colors text-xs font-black"
                                            >
                                                -
                                            </button>
                                            <span className="text-[10px] font-black italic text-brand-carbon w-4 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="text-gray-400 hover:text-brand-carbon transition-colors text-xs font-black"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <p className="text-sm font-black italic text-brand-carbon">{(item.price * item.quantity).toFixed(2)}€</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-300 hover:text-red-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Summary */}
                {cart.length > 0 && (
                    <div className="p-8 bg-gray-50 border-t border-gray-200 space-y-6 shadow-[0_-20px_40px_rgba(0,0,0,0.02)]">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal Boutitque</span>
                                <span className="text-sm font-black text-brand-carbon">{subtotal.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    Gastos de Envío
                                    <Truck className="w-3 h-3 text-primary" />
                                </span>
                                <span className={`text-sm font-black ${shippingCost === 0 ? 'text-green-600' : 'text-brand-carbon'}`}>
                                    {shippingCost === 0 ? 'GRATIS' : `${shippingCost.toFixed(2)}€`}
                                </span>
                            </div>
                            <div className="h-px bg-gray-200 my-2"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-black text-brand-carbon uppercase italic leading-none">Total Inversión</span>
                                <span className="text-2xl font-black text-primary italic leading-none">{totalPrice.toFixed(2)}€</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Link
                                to="/cart"
                                onClick={() => setIsSideCartOpen(false)}
                                className="py-5 rounded-2xl border-2 border-brand-carbon text-[10px] font-black uppercase italic tracking-widest text-brand-carbon text-center hover:bg-brand-carbon hover:text-white transition-all"
                            >
                                Ver Carrito
                            </Link>
                            <Link
                                to="/cart"
                                onClick={() => setIsSideCartOpen(false)}
                                className="py-5 rounded-2xl bg-brand-carbon text-white text-[10px] font-black uppercase italic tracking-widest text-center hover:bg-primary transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2 group"
                            >
                                Finalizar
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
