import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, AlertCircle, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [hasSession, setHasSession] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        // Listen for recovery event or check current session
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY' || session) {
                setHasSession(true);
            }
            setCheckingSession(false);
        });

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setHasSession(true);
            setCheckingSession(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return setError('Las contraseñas no coinciden. Por favor verifícalas.');
        }
        if (password.length < 6) {
            return setError('La contraseña debe tener al menos 6 caracteres.');
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.message || 'Error al actualizar la contraseña. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-[70vh] flex items-center justify-center py-16 px-4">
            <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-luxury border border-gray-100 w-full max-w-md animate-in fade-in slide-in-from-bottom-6 duration-500">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20 text-primary">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-1">Mil Luces Boutique</p>
                    <h1 className="text-2xl font-black text-brand-carbon uppercase italic tracking-tighter">
                        Restablecer Contraseña
                    </h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-2">
                        Introduce tu nueva contraseña de acceso
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in fade-in">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold uppercase tracking-wide leading-relaxed">{error}</p>
                    </div>
                )}

                {success ? (
                    <div className="text-center py-8 space-y-4 animate-in fade-in">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                            <CheckCircle className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-black text-brand-carbon uppercase italic">¡Contraseña Actualizada!</h2>
                        <p className="text-xs text-gray-500 font-bold leading-relaxed">
                            Tu contraseña se ha restablecido correctamente. Serás redirigido a la página de inicio de sesión en unos segundos...
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="mt-4 inline-flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest hover:underline"
                        >
                            Ir a Iniciar Sesión ahora <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                Nueva Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-12 bg-gray-50 border-none rounded-2xl pl-11 pr-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-300 focus:outline-none"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                Confirmar Nueva Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-12 bg-gray-50 border-none rounded-2xl pl-11 pr-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-300 focus:outline-none"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-brand-carbon text-white rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-primary transition-all shadow-xl shadow-brand-carbon/10 flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /><span>Guardando...</span></>
                            ) : (
                                <><span>Guardar Nueva Contraseña</span><ArrowRight className="w-4 h-4 text-primary" /></>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
