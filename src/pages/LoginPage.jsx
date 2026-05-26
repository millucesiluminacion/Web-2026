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
    const [forgotMode, setForgotMode] = useState(false);
    const [forgotSent, setForgotSent] = useState(false);

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!email) return setError('Introduce tu email para recuperar la contraseña.');
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/auth/recover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (response.ok) {
                setForgotSent(true);
            } else {
                const data = await response.json();
                setError(data.error || 'Error al enviar el enlace de recuperación.');
            }
        } catch (err) {
            setError('Error de conexión. Inténtalo más tarde.');
        } finally {
            setLoading(false);
        }
    };

    const translateError = (message) => {
        const msg = message.toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
            return 'Email o contraseña incorrectos. Revisa tus datos.';
        }
        if (msg.includes('email not confirmed')) {
            return 'Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada o spam.';
        }
        if (msg.includes('rate limit exceeded')) {
            return 'Demasiados intentos seguidos. Por seguridad, espera unos minutos.';
        }
        return 'Error al iniciar sesión: ' + message;
    };

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
            setError(translateError(err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-100 min-h-[600px] flex items-center justify-center py-12">
            <div className="bg-white p-8 rounded shadow-sm border border-gray-200 w-full max-w-md">
                <h2 className="text-2xl font-black text-gray-800 mb-6 text-center uppercase">
                    {forgotMode ? 'Recuperar Contraseña' : 'Iniciar Sesión'}
                </h2>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold uppercase tracking-wider leading-relaxed">{error}</p>
                    </div>
                )}

                {forgotSent ? (
                    <div className="text-center py-8 space-y-4">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto border border-green-200">
                            <Mail className="w-7 h-7 text-green-600" />
                        </div>
                        <h3 className="text-lg font-black text-gray-800 uppercase">¡Enlace Enviado!</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">Hemos enviado un correo a <strong>{email}</strong> con un enlace seguro para restablecer tu contraseña. Revisa también la carpeta de spam.</p>
                        <button onClick={() => { setForgotMode(false); setForgotSent(false); setError(null); }} className="text-sm font-bold text-primary hover:underline mt-4">
                            Volver al Login
                        </button>
                    </div>
                ) : forgotMode ? (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tu Email</label>
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
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-carbon text-white font-bold py-4 rounded-xl uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-black/5 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Enviando...</span></> : <span>Enviar Enlace de Recuperación</span>}
                        </button>
                        <button type="button" onClick={() => { setForgotMode(false); setError(null); }} className="w-full text-sm font-bold text-gray-500 hover:text-primary transition-colors mt-2">
                            ← Volver al Login
                        </button>
                    </form>
                ) : (
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

                        <div className="text-right">
                            <button type="button" onClick={() => { setForgotMode(true); setError(null); }} className="text-xs font-bold text-gray-400 hover:text-primary transition-colors uppercase tracking-wider">
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-carbon text-white font-bold py-4 rounded-xl uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-black/5 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /><span>Procesando...</span></>
                            ) : (
                                <span>Iniciar Sesión</span>
                            )}
                        </button>
                    </form>
                )}

                {!forgotMode && !forgotSent && (
                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <h3 className="text-sm font-bold text-gray-700 mb-4">¿No tienes cuenta?</h3>
                        <Link to="/register" className="inline-block border-2 border-gray-800 text-gray-800 font-bold py-2 px-6 hover:bg-gray-800 hover:text-white transition-colors uppercase text-sm">
                            Crear una cuenta
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
