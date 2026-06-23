import { useState, useEffect } from 'react';
import { Save, Loader2, Target, Users, Calendar, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Link } from 'react-router-dom';

export default function DashboardSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        monthlyGoals: {},
        activeClientThreshold: 6, // months
        predictionDays: 30,
        showB2B: true,
        showForecast: true
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'dashboard_config')
                .maybeSingle();

            if (data?.value) {
                setConfig(data.value);
            }
        } catch (err) {
            console.error('Error fetching dashboard config:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    key: 'dashboard_config',
                    value: config
                }, { onConflict: 'key' });

            if (error) throw error;
            alert('Configuración guardada correctamente');
        } catch (err) {
            alert('Error al guardar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const updateGoal = (month, value) => {
        setConfig(prev => ({
            ...prev,
            monthlyGoals: {
                ...prev.monthlyGoals,
                [month]: parseFloat(value) || 0
            }
        }));
    };

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-primary/20" />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-6 mb-12">
                <Link to="/admin" className="p-4 bg-white rounded-2xl border border-gray-100 text-gray-400 hover:text-primary transition-all shadow-sm">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block font-outfit">Intelligence Config</span>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter font-outfit">
                        Ajustes del <span className="text-primary/40">Dashboard</span>
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Monthly Goals Section */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                <Target className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-brand-carbon uppercase italic font-outfit">Objetivos Mensuales (Ventas €)</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Define el hito de facturación para cada mes del año.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {months.map((name, index) => {
                                const monthKey = (index + 1).toString().padStart(2, '0');
                                return (
                                    <div key={monthKey} className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 font-outfit">{name}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={config.monthlyGoals[monthKey] || ''}
                                                onChange={(e) => updateGoal(monthKey, e.target.value)}
                                                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                                placeholder="5000"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300">€</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Other Config Section */}
                <div className="space-y-8">
                    <div className="bg-brand-carbon p-10 rounded-[3rem] text-white shadow-2xl shadow-brand-carbon/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-primary">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black uppercase italic font-outfit">CRM & Fidelización</h2>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Filtros de actividad clientes.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2 font-outfit">Umbral Cliente Activo (Meses)</label>
                                <select
                                    value={config.activeClientThreshold}
                                    onChange={(e) => setConfig(prev => ({ ...prev, activeClientThreshold: parseInt(e.target.value) }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit text-white appearance-none cursor-pointer"
                                >
                                    <option value={3}>3 Meses</option>
                                    <option value={6}>6 Meses</option>
                                    <option value={12}>12 Meses</option>
                                    <option value={24}>24 Meses</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2 font-outfit">Base para Previsión (Días)</label>
                                <input
                                    type="number"
                                    value={config.predictionDays}
                                    onChange={(e) => setConfig(prev => ({ ...prev, predictionDays: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit text-white"
                                />
                            </div>
                        </div>

                        <div className="mt-12">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full bg-primary text-brand-carbon h-14 rounded-2xl font-black uppercase italic text-[11px] tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar Inteligencia
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100">
                        <div className="flex items-center gap-4 mb-6">
                            <Calendar className="w-5 h-5 text-gray-300" />
                            <h3 className="text-[11px] font-black text-brand-carbon uppercase tracking-widest font-outfit">Notas de Gerencia</h3>
                        </div>
                        <p className="text-[10px] leading-loose text-gray-400 font-semibold italic">
                            "Los objetivos mensuales permiten al sistema calcular automáticamente la evolución y predecir si alcanzaremos los hitos de crecimiento definidos."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
