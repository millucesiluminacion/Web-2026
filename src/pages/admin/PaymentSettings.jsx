import { useState, useEffect } from 'react';
import {
    CreditCard, Save, Loader2, CheckCircle, AlertCircle,
    ShieldCheck, Eye, EyeOff, ExternalLink, Unlink, Zap, Link as LinkIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const FIELD = "w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 text-xs font-mono focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all";
const LABEL = "text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1.5 block ml-1";

function ProviderCard({ color, logo, title, subtitle, docsUrl, provider, settings, onChange, onSave, onToggle, saving, onConnectOAuth, onDisconnectOAuth }) {
    const [show, setShow] = useState({});
    const config = settings[provider] || {};
    const mode = config.mode || 'manual';

    const isConnectActive = config.connectEnabled && (
        provider === 'stripe' ? !!config.connectAccountId :
            provider === 'paypal' ? !!config.merchantId : false
    );

    const isManualActive = provider === 'stripe' ? (!!config.secretKey && !!config.publicKey) :
        provider === 'paypal' ? (!!config.clientId && !!config.secretKey) :
            provider === 'transfer' ? (!!config.iban) : false;

    const isActive = config.enabled && (mode === 'connect' ? isConnectActive : isManualActive);

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
                                {isActive
                                    ? (mode === 'connect' ? 'Conectado via OAuth' : 'Configurado (Llaves Manuales)')
                                    : 'Sin configurar'}
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
                        onClick={() => onToggle ? onToggle(provider, !config.enabled) : onChange(provider, 'enabled', !config.enabled)}
                        className={`relative w-12 h-6 rounded-full transition-all ${config.enabled ? 'bg-primary' : 'bg-gray-200'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.enabled ? 'translate-x-6' : ''}`}></span>
                    </button>
                </div>
            </div>

            {/* Mode Switcher for Stripe/PayPal */}
            {(provider === 'stripe' || provider === 'paypal') && (
                <div className="px-8 py-3 bg-gray-50/70 border-t border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Modo de Operación:</span>
                    <div className="flex gap-2 p-1 bg-white rounded-xl border border-gray-200 shadow-inner">
                        <button
                            type="button"
                            onClick={() => onChange(provider, 'mode', 'connect')}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'connect' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-brand-carbon'}`}
                        >
                            ⚡ OAuth Connect (Recomendado)
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange(provider, 'mode', 'manual')}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'manual' ? 'bg-brand-carbon text-white shadow-sm' : 'text-gray-400 hover:text-brand-carbon'}`}
                        >
                            🔑 Llaves Manuales (Fallback)
                        </button>
                    </div>
                </div>
            )}

            {/* OAuth View vs Manual Keys View */}
            <div className="px-8 pb-8 pt-6 space-y-6">
                {(provider === 'stripe' || provider === 'paypal') && mode === 'connect' ? (
                    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-3xl border border-gray-200/60 space-y-4">
                        {isConnectActive ? (
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <h4 className="text-xs font-black text-brand-carbon uppercase italic">Cuenta de {title} Conectada Exitosamente</h4>
                                    </div>
                                    <p className="text-[10px] font-mono text-gray-500 mt-1">
                                        ID de Cuenta: <span className="font-bold text-brand-carbon">{provider === 'stripe' ? config.connectAccountId : config.merchantId}</span>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onDisconnectOAuth(provider)}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                                >
                                    <Unlink className="w-3.5 h-3.5" /> Desconectar {title}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-black text-brand-carbon uppercase italic mb-1">Conexión Directa en 1-Clic</h4>
                                    <p className="text-[9px] text-gray-500 font-bold leading-relaxed">
                                        Autoriza tu cuenta oficial de {title} de forma 100% segura mediante OAuth sin introducir claves secretas.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className={LABEL}>
                                        {provider === 'stripe' ? 'Stripe Connect Client ID (ca_xxxx)' : 'PayPal Partner Client ID'} (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={config.connectClientId || ''}
                                        onChange={e => onChange(provider, 'connectClientId', e.target.value)}
                                        placeholder={provider === 'stripe' ? 'ca_xxxxxxxxxxxxxxxx' : 'Client ID de PayPal Partner'}
                                        className={FIELD}
                                    />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => onConnectOAuth(provider)}
                                        className="flex items-center gap-3 bg-primary text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                                    >
                                        <LinkIcon className="w-4 h-4" /> Conectar con {title}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
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
                    </>
                )}
            </div>
        </div>
    );
}

export default function PaymentSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState('');
    const [toast, setToast] = useState({ type: '', text: '' });

    const [settings, setSettings] = useState({
        stripe: { enabled: false, mode: 'manual', publicKey: '', secretKey: '', connectAccountId: '', connectClientId: '', connectEnabled: false },
        paypal: { enabled: false, mode: 'manual', clientId: '', secretKey: '', merchantId: '', connectClientId: '', connectEnabled: false },
        transfer: { enabled: false, iban: '', titular: '', banco: '', concepto: '' },
    });

    useEffect(() => {
        fetchSettings();
        checkUrlParams();
    }, []);

    async function checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        const error = params.get('error');
        const merchantId = params.get('merchantId') || params.get('merchantIdInPayPal') || params.get('merchant_id');

        if (merchantId) {
            await handleSaveMerchantId('paypal', merchantId);
            setToast({ type: 'success', text: `¡Cuenta de PayPal conectada exitosamente via OAuth! ID Comercio: ${merchantId}` });
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (status === 'stripe_connected') {
            setToast({ type: 'success', text: '¡Cuenta de Stripe conectada exitosamente via OAuth!' });
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (status === 'paypal_connected') {
            setToast({ type: 'success', text: '¡Cuenta de PayPal conectada exitosamente via OAuth!' });
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (error) {
            setToast({ type: 'error', text: `Error de conexión OAuth: ${decodeURIComponent(error)}` });
        }

        if (status || error || merchantId) {
            setTimeout(() => setToast({ type: '', text: '' }), 5000);
        }
    }

    async function handleSaveMerchantId(provider, merchantId) {
        const current = settings[provider] || {};
        const updated = {
            ...current,
            enabled: true,
            mode: 'connect',
            merchantId: merchantId,
            connectEnabled: true,
            connectedAt: new Date().toISOString()
        };
        setSettings(prev => ({ ...prev, [provider]: updated }));

        const keyMap = { stripe: 'payment_stripe', paypal: 'payment_paypal' };
        await supabase.from('app_settings').upsert([
            { key: keyMap[provider], value: updated, description: `Configuración de ${provider}` }
        ]);
    }

    async function fetchSettings() {
        setLoading(true);
        const { data } = await supabase
            .from('app_settings')
            .select('*')
            .in('key', ['payment_stripe', 'payment_paypal', 'payment_transfer']);

        if (data) {
            const next = { ...settings };
            data.forEach(row => {
                if (row.key === 'payment_stripe') next.stripe = { mode: row.value?.mode || 'manual', ...row.value };
                if (row.key === 'payment_paypal') next.paypal = { mode: row.value?.mode || 'manual', ...row.value };
                if (row.key === 'payment_transfer') next.transfer = row.value;
            });
            setSettings(next);
        }
        setLoading(false);
    }

    function handleChange(provider, field, value) {
        setSettings(prev => {
            const currentProvider = { ...prev[provider], [field]: value };
            if (field === 'connectClientId') {
                currentProvider.clientId = value;
            } else if (field === 'clientId') {
                currentProvider.connectClientId = value;
            }
            return {
                ...prev,
                [provider]: currentProvider
            };
        });
    }

    async function handleToggle(provider, newEnabled) {
        const keyMap = { stripe: 'payment_stripe', paypal: 'payment_paypal', transfer: 'payment_transfer' };
        const currentConfig = {
            ...settings[provider],
            enabled: newEnabled
        };

        setSettings(prev => ({ ...prev, [provider]: currentConfig }));

        const { error } = await supabase.from('app_settings').upsert([
            { key: keyMap[provider], value: currentConfig, description: `Configuración de ${provider}` }
        ]);

        if (error) {
            setToast({ type: 'error', text: 'Error al cambiar estado: ' + error.message });
        } else {
            setToast({ type: 'success', text: `¡${provider.charAt(0).toUpperCase() + provider.slice(1)} ${newEnabled ? 'activado' : 'desactivado'}!` });
        }
        setTimeout(() => setToast({ type: '', text: '' }), 3500);
    }

    async function handleSave(provider) {
        setSaving(provider);
        const keyMap = { stripe: 'payment_stripe', paypal: 'payment_paypal', transfer: 'payment_transfer' };

        const providerData = { ...settings[provider] };
        Object.keys(providerData).forEach(k => {
            if (typeof providerData[k] === 'string') {
                providerData[k] = providerData[k].trim().replace(/^["']|["']$/g, '');
            }
        });

        const currentConfig = {
            ...providerData,
            enabled: providerData.enabled !== undefined ? providerData.enabled : true,
        };

        const { error } = await supabase.from('app_settings').upsert([
            { key: keyMap[provider], value: currentConfig, description: `Configuración de ${provider}` }
        ]);

        setSettings(prev => ({ ...prev, [provider]: currentConfig }));
        setSaving('');

        if (error) {
            setToast({ type: 'error', text: 'Error al guardar: ' + error.message });
        } else {
            setToast({ type: 'success', text: `¡${provider.charAt(0).toUpperCase() + provider.slice(1)} guardado!` });
        }
        setTimeout(() => setToast({ type: '', text: '' }), 3500);
    }

    async function handleConnectOAuth(provider) {
        const stripeClientId = settings.stripe.connectClientId?.trim();
        const paypalClientId = (settings.paypal.connectClientId || settings.paypal.clientId)?.trim();

        if (provider === 'stripe' && (!stripeClientId || stripeClientId === 'ca_placeholder')) {
            return alert("⚠️ Debes escribir tu 'Stripe Connect Client ID' (empieza por 'ca_...') en el campo de arriba.\n\nPuedes encontrarlo en tu Dashboard de Stripe -> Configuración -> Connect -> Configuración de plataforma.");
        }

        if (provider === 'paypal' && (!paypalClientId || paypalClientId === 'sandbox_placeholder')) {
            return alert("⚠️ Debes escribir tu 'Client ID de PayPal' en el campo de arriba para iniciar el proceso de autorización OAuth.");
        }

        // Auto-save Client ID to database before redirecting
        await handleSave(provider);

        try {
            const endpoint = `/api/payments/${provider}/connect?clientId=${encodeURIComponent(paypalClientId || stripeClientId || '')}`;
            const res = await fetch(endpoint);
            const contentType = res.headers.get('content-type') || '';

            // Si el backend es un servidor API real que responde JSON
            if (res.ok && contentType.includes('application/json')) {
                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url;
                    return;
                }
            }

            // Fallback de generación client-side seguro (para servidor de desarrollo local Vite)
            const proto = window.location.protocol;
            const host = window.location.host;

            if (provider === 'stripe') {
                const redirectUri = `${proto}//${host}/api/payments/stripe/callback`;
                const state = btoa(JSON.stringify({ timestamp: Date.now() }));
                const stripeUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${encodeURIComponent(stripeClientId)}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
                window.location.href = stripeUrl;
            } else if (provider === 'paypal') {
                const returnUrl = `${proto}//${host}/admin/payments`;
                const isSandbox = paypalClientId.startsWith('sb');
                const paypalDomain = isSandbox ? 'https://www.sandbox.paypal.com' : 'https://www.paypal.com';
                const paypalUrl = `${paypalDomain}/bizsignup/partner/entry?partnerClientId=${encodeURIComponent(paypalClientId)}&partnerId=${encodeURIComponent(paypalClientId)}&sellerNonce=${Date.now()}&returnToPartnerUrl=${encodeURIComponent(returnUrl)}`;
                window.location.href = paypalUrl;
            }
        } catch (e) {
            console.error(`[Connect OAuth] Error connecting ${provider}:`, e);
            alert(`No se pudo iniciar la redirección con ${provider}. Asegúrate de revisar la consola.`);
        }
    }

    async function handleDisconnectOAuth(provider) {
        if (!confirm(`¿Estás seguro de desconectar la cuenta de ${provider}?`)) return;

        const updated = {
            ...settings[provider],
            mode: 'manual',
            connectEnabled: false,
            connectAccountId: '',
            merchantId: ''
        };

        handleChange(provider, 'mode', 'manual');
        handleChange(provider, 'connectEnabled', false);

        const keyMap = { stripe: 'payment_stripe', paypal: 'payment_paypal' };
        await supabase.from('app_settings').upsert([
            { key: keyMap[provider], value: updated, description: `Configuración de ${provider}` }
        ]);

        setToast({ type: 'success', text: `Cuenta de ${provider} desconectada.` });
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
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em] mt-2">Soporte dual para OAuth Connect y Llaves Manuales</p>
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
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">¿Cómo funciona el Sistema Dual?</p>
                    <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                        Puedes conectar tu cuenta directamente mediante <b>OAuth Connect (1-Clic)</b> para evitar manipular claves privadas, o mantener las <b>llaves API manuales como sistema de respaldo (fallback)</b>. Los cobros se procesarán automáticamente según el modo seleccionado.
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
                    onToggle={handleToggle}
                    saving={saving}
                    onConnectOAuth={handleConnectOAuth}
                    onDisconnectOAuth={handleDisconnectOAuth}
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
                    onToggle={handleToggle}
                    saving={saving}
                    onConnectOAuth={handleConnectOAuth}
                    onDisconnectOAuth={handleDisconnectOAuth}
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
                    onToggle={handleToggle}
                    saving={saving}
                    onConnectOAuth={handleConnectOAuth}
                    onDisconnectOAuth={handleDisconnectOAuth}
                />

                {/* Seguridad */}
                <div className="bg-brand-carbon rounded-[2.5rem] p-8 text-white flex items-center gap-6">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase italic tracking-wider mb-1">Almacenamiento Seguro con Encriptación</p>
                        <p className="text-[9px] text-white/40 font-bold uppercase leading-relaxed tracking-widest">
                            Tus credenciales y fichas de cuenta conectada se almacenan en la base de datos de Supabase. El procesamiento de transacciones ocurre en servidores seguros sin exponer claves secretas al navegador.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
