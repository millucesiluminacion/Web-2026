import { Trash, ArrowRight, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Cart() {
    const {
        cart,
        removeFromCart,
        updateQuantity,
        subtotal,
        proDiscountAmount,
        totalPrice,
        discountPercent
    } = useCart();

    // Calculate taxes accurately (assuming totalPrice includes tax)
    const IVA_RATE = 0.21;
    const baseImponible = totalPrice / (1 + IVA_RATE);
    const iva = totalPrice - baseImponible;

    if (cart.length === 0) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-brand-porcelain">
                <div className="w-32 h-32 mb-8 bg-white rounded-[2.5rem] shadow-luxury flex items-center justify-center text-5xl opacity-20 relative">
                    <div className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-[2.5rem] animate-spin-slow"></div>
                    💡
                </div>
                <h2 className="text-2xl font-black text-brand-carbon uppercase italic tracking-tighter mb-4">Tu Colección está Vacía</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[.4em] mb-12 text-center max-w-xs">Parece que aún no has seleccionado ninguna de nuestras piezas exclusivas.</p>
                <Link to="/search" className="px-12 py-5 bg-brand-carbon text-white rounded-2xl font-black uppercase italic text-[10px] hover:bg-primary transition-all shadow-xl shadow-black/20">
                    Explorar Galería
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-32 pb-20 bg-brand-porcelain">
            <div className="container mx-auto px-6 max-w-[1400px]">
                <div className="mb-16">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block text-center">Finalizar Adquisición</span>
                    <h1 className="text-5xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter text-center">Bolsa de <br /><span className="text-gray-300">Selección</span></h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                    {/* Items Section (8 Units) */}
                    <div className="lg:col-span-8 space-y-6">
                        {cart.map(item => (
                            <div key={item.id} className="group bg-white p-8 rounded-[2.5rem] shadow-luxury border border-gray-100/50 flex flex-col md:flex-row items-center gap-8 hover:shadow-luxury-hover transition-all duration-500">
                                <div className="w-24 h-24 bg-brand-porcelain rounded-2xl flex-shrink-0 flex items-center justify-center text-4xl overflow-hidden group-hover:scale-105 transition-transform">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                                    ) : (
                                        "💡"
                                    )}
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <p className="text-[8px] font-black text-primary uppercase tracking-[.3em] mb-1">{item.category}</p>
                                    <h3 className="text-lg font-black text-brand-carbon uppercase italic leading-tight mb-2 group-hover:text-primary transition-colors">{item.name}</h3>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Masterpiece Ref. {1000 + item.id}</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center bg-gray-50 rounded-xl px-4 py-2 border border-gray-100">
                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 text-gray-400 hover:text-brand-carbon font-black">-</button>
                                        <span className="w-8 text-center text-xs font-black italic">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 text-gray-400 hover:text-brand-carbon font-black">+</button>
                                    </div>
                                    <div className="text-right min-w-[100px]">
                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">Inversión</p>
                                        <p className="text-xl font-black text-brand-carbon italic tracking-tighter">{(item.price * item.quantity).toFixed(2)} €</p>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="w-10 h-10 flex items-center justify-center text-gray-200 hover:text-red-500 transition-colors">
                                        <Trash className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary Sidebar (4 Units) */}
                    <div className="lg:col-span-4 lg:sticky lg:top-40">
                        <div className="bg-brand-carbon p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full group-hover:bg-primary/40 transition-colors"></div>

                            <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8 relative z-10">Resumen de<br /><span className="text-gray-500">Adquisición</span></h3>

                            <div className="space-y-4 mb-10 relative z-10">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-[.3em]">
                                    <span className="text-gray-500">Selección Subtotal</span>
                                    <span>{subtotal.toFixed(2)} €</span>
                                </div>
                                {proDiscountAmount > 0 && (
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-[.3em] text-primary">
                                        <span className="font-black italic">Descuento Profesional ({discountPercent}%)</span>
                                        <span className="font-black italic">-{proDiscountAmount.toFixed(2)} €</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-[.3em]">
                                    <span className="text-gray-500">Envío Boutique</span>
                                    <span className="text-primary font-black italic">CONCEDIDO</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-[.3em]">
                                    <span className="text-gray-500">IVA (21%)</span>
                                    <span>{iva.toFixed(2)} €</span>
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-8 mb-10 relative z-10">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black uppercase tracking-[.4em] text-gray-500">Inversión Total</span>
                                    <div className="text-right">
                                        <span className="text-5xl font-black italic tracking-tighter">{totalPrice.toFixed(2)}</span>
                                        <span className="text-xl font-black italic tracking-tighter ml-1">€</span>
                                    </div>
                                </div>
                            </div>

                            <Link to="/checkout" className="w-full bg-white text-brand-carbon py-5 rounded-2xl font-black uppercase italic text-[10px] hover:bg-primary hover:text-white transition-all shadow-xl shadow-black/20 flex items-center justify-center gap-4 relative z-10 group">
                                Tramitar Selección <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-2" />
                            </Link>

                            <div className="mt-8 text-center relative z-10">
                                <Link to="/" className="text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">
                                    ← Seguir Explorando
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
