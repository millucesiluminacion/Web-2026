import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

const CARD_ELEMENT_OPTIONS = {
    style: {
        base: {
            color: '#1a1a1a',
            fontFamily: '"Outfit", sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
                color: '#a1a1aa',
            },
        },
        invalid: {
            color: '#ef4444',
            iconColor: '#ef4444',
        },
    },
};

export default function StripePaymentForm({ amount, onSucceeded, onFailed, prePaymentHook }) {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 0. Ejecutar validaciones y creación de pedido previa
            let orderId = null;
            if (prePaymentHook) {
                const result = await prePaymentHook();
                if (result.error) throw new Error(result.error);
                orderId = result.orderId;
            }

            // 1. Crear el PaymentIntent en nuestro servidor (con verificación de precio)
            const response = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: orderId,
                    metadata: { orderId: orderId || '' }
                }),
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || 'Error al conectar con el servidor de pago.');
            }

            const { clientSecret } = data;

            // 2. Confirmar el pago en el cliente
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement),
                },
            });

            if (result.error) {
                setError(result.error.message);
                if (onFailed) await onFailed(result.error.message, orderId);
            } else {
                if (result.paymentIntent.status === 'succeeded') {
                    if (onSucceeded) await onSucceeded(result.paymentIntent, orderId);
                }
            }
        } catch (err) {
            setError(err.message || 'Error al procesar el pago.');
            if (onFailed) await onFailed(err.message, orderId);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 shadow-sm group focus-within:border-primary/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                        <Lock className="w-3 h-3 text-primary" /> Datos de Tarjeta Seguros
                    </label>
                    <div className="flex gap-1.5 grayscale opacity-50">
                        <span className="text-xl">💳</span>
                        <span className="text-xl">🏦</span>
                    </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-gray-100 group-focus-within:shadow-luxury transition-all">
                    <CardElement options={CARD_ELEMENT_OPTIONS} />
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">{error}</p>
                </div>
            )}

            <button
                type="button"
                onClick={handleSubmit}
                disabled={!stripe || loading}
                className="w-full h-16 bg-brand-carbon text-white rounded-[2rem] font-black uppercase italic tracking-widest hover:bg-primary transition-all shadow-xl shadow-brand-carbon/20 flex items-center justify-center gap-4 group disabled:opacity-50"
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                    <>
                        <ShieldCheck className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                        Pagar {amount.toFixed(2)} €
                    </>
                )}
            </button>

            <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest">
                Tu pago se procesa de forma segura a través de Stripe con encriptación SSL de 256 bits.
            </p>
        </div>
    );
}
