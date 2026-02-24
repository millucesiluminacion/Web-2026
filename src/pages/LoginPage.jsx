import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-100 min-h-[600px] flex items-center justify-center py-12">
            <div className="bg-white p-8 rounded shadow-sm border border-gray-200 w-full max-w-md">
                <h2 className="text-2xl font-black text-gray-800 mb-6 text-center uppercase">Iniciar Sesión</h2>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold uppercase tracking-wider leading-relaxed">{error}</p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none transition-all"
                                placeholder="ejemplo@email.com"
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none transition-all"
                                placeholder="••••••••"
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-carbon text-white font-bold py-4 rounded-xl uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-black/5 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Procesando...</span>
                            </>
                        ) : (
                            <span>Iniciar Sesión</span>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <h3 className="text-sm font-bold text-gray-700 mb-4">¿No tienes cuenta?</h3>
                    <Link to="/register" className="inline-block border-2 border-gray-800 text-gray-800 font-bold py-2 px-6 hover:bg-gray-800 hover:text-white transition-colors uppercase text-sm">
                        Crear una cuenta
                    </Link>
                </div>
            </div>
        </div>
    );
}
