import { useState, useEffect } from 'react';
import {
    Save, User, Lock, Bell, Mail, Shield, Loader2, CheckCircle,
    Server, Send, Globe, Image as ImageIcon, Briefcase, Info, AlertTriangle, Key
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function AccountSettings() {
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('perfil'); // 'perfil', 'smtp', 'marca', 'estado'
    const [healthData, setHealthData] = useState(null);
    const [isHealthLoading, setIsHealthLoading] = useState(false);

    const [profile, setProfile] = useState({
        full_name: '',
        email: '',
        role: ''
    });

    const [smtpConfig, setSmtpConfig] = useState({
        host: '',
        port: '465',
        user: '',
        pass: '',
        secure: true,
        from_name: 'Mil Luces',
        from_email: ''
    });

    const [branding, setBranding] = useState({
        site_name: 'Mil Luces',
        contact_email: '',
        support_phone: ''
    });

    const [testEmail, setTestEmail] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchHealthStatus();
    }, []);

    const fetchHealthStatus = async () => {
        setIsHealthLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/health-check', {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });

            // Validar que la respuesta sea JSON antes de parsear
            const contentType = response.headers.get("content-type");
            if (response.ok && contentType && contentType.includes("application/json")) {
                const data = await response.json();
                setHealthData(data);
            } else {
                const text = await response.text();
                // Si recibimos código fuente o un error extraño, no rompemos la UI
                console.warn("⚠️ API de salud devolvió una respuesta no válida (posiblemente falta 'vercel dev'):", text.slice(0, 50));
                setHealthData({
                    error: "El servidor local no está ejecutando funciones. Usa 'vercel dev' para probar.",
                    environment: { platform: 'Desconocido (Modo Local)' }
                });
            }
        } catch (err) {
            console.error("Health check error:", err);
        } finally {
            setIsHealthLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            setLoading(true);

            // 1. Fetch Profile
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profileVal } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                if (profileVal) {
                    setProfile({
                        full_name: profileVal.full_name || '',
                        email: session.user.email || '',
                        role: profileVal.role || ''
                    });
                }
            }

            // 2. Fetch App Settings (SMTP & Branding)
            const { data: settings } = await supabase
                .from('app_settings')
                .select('*')
                .in('key', ['smtp_config', 'site_branding']);

            if (settings) {
                const smtp = settings.find(s => s.key === 'smtp_config');
                if (smtp) setSmtpConfig(smtp.value);

                const brand = settings.find(s => s.key === 'site_branding');
                if (brand) setBranding(brand.value);
            }
        } catch (err) {
            console.error("Error fetching settings:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save SMTP
            const { error: smtpErr } = await supabase
                .from('app_settings')
                .upsert({
                    key: 'smtp_config',
                    value: smtpConfig,
                    description: 'Configuración de servidor de correo SMTP'
                }, { onConflict: 'key' });

            // Save Branding
            const { error: brandErr } = await supabase
                .from('app_settings')
                .upsert({
                    key: 'site_branding',
                    value: branding,
                    description: 'Configuración visual y de contacto del sitio'
                }, { onConflict: 'key' });

            if (smtpErr || brandErr) throw new Error("Error al guardar configuraciones");

            alert('Configuración profesional guardada exitosamente');
        } catch (err) {
            alert('Error al guardar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendTest = async () => {
        if (!testEmail) return alert("Escribe un email de destino");
        setIsTesting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    to: testEmail,
                    subject: 'Prueba de Configuración SMTP - Mil Luces',
                    html: `<h1>¡Conexión Exitosa!</h1><p>Este es un correo de prueba enviado desde tu nueva configuración profesional en <b>Mil Luces</b>.</p>`
                })
            });
            const result = await response.json();
            if (response.ok) {
                alert("✅ Email enviado con éxito. Revisa tu bandeja de entrada.");
            } else {
                throw new Error(result.error || "Fallo en el envío");
            }
        } catch (err) {
            alert("❌ Error en la prueba: " + err.message);
        } finally {
            setIsTesting(false);
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50/50">
            <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[.4em] text-gray-400">Cargando Sistema...</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto pb-20">
            {/* Header Profesional */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
                <div className="font-outfit">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-primary/10 p-2 rounded-xl">
                            <Briefcase className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-[10px] text-primary font-black uppercase tracking-[.4em]">Panel de Control</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">
                        Ajustes del <span className="text-primary">Sistema</span>
                    </h1>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-4">
                        Configuración maestra de correo, marca y perfiles.
                    </p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-brand-carbon text-white h-16 px-10 rounded-2xl flex items-center gap-4 hover:bg-primary transition-all font-black uppercase italic text-xs shadow-2xl shadow-brand-carbon/20 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Save className="w-5 h-5 text-primary" />}
                        Guardar Ajustes
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 mb-10 overflow-x-auto pb-4 scrollbar-hide">
                {[
                    { id: 'perfil', label: 'Mi Perfil', icon: User },
                    { id: 'smtp', label: 'Correo SMTP', icon: Server },
                    { id: 'marca', label: 'Marca / Contacto', icon: Globe },
                    { id: 'estado', label: 'Estado del Sistema', icon: Shield }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl transition-all font-black uppercase italic text-[10px] tracking-widest whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-primary text-white shadow-xl shadow-primary/20'
                            : 'bg-white text-gray-400 hover:text-brand-carbon hover:bg-gray-50 border border-gray-100'
                            }`}
                    >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-gray-300'}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Main Content Area */}
                <div className="lg:col-span-8 space-y-8">

                    {/* TAB: PERFIL */}
                    {activeTab === 'perfil' && (
                        <div className="bg-white rounded-[2.5rem] shadow-luxury border border-gray-100 p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-4 mb-10 border-b border-gray-50 pb-8">
                                <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary font-black italic text-2xl border border-primary/20">
                                    {profile.full_name?.charAt(0) || 'A'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-brand-carbon uppercase italic">{profile.full_name}</h3>
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Nivel: {profile.role}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={profile.full_name}
                                        onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                                        className="w-full bg-gray-50/50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Maestro</label>
                                    <input
                                        type="text"
                                        value={profile.email}
                                        disabled
                                        className="w-full bg-gray-100 border-none rounded-2xl px-6 py-4 text-sm font-bold text-gray-400 cursor-not-allowed opacity-60"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: SMTP */}
                    {activeTab === 'smtp' && (
                        <div className="bg-white rounded-[2.5rem] shadow-luxury border border-gray-100 p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                            <div className="flex items-start gap-6 bg-blue-50/50 p-8 rounded-3xl border border-blue-100/50">
                                <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
                                    <Info className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-blue-900 uppercase italic tracking-tight mb-2">Servidor de Correo</h4>
                                    <p className="text-xs text-blue-700/70 font-bold leading-relaxed">
                                        Configura tu propio servidor (Gmail, Outlook, Hostinger, etc.) para que Mil Luces envíe notificaciones de forma profesional con tu dominio.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Servidor SMTP (Host)</label>
                                    <input
                                        type="text"
                                        value={smtpConfig.host}
                                        onChange={e => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                                        placeholder="smtp.tudominio.com"
                                        className="w-full bg-gray-50/50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Puerto</label>
                                    <input
                                        type="text"
                                        value={smtpConfig.port}
                                        onChange={e => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                                        placeholder="465 o 587"
                                        className="w-full bg-gray-50/50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Usuario / Email SMTP</label>
                                    <input
                                        type="text"
                                        value={smtpConfig.user}
                                        onChange={e => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                                        placeholder="hola@tudominio.com"
                                        className="w-full bg-gray-50/50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
                                    <input
                                        type="password"
                                        value={smtpConfig.pass}
                                        onChange={e => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                                        placeholder="••••••••••••"
                                        className="w-full bg-gray-50/50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-10 border-t border-gray-50">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[.3em] mb-6">Detalles de Remitente</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre que aparece (From Name)</label>
                                        <input
                                            type="text"
                                            value={smtpConfig.from_name}
                                            onChange={e => setSmtpConfig({ ...smtpConfig, from_name: e.target.value })}
                                            className="w-full bg-gray-50/50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email remitente (From Email)</label>
                                        <input
                                            type="text"
                                            value={smtpConfig.from_email}
                                            onChange={e => setSmtpConfig({ ...smtpConfig, from_email: e.target.value })}
                                            placeholder="no-reply@tudominio.com"
                                            className="w-full bg-gray-50/50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: MARCA */}
                    {activeTab === 'marca' && (
                        <div className="bg-white rounded-[2.5rem] shadow-luxury border border-gray-100 p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Comercial del Sitio</label>
                                    <input
                                        type="text"
                                        value={branding.site_name}
                                        onChange={e => setBranding({ ...branding, site_name: e.target.value })}
                                        className="w-full bg-gray-50/50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Público de Contacto</label>
                                    <input
                                        type="text"
                                        value={branding.contact_email}
                                        onChange={e => setBranding({ ...branding, contact_email: e.target.value })}
                                        placeholder="contacto@mi-empresa.com"
                                        className="w-full bg-gray-50/50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono Soporte</label>
                                    <input
                                        type="text"
                                        value={branding.support_phone}
                                        onChange={e => setBranding({ ...branding, support_phone: e.target.value })}
                                        className="w-full bg-gray-50/50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: ESTADO DEL SISTEMA (HEALTH CHECK) */}
                    {activeTab === 'estado' && (
                        <div className="bg-white rounded-[2.5rem] shadow-luxury border border-gray-100 p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-brand-carbon uppercase italic">Diagnóstico de Salud</h3>
                                <button
                                    onClick={fetchHealthStatus}
                                    className="p-3 text-primary hover:bg-primary/5 rounded-xl transition-all"
                                    title="Refrescar Estado"
                                >
                                    <Loader2 className={`w-5 h-5 ${isHealthLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* PLATAFORMA */}
                                <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Globe className="w-5 h-5 text-purple-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Plataforma</span>
                                    </div>
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-sm font-black text-brand-carbon">{healthData?.environment?.platform || 'Node.js'}</span>
                                        <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-lg text-[9px] font-black uppercase italic tracking-tighter">Producción</span>
                                    </div>
                                </div>

                                {/* BASE DE DATOS */}
                                <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Shield className="w-5 h-5 text-blue-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Base de Datos</span>
                                    </div>
                                    <div className="space-y-3 px-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-600 uppercase">Conectividad</span>
                                            <span className={`h-2.5 w-2.5 rounded-full ${healthData?.database?.reachable ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-600 uppercase">Perfiles</span>
                                            <span className={`text-[9px] font-black uppercase ${healthData?.database?.profiles_table ? 'text-green-600' : 'text-red-500'}`}>
                                                {healthData?.database?.profiles_table ? 'OK' : 'Error'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* SECRETOS DEL SERVIDOR */}
                                <div className="p-6 bg-brand-carbon rounded-[2rem] shadow-xl text-white space-y-4 col-span-1 md:col-span-2">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Key className="w-5 h-5 text-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Llaves del Servidor (Secrets)</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
                                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                            <div>
                                                <p className="text-xs font-bold uppercase italic tracking-tight">Supabase Service Key</p>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 tracking-tighter">(Necesaria para registro sin confirmación)</p>
                                            </div>
                                            {healthData?.environment?.supabase_service_key ? (
                                                <CheckCircle className="w-5 h-5 text-primary" />
                                            ) : (
                                                <div className="flex flex-col items-end gap-2 text-right">
                                                    <div className="flex items-center gap-2 text-red-500 px-3 py-1.5 bg-red-500/10 rounded-xl border border-red-500/20">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        <span className="text-[8px] font-black uppercase italic tracking-tighter">Falta Clave</span>
                                                    </div>
                                                    {healthData?.environment?.detected_keys?.length > 0 && (
                                                        <p className="text-[8px] text-gray-400 opacity-60 max-w-[150px] leading-tight mt-1">
                                                            Encontradas: {healthData.environment.detected_keys.join(", ")}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                            <div>
                                                <p className="text-xs font-bold uppercase italic tracking-tight">Configuración SMTP</p>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 tracking-tighter">(Necesaria para emails profesionales)</p>
                                            </div>
                                            {healthData?.smtp?.configured ? (
                                                <CheckCircle className="w-5 h-5 text-primary" />
                                            ) : (
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="flex items-center gap-2 text-primary px-3 py-1.5 bg-primary/10 rounded-xl border border-primary/20">
                                                        <Info className="w-3.5 h-3.5" />
                                                        <span className="text-[8px] font-black uppercase italic tracking-tighter">Pendiente</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setActiveTab('smtp')}
                                                        className="text-[8px] font-bold text-primary uppercase border-b border-primary/20 hover:border-primary transition-all"
                                                    >
                                                        Configurar Ahora &rarr;
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {!healthData?.environment?.supabase_service_key && (
                                        <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">¿Cómo solucionar la falta de Clave?</p>
                                            <p className="text-[11px] text-gray-400 leading-relaxed italic">
                                                Ve a tu panel de <b>Vercel &rarr; Settings &rarr; Environment Variables</b> y añade:<br />
                                                <code className="bg-white/10 px-2 py-0.5 rounded text-primary mt-2 inline-block">SUPABASE_SERVICE_ROLE_KEY</code> con tu clave secreta de Supabase.<br />
                                                <span className="block mt-2 opacity-60">Esto permitirá al sistema crear usuarios sin que tengan que confirmar su email manualmente.</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Panel: Sidebars & Utils */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Test SMTP Tool */}
                    {(activeTab === 'smtp') && (
                        <div className="bg-brand-carbon rounded-[2.5rem] shadow-2xl p-8 text-white relative overflow-hidden group">
                            <div className="relative z-10 space-y-8">
                                <div className="flex items-center gap-3">
                                    <Send className="w-5 h-5 text-primary" />
                                    <h4 className="text-[11px] font-black uppercase tracking-[.3em] italic">Herramienta de Prueba</h4>
                                </div>

                                <p className="text-[9px] font-bold text-gray-400 uppercase leading-relaxed">
                                    Verifica que tus credenciales funcionen enviando un email de prueba.
                                </p>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Enviar prueba a:</label>
                                        <input
                                            type="email"
                                            value={testEmail}
                                            onChange={e => setTestEmail(e.target.value)}
                                            placeholder="tu-email@personal.com"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                                        />
                                    </div>

                                    <button
                                        onClick={handleSendTest}
                                        disabled={isTesting}
                                        className="w-full bg-primary text-white font-black py-4 rounded-xl uppercase tracking-widest text-[9px] italic hover:bg-white hover:text-brand-carbon transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Enviar Test</span>}
                                    </button>
                                </div>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700"></div>
                        </div>
                    )}

                    {/* Security Info */}
                    <div className="bg-white rounded-[2.5rem] shadow-luxury border border-gray-100 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Shield className="w-5 h-5 text-green-500" />
                            <h4 className="text-[10px] font-black text-brand-carbon uppercase tracking-widest">Seguridad</h4>
                        </div>
                        <ul className="space-y-4">
                            {[
                                { text: 'Cifrado de datos AES', icon: CheckCircle },
                                { text: 'Sesión Admin Protegida', icon: CheckCircle },
                                { text: 'HTTPS forzado', icon: CheckCircle }
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <item.icon className="w-4 h-4 text-green-500" />
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Pro Help */}
                    <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 line-pattern">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-black text-primary uppercase italic tracking-widest">Atención PRO</span>
                        </div>
                        <p className="text-[10px] font-bold text-primary/70 uppercase leading-relaxed">
                            Si usas Gmail, recuerda que debes activar una "Contraseña de Aplicación" para usar SMTP de forma segura.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
