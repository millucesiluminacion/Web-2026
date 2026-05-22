import { useState, useEffect } from 'react';
import {
    User, Mail, Phone, MapPin, Shield, Star,
    Zap, LogOut, Loader2, Save, Key, ShoppingBag,
    ArrowRight, Bell, Heart, CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function AccountPage() {
    const { user, profile, signOut, isPartner, userTier, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('perfil'); // 'perfil', 'favoritos', 'pedidos'

    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        address: '',
        company_name: '',
        vat_id: ''
    });

    const [passwordData, setPasswordData] = useState({
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                phone: profile.phone || '',
                address: profile.address || '',
                company_name: profile.company_name || '',
                vat_id: profile.vat_id || ''
            });
            setLoading(false);
        }
    }, [profile]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update(formData)
                .eq('id', user.id);

            if (error) throw error;
            await refreshProfile();
            alert('Perfil actualizado con éxito');
        } catch (err) {
            alert('Error al actualizar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (passwordData.password !== passwordData.confirmPassword) {
            return alert('Las contraseñas no coinciden');
        }
        setIsSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.password
            });
            if (error) throw error;
            alert('Contraseña actualizada correctamente');
            setPasswordData({ password: '', confirmPassword: '' });
        } catch (err) {
            alert('Error al actualizar contraseña: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 font-outfit">
            {/* Header / Banner */}
            <div className="relative mb-12 rounded-[3rem] overflow-hidden bg-brand-carbon p-10 lg:p-16 text-white shadow-2xl">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 lg:w-32 lg:h-32 bg-primary/20 rounded-[2.5rem] border border-primary/20 flex items-center justify-center text-4xl font-black italic text-primary">
                            {formData.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`text-[10px] font-black uppercase tracking-[.3em] px-3 py-1 rounded-lg ${userTier === 'vip' ? 'bg-yellow-400 text-brand-carbon' : userTier === 'pro' ? 'bg-primary text-white' : 'bg-white/10 text-gray-400'}`}>
                                    {userTier === 'vip' ? 'Socio VIP' : userTier === 'pro' ? 'Cliente Profesional' : 'Cliente Boutique'}
                                </span>
                            </div>
                            <h1 className="text-4xl lg:text-6xl font-black uppercase italic leading-none tracking-tighter">
                                Hola, <span className="text-primary">{formData.full_name?.split(' ')[0] || 'Usuario'}</span>
                            </h1>
                            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-4 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-primary" /> {user?.email}
                            </p>
                        </div>
                    </div>

                    {profile?.discount_percent > 0 && (
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] flex items-center gap-6">
                            <div className="bg-primary/20 p-4 rounded-2xl">
                                <Zap className="w-8 h-8 text-primary shadow-[0_0_20px_rgba(255,5,5,0.4)]" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Tu Ventaja Exclusiva</p>
                                <p className="text-3xl font-black italic">{profile.discount_percent}% de Descuento</p>
                                <p className="text-[9px] font-bold text-gray-500 uppercase mt-1 leading-tight">Aplicado automáticamente en todo el catálogo</p>
                            </div>
                        </div>
                    )}
                </div>
                {/* Decorative background elements */}
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-[100px]"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Categorías laterales */}
                <div className="lg:col-span-3 space-y-4">
                    {[
                        { id: 'perfil', label: 'Mi Información', icon: User },
                        { id: 'favoritos', label: 'Mis Favoritos', icon: Heart },
                        { id: 'pedidos', label: 'Historial de Pedidos', icon: ShoppingBag },
                        { id: 'pagos', label: 'Métodos de Pago', icon: CreditCard },
                        { id: 'avisos', label: 'Preferencias', icon: Bell },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center justify-between p-6 rounded-3xl transition-all group ${activeTab === tab.id
                                ? 'bg-primary text-white shadow-xl shadow-primary/20 translate-x-2'
                                : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100 hover:border-primary/20'}`}
                        >
                            <div className="flex items-center gap-4">
                                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-gray-300'}`} />
                                <span className="text-[11px] font-black uppercase tracking-widest italic">{tab.label}</span>
                            </div>
                            <ArrowRight className={`w-4 h-4 opacity-0 transition-all ${activeTab === tab.id ? 'opacity-100 mr-2' : ''}`} />
                        </button>
                    ))}

                    <button
                        onClick={signOut}
                        className="w-full flex items-center gap-4 p-6 rounded-3xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all group mt-8"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest italic">Cerrar Sesión</span>
                    </button>
                </div>

                {/* Área de contenido central */}
                <div className="lg:col-span-9 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                    {activeTab === 'perfil' && (
                        <div className="space-y-8">
                            {/* Datos Personales */}
                            <div className="bg-white rounded-[2.5rem] shadow-luxury border border-gray-100 p-10">
                                <div className="flex items-center justify-between mb-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                                        <h3 className="text-xl font-black text-brand-carbon uppercase italic">Información Personal</h3>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tus datos nunca serán compartidos</p>
                                </div>

                                <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre y Apellidos</label>
                                        <div className="relative">
                                            <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                type="text"
                                                className="premium-input pl-14 w-full h-16 bg-gray-50/50 hover:bg-white focus:bg-white"
                                                value={formData.full_name}
                                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono de Contacto</label>
                                        <div className="relative">
                                            <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                type="tel"
                                                className="premium-input pl-14 w-full h-16 bg-gray-50/50 hover:bg-white focus:bg-white"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dirección Principal</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-6 top-6 w-4 h-4 text-gray-300" />
                                            <textarea
                                                className="premium-input pl-14 w-full h-32 pt-6 bg-gray-50/50 hover:bg-white focus:bg-white resize-none"
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {(profile?.company_name || profile?.user_type === 'profesional') && (
                                        <>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Empresa / Razón Social</label>
                                                <input
                                                    type="text"
                                                    className="premium-input w-full h-16 bg-gray-50/50 hover:bg-white focus:bg-white"
                                                    value={formData.company_name}
                                                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CIF / NIF (VAT ID)</label>
                                                <input
                                                    type="text"
                                                    className="premium-input w-full h-16 bg-gray-50/50 hover:bg-white focus:bg-white"
                                                    value={formData.vat_id}
                                                    onChange={e => setFormData({ ...formData, vat_id: e.target.value })}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="md:col-span-2 pt-6">
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="bg-brand-carbon text-white h-16 px-12 rounded-2xl flex items-center justify-center gap-4 hover:bg-primary transition-all font-black uppercase italic text-xs shadow-2xl disabled:opacity-50"
                                        >
                                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Save className="w-5 h-5 text-primary" />}
                                            Guardar Cambios del Perfil
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Cambio de Contraseña */}
                            <div className="bg-white rounded-[2.5rem] shadow-luxury border border-gray-100 p-10">
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="w-2 h-2 bg-brand-carbon rounded-full"></div>
                                    <h3 className="text-xl font-black text-brand-carbon uppercase italic">Seguridad y Acceso</h3>
                                </div>

                                <form onSubmit={handleUpdatePassword} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                                        <div className="relative">
                                            <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                type="password"
                                                className="premium-input pl-14 w-full h-16 bg-gray-50/50 hover:bg-white focus:bg-white"
                                                value={passwordData.password}
                                                onChange={e => setPasswordData({ ...passwordData, password: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                                        <div className="relative">
                                            <Shield className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                type="password"
                                                className="premium-input pl-14 w-full h-16 bg-gray-50/50 hover:bg-white focus:bg-white"
                                                value={passwordData.confirmPassword}
                                                onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 pt-4">
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="bg-brand-carbon text-white h-16 px-12 rounded-2xl flex items-center justify-center gap-4 hover:bg-primary transition-all font-black uppercase italic text-xs shadow-2xl disabled:opacity-50"
                                        >
                                            Actualizar Contraseña
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab !== 'perfil' && (
                        <div className="bg-gray-50 rounded-[3rem] p-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200">
                            <div className="bg-white p-8 rounded-full shadow-luxury mb-8">
                                <Loader2 className="w-12 h-12 text-gray-300 animate-pulse" />
                            </div>
                            <h3 className="text-2xl font-black text-brand-carbon uppercase italic mb-4">Sección en Construcción</h3>
                            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest max-w-sm">Estamos preparando el panel de pedidos y favoritos para que sea tan premium como nuestra luz.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
