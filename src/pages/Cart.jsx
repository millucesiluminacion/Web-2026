import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
    Trash, CreditCard, Truck, ShieldCheck,
    CheckCircle2, Loader2, Lock, Package,
    ChevronDown, ChevronUp, ArrowRight, Sparkles,
    AlertCircle, Minus, Plus, X
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import StripePaymentForm from '../components/commerce/StripePaymentForm';
import { IVA_RATE } from '../lib/pricingUtils';

const INPUT_CLASS = "w-full bg-gray-50/80 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all placeholder:font-normal placeholder:text-gray-300";
const LABEL_CLASS = "text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1.5 block ml-1";

// Detectar si estamos en desarrollo o producción
const API_BASE = import.meta.env.DEV ? '' : '';

export default function Cart() {
    const { cart, removeFromCart, updateQuantity, totalOriginal, totalSavings, totalPrice, subtotal, shippingCost, shippingConfig, shippingZone, setShippingZone, currentShipping, clearCart } = useCart();
    const { profile, user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [loading, setLoading] = useState(false);
    const [paymentloading, setPaymentLoading] = useState(true);
    const [orderCompleted, setOrderCompleted] = useState(false);
    const [orderRef, setOrderRef] = useState('');
    const [createdOrderId, setCreatedOrderId] = useState('');
    const [showOrderSummary, setShowOrderSummary] = useState(true);
    const [paymentMethods, setPaymentMethods] = useState({ stripe: null, paypal: null, transfer: null });
    const [payError, setPayError] = useState('');
    const [transferInfo, setTransferInfo] = useState(null);
    const [stripePromise, setStripePromise] = useState(null);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    const [formData, setFormData] = useState({
        name: profile?.full_name || '',
        email: user?.email || '',
        phone: '',
        address: '',
        city: '',
        zip: '',
        country: 'España',
        notes: '',
        paymentMethod: '',
        shippingMethod: null // 'delivery' or 'pickup'
    });

    const isPro = profile?.user_type === 'profesional' && !!profile?.has_pro_prices;
    const isB2B = isPro || !!profile?.is_partner;

    // Explicit shipping cost calculation based on method choice
    const effectiveShippingCost = formData.shippingMethod === 'pickup' ? 0 : (formData.shippingMethod === 'delivery' ? shippingCost : 0);

    const couponDiscount = appliedCoupon ? (subtotal * (appliedCoupon.discount_percentage / 100)) : 0;
    const effectiveTotalPrice = subtotal + effectiveShippingCost - couponDiscount;
    const baseImponible = effectiveTotalPrice / (1 + IVA_RATE);
    const iva = effectiveTotalPrice - baseImponible;

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
                    if (row.key === 'payment_stripe' && row.value?.enabled) {
                        methods.stripe = row.value;
                        if (row.value.publicKey) {
                            setStripePromise(loadStripe(row.value.publicKey));
                        }
                    }
                    if (row.key === 'payment_paypal' && row.value?.enabled && (row.value?.clientId || row.value?.secretKey || row.value?.merchantId || row.value?.connectClientId)) {
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


    // Detección de Zona de Envío automática
    useEffect(() => {
        const detectZone = () => {
            if (formData.country !== 'España') {
                if (shippingZone !== 'international') setShippingZone('international');
                return;
            }

            const zipPrefix = formData.zip.substring(0, 2);
            const islandPrefixes = ['07', '35', '38', '51', '52'];

            if (islandPrefixes.includes(zipPrefix)) {
                if (shippingZone !== 'islands') setShippingZone('islands');
            } else if (formData.zip.length >= 2) {
                if (shippingZone !== 'peninsula') setShippingZone('peninsula');
            }
        };
        detectZone();
    }, [formData.zip, formData.country, setShippingZone, shippingZone]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };

            // Si cambiamos a envío a domicilio y el método era pago en tienda, lo reseteamos
            if (name === 'shippingMethod' && value === 'delivery' && prev.paymentMethod === 'in_store') {
                const firstActive = paymentMethods.stripe ? 'stripe' : paymentMethods.paypal ? 'paypal' : paymentMethods.transfer ? 'transfer' : '';
                next.paymentMethod = firstActive;
            }

            return next;
        });
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
                notes: appliedCoupon
                    ? `${formData.notes}${formData.notes ? ' | ' : ''}CUPÓN: ${appliedCoupon.code} (-${appliedCoupon.discount_percentage}%)`
                    : formData.notes,
                total: effectiveTotalPrice,
                payment_method: formData.paymentMethod,
                shipping_method: formData.shippingMethod || 'delivery',
                status: 'PENDING',
                user_id: user?.id || null,
            }])
            .select()
            .maybeSingle();

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

        // Trigger Order Confirmation Email
        try {
            // Build detailed HTML for both Customer and Admin
            const itemsHtml = cart.map(item => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 12px 0; font-size: 14px;">
                        <div style="font-weight: bold; color: #111827;">${item.name}</div>
                        <div style="font-size: 12px; color: #6b7280;">Boutique Ref: ${item.id.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td style="padding: 12px 10px; font-size: 14px; text-align: center; color: #374151;">${item.quantity}</td>
                    <td style="padding: 12px 0; font-size: 14px; text-align: right; font-weight: bold; color: #111827;">${item.price.toFixed(2)}€</td>
                </tr>
            `).join('');

            const ivaAmount = effectiveTotalPrice * 0.17355; // 21% inclusive is approx 17.355% of total
            const basePrice = effectiveTotalPrice - ivaAmount;

            const orderDetailsHtml = `
                <div style="margin-top: 30px; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden;">
                    <div style="background-color: #fafafa; padding: 15px 20px; border-bottom: 1px solid #f0f0f0;">
                        <h3 style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #111827; font-style: italic;">Detalles del Pedido</h3>
                    </div>
                    <div style="padding: 20px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 2px solid #111827;">
                                    <th style="text-align: left; padding-bottom: 10px; font-size: 10px; text-transform: uppercase; color: #6b7280;">Producto</th>
                                    <th style="text-align: center; padding-bottom: 10px; font-size: 10px; text-transform: uppercase; color: #6b7280;">Cant.</th>
                                    <th style="text-align: right; padding-bottom: 10px; font-size: 10px; text-transform: uppercase; color: #6b7280;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </div>
                    <div style="background-color: #fafafa; padding: 20px; border-top: 1px solid #f0f0f0;">
                        <table style="width: 100%;">
                            <tr>
                                <td style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Base Imponible:</td>
                                <td style="text-align: right; font-size: 14px; font-weight: bold;">${basePrice.toFixed(2)}€</td>
                            </tr>
                            <tr>
                                <td style="font-size: 12px; color: #6b7280; text-transform: uppercase;">IVA (21%):</td>
                                <td style="text-align: right; font-size: 14px; font-weight: bold;">${ivaAmount.toFixed(2)}€</td>
                            </tr>
                            ${appliedCoupon ? `
                            <tr>
                                <td style="font-size: 12px; color: #16a34a; text-transform: uppercase; font-weight: bold;">Descuento Cupón (${appliedCoupon.code}):</td>
                                <td style="text-align: right; font-size: 14px; font-weight: bold; color: #16a34a;">-${couponDiscount.toFixed(2)}€</td>
                            </tr>
                            ` : ''}
                            <tr style="border-top: 1px solid #e5e7eb;">
                                <td style="padding-top: 10px; font-size: 14px; font-weight: 900; color: #111827; text-transform: uppercase; font-style: italic;">Total del Pedido:</td>
                                <td style="padding-top: 10px; text-align: right; font-size: 20px; font-weight: 900; color: #111827;">${effectiveTotalPrice.toFixed(2)}€</td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div style="margin-top: 20px; padding: 15px; background-color: #f0fdf4; border-radius: 12px; border: 1px solid #dcfce7; color: #166534; font-size: 13px; font-weight: bold; text-align: center;">
                    Método de entrega: ${formData.shippingMethod === 'pickup' ? 'RECOGIDA EN TIENDA (0€)' : 'ENVÍO A DOMICILIO'} <br/>
                    Método de pago: ${formData.paymentMethod === 'stripe' ? 'TARJETA' : formData.paymentMethod === 'paypal' ? 'PAYPAL' : formData.paymentMethod === 'transfer' ? 'TRANSFERENCIA' : 'PAGO EN TIENDA'}
                </div>
            `;

            // 1. Send to Customer
            const customerResp = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': import.meta.env.VITE_EMAIL_SYSTEM_KEY || 'MilLucesSeguro2026'
                },
                body: JSON.stringify({
                    to: formData.email,
                    templateKey: 'order_confirmation',
                    variables: {
                        name: formData.name,
                        order_id: order.id.slice(0, 8).toUpperCase(),
                        site_name: 'Mil Luces Iluminación',
                        body: `Gracias por confiar en nosotros. Hemos recibido tu pedido y ya estamos trabajando en él. Aquí tienes los detalles:<br/>${orderDetailsHtml}`
                    }
                })
            });
            console.log('[Cart] Customer Email Status:', customerResp.status);

            // 2. Send to Admin (Notification of New Order)
            let adminEmail = 'milluces@millucesiluminacion.com';
            try {
                const { data: brandData } = await supabase.from('app_settings').select('value').eq('key', 'site_branding').maybeSingle();
                if (brandData?.value?.contact_email) adminEmail = brandData.value.contact_email;
            } catch (e) { }

            const adminResp = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': import.meta.env.VITE_EMAIL_SYSTEM_KEY || 'MilLucesSeguro2026'
                },
                body: JSON.stringify({
                    to: adminEmail,
                    templateKey: 'master_layout',
                    variables: {
                        site_name: 'Mil Luces Iluminación',
                        body: `
                            <div style="font-family: sans-serif; color: #111827;">
                                <h1 style="font-style: italic; text-transform: uppercase; font-weight: 900; border-bottom: 2px solid #111827; padding-bottom: 10px; font-size: 24px;">Nuevo Pedido Recibido</h1>
                                <p style="font-size: 14px; margin-top: 20px;">Se ha registrado un nuevo pedido en la web:</p>
                                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 12px; border: 1px solid #f0f0f0;">
                                    <p style="margin: 5px 0;"><b>ID Pedido:</b> #${order.id.slice(0, 8).toUpperCase()}</p>
                                    <p style="margin: 5px 0;"><b>Cliente:</b> ${formData.name}</p>
                                    <p style="margin: 5px 0;"><b>Email:</b> ${formData.email}</p>
                                    <p style="margin: 5px 0;"><b>Teléfono:</b> ${formData.phone || 'No facilitado'}</p>
                                    <p style="margin: 5px 0;"><b>Dirección:</b> ${formData.shippingMethod === 'pickup' ? 'RECOGIDA EN TIENDA' : `${formData.address}, ${formData.city} (${formData.zip})`}</p>
                                </div>
                                ${orderDetailsHtml}
                                <p style="margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em;">Gestiona este pedido desde el Panel Admin</p>
                            </div>
                        `
                    }
                })
            });
            console.log('[Cart] Admin Notification Status:', adminResp.status);
        } catch (emailErr) {
            console.error('Error triggering order confirmation emails:', emailErr);
        }

        return order;
    }

    const handlePaymentSucceeded = (paymentIntent) => {
        setOrderRef(paymentIntent.id.slice(-8).toUpperCase());
        setOrderCompleted(true);
        clearCart();
        setLoading(false);
    };

    const handlePaymentFailed = (error) => {
        setPayError(error);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (cart.length === 0) return;

        if (formData.paymentMethod === 'stripe') return;

        setLoading(true);
        setPayError('');

        try {
            const order = await saveOrder();

            if (formData.paymentMethod === 'paypal') {
                const res = await fetch('/api/create-paypal-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: order.id }),
                });
                const { approveUrl, error } = await res.json();
                if (window.top) {
                    window.top.location.href = approveUrl;
                } else {
                    window.location.assign(approveUrl);
                }
                return;
            }

            if (formData.paymentMethod === 'transfer' || formData.paymentMethod === 'in_store') {
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

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setIsValidatingCoupon(true);
        setCouponError('');
        try {
            const { data, error } = await supabase
                .from('offers')
                .select('*')
                .eq('code', couponCode.toUpperCase())
                .eq('is_active', true)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                setCouponError('Código no válido');
                setAppliedCoupon(null);
            } else if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
                setCouponError('El cupón ha expirado');
                setAppliedCoupon(null);
            } else {
                setAppliedCoupon(data);
                setCouponCode('');
            }
        } catch (err) {
            console.error('Error validando cupón:', err);
            setCouponError('Error al validar cupón');
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponError('');
    };

    // ── Pantalla de confirmación ──────────────────────────────────────
    if (orderCompleted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-porcelain px-6 py-20">
                <div className="max-w-lg w-full text-center animate-in fade-in zoom-in duration-700">
                    <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-primary/20">
                        <CheckCircle2 className="w-12 h-12 text-primary" />
                    </div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-3 block">Compra Confirmada</span>
                    <h1 className="text-3xl sm:text-5xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter mb-4">
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
                    {formData.paymentMethod === 'in_store' && (
                        <div className="bg-white rounded-3xl p-6 text-left mb-8 shadow-luxury border border-gray-100 space-y-3">
                            <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-4">Instrucciones de Pago</p>
                            <p className="text-sm font-bold text-brand-carbon italic">Puedes realizar el pago en efectivo o con tarjeta físicamente al recoger tu pedido en nuestra tienda.</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest pt-2 border-t border-gray-50">Te avisaremos cuando tu pedido esté listo para ser recogido.</p>
                        </div>
                    )}
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-12 max-w-xs mx-auto">
                        Gracias por confiar en Mil Luces. Hemos enviado los detalles al email facilitado.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={() => navigate('/')} className="px-10 py-4 bg-brand-carbon text-white rounded-2xl font-black uppercase italic text-[10px] hover:bg-primary transition-all shadow-xl shadow-black/20">
                            Seguir Explorando
                        </button>
                        <Link to="/catalogo" className="px-10 py-4 bg-white text-brand-carbon rounded-2xl font-black uppercase italic text-[10px] hover:border-primary border border-gray-100 transition-all shadow-luxury">
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
                <Link to="/catalogo" className="px-12 py-5 bg-brand-carbon text-white rounded-2xl font-black uppercase italic text-[10px] hover:bg-primary transition-all shadow-xl shadow-black/20">
                    Explorar Galería
                </Link>
            </div>
        );
    }

    const activeMethodsList = [
        paymentMethods.stripe && { value: 'stripe', label: 'Tarjeta de Crédito / Débito', sub: 'Visa, Mastercard, Apple Pay (procesado por Stripe)', icon: '💳' },
        paymentMethods.paypal && { value: 'paypal', label: 'PayPal', sub: 'Paga con tu cuenta PayPal de forma segura', icon: '🅿️' },
        paymentMethods.transfer && { value: 'transfer', label: 'Transferencia Bancaria', sub: 'Recibirás los datos bancarios al confirmar', icon: '🏦' },
        formData.shippingMethod === 'pickup' && { value: 'in_store', label: 'Pago en Tienda', sub: 'Efectivo o tarjeta al recoger tu pedido', icon: '🏪' },
    ].filter(Boolean);

    // ── Checkout All-In-One ───────────────────────────────────────────
    return (
        <div className="min-h-screen bg-brand-porcelain pt-10 pb-20">
            <div className="container mx-auto px-4 md:px-6 max-w-[1400px]">

                <div className="mb-12 text-center">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block">Tu Selección Exclusiva</span>
                    <h1 className="text-3xl sm:text-5xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">
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
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{cart.length} artículo{cart.length !== 1 ? 's' : ''} · {subtotal.toFixed(2)} €</p>
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
                                                    <Link to={`/product/${item.slug || item.id}`} className="group/title">
                                                        <h3 className="text-[10px] font-black text-brand-carbon uppercase italic leading-none mb-1 group-hover/title:text-primary transition-colors truncate">{item.name}</h3>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-none">REF: {item.reference || 'N/A'}</p>
                                                            {item.isMandatory && (
                                                                <span className="text-[7px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-tighter italic">Obligatorio</span>
                                                            )}
                                                        </div>
                                                    </Link>
                                                </div>
                                                <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
                                                    <div className="flex items-center bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-100 shadow-sm">
                                                        {item.isMandatory ? (
                                                            <span className="text-[10px] font-black text-brand-carbon px-2 italic">{item.quantity}</span>
                                                        ) : (
                                                            <>
                                                                <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-brand-carbon transition-colors">
                                                                    <Minus className="w-3 h-3" />
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    value={item.quantity}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value);
                                                                        if (!isNaN(val) && val >= 1) updateQuantity(item.id, val);
                                                                    }}
                                                                    className="w-10 bg-transparent text-center font-black italic text-brand-carbon border-none focus:outline-none text-[10px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                />
                                                                <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-brand-carbon transition-colors">
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="text-right min-w-[70px]">
                                                        <p className="text-sm font-black text-brand-carbon italic tracking-tighter">
                                                            {isB2B ? ((item.price / (1 + IVA_RATE)) * item.quantity).toFixed(2) : (item.price * item.quantity).toFixed(2)} €
                                                        </p>
                                                        {isB2B && <span className="text-[8px] font-black text-primary uppercase italic">+IVA</span>}
                                                    </div>
                                                    {item.isMandatory ? (
                                                        <div className="w-8 h-8 flex items-center justify-center text-amber-200 cursor-not-allowed" title="Accesorio obligatorio">
                                                            <Lock className="w-4 h-4" />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFromCart(item.id)}
                                                            className="w-8 h-8 flex items-center justify-center text-gray-200 hover:text-red-400 hover:bg-red-50 transition-all rounded-xl shadow-sm hover:shadow-red-100"
                                                        >
                                                            <Trash className="w-4 h-4" />
                                                        </button>
                                                    )}
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

                            {/* 2: Método de Entrega */}
                            <div className="bg-white rounded-[2.5rem] shadow-luxury border border-gray-100/50 p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50/60 blur-[80px] rounded-full pointer-events-none"></div>
                                <div className="flex items-center gap-5 mb-8 relative z-10">
                                    <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                                        <Truck className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-brand-carbon uppercase italic leading-none mb-0.5">Método de Entrega</h2>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">¿Cómo prefieres recibir tu pedido?</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                    <label className={`flex flex-col p-5 rounded-2xl cursor-pointer transition-all border-2 ${formData.shippingMethod === 'delivery' ? 'border-primary bg-primary/5' : 'border-gray-50 hover:border-gray-200 bg-gray-50/30'}`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.shippingMethod === 'delivery' ? 'border-primary' : 'border-gray-300'}`}>
                                                {formData.shippingMethod === 'delivery' && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                                            </div>
                                            <input type="radio" name="shippingMethod" value="delivery" checked={formData.shippingMethod === 'delivery'} onChange={handleChange} className="hidden" />
                                            <span className="text-xs font-black text-brand-carbon uppercase italic leading-none">Envío a Domicilio</span>
                                        </div>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-7">
                                            {shippingCost === 0 ? 'GRATIS' : `${shippingCost.toFixed(2)}€`} · {currentShipping.delivery_time}
                                        </p>
                                    </label>

                                    <label className={`flex flex-col p-5 rounded-2xl cursor-pointer transition-all border-2 ${formData.shippingMethod === 'pickup' ? 'border-primary bg-primary/5' : 'border-gray-50 hover:border-gray-200 bg-gray-50/30'}`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.shippingMethod === 'pickup' ? 'border-primary' : 'border-gray-300'}`}>
                                                {formData.shippingMethod === 'pickup' && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                                            </div>
                                            <input type="radio" name="shippingMethod" value="pickup" checked={formData.shippingMethod === 'pickup'} onChange={handleChange} className="hidden" />
                                            <span className="text-xs font-black text-brand-carbon uppercase italic leading-none">Recogida en Tienda</span>
                                        </div>
                                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest pl-7 italic">
                                            GRATIS · Recogida en tienda en 2 horas
                                        </p>
                                    </label>
                                </div>
                            </div>

                            {/* 3: Datos de envío / Facturación */}
                            <div className={`bg-white rounded-[2.5rem] shadow-luxury border border-gray-100/50 p-8 relative overflow-hidden transition-all duration-500 ${!formData.shippingMethod ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-[80px] rounded-full pointer-events-none"></div>
                                <div className="flex items-center gap-5 mb-8 relative z-10">
                                    <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/10">
                                        <Package className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-brand-carbon uppercase italic leading-none mb-0.5">
                                            {formData.shippingMethod === 'pickup' ? 'Datos del Cliente' : 'Destino de Envío'}
                                        </h2>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                            {formData.shippingMethod === 'pickup' ? 'Identifícate para la recogida' : '¿A dónde enviamos tu selección?'}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                                    <div><label className={LABEL_CLASS}>Nombre Completo *</label><input required name="name" value={formData.name} onChange={handleChange} type="text" placeholder="Nombre & Apellidos" className={INPUT_CLASS} /></div>
                                    <div><label className={LABEL_CLASS}>Email de Contacto *</label><input required name="email" value={formData.email} onChange={handleChange} type="email" placeholder="hola@milluces.com" className={INPUT_CLASS} /></div>
                                    <div><label className={LABEL_CLASS}>Teléfono *</label><input required name="phone" value={formData.phone} onChange={handleChange} type="tel" placeholder="+34 600 000 000" className={INPUT_CLASS} /></div>

                                    {formData.shippingMethod === 'delivery' && (
                                        <>
                                            <div><label className={LABEL_CLASS}>País *</label>
                                                <select
                                                    name="country"
                                                    value={formData.country}
                                                    onChange={handleChange}
                                                    className={INPUT_CLASS}
                                                >
                                                    <option value="España">España</option>
                                                    <option value="Portugal">Portugal</option>
                                                    <option value="Francia">Francia</option>
                                                    <option value="Alemania">Alemania</option>
                                                    <option value="Internacional">Otro (Internacional)</option>
                                                </select>
                                            </div>
                                            <div><label className={LABEL_CLASS}>Código Postal *</label><input required name="zip" value={formData.zip} onChange={handleChange} type="text" placeholder="28001" className={INPUT_CLASS} /></div>
                                            <div className="md:col-span-2"><label className={LABEL_CLASS}>Dirección de Entrega *</label><input required name="address" value={formData.address} onChange={handleChange} type="text" placeholder="Calle, número, piso, puerta..." className={INPUT_CLASS} /></div>
                                            <div><label className={LABEL_CLASS}>Ciudad *</label><input required name="city" value={formData.city} onChange={handleChange} type="text" placeholder="Madrid" className={INPUT_CLASS} /></div>
                                        </>
                                    )}

                                    <div className="md:col-span-2"><label className={LABEL_CLASS}>Notas del pedido</label><input name="notes" value={formData.notes} onChange={handleChange} type="text" placeholder="Instrucciones especiales..." className={INPUT_CLASS} /></div>
                                </div>
                            </div>

                            {/* 4: Método de pago */}
                            <div className={`bg-white rounded-[2.5rem] shadow-luxury border border-gray-100/50 p-8 relative overflow-hidden transition-all duration-500 ${!formData.shippingMethod ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
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
                                    <div className="space-y-6 relative z-10">
                                        <div className="space-y-3">
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

                                        {/* Formulario Stripe Embebido */}
                                        {formData.paymentMethod === 'stripe' && stripePromise && (
                                            <div className="pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-top-4 duration-500">
                                                <Elements stripe={stripePromise}>
                                                    <StripePaymentForm
                                                        amount={effectiveTotalPrice}
                                                        prePaymentHook={async () => {
                                                            try {
                                                                const order = await saveOrder();
                                                                return { orderId: order.id };
                                                            } catch (err) {
                                                                return { error: err.message || 'Error al crear el pedido' };
                                                            }
                                                        }}
                                                        onSucceeded={handlePaymentSucceeded}
                                                        onFailed={handlePaymentFailed}
                                                    />
                                                </Elements>
                                            </div>
                                        )}

                                        {/* Formulario PayPal Embebido */}
                                        {formData.paymentMethod === 'paypal' && paymentMethods.paypal && (
                                            <div className="pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-top-4 duration-500">
                                                <PayPalScriptProvider options={{
                                                    "client-id": (paymentMethods.paypal.clientId || paymentMethods.paypal.connectClientId || "test")?.trim(),
                                                    currency: "EUR",
                                                    intent: "capture"
                                                }}>
                                                    <PayPalButtons
                                                        style={{
                                                            layout: "vertical",
                                                            color: "black",
                                                            shape: "rect",
                                                            label: "pay",
                                                            height: 50,
                                                            tagline: false
                                                        }}
                                                        disabled={!formData.name || !formData.email || !formData.phone || !formData.shippingMethod}
                                                        createOrder={async () => {
                                                            setPayError('');
                                                            const order = await saveOrder();
                                                            setCreatedOrderId(order.id);
                                                            const res = await fetch('/api/create-paypal-order', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ orderId: order.id }),
                                                            });
                                                            const data = await res.json();
                                                            if (data.error) throw new Error(data.error);
                                                            return data.orderId;
                                                        }}
                                                        onApprove={async (data) => {
                                                            try {
                                                                setLoading(true);
                                                                const res = await fetch('/api/capture-paypal-order', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        paypalOrderId: data.orderID,
                                                                        orderId: createdOrderId
                                                                    }),
                                                                });
                                                                const result = await res.json();
                                                                if (result.success) {
                                                                    setOrderRef(createdOrderId.slice(0, 8).toUpperCase());
                                                                    setOrderCompleted(true);
                                                                    clearCart();
                                                                } else {
                                                                    setPayError(result.error || 'Error completando el pago con PayPal.');
                                                                }
                                                            } catch (err) {
                                                                setPayError('Error al capturar la orden de PayPal.');
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }}
                                                        onError={(err) => {
                                                            console.error('[PayPal SDK Error]:', err);
                                                            setPayError('Ocurrió un problema con PayPal. Verifica tus datos e inténtalo de nuevo.');
                                                        }}
                                                    />
                                                </PayPalScriptProvider>
                                            </div>
                                        )}
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
                                    <span className="text-white">Resumen de</span> <br /><span className="text-gray-500">Compra</span>
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
                                            <p className="text-xs font-black text-white italic flex-shrink-0">
                                                {isB2B ? ((item.price / (1 + IVA_RATE)) * item.quantity).toFixed(2) : (item.price * item.quantity).toFixed(2)} €
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-3 border-t border-white/10 pt-5 mb-5 relative z-10">
                                    {totalSavings > 0 && (
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-[.2em] text-primary italic">
                                            <span>Ahorro Exclusivo</span>
                                            <span>−{isB2B ? (totalSavings / (1 + IVA_RATE)).toFixed(2) : totalSavings.toFixed(2)} €</span>
                                        </div>
                                    )}
                                    {!formData.shippingMethod && (
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-[.2em]">
                                            <span className="text-gray-500">Envío</span>
                                            <span className="text-primary font-black italic uppercase">A elegir</span>
                                        </div>
                                    )}
                                    {formData.shippingMethod && (
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-[.2em]">
                                            <span className="text-gray-500">Envío</span>
                                            <span className={`${effectiveShippingCost === 0 ? 'text-primary' : 'text-white'} font-black italic uppercase`}>
                                                {effectiveShippingCost === 0 ? 'GRATIS' : `${(isB2B ? effectiveShippingCost / (1 + IVA_RATE) : effectiveShippingCost).toFixed(2)} €`}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-[.2em]">
                                        <span className="text-gray-500">Base Imponible</span>
                                        <span className="text-white font-bold">{baseImponible.toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-[.2em]">
                                        <span className="text-gray-500">IVA (21%)</span>
                                        <span className="text-white font-bold">{iva.toFixed(2)} €</span>
                                    </div>
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-[.2em] text-primary italic border-t border-white/5 pt-3 mt-1">
                                            <span>Cupón: {appliedCoupon.code} (−{appliedCoupon.discount_percentage}%)</span>
                                            <span>−{couponDiscount.toFixed(2)} €</span>
                                        </div>
                                    )}
                                </div>

                                {/* Coupon Input */}
                                {!appliedCoupon ? (
                                    <div className="mb-6 relative z-10">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="CÓDIGO DE CUPÓN"
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/20 select-none no-drag"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleApplyCoupon}
                                                disabled={isValidatingCoupon || !couponCode.trim()}
                                                className="bg-white/10 hover:bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all disabled:opacity-30 flex items-center justify-center min-w-[70px]"
                                            >
                                                {isValidatingCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : 'APLICAR'}
                                            </button>
                                        </div>
                                        {couponError && <p className="text-[9px] font-bold text-red-400 mt-2 ml-1 uppercase tracking-tighter">{couponError}</p>}
                                    </div>
                                ) : (
                                    <div className="mb-6 relative z-10 flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-3 h-3 text-primary" />
                                            <span className="text-[10px] font-black uppercase italic text-primary">Cupón Aplicado</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={removeCoupon}
                                            className="text-white/40 hover:text-white transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                                <div className="border-t border-white/10 pt-5 mb-7 relative z-10">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] font-black uppercase tracking-[.3em] text-gray-500">
                                            Total <span className="text-[7px] opacity-30 select-none">(IVA Incl.)</span>
                                        </span>
                                        <div className="text-right">
                                            <span className="text-4xl font-black italic tracking-tighter text-white">
                                                {effectiveTotalPrice.toFixed(2)}
                                            </span>
                                            <span className="text-lg font-black italic ml-1 text-white">€</span>
                                        </div>
                                    </div>
                                </div>
                                {formData.paymentMethod !== 'stripe' && formData.paymentMethod !== 'paypal' && (
                                    <button
                                        form="aio-form"
                                        type="submit"
                                        disabled={loading || paymentloading || activeMethodsList.length === 0 || !formData.paymentMethod || !formData.shippingMethod}
                                        className="w-full bg-white text-brand-carbon py-4 rounded-2xl font-black uppercase italic text-[11px] hover:bg-primary hover:text-white transition-all shadow-xl shadow-black/30 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group relative z-10 mb-4"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                            <>
                                                <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                {formData.paymentMethod === 'paypal' ? 'Pagar con PayPal' :
                                                    formData.paymentMethod === 'transfer' ? 'Confirmar Pedido' :
                                                        'Confirmar Pedido'}
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                )}
                                <div className="flex items-center justify-center gap-2 opacity-30 relative z-10">
                                    <Lock className="w-3 h-3" />
                                    <span className="text-[8px] font-black uppercase tracking-[.3em]">Encripción SSL 256-bit</span>
                                </div>
                            </div>
                            <div className="mt-4 text-center">
                                <Link to="/catalogo" className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors">
                                    ← Seguir Explorando
                                </Link>
                            </div>
                        </div>

                    </div>
                </form>
            </div >
        </div >
    );
}
