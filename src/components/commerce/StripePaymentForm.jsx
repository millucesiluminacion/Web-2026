import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, ShieldCheck, AlertCircle, Lock } from 'lucide-react';

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
            // 0. Validar formulario de Stripe antes de crear el pedido en Supabase
            const { error: submitError } = await elements.submit();
            if (submitError) {
                setError(submitError.message);
                setLoading(false);
                return;
            }

            // 1. Ejecutar validaciones y creación de borrador de pedido previo
            let orderId = null;
            if (prePaymentHook) {
                const result = await prePaymentHook();
                if (result.error) throw new Error(result.error);
                orderId = result.orderId;
            }

            // 2. Crear el PaymentIntent en nuestro servidor
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

            // 3. Confirmar el pago (soporta Tarjetas, Google Pay, Apple Pay, Bizum)
            const result = await stripe.confirmPayment({
                elements,
                clientSecret,
                confirmParams: {
                    return_url: `${window.location.origin}/cart?payment=success&order=${orderId}`,
                },
                redirect: 'if_required',
            });

            if (result.error) {
                setError(result.error.message);
                if (onFailed) await onFailed(result.error.message, orderId);
            } else {
                if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
                    if (onSucceeded) await onSucceeded(result.paymentIntent, orderId);
                }
            }
        } catch (err) {
            setError(err.message || 'Error al procesar el pago.');
            if (onFailed) await onFailed(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 shadow-sm transition-all">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                        <Lock className="w-3 h-3 text-primary" /> Métodos de Pago Seguros (Tarjetas, Google Pay, Apple Pay, Bizum)
                    </label>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-gray-100 transition-all">
                    <PaymentElement options={{ layout: 'tabs' }} />
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">{error}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || !elements || loading}
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
        </form>
    );
}
