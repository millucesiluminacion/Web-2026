import { useState, useEffect } from 'react';
import {
    CreditCard, Save, Loader2, CheckCircle, AlertCircle,
    ShieldCheck, Eye, EyeOff, ExternalLink, Unlink, Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const FIELD = "w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 text-xs font-mono focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all";
const LABEL = "text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1.5 block ml-1";

function ProviderCard({ color, logo, title, subtitle, docsUrl, provider, settings, onChange, onSave, saving }) {
    const [show, setShow] = useState({});
    const config = settings[provider] || {};
    const isActive = config.enabled && (
        provider === 'stripe' ? !!config.secretKey && !!config.publicKey :
            provider === 'paypal' ? !!config.clientId && !!config.secretKey :
                true
    );

    const toggle = (field) => setShow(p => ({ ...p, [field]: !p[field] }));

    const fields = {
        stripe: [
            { key: 'publicKey', label: 'Publishable Key (pk_live_ o pk_test_)', placeholder: 'pk_live_xxxxxxxxxxxxxxxx', secret: false },
            { key: 'secretKey', label: 'Secret Key (sk_live_ o sk_test_)', placeholder: 'sk_live_xxxxxxxxxxxxxxxx', secret: true },
        ],
        paypal: [
            { key: 'clientId', label: 'Client ID', placeholder: 'AXxxxxxxxxxxxxx', secret: false },
            { key: 'secretKey', label: 'Secret Key', placeholder: 'EKxxxxxxxxxxxxx', secret: true },
        ],
        transfer: [
            { key: 'iban', label: 'IBAN', placeholder: 'ES76 0049 0001 5510 2701 0330', secret: false },
            { key: 'titular', label: 'Titular de la cuenta', placeholder: 'Mil Luces S.L.', secret: false },
            { key: 'banco', label: 'Banco', placeholder: 'Banco Santander', secret: false },
            { key: 'concepto', label: 'Concepto a indicar', placeholder: 'Pedido #XXXXX', secret: false },
        ],
    };

    return (
        <div className={`bg-white rounded-[2.5rem] border-2 ${isActive ? 'border-green-200 shadow-green-50 shadow-xl' : 'border-gray-100 shadow-sm'} overflow-hidden transition-all duration-500`}>
            {/* Header */}
            <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 ${color} rounded-3xl flex items-center justify-center text-white shadow-xl flex-shrink-0`}>
                        {logo}
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-gray-900 uppercase italic leading-none mb-1">{title}</h3>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{subtitle}</p>
                        <div className="flex items-center gap-2 mt-3">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
                                {isActive ? 'Configurado y Activo' : 'Sin configurar'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {docsUrl && (
                        <a href={docsUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">
                            <ExternalLink className="w-3 h-3" /> Ver dashboard
                        </a>
                    )}
                    {/* Toggle activo */}
                    <button
                        type="button"
                        onClick={() => onChange(provider, 'enabled', !config.enabled)}
                        className={`relative w-12 h-6 rounded-full transition-all ${config.enabled ? 'bg-primary' : 'bg-gray-200'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.enabled ? 'translate-x-6' : ''}`}></span>
                    </button>
                </div>
            </div>

            {/* Fields */}
            <div className="px-8 pb-8 border-t border-gray-50 pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(fields[provider] || []).map(f => (
                        <div key={f.key} className={f.key === 'iban' || f.key === 'concepto' ? 'md:col-span-2' : ''}>
                            <label className={LABEL}>{f.label}</label>
                            <div className="relative">
                                <input
                                    type={f.secret && !show[f.key] ? 'password' : 'text'}
                                    value={config[f.key] || ''}
                                    onChange={e => onChange(provider, f.key, e.target.value)}
                                    placeholder={f.placeholder}
                                    className={FIELD}
                                />
                                {f.secret && (
                                    <button type="button" onClick={() => toggle(f.key)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                                        {show[f.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => onSave(provider)}
                    disabled={saving === provider}
                    className="mt-2 flex items-center gap-2 bg-brand-carbon text-white px-6 py-3 rounded-2xl font-black uppercase italic text-[10px] hover:bg-primary transition-all disabled:opacity-50 shadow-lg"
                >
                    {saving === provider ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-primary" />}
                    Guardar {title}
                </button>
            </div>
        </div>
    );
}

export default function PaymentSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState('');
    const [toast, setToast] = useState({ type: '', text: '' });

    const [settings, setSettings] = useState({
        stripe: { enabled: false, publicKey: '', secretKey: '' },
        paypal: { enabled: false, clientId: '', secretKey: '' },
        transfer: { enabled: false, iban: '', titular: '', banco: '', concepto: '' },
    });

    useEffect(() => { fetchSettings(); }, []);

    async function fetchSettings() {
        setLoading(true);
        const { data } = await supabase
            .from('app_settings')
            .select('*')
            .in('key', ['payment_stripe', 'payment_paypal', 'payment_transfer']);

        if (data) {
            const next = { ...settings };
            data.forEach(row => {
                if (row.key === 'payment_stripe') next.stripe = row.value;
                if (row.key === 'payment_paypal') next.paypal = row.value;
                if (row.key === 'payment_transfer') next.transfer = row.value;
            });
            setSettings(next);
        }
        setLoading(false);
    }

    function handleChange(provider, field, value) {
        setSettings(prev => ({
            ...prev,
            [provider]: { ...prev[provider], [field]: value }
        }));
    }

    async function handleSave(provider) {
        setSaving(provider);
        const keyMap = { stripe: 'payment_stripe', paypal: 'payment_paypal', transfer: 'payment_transfer' };
        const { error } = await supabase.from('app_settings').upsert([
            { key: keyMap[provider], value: settings[provider], description: `Configuración de ${provider}` }
        ]);
        setSaving('');
        if (error) {
            setToast({ type: 'error', text: 'Error al guardar: ' + error.message });
        } else {
            setToast({ type: 'success', text: `¡${provider.charAt(0).toUpperCase() + provider.slice(1)} guardado correctamente!` });
        }
        setTimeout(() => setToast({ type: '', text: '' }), 3500);
    }

    if (loading) return (
        <div className="p-20 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest">Cargando configuración...</p>
        </div>
    );

    return (
        <div className="max-w-4xl pb-20">
            {/* Header */}
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Métodos de Pago</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em] mt-2">Configura las pasarelas activas en tu tienda</p>
                </div>
                {toast.text && (
                    <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase italic animate-in fade-in slide-in-from-right-4 ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                        {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {toast.text}
                    </div>
                )}
            </div>

            {/* Info banner */}
            <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 mb-8 flex items-start gap-4">
                <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">¿Cómo funciona?</p>
                    <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                        Introduce las credenciales de tu cuenta de Stripe o PayPal. Los clientes solo verán los métodos que estén activos (toggle ON) y tengan credenciales guardadas. El cobro se procesa directamente en tu cuenta.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <ProviderCard
                    color="bg-indigo-600"
                    logo={<CreditCard className="w-8 h-8" />}
                    title="Stripe"
                    subtitle="Tarjeta de crédito, Apple Pay y Google Pay"
                    docsUrl="https://dashboard.stripe.com/apikeys"
                    provider="stripe"
                    settings={settings}
                    onChange={handleChange}
                    onSave={handleSave}
                    saving={saving}
                />

                <ProviderCard
                    color="bg-blue-500"
                    logo={<span className="text-2xl font-black italic">P</span>}
                    title="PayPal"
                    subtitle="Saldo PayPal y tarjetas via PayPal"
                    docsUrl="https://developer.paypal.com/dashboard/applications/live"
                    provider="paypal"
                    settings={settings}
                    onChange={handleChange}
                    onSave={handleSave}
                    saving={saving}
                />

                <ProviderCard
                    color="bg-gray-700"
                    logo={<span className="text-xl">🏦</span>}
                    title="Transferencia Bancaria"
                    subtitle="El cliente recibe los datos para hacer la transferencia"
                    docsUrl={null}
                    provider="transfer"
                    settings={settings}
                    onChange={handleChange}
                    onSave={handleSave}
                    saving={saving}
                />

                {/* Seguridad */}
                <div className="bg-brand-carbon rounded-[2.5rem] p-8 text-white flex items-center gap-6">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase italic tracking-wider mb-1">Almacenamiento Seguro</p>
                        <p className="text-[9px] text-white/40 font-bold uppercase leading-relaxed tracking-widest">
                            Tus credenciales se guardan en la base de datos de Supabase. Las Secret Keys nunca se exponen al navegador del cliente — solo las usa el servidor de Vercel para procesar pagos.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
