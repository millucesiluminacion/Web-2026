import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Check, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function RegisterPage({ isPro = false }) {
    const navigate = useNavigate();
    const [userType, setUserType] = useState(isPro ? 'profesional' : 'persona');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [vatId, setVatId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        user_type: userType,
                        company_name: userType === 'profesional' ? companyName : null,
                        vat_id: userType === 'profesional' ? vatId : null,
                        role: 'editor' // Registros públicos por defecto son editores LIMITADOS hasta que se verifiquen
                    }
                }
            });

            if (signUpError) throw signUpError;
            alert('Registro exitoso. Revisa tu email para confirmar o inicia sesión si ya está activa.');
            navigate('/login');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen flex items-center justify-center py-12 px-4">
            <div className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-luxury border border-gray-100 w-full max-w-5xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-black text-brand-carbon mb-3 uppercase italic tracking-tighter">
                        Crear Cuenta <span className="text-primary">Mil Luces</span>
                    </h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                        Únete a la élite de la iluminación y disfruta de ventajas únicas.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* Left Column: Benefits & Selector */}
                    <div className="lg:col-span-5 space-y-8">
                        {/* Selector */}
                        <div className="p-1.5 bg-gray-50 rounded-2xl border border-gray-100 flex gap-1">
                            <button
                                onClick={() => setUserType('persona')}
                                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userType === 'persona' ? 'bg-white shadow-xl text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Particular
                            </button>
                            <button
                                onClick={() => setUserType('profesional')}
                                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userType === 'profesional' ? 'bg-white shadow-xl text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Profesional / Empresa
                            </button>
                        </div>

                        {/* Benefits List */}
                        <div className="space-y-4 p-8 bg-brand-carbon rounded-[2rem] text-white">
                            <p className="text-[10px] font-black uppercase tracking-[.3em] text-primary mb-4 italic">Beneficios exclusvios</p>
                            {[
                                { text: userType === 'persona' ? 'Seguimiento de pedidos' : 'Descuentos profesionales de hasta el 10%+', icon: Check },
                                { text: userType === 'persona' ? 'Facturas descargables' : 'Facturas con IVA desglosado automáticas', icon: Check },
                                { text: userType === 'persona' ? 'Ofertas exclusivas' : 'Soporte técnico y showroom prioritario', icon: Check },
                                { text: 'Acceso a lanzamientos limitados', icon: Check },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                                        <item.icon className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-tight">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Form */}
                    <div className="lg:col-span-7">
                        {error && (
                            <div className="mb-8 p-6 bg-red-50 border border-red-100 rounded-[1.5rem] flex items-start gap-4 text-red-600 animate-in fade-in slide-in-from-top-4">
                                <AlertCircle className="w-6 h-6 shrink-0" />
                                <p className="text-xs font-bold uppercase tracking-wider leading-relaxed">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-gray-50 border-none rounded-2lx px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-300"
                                        placeholder="Marc Pérez"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-gray-50 border-none rounded-2lx px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-300"
                                        placeholder="hola@ejemplo.com"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {userType === 'profesional' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre de Empresa</label>
                                        <input
                                            type="text"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            className="w-full bg-gray-50 border-none rounded-2lx px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-300"
                                            placeholder="Mil Luces S.L."
                                            required={userType === 'profesional'}
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">NIF / CIF</label>
                                        <input
                                            type="text"
                                            value={vatId}
                                            onChange={(e) => setVatId(e.target.value)}
                                            className="w-full bg-gray-50 border-none rounded-2lx px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-300"
                                            placeholder="B12345678"
                                            required={userType === 'profesional'}
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-gray-50 border-none rounded-2lx px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-300"
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="flex items-start gap-4 py-4">
                                <input type="checkbox" className="mt-1 accent-primary w-4 h-4" required disabled={loading} />
                                <span className="text-[10px] text-gray-400 leading-relaxed uppercase font-black tracking-tight">
                                    He leído y acepto la <a href="#" className="text-primary hover:underline">Política de Privacidad</a> y los Términos de Servicio.
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-white font-black py-6 rounded-[1.5rem] uppercase tracking-[.2em] italic text-xs hover:bg-brand-carbon hover:scale-[1.02] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-4 disabled:opacity-50 disabled:grayscale"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <span>Crear Mi Cuenta Ahora</span>
                                )}
                            </button>

                            <div className="text-center pt-8 border-t border-gray-50">
                                <Link to="/login" className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors">
                                    ¿Ya tienes cuenta? Inicia sesión aquí
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
