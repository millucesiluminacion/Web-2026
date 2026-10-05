import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle, Info, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, profile, loading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [infoMessage, setInfoMessage] = useState(null);
    const [confirmedSuccess, setConfirmedSuccess] = useState(false);
    const [forgotMode, setForgotMode] = useState(false);
    const [forgotSent, setForgotSent] = useState(false);

    // Detectar si el usuario llega desde un enlace de confirmación de email o recuperación
    useEffect(() => {
        const hash = window.location.hash || '';
        const searchParams = new URLSearchParams(window.location.search);

        // 1. Detección de enlace de confirmación completado (type=signup en hash o confirmed=true en query)
        if (hash.includes('type=signup') || searchParams.get('confirmed') === 'true') {
            setConfirmedSuccess(true);
            setInfoMessage('¡Tu cuenta de correo ha sido confirmada con éxito! Ya puedes iniciar sesión con tus credenciales.');
        }

        // 2. Detección de token_hash en query para auto-verificación (fallback si Supabase envía token directo)
        const tokenHash = searchParams.get('token_hash');
        const tokenType = searchParams.get('type');
        if (tokenHash && (tokenType === 'signup' || tokenType === 'email')) {
            supabase.auth.verifyOtp({ token_hash: tokenHash, type: tokenType })
                .then(({ error: verifyErr }) => {
                    if (!verifyErr) {
                        setConfirmedSuccess(true);
                        setInfoMessage('¡Tu cuenta ha sido validada y confirmada con éxito!');
                    }
                })
                .catch(() => {});
        }

        // 3. Detección de enlace ya consumido o caducado (#error=access_denied&error_code=otp_expired)
        if (hash.includes('error_code=otp_expired') || hash.includes('invalid+or+has+expired') || hash.includes('otp_expired')) {
            setInfoMessage('Tu cuenta ya ha sido confirmada anteriormente (o el enlace de un solo uso ya fue utilizado). Puedes iniciar sesión a continuación con tus datos.');
        } else if (hash.includes('error=')) {
            const hashClean = hash.startsWith('#') ? hash.substring(1) : hash;
            const params = new URLSearchParams(hashClean);
            const desc = params.get('error_description');
            if (desc && !desc.includes('expired')) {
                setError(decodeURIComponent(desc.replace(/\+/g, ' ')));
            }
        }
    }, [location]);

    // Si el usuario ya está autenticado, ofrecerle ir directo a su perfil
    useEffect(() => {
        if (user && !authLoading && confirmedSuccess) {
            const timer = setTimeout(() => {
                navigate('/perfil');
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [user, authLoading, confirmedSuccess, navigate]);

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
            const data = await response.json();
            if (response.ok) {
                setForgotSent(true);
            } else {
                setError(data.error || 'Error al enviar el enlace de recuperación.');
            }
        } catch (err) {
            setError(err.message || 'Error de conexión. Inténtalo más tarde.');
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

                {confirmedSuccess && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-emerald-900">¡Cuenta Confirmada!</p>
                            <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                                Tu correo electrónico ha sido validado correctamente. 
                                {user ? ' Redirigiendo a tu cuenta...' : ' Ya puedes iniciar sesión con tu email y contraseña.'}
                            </p>
                        </div>
                    </div>
                )}

                {infoMessage && !confirmedSuccess && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-blue-800 animate-in fade-in slide-in-from-top-2">
                        <Info className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
                        <p className="text-xs font-medium leading-relaxed">{infoMessage}</p>
                    </div>
                )}

                {user && !forgotMode && (
                    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between gap-3">
                        <div className="text-left">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-widest">Sesión Iniciada</span>
                            <span className="text-xs font-bold text-gray-800 truncate block max-w-[200px]">{user.email}</span>
                        </div>
                        <Link 
                            to="/perfil" 
                            className="bg-brand-carbon text-white text-xs font-bold px-4 py-2 rounded-xl uppercase tracking-wider flex items-center gap-1.5 hover:bg-black transition-colors"
                        >
                            <span>Mi Cuenta</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                )}

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
