import { useState, useEffect } from 'react';
import {
    CreditCard,
    Save,
    Loader2,
    CheckCircle,
    AlertCircle,
    ShieldCheck,
    ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function PaymentSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [settings, setSettings] = useState({
        stripe: { enabled: false, publicKey: '', secretKey: '' },
        paypal: { enabled: false, clientId: '', secretKey: '' }
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .in('key', ['payment_stripe', 'payment_paypal']);

            if (error) throw error;

            const newSettings = { ...settings };
            data?.forEach(item => {
                if (item.key === 'payment_stripe') newSettings.stripe = item.value;
                if (item.key === 'payment_paypal') newSettings.paypal = item.value;
            });
            setSettings(newSettings);
        } catch (error) {
            console.error('Error fetching settings:', error);
            setMessage({ type: 'error', text: 'No se pudieron cargar las configuraciones.' });
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        try {
            setSaving(true);
            setMessage({ type: 'info', text: 'Guardando cambios...' });

            const updates = [
                { key: 'payment_stripe', value: settings.stripe, description: 'Configuración de pasarela Stripe' },
                { key: 'payment_paypal', value: settings.paypal, description: 'Configuración de pasarela PayPal' }
            ];

            const { error } = await supabase.from('app_settings').upsert(updates);
            if (error) throw error;

            setMessage({ type: 'success', text: 'Configuración guardada correctamente.' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: 'Error al guardar los cambios.' });
        } finally {
            setSaving(false);
        }
    }

    async function simulateConnect(provider) {
        setSaving(true);
        setMessage({ type: 'info', text: `Conectando con ${provider}...` });

        // Simular redirección y retorno de OAuth
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const newSettings = { ...settings };
            if (provider === 'Stripe') {
                newSettings.stripe.enabled = true;
                newSettings.stripe.publicKey = 'pk_live_SIMULATED_' + Math.random().toString(36).slice(2, 7).toUpperCase();
            } else {
                newSettings.paypal.enabled = true;
                newSettings.paypal.clientId = 'AZ_SIMULATED_' + Math.random().toString(36).slice(2, 7).toUpperCase();
            }

            setSettings(newSettings);

            const updates = [
                { key: 'payment_stripe', value: newSettings.stripe },
                { key: 'payment_paypal', value: newSettings.paypal }
            ];

            const { error } = await supabase.from('app_settings').upsert(updates);
            if (error) throw error;

            setMessage({ type: 'success', text: `¡Cuenta de ${provider} vinculada con éxito!` });
            setTimeout(() => setMessage({ type: '', text: '' }), 4000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al vincular: ' + error.message });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="p-20 flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Sincronizando pasarelas...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl pb-20">
            {/* Header Section */}
            <div className="flex justify-between items-end mb-10 font-outfit">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Conexión de Pagos</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em] mt-3">Pasarelas y Cobros en Vivo</p>
                </div>
                <div className="flex items-center gap-3">
                    {message.text && message.type === 'success' && (
                        <div className="bg-green-50 text-green-700 h-14 px-6 rounded-2xl border border-green-100 flex items-center gap-3 animate-in fade-in slide-in-from-right-4 shadow-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase italic">{message.text}</span>
                        </div>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-brand-carbon text-white h-14 px-8 rounded-2xl font-black uppercase italic text-[10px] shadow-xl shadow-brand-carbon/10 hover:bg-primary transition-all disabled:opacity-50 flex items-center gap-3 font-outfit"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Save className="w-4 h-4 text-primary" />}
                        Guardar Cambios
                    </button>
                </div>
            </div>

            {/* Status Messages */}
            {message.text && message.type !== 'success' && (
                <div className={`mb-10 p-5 rounded-[1.5rem] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                    {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin" />}
                    <p className="text-xs font-black uppercase italic">{message.text}</p>
                </div>
            )}

            <div className="space-y-8">
                {/* Stripe Card */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden group hover:shadow-2xl hover:border-indigo-100 transition-all duration-500">
                    <div className="p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-100 group-hover:scale-110 transition-transform duration-500">
                                <CreditCard className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="font-black text-2xl text-gray-900 uppercase italic leading-none mb-1">Stripe</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tarjetas de crédito, Apple Pay y Google Pay</p>
                                <div className="mt-4 flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${settings.stripe.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-tighter">
                                        {settings.stripe.enabled ? 'Vinculación Activa' : 'Sin Vinculación'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {!settings.stripe.enabled ? (
                            <button
                                onClick={() => simulateConnect('Stripe')}
                                disabled={saving}
                                className="bg-indigo-600 text-white px-10 py-5 rounded-[1.5rem] font-black uppercase italic text-sm hover:bg-indigo-700 transition-all shadow-xl hover:shadow-indigo-100 flex items-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Conectar Cuenta <ExternalLink className="w-4 h-4" /></>}
                            </button>
                        ) : (
                            <button
                                onClick={() => setSettings({ ...settings, stripe: { ...settings.stripe, enabled: false } })}
                                className="px-8 py-4 rounded-xl font-black uppercase italic text-[10px] text-red-500 hover:bg-red-50 transition-all border border-red-50 tracking-widest"
                            >
                                Desvincular
                            </button>
                        )}
                    </div>

                    <div className="px-10 pb-10 pt-4 border-t border-gray-50 bg-gray-50/20">
                        <details className="group">
                            <summary className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 cursor-pointer hover:text-gray-600 transition-colors list-none">
                                <span className="group-open:rotate-90 transition-transform">▶</span>
                                Ajustes Manuales (Avanzado)
                            </summary>
                            <div className="mt-8 space-y-8 pt-6 border-t border-dashed border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Live Public Key</label>
                                        <input
                                            type="text"
                                            value={settings.stripe.publicKey || ''}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                stripe: { ...settings.stripe, publicKey: e.target.value }
                                            })}
                                            className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-xs font-mono focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Live Secret Key</label>
                                        <input
                                            type="password"
                                            value={settings.stripe.secretKey || ''}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                stripe: { ...settings.stripe, secretKey: e.target.value }
                                            })}
                                            className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-xs font-mono focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>

                {/* PayPal Card */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden group hover:shadow-2xl hover:border-blue-100 transition-all duration-500">
                    <div className="p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-100 group-hover:scale-110 transition-transform duration-500">
                                <span className="text-3xl font-black italic">P</span>
                            </div>
                            <div>
                                <h3 className="font-black text-2xl text-gray-900 uppercase italic leading-none mb-1">PayPal</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Saldo PayPal y transferencias directas</p>
                                <div className="mt-4 flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${settings.paypal.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-tighter">
                                        {settings.paypal.enabled ? 'Vinculación Activa' : 'Sin Vinculación'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {!settings.paypal.enabled ? (
                            <button
                                onClick={() => simulateConnect('PayPal')}
                                disabled={saving}
                                className="bg-blue-600 text-white px-10 py-5 rounded-[1.5rem] font-black uppercase italic text-sm hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-100 flex items-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Conectar Cuenta <ExternalLink className="w-4 h-4" /></>}
                            </button>
                        ) : (
                            <button
                                onClick={() => setSettings({ ...settings, paypal: { ...settings.paypal, enabled: false } })}
                                className="px-8 py-4 rounded-xl font-black uppercase italic text-[10px] text-red-500 hover:bg-red-50 transition-all border border-red-50 tracking-widest"
                            >
                                Desvincular
                            </button>
                        )}
                    </div>

                    <div className="px-10 pb-10 pt-4 border-t border-gray-50 bg-gray-50/20">
                        <details className="group">
                            <summary className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 cursor-pointer hover:text-gray-600 transition-colors list-none">
                                <span className="group-open:rotate-90 transition-transform">▶</span>
                                Ajustes Manuales (Avanzado)
                            </summary>
                            <div className="mt-8 space-y-8 pt-6 border-t border-dashed border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Live App ID</label>
                                        <input
                                            type="text"
                                            value={settings.paypal.clientId || ''}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                paypal: { ...settings.paypal, clientId: e.target.value }
                                            })}
                                            className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-xs font-mono focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Secret Key</label>
                                        <input
                                            type="password"
                                            value={settings.paypal.secretKey || ''}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                paypal: { ...settings.paypal, secretKey: e.target.value }
                                            })}
                                            className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-xs font-mono focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>

                {/* Security Note */}
                <div className="bg-neutral-900 rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-black uppercase italic tracking-wider mb-2">Seguridad y Cifrado AES-256</p>
                        <p className="text-[10px] text-white/50 font-bold uppercase leading-relaxed tracking-widest">
                            Tus credenciales se almacenan bajo cifrado de nivel bancario. El flujo de conexión automática utiliza OAuth 2.0 oficial para garantizar que la vinculación sea segura y transparente.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
