import { useState } from 'react';
import { X, Mail, Lock, User, Check, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export function AuthModal({ isOpen, onClose, defaultTab = 'login', defaultType = 'persona' }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [userType, setUserType] = useState(defaultType);

    // Login state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState(null);

    // Register state
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regFullName, setRegFullName] = useState('');
    const [regCompanyName, setRegCompanyName] = useState('');
    const [regVatId, setRegVatId] = useState('');
    const [regLoading, setRegLoading] = useState(false);
    const [regError, setRegError] = useState(null);

    if (!isOpen) return null;

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: loginPassword,
            });
            if (error) throw error;
            onClose();
            // Stay on current page, no redirect to /admin
        } catch (err) {
            setLoginError(err.message);
        } finally {
            setLoginLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setRegLoading(true);
        setRegError(null);
        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email: regEmail,
                password: regPassword,
                options: {
                    data: {
                        full_name: regFullName,
                        user_type: userType,
                        company_name: userType === 'profesional' ? regCompanyName : null,
                        vat_id: userType === 'profesional' ? regVatId : null,
                        role: 'editor'
                    }
                }
            });
            if (signUpError) throw signUpError;
            onClose();
            alert('Registro exitoso. Revisa tu email para confirmar tu cuenta.');
        } catch (err) {
            setRegError(err.message);
        } finally {
            setRegLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-brand-carbon/70 backdrop-blur-md animate-in fade-in duration-300" />

            {/* Modal Panel */}
            <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500 z-10">
                {/* Header */}
                <div className="p-8 pb-0 flex items-start justify-between">
                    <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-1">Mil Luces Boutique</p>
                        <h2 className="text-2xl font-black text-brand-carbon uppercase italic tracking-tighter leading-none">
                            {activeTab === 'login' ? 'Bienvenido' : 'Nueva Cuenta'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-brand-carbon transition-all hover:rotate-90 duration-300"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="px-8 pt-6">
                    <div className="flex gap-1 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                        <button
                            onClick={() => setActiveTab('login')}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'login' ? 'bg-white shadow-md text-brand-carbon' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Iniciar Sesión
                        </button>
                        <button
                            onClick={() => setActiveTab('register')}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'register' ? 'bg-white shadow-md text-brand-carbon' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Crear Cuenta
                        </button>
                    </div>
                </div>

                {/* Form Content */}
                <div className="p-8">
                    {/* ── LOGIN TAB ── */}
                    {activeTab === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in duration-300">
                            {loginError && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <p className="text-[10px] font-bold uppercase tracking-wide leading-relaxed">{loginError}</p>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input
                                        type="email" required
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        placeholder="hola@ejemplo.com"
                                        className="w-full h-12 bg-gray-50 border-none rounded-2xl pl-11 pr-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-300 focus:outline-none"
                                        disabled={loginLoading}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input
                                        type="password" required
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full h-12 bg-gray-50 border-none rounded-2xl pl-11 pr-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-300 focus:outline-none"
                                        disabled={loginLoading}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit" disabled={loginLoading}
                                className="w-full h-14 bg-brand-carbon text-white rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-primary transition-all shadow-xl shadow-brand-carbon/10 flex items-center justify-center gap-3 disabled:opacity-50 mt-2"
                            >
                                {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Entrar</span><ArrowRight className="w-4 h-4 text-primary" /></>}
                            </button>
                            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-wider pt-2">
                                ¿Sin cuenta?{' '}
                                <button type="button" onClick={() => setActiveTab('register')} className="text-primary hover:underline">
                                    Regístrate gratis
                                </button>
                            </p>
                        </form>
                    )}

                    {/* ── REGISTER TAB ── */}
                    {activeTab === 'register' && (
                        <div className="animate-in fade-in duration-300">
                            {/* Type Selector */}
                            <div className="flex gap-1 p-1 bg-gray-50 rounded-2xl border border-gray-100 mb-5">
                                <button
                                    onClick={() => setUserType('persona')}
                                    className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${userType === 'persona' ? 'bg-white shadow text-brand-carbon' : 'text-gray-400'}`}
                                >
                                    Particular
                                </button>
                                <button
                                    onClick={() => setUserType('profesional')}
                                    className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${userType === 'profesional' ? 'bg-brand-carbon shadow text-primary' : 'text-gray-400'}`}
                                >
                                    Profesional / Empresa
                                </button>
                            </div>

                            <form onSubmit={handleRegister} className="space-y-3">
                                {regError && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-bold uppercase tracking-wide leading-relaxed">{regError}</p>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                        {userType === 'profesional' ? 'Nombre Responsable' : 'Nombre Completo'}
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input type="text" required value={regFullName} onChange={(e) => setRegFullName(e.target.value)}
                                            placeholder="Marc Pérez"
                                            className="w-full h-11 bg-gray-50 border-none rounded-2xl pl-11 pr-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all focus:outline-none placeholder:text-gray-300"
                                            disabled={regLoading} />
                                    </div>
                                </div>
                                {userType === 'profesional' && (
                                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Empresa</label>
                                            <input type="text" required value={regCompanyName} onChange={(e) => setRegCompanyName(e.target.value)}
                                                placeholder="Mil Luces S.L."
                                                className="w-full h-11 bg-gray-50 border-none rounded-2xl px-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all focus:outline-none placeholder:text-gray-300"
                                                disabled={regLoading} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">NIF / CIF</label>
                                            <input type="text" required value={regVatId} onChange={(e) => setRegVatId(e.target.value)}
                                                placeholder="B12345678"
                                                className="w-full h-11 bg-gray-50 border-none rounded-2xl px-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all focus:outline-none placeholder:text-gray-300"
                                                disabled={regLoading} />
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                                            placeholder="hola@empresa.com"
                                            className="w-full h-11 bg-gray-50 border-none rounded-2xl pl-11 pr-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all focus:outline-none placeholder:text-gray-300"
                                            disabled={regLoading} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input type="password" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full h-11 bg-gray-50 border-none rounded-2xl pl-11 pr-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all focus:outline-none placeholder:text-gray-300"
                                            disabled={regLoading} />
                                    </div>
                                </div>
                                {userType === 'profesional' && (
                                    <div className="p-4 bg-brand-carbon/5 rounded-2xl border border-brand-carbon/5 flex gap-3 animate-in fade-in duration-300">
                                        <div className="p-1.5 rounded-lg bg-primary/10">
                                            <Check className="w-3 h-3 text-primary" />
                                        </div>
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide leading-relaxed">
                                            Acceso a descuentos profesionales de hasta el 10%+ y soporte prioritario.
                                        </p>
                                    </div>
                                )}
                                <div className="flex items-start gap-3 py-1">
                                    <input type="checkbox" required className="mt-1 accent-primary w-4 h-4" disabled={regLoading} />
                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight leading-relaxed">
                                        Acepto la <a href="#" className="text-primary hover:underline">Política de Privacidad</a> y Términos de Servicio
                                    </span>
                                </div>
                                <button
                                    type="submit" disabled={regLoading}
                                    className="w-full h-14 bg-brand-carbon text-white rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-primary transition-all shadow-xl shadow-brand-carbon/10 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {regLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Crear Mi Cuenta</span><ArrowRight className="w-4 h-4 text-primary" /></>}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
