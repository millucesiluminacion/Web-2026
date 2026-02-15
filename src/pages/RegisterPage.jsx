import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Check, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
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
        <div className="bg-gray-100 min-h-[600px] flex items-center justify-center py-12">
            <div className="bg-white p-8 rounded shadow-sm border border-gray-200 w-full max-w-lg">
                <h2 className="text-2xl font-black text-gray-800 mb-2 text-center uppercase">Crear Cuenta</h2>
                <p className="text-center text-gray-500 text-sm mb-8">Únete a Mil Luces y disfruta de ventajas exclusivas.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Check className="w-4 h-4 text-green-500" />
                            <span>Seguimiento de pedidos</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Check className="w-4 h-4 text-green-500" />
                            <span>Facturas descargables</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Check className="w-4 h-4 text-green-500" />
                            <span>Ofertas exclusivas</span>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold uppercase tracking-wider leading-relaxed">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre Completo</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none transition-all"
                                placeholder="Tu nombre artístico o real"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none transition-all"
                                placeholder="ejemplo@mil-luces.com"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none transition-all"
                                placeholder="Mínimo 6 caracteres"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="flex items-start gap-2 pt-2">
                            <input type="checkbox" className="mt-1" required disabled={loading} />
                            <span className="text-[10px] text-gray-500 leading-tight uppercase font-bold tracking-tighter">
                                He leído y acepto la <a href="#" className="underline text-primary">Política de Privacidad</a>.
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-carbon text-white font-bold py-4 rounded-xl uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-black/5 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Creando Cuenta...</span>
                                </>
                            ) : (
                                <span>Registrarme ahora</span>
                            )}
                        </button>
                    </form>
                </div>

                <div className="text-center border-t border-gray-100 pt-4">
                    <Link to="/login" className="text-sm text-blue-600 hover:underline">¿Ya tienes cuenta? Inicia sesión</Link>
                </div>
            </div>
        </div>
    );
}
