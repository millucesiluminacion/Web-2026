import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabaseClient';
import {
    CreditCard,
    Truck,
    ShieldCheck,
    ArrowLeft,
    CheckCircle2,
    Loader2,
    Lock
} from 'lucide-react';

export default function Checkout() {
    const { cart, totalPrice, clearCart } = useCart();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [orderCompleted, setOrderCompleted] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        zip: '',
        paymentMethod: 'stripe'
    });

    const IVA_RATE = 0.21;
    const iva = totalPrice * IVA_RATE;
    const subtotal = totalPrice - iva;

    if (cart.length === 0 && !orderCompleted) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-gray-800 uppercase italic">Tu carrito está vacío</h2>
                <Link to="/" className="mt-6 inline-block bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase italic text-sm hover:bg-blue-700 transition-all">
                    Volver a la tienda
                </Link>
            </div>
        );
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Crear el pedido
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    customer_name: formData.name,
                    customer_email: formData.email,
                    customer_phone: formData.phone,
                    shipping_address: formData.address,
                    shipping_city: formData.city,
                    shipping_zip: formData.zip,
                    total: totalPrice,
                    payment_method: formData.paymentMethod,
                    status: 'PENDING'
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Crear los items del pedido
            const orderItems = cart.map(item => ({
                order_id: order.id,
                product_id: item.id,
                quantity: item.quantity,
                unit_price: item.price,
                product_name: item.name
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // 3. Éxito
            setOrderCompleted(true);
            clearCart();

            // Simular delay para realismo
            setTimeout(() => {
                setLoading(false);
            }, 1500);

        } catch (err) {
            console.error('Error procesando pedido:', err);
            alert('Hubo un error al procesar tu pedido. Por favor, inténtalo de nuevo.');
            setLoading(false);
        }
    };

    if (orderCompleted) {
        return (
            <div className="container mx-auto px-4 py-20 text-center animate-in fade-in zoom-in duration-500">
                <div className="max-w-md mx-auto bg-white p-10 rounded-3xl shadow-2xl border border-gray-100">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 uppercase italic mb-2">¡Pedido Recibido!</h2>
                    <p className="text-gray-500 font-bold mb-8">Gracias por confiar en Mil Luces. Hemos enviado los detalles a tu email.</p>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase italic text-sm hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200"
                        >
                            Seguir comprando
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-brand-porcelain min-h-screen pt-32 pb-20">
            <div className="container mx-auto px-6 max-w-[1400px]">
                <div className="flex items-center gap-4 mb-12 group cursor-pointer" onClick={() => navigate('/cart')}>
                    <ArrowLeft className="w-4 h-4 text-brand-carbon/40 group-hover:text-primary transition-colors" />
                    <span className="text-[10px] font-black uppercase tracking-[.4em] text-brand-carbon/40 group-hover:text-primary transition-colors italic">Volver a la Selección</span>
                </div>

                <div className="mb-16">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block">Casi Tuyo</span>
                    <h1 className="text-5xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Confirmar <br /><span className="text-gray-300">Adquisición</span></h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                    {/* Formulario (8 Units) */}
                    <div className="lg:col-span-8 space-y-12">
                        <form id="checkout-form" onSubmit={handleSubmit} className="space-y-12">
                            {/* Datos de contacto */}
                            <section className="bg-white p-10 lg:p-12 rounded-[3rem] shadow-luxury border border-gray-100/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] rounded-full"></div>
                                <div className="flex items-center gap-6 mb-10 relative z-10">
                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/10">
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-brand-carbon uppercase italic leading-none mb-1">Manifiesto de Envío</h3>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">¿A dónde enviamos tu selección exclusiva?</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Nombre Completo</label>
                                        <input
                                            required
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            type="text"
                                            placeholder="Nombre & Apellidos"
                                            className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Email de Contacto</label>
                                        <input
                                            required
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            type="email"
                                            placeholder="ejemplo@mil-luces.com"
                                            className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Teléfono</label>
                                        <input
                                            required
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            type="tel"
                                            placeholder="+34"
                                            className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Dirección de Entrega</label>
                                        <input
                                            required
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            type="text"
                                            placeholder="Calle, número, piso..."
                                            className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Ciudad</label>
                                        <input
                                            required
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            type="text"
                                            placeholder="Madrid"
                                            className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Código Postal</label>
                                        <input
                                            required
                                            name="zip"
                                            value={formData.zip}
                                            onChange={handleChange}
                                            type="text"
                                            placeholder="28001"
                                            className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Pago */}
                            <section className="bg-white p-10 lg:p-12 rounded-[3rem] shadow-luxury border border-gray-100/50 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 blur-[60px] rounded-full"></div>
                                <div className="flex items-center gap-6 mb-10 relative z-10">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-brand-carbon uppercase italic leading-none mb-1">Pasarela de Inversión</h3>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Transacción segura bajo protocolo SSL de alto nivel</p>
                                    </div>
                                </div>

                                <div className="space-y-4 relative z-10">
                                    <label className={`flex items-center justify-between p-6 rounded-2xl cursor-pointer transition-all border-2 ${formData.paymentMethod === 'stripe' ? 'border-primary bg-primary/5' : 'border-gray-50 hover:border-gray-200 bg-gray-50/30'}`}>
                                        <div className="flex items-center gap-6">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.paymentMethod === 'stripe' ? 'border-primary' : 'border-gray-300'}`}>
                                                {formData.paymentMethod === 'stripe' && <div className="w-3 h-3 bg-primary rounded-full"></div>}
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="stripe"
                                                    checked={formData.paymentMethod === 'stripe'}
                                                    onChange={handleChange}
                                                    className="hidden"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-black text-xs text-brand-carbon uppercase italic leading-none mb-1">Tarjeta de Crédito / Débito</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Procesamiento instantáneo (Recomendado)</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="w-8 h-5 bg-white rounded border border-gray-100 shadow-sm"></div>
                                            <div className="w-8 h-5 bg-white rounded border border-gray-100 shadow-sm"></div>
                                        </div>
                                    </label>

                                    <label className={`flex items-center justify-between p-6 rounded-2xl cursor-pointer transition-all border-2 ${formData.paymentMethod === 'paypal' ? 'border-primary bg-primary/5' : 'border-gray-50 hover:border-gray-200 bg-gray-50/30'}`}>
                                        <div className="flex items-center gap-6">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.paymentMethod === 'paypal' ? 'border-primary' : 'border-gray-300'}`}>
                                                {formData.paymentMethod === 'paypal' && <div className="w-3 h-3 bg-primary rounded-full"></div>}
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="paypal"
                                                    checked={formData.paymentMethod === 'paypal'}
                                                    onChange={handleChange}
                                                    className="hidden"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-black text-xs text-brand-carbon uppercase italic leading-none mb-1">PayPal Checkout</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Acceso directo a tu cuenta PayPal</p>
                                            </div>
                                        </div>
                                        <span className="text-primary font-black italic text-xs tracking-tighter">PayPal</span>
                                    </label>

                                    <label className={`flex items-center justify-between p-6 rounded-2xl cursor-pointer transition-all border-2 ${formData.paymentMethod === 'transfer' ? 'border-primary bg-primary/5' : 'border-gray-50 hover:border-gray-200 bg-gray-50/30'}`}>
                                        <div className="flex items-center gap-6">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.paymentMethod === 'transfer' ? 'border-primary' : 'border-gray-300'}`}>
                                                {formData.paymentMethod === 'transfer' && <div className="w-3 h-3 bg-primary rounded-full"></div>}
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="transfer"
                                                    checked={formData.paymentMethod === 'transfer'}
                                                    onChange={handleChange}
                                                    className="hidden"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-black text-xs text-brand-carbon uppercase italic leading-none mb-1">Transferencia Directa</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Confirmación manual (Lento)</p>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </section>
                        </form>
                    </div>

                    {/* Resumen lateral (4 Units) */}
                    <div className="lg:col-span-4 lg:sticky lg:top-40">
                        <div className="bg-white rounded-[3rem] p-10 shadow-luxury border border-gray-100/50">
                            <h3 className="text-xl font-black text-brand-carbon uppercase italic tracking-tighter mb-8">Estado de la <br /><span className="text-gray-300">Selección</span></h3>

                            <div className="space-y-6 mb-10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {cart.map(item => (
                                    <div key={item.id} className="flex justify-between items-center gap-4 group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-xl border border-gray-100 group-hover:scale-110 transition-transform overflow-hidden">
                                                {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" /> : "💡"}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-brand-carbon uppercase italic leading-none mb-1 line-clamp-1 group-hover:text-primary transition-colors">{item.name}</p>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Cant: {item.quantity}</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-black text-brand-carbon italic tracking-tighter">{(item.price * item.quantity).toFixed(2)} €</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 border-t border-dashed border-gray-100 pt-8 mb-10">
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-[.3em]">
                                    <span>Subtotal</span>
                                    <span>{subtotal.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-[.3em]">
                                    <span>Envío</span>
                                    <span className="text-primary italic">CONCEDIDO</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-[.3em]">
                                    <span>IVA (21%)</span>
                                    <span>{iva.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between items-baseline pt-4">
                                    <span className="text-[10px] font-black text-brand-carbon uppercase tracking-[.4em]">Inmersión Total</span>
                                    <div className="text-right">
                                        <span className="text-3xl font-black text-primary italic tracking-tighter">{totalPrice.toFixed(2)}</span>
                                        <span className="text-lg font-black text-primary italic tracking-tighter ml-1">€</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                form="checkout-form"
                                type="submit"
                                disabled={loading}
                                className="w-full bg-brand-carbon text-white py-5 rounded-2xl font-black uppercase italic text-[11px] hover:bg-primary transition-all shadow-xl shadow-black/20 flex items-center justify-center gap-4 disabled:opacity-50 group mb-6"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <ShieldCheck className="w-5 h-5 transition-transform group-hover:scale-110" />
                                        Confirmar Adquisición
                                    </>
                                )}
                            </button>

                            <div className="flex items-center justify-center gap-3 opacity-20">
                                <Lock className="w-3 h-3" />
                                <span className="text-[8px] font-black uppercase tracking-[.3em]">Encripción SSL 256-bit</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
