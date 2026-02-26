import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
    Trash, CreditCard, Truck, ShieldCheck,
    CheckCircle2, Loader2, Lock, Package,
    ChevronDown, ChevronUp, ArrowRight, Sparkles,
    AlertCircle
} from 'lucide-react';

const INPUT_CLASS = "w-full bg-gray-50/80 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all placeholder:font-normal placeholder:text-gray-300";
const LABEL_CLASS = "text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1.5 block ml-1";

// Detectar si estamos en desarrollo o producción
const API_BASE = import.meta.env.DEV ? '' : '';

export default function Cart() {
    const { cart, removeFromCart, updateQuantity, totalOriginal, totalSavings, totalPrice, clearCart } = useCart();
    const { profile, user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [loading, setLoading] = useState(false);
    const [paymentloading, setPaymentLoading] = useState(true);
    const [orderCompleted, setOrderCompleted] = useState(false);
    const [orderRef, setOrderRef] = useState('');
    const [showOrderSummary, setShowOrderSummary] = useState(true);
    const [paymentMethods, setPaymentMethods] = useState({ stripe: null, paypal: null, transfer: null });
    const [payError, setPayError] = useState('');
    const [transferInfo, setTransferInfo] = useState(null);

    const [formData, setFormData] = useState({
        name: profile?.full_name || '',
        email: user?.email || '',
        phone: '',
        address: '',
        city: '',
        zip: '',
        notes: '',
        paymentMethod: ''
    });

    const IVA_RATE = 0.21;
    const baseImponible = totalPrice / (1 + IVA_RATE);
    const iva = totalPrice - baseImponible;

    // Verificar si venimos de un pago exitoso
    useEffect(() => {
        const paymentStatus = searchParams.get('payment');
        const orderId = searchParams.get('order');
        if (paymentStatus === 'success' && orderId) {
            setOrderRef(orderId.slice(0, 8).toUpperCase());
            setOrderCompleted(true);
            clearCart();
        }
    }, [searchParams]);

    // Cargar métodos de pago activos del admin
    useEffect(() => {
        async function loadPaymentMethods() {
            setPaymentLoading(true);
            const { data } = await supabase
                .from('app_settings')
                .select('key, value')
                .in('key', ['payment_stripe', 'payment_paypal', 'payment_transfer']);

            const methods = { stripe: null, paypal: null, transfer: null };
            if (data) {
                data.forEach(row => {
                    if (row.key === 'payment_stripe' && row.value?.enabled && row.value?.secretKey) {
                        methods.stripe = row.value;
                    }
                    if (row.key === 'payment_paypal' && row.value?.enabled && row.value?.clientId) {
                        methods.paypal = row.value;
                    }
                    if (row.key === 'payment_transfer' && row.value?.enabled) {
                        methods.transfer = row.value;
                        setTransferInfo(row.value);
                    }
                });
            }
            setPaymentMethods(methods);

            // Seleccionar el primer método activo por defecto
            const firstActive = methods.stripe ? 'stripe' : methods.paypal ? 'paypal' : methods.transfer ? 'transfer' : '';
            setFormData(prev => ({ ...prev, paymentMethod: firstActive }));
            setPaymentLoading(false);
        }
        loadPaymentMethods();
    }, []);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Guardar pedido en Supabase
    async function saveOrder() {
        const { data: order, error } = await supabase
            .from('orders')
            .insert([{
                customer_name: formData.name,
                customer_email: formData.email,
                customer_phone: formData.phone,
                shipping_address: formData.address,
                shipping_city: formData.city,
                shipping_zip: formData.zip,
                notes: formData.notes,
                total: totalPrice,
                payment_method: formData.paymentMethod,
                status: 'PENDING',
                user_id: user?.id || null,
            }])
            .select()
            .single();

        if (error) throw error;

        const orderItems = cart.map(item => ({
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            product_name: item.name,
        }));
        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if (itemsError) throw itemsError;

        return order;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (cart.length === 0) return;
        setLoading(true);
        setPayError('');

        try {
            const order = await saveOrder();

            if (formData.paymentMethod === 'stripe') {
                // Llamar a la función serverless de Stripe
                const res = await fetch('/api/create-stripe-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url })),
                        orderId: order.id,
                    }),
                });
                const { url, error } = await res.json();
                if (error) throw new Error(error);
                window.location.href = url; // Redirigir a Stripe Checkout
                return;
            }

            if (formData.paymentMethod === 'paypal') {
                // Llamar a la función serverless de PayPal
                const res = await fetch('/api/create-paypal-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ totalPrice, orderId: order.id }),
                });
                const { approveUrl, error } = await res.json();
                if (error) throw new Error(error);
                window.location.href = approveUrl; // Redirigir a PayPal
                return;
            }

            if (formData.paymentMethod === 'transfer') {
                setOrderRef(order.id.slice(0, 8).toUpperCase());
                setOrderCompleted(true);
                clearCart();
                return;
            }

        } catch (err) {
            console.error('Error procesando pedido:', err);
            setPayError(err.message || 'Hubo un error al procesar tu pedido. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    // ── Pantalla de confirmación ──────────────────────────────────────
    if (orderCompleted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-porcelain px-6 py-20">
                <div className="max-w-lg w-full text-center animate-in fade-in zoom-in duration-700">
                    <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-primary/20">
                        <CheckCircle2 className="w-12 h-12 text-primary" />
                    </div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-3 block">Adquisición Confirmada</span>
                    <h1 className="text-5xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter mb-4">
                        ¡Pedido <span className="text-gray-300">Recibido!</span>
                    </h1>
                    <p className="text-sm text-gray-400 font-bold mb-2">
                        Referencia: <span className="text-brand-carbon font-black italic">#{orderRef}</span>
                    </p>
                    {formData.paymentMethod === 'transfer' && transferInfo && (
                        <div className="bg-white rounded-3xl p-6 text-left mb-8 shadow-luxury border border-gray-100 space-y-3">
                            <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-4">Datos para la Transferencia</p>
                            {transferInfo.iban && <div><span className="text-[9px] font-black text-gray-400 uppercase block">IBAN</span><span className="text-sm font-black text-brand-carbon font-mono">{transferInfo.iban}</span></div>}
                            {transferInfo.titular && <div><span className="text-[9px] font-black text-gray-400 uppercase block">Titular</span><span className="text-sm font-bold text-brand-carbon">{transferInfo.titular}</span></div>}
                            {transferInfo.banco && <div><span className="text-[9px] font-black text-gray-400 uppercase block">Banco</span><span className="text-sm font-bold text-brand-carbon">{transferInfo.banco}</span></div>}
                            <div><span className="text-[9px] font-black text-gray-400 uppercase block">Concepto</span><span className="text-sm font-black text-primary">#{orderRef}</span></div>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest pt-2 border-t border-gray-50">Tu pedido se procesará en cuanto recibamos la transferencia.</p>
                        </div>
                    )}
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-12 max-w-xs mx-auto">
                        Gracias por confiar en Mil Luces. Hemos enviado los detalles al email facilitado.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={() => navigate('/')} className="px-10 py-4 bg-brand-carbon text-white rounded-2xl font-black uppercase italic text-[10px] hover:bg-primary transition-all shadow-xl shadow-black/20">
                            Seguir Explorando
                        </button>
                        <Link to="/search" className="px-10 py-4 bg-white text-brand-carbon rounded-2xl font-black uppercase italic text-[10px] hover:border-primary border border-gray-100 transition-all shadow-luxury">
                            Ver Catálogo
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── Carrito vacío ─────────────────────────────────────────────────
    if (cart.length === 0) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-brand-porcelain">
                <div className="w-32 h-32 mb-8 bg-white rounded-[2.5rem] shadow-luxury flex items-center justify-center text-5xl opacity-20 relative">
                    <div className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-[2.5rem] animate-spin-slow"></div>
                    💡
                </div>
                <h2 className="text-2xl font-black text-brand-carbon uppercase italic tracking-tighter mb-4">Tu Colección está Vacía</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[.4em] mb-12 text-center max-w-xs">
                    Parece que aún no has seleccionado ninguna de nuestras piezas exclusivas.
                </p>
                <Link to="/search" className="px-12 py-5 bg-brand-carbon text-white rounded-2xl font-black uppercase italic text-[10px] hover:bg-primary transition-all shadow-xl shadow-black/20">
                    Explorar Galería
                </Link>
            </div>
        );
    }

    const activeMethodsList = [
        paymentMethods.stripe && { value: 'stripe', label: 'Tarjeta de Crédito / Débito', sub: 'Visa, Mastercard, Apple Pay (procesado por Stripe)', icon: '💳' },
        paymentMethods.paypal && { value: 'paypal', label: 'PayPal', sub: 'Paga con tu cuenta PayPal de forma segura', icon: '🅿️' },
        paymentMethods.transfer && { value: 'transfer', label: 'Transferencia Bancaria', sub: 'Recibirás los datos bancarios al confirmar', icon: '🏦' },
    ].filter(Boolean);

    // ── Checkout All-In-One ───────────────────────────────────────────
    return (
        <div className="min-h-screen bg-brand-porcelain pt-10 pb-20">
            <div className="container mx-auto px-4 md:px-6 max-w-[1400px]">

                <div className="mb-12 text-center">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block">Tu Selección Exclusiva</span>
                    <h1 className="text-5xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">
                        Finalizar <span className="text-gray-300">Pedido</span>
                    </h1>
                </div>

                <form onSubmit={handleSubmit} id="aio-form">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

                        {/* COLUMNA IZQUIERDA (8 cols) */}
                        <div className="lg:col-span-8 space-y-6">

                            {/* 1: Revisión del pedido */}
                            <div className="bg-white rounded-[2.5rem] shadow-luxury border border-gray-100/50 overflow-hidden">
                                <button type="button" onClick={() => setShowOrderSummary(p => !p)} className="w-full flex items-center justify-between p-8 group">
                                    <div className="flex items-center gap-5">
                                        <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/10">
                                            <Package className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="text-left">
                                            <h2 className="text-sm font-black text-brand-carbon uppercase italic leading-none mb-0.5">Tu Selección</h2>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{cart.length} artículo{cart.length !== 1 ? 's' : ''} · {totalPrice.toFixed(2)} €</p>
                                        </div>
                                    </div>
                                    {showOrderSummary ? <ChevronUp className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" /> : <ChevronDown className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />}
                                </button>

                                {showOrderSummary && (
                                    <div className="px-8 pb-8 border-t border-gray-50 pt-6 space-y-4">
                                        {cart.map(item => (
                                            <div key={item.id} className="group flex items-center gap-5 p-4 rounded-2xl hover:bg-gray-50/80 transition-colors">
                                                <Link to={`/product/${item.slug || item.id}`} className="w-16 h-16 bg-brand-porcelain rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
                                                    {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" /> : <span className="text-2xl">💡</span>}
                                                </Link>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[8px] font-black text-primary uppercase tracking-[.2em] mb-0.5">{item.category}</p>
                                                    <Link to={`/product/${item.slug || item.id}`}>
                                                        <h3 className="text-xs font-black text-brand-carbon uppercase italic leading-tight group-hover:text-primary transition-colors line-clamp-2">{item.name}</h3>
                                                    </Link>
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <div className="flex items-center bg-gray-100 rounded-xl px-3 py-1.5 gap-2">
                                                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-5 h-5 text-gray-400 hover:text-brand-carbon font-black text-lg leading-none flex items-center justify-center">−</button>
                                                        <span className="w-6 text-center text-xs font-black italic">{item.quantity}</span>
                                                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-5 h-5 text-gray-400 hover:text-brand-carbon font-black text-lg leading-none flex items-center justify-center">+</button>
                                                    </div>
                                                    <div className="text-right min-w-[80px]">
                                                        <p className="text-sm font-black text-brand-carbon italic tracking-tighter">{(item.price * item.quantity).toFixed(2)} €</p>
                                                    </div>
                                                    <button type="button" onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center text-gray-200 hover:text-red-400 transition-colors rounded-xl hover:bg-red-50">
                                                        <Trash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {totalSavings > 0 && (
                                            <div className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-2xl px-5 py-3">
                                                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest italic">Ahorro Exclusivo: −{totalSavings.toFixed(2)} €</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 2: Datos de envío */}
                            <div className="bg-white rounded-[2.5rem] shadow-luxury border border-gray-100/50 p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-[80px] rounded-full pointer-events-none"></div>
                                <div className="flex items-center gap-5 mb-8 relative z-10">
                                    <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/10">
                                        <Truck className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-brand-carbon uppercase italic leading-none mb-0.5">Destino de Envío</h2>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">¿A dónde enviamos tu selección?</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                                    <div><label className={LABEL_CLASS}>Nombre Completo *</label><input required name="name" value={formData.name} onChange={handleChange} type="text" placeholder="Nombre & Apellidos" className={INPUT_CLASS} /></div>
                                    <div><label className={LABEL_CLASS}>Email de Contacto *</label><input required name="email" value={formData.email} onChange={handleChange} type="email" placeholder="hola@milluces.com" className={INPUT_CLASS} /></div>
                                    <div><label className={LABEL_CLASS}>Teléfono *</label><input required name="phone" value={formData.phone} onChange={handleChange} type="tel" placeholder="+34 600 000 000" className={INPUT_CLASS} /></div>
                                    <div><label className={LABEL_CLASS}>Código Postal *</label><input required name="zip" value={formData.zip} onChange={handleChange} type="text" placeholder="28001" className={INPUT_CLASS} /></div>
                                    <div className="md:col-span-2"><label className={LABEL_CLASS}>Dirección de Entrega *</label><input required name="address" value={formData.address} onChange={handleChange} type="text" placeholder="Calle, número, piso, puerta..." className={INPUT_CLASS} /></div>
                                    <div><label className={LABEL_CLASS}>Ciudad *</label><input required name="city" value={formData.city} onChange={handleChange} type="text" placeholder="Madrid" className={INPUT_CLASS} /></div>
                                    <div><label className={LABEL_CLASS}>Notas del pedido</label><input name="notes" value={formData.notes} onChange={handleChange} type="text" placeholder="Instrucciones especiales..." className={INPUT_CLASS} /></div>
                                </div>
                            </div>

                            {/* 3: Método de pago */}
                            <div className="bg-white rounded-[2.5rem] shadow-luxury border border-gray-100/50 p-8 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-40 h-40 bg-indigo-50/60 blur-[80px] rounded-full pointer-events-none"></div>
                                <div className="flex items-center gap-5 mb-8 relative z-10">
                                    <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
                                        <CreditCard className="w-5 h-5 text-indigo-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-brand-carbon uppercase italic leading-none mb-0.5">Método de Pago</h2>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Transacción segura · SSL 256-bit</p>
                                    </div>
                                </div>

                                {paymentloading ? (
                                    <div className="flex items-center gap-3 text-gray-400 py-4">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Cargando métodos disponibles...</span>
                                    </div>
                                ) : activeMethodsList.length === 0 ? (
                                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
                                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">No hay métodos de pago activos. Configúralos en el panel de administración.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 relative z-10">
                                        {activeMethodsList.map(opt => (
                                            <label key={opt.value} className={`flex items-center gap-5 p-5 rounded-2xl cursor-pointer transition-all border-2 ${formData.paymentMethod === opt.value ? 'border-primary bg-primary/5' : 'border-gray-50 hover:border-gray-200 bg-gray-50/30'}`}>
                                                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${formData.paymentMethod === opt.value ? 'border-primary' : 'border-gray-300'}`}>
                                                    {formData.paymentMethod === opt.value && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
                                                </div>
                                                <input type="radio" name="paymentMethod" value={opt.value} checked={formData.paymentMethod === opt.value} onChange={handleChange} className="hidden" />
                                                <span className="text-xl">{opt.icon}</span>
                                                <div className="flex-1">
                                                    <p className="font-black text-xs text-brand-carbon uppercase italic leading-none mb-1">{opt.label}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{opt.sub}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Error de pago */}
                            {payError && (
                                <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">{payError}</p>
                                </div>
                            )}
                        </div>

                        {/* PANEL DERECHO STICKY (4 cols) */}
                        <div className="lg:col-span-4 lg:sticky lg:top-[140px]">
                            <div className="bg-brand-carbon p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/15 blur-[80px] rounded-full"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full"></div>
                                <h3 className="text-lg font-black uppercase italic tracking-tighter mb-6 relative z-10">
                                    Resumen de <br /><span className="text-gray-500">Adquisición</span>
                                </h3>
                                <div className="space-y-3 mb-6 max-h-[200px] overflow-y-auto pr-1 relative z-10">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/5 flex-shrink-0 overflow-hidden">
                                                {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" /> : <span className="text-base">💡</span>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] font-black text-white/70 uppercase italic leading-tight line-clamp-1">{item.name}</p>
                                                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">×{item.quantity}</p>
                                            </div>
                                            <p className="text-xs font-black text-white italic flex-shrink-0">{(item.price * item.quantity).toFixed(2)} €</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-3 border-t border-white/10 pt-5 mb-5 relative z-10">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-[.2em]">
                                        <span className="text-gray-500">P.V.P. Original</span>
                                        <span className={totalSavings > 0 ? 'line-through text-gray-600' : ''}>{totalOriginal.toFixed(2)} €</span>
                                    </div>
                                    {totalSavings > 0 && (
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-[.2em] text-primary italic">
                                            <span>Ahorro Exclusivo</span><span>−{totalSavings.toFixed(2)} €</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-[.2em]">
                                        <span className="text-gray-500">Envío</span><span className="text-primary font-black italic">CONCEDIDO</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-[.2em]">
                                        <span className="text-gray-500">IVA (21%)</span><span>{iva.toFixed(2)} €</span>
                                    </div>
                                </div>
                                <div className="border-t border-white/10 pt-5 mb-7 relative z-10">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] font-black uppercase tracking-[.3em] text-gray-500">Inversión Total</span>
                                        <div className="text-right">
                                            <span className="text-4xl font-black italic tracking-tighter">{totalPrice.toFixed(2)}</span>
                                            <span className="text-lg font-black italic ml-1">€</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    form="aio-form"
                                    type="submit"
                                    disabled={loading || paymentloading || activeMethodsList.length === 0 || !formData.paymentMethod}
                                    className="w-full bg-white text-brand-carbon py-4 rounded-2xl font-black uppercase italic text-[11px] hover:bg-primary hover:text-white transition-all shadow-xl shadow-black/30 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group relative z-10 mb-4"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            {formData.paymentMethod === 'stripe' ? 'Pagar con Stripe' :
                                                formData.paymentMethod === 'paypal' ? 'Pagar con PayPal' :
                                                    formData.paymentMethod === 'transfer' ? 'Confirmar Pedido' :
                                                        'Confirmar Pedido'}
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                                <div className="flex items-center justify-center gap-2 opacity-30 relative z-10">
                                    <Lock className="w-3 h-3" />
                                    <span className="text-[8px] font-black uppercase tracking-[.3em]">Encripción SSL 256-bit</span>
                                </div>
                            </div>
                            <div className="mt-4 text-center">
                                <Link to="/search" className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors">
                                    ← Seguir Explorando
                                </Link>
                            </div>
                        </div>

                    </div>
                </form>
            </div>
        </div>
    );
}
