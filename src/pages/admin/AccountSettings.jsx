import { useState, useEffect } from 'react';
import { Save, User, Lock, Bell, Mail, Shield, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function AccountSettings() {
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState({
        full_name: 'Administrador Principal',
        email: 'admin@mil-luces.com',
        role: 'Super Administrador',
        notifications: true,
        two_factor: false
    });

    useEffect(() => {
        // Simulating a fetch or getting data from Auth
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        // Placeholder for real update logic
        setTimeout(() => {
            setIsSaving(false);
            alert('Configuración guardada exitosamente');
        }, 1000);
    };

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-black text-gray-800 uppercase italic">Configuración de Cuenta</h1>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors font-black uppercase italic shadow-md disabled:bg-gray-400"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Aplicar Cambios
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Side: Basic Info */}
                <div className="md:col-span-2 space-y-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <h2 className="font-black uppercase text-[10px] text-gray-700 tracking-widest">Información de Perfil</h2>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 border-2 border-blue-50 relative group">
                                    <span className="text-2xl font-black uppercase italic">A</span>
                                    <button className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity flex items-center justify-center text-[10px] font-black uppercase">Cambiar</button>
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nombre Completo</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg px-4 py-2.5 text-sm font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                            value={profile.full_name}
                                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Correo Electrónico</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                                            <input
                                                type="email"
                                                className="w-full border rounded-lg pl-10 pr-4 py-2.5 text-sm font-medium text-gray-500 bg-gray-50 focus:outline-none"
                                                value={profile.email}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-blue-600" />
                            <h2 className="font-black uppercase text-[10px] text-gray-700 tracking-widest">Seguridad y Acceso</h2>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-lg border border-gray-100 text-gray-400">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Autenticación en dos pasos (2FA)</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Añade una capa extra de seguridad a tu cuenta.</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={profile.two_factor}
                                        onChange={(e) => setProfile({ ...profile, two_factor: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <button className="text-xs font-black text-blue-600 border border-blue-100 px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors uppercase italic tracking-widest w-full text-left flex items-center justify-between">
                                Cambiar Contraseña
                                <Lock className="w-4 h-4 opacity-50" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Quick Settings */}
                <div className="space-y-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                            <Bell className="w-4 h-4 text-blue-600" />
                            <h2 className="font-black uppercase text-[10px] text-gray-700 tracking-widest">Avisos</h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-600 uppercase">Alertas de Stock</span>
                                    <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-600 uppercase">Nuevos Pedidos</span>
                                    <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-600 uppercase">Registros</span>
                                    <input type="checkbox" className="rounded text-blue-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-900 to-black p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="font-black italic uppercase tracking-widest text-[#4488ff] mb-2">Estado del Sistema</h3>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-[10px] font-black uppercase tracking-tighter opacity-80">Todos los servicios activos</span>
                            </div>
                            <div className="space-y-2 text-[10px] font-bold uppercase opacity-60">
                                <div className="flex justify-between">
                                    <span>Base de datos (Supabase)</span>
                                    <span className="text-green-400">Online</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Auth Service</span>
                                    <span className="text-green-400">Online</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Media Storage</span>
                                    <span className="text-green-400">Online</span>
                                </div>
                            </div>
                        </div>
                        {/* Decorative background element */}
                        <div className="absolute -bottom-4 -right-4 bg-blue-600/10 w-24 h-24 rounded-full blur-2xl"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
