import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, Save, X, Sparkles, Zap, Shield, Clock, Heart, Star, Award, Info } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const ICON_MAP = {
    Sparkles, Zap, Shield, Clock, Heart, Star, Award, Info
};

export default function BadgesAdmin() {
    const [badges, setBadges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        bg_color: '#333333',
        text_color: '#ffffff',
        icon_name: '',
        is_active: true
    });

    useEffect(() => {
        fetchBadges();
    }, []);

    async function fetchBadges() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('badges')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBadges(data || []);
        } catch (error) {
            console.error('Error fetching badges:', error.message);
        } finally {
            setLoading(false);
        }
    }

    function openEdit(badge) {
        setEditingId(badge.id);
        setFormData({
            name: badge.name,
            bg_color: badge.bg_color,
            text_color: badge.text_color,
            icon_name: badge.icon_name || '',
            is_active: badge.is_active
        });
        setIsModalOpen(true);
    }

    function openCreate() {
        setEditingId(null);
        setFormData({
            name: '',
            bg_color: '#333333',
            text_color: '#ffffff',
            icon_name: '',
            is_active: true
        });
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setIsSaving(true);
            if (editingId) {
                const { error } = await supabase
                    .from('badges')
                    .update(formData)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('badges')
                    .insert([formData]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            fetchBadges();
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteBadge(id) {
        if (!confirm('¿Estás seguro de eliminar este estilo de badge? Se quitará de todos los productos.')) return;
        try {
            const { error } = await supabase.from('badges').delete().eq('id', id);
            if (error) throw error;
            setBadges(prev => prev.filter(b => b.id !== id));
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end mb-12 pb-8 border-b border-gray-100">
                <div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-3 block">Estética Boutique</span>
                    <h1 className="text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter mb-2">
                        Gestión de <span className="text-primary/40">Badges</span>
                    </h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase italic">
                        * Los badges de sistema (NUEVO, AGOTADO, ENVÍO GRATIS) se calculan automáticamente.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-brand-carbon text-white px-8 py-4 rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-primary transition-all flex items-center gap-3 shadow-xl shadow-brand-carbon/10"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Estilo
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-primary/20" />
                </div>
            ) : badges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {badges.map((badge) => {
                        const Icon = ICON_MAP[badge.icon_name];
                        return (
                            <div key={badge.id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                                <div className="flex justify-between items-start mb-8">
                                    <div
                                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[.2em] flex items-center gap-2 shadow-sm"
                                        style={{ backgroundColor: badge.bg_color, color: badge.text_color }}
                                    >
                                        {Icon && <Icon className="w-4 h-4" />}
                                        {badge.name}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(badge)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-primary transition-colors">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => deleteBadge(badge.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                        <span>Fondo: {badge.bg_color}</span>
                                        <span>Texto: {badge.text_color}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${badge.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">
                                            {badge.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100">
                    <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Award className="w-10 h-10 text-gray-200" />
                    </div>
                    <h3 className="text-xl font-black text-brand-carbon uppercase italic mb-2">No hay estilos de badges</h3>
                    <p className="text-sm text-gray-400 mb-8 max-w-sm mx-auto">Crea estilos personalizados (ej: Especial, Stock, Novedad) para asignarlos a tus productos.</p>
                    <button
                        onClick={openCreate}
                        className="bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-brand-carbon transition-all"
                    >
                        Crear mi Primer Badge
                    </button>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-carbon/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-xl font-black text-brand-carbon uppercase italic">Configurar Badge</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-brand-carbon transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Nombre del Badge</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full border-b-2 border-gray-100 py-3 text-sm font-bold focus:outline-none focus:border-primary transition-colors"
                                        placeholder="Ej: ENVÍO GRATIS, ECO, TOP VENTAS..."
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Color Fondo</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="color"
                                                className="w-10 h-10 rounded-lg cursor-pointer border-none"
                                                value={formData.bg_color}
                                                onChange={e => setFormData({ ...formData, bg_color: e.target.value })}
                                            />
                                            <span className="text-xs font-mono font-bold text-gray-400 uppercase">{formData.bg_color}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Color Texto</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="color"
                                                className="w-10 h-10 rounded-lg cursor-pointer border-none"
                                                value={formData.text_color}
                                                onChange={e => setFormData({ ...formData, text_color: e.target.value })}
                                            />
                                            <span className="text-xs font-mono font-bold text-gray-400 uppercase">{formData.text_color}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Icono Visual</label>
                                    <div className="grid grid-cols-4 gap-4">
                                        {Object.entries(ICON_MAP).map(([name, Icon]) => (
                                            <button
                                                key={name}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, icon_name: name })}
                                                className={`p-4 rounded-2xl flex items-center justify-center border transition-all ${formData.icon_name === name ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 hover:border-gray-200 text-gray-400'}`}
                                            >
                                                <Icon className="w-5 h-5" />
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, icon_name: '' })}
                                            className={`p-4 rounded-2xl flex items-center justify-center border transition-all ${formData.icon_name === '' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 hover:border-gray-200 text-gray-400'}`}
                                        >
                                            <span className="text-[10px] font-black">NADA</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-4">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-primary border-gray-100 rounded focus:ring-primary"
                                    />
                                    <label htmlFor="is_active" className="text-[10px] font-black text-brand-carbon uppercase tracking-widest underline decoration-primary/30 decoration-2 underline-offset-4">Badge Activo en Web</label>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 bg-brand-carbon text-white py-5 rounded-2xl font-black uppercase italic text-[11px] hover:bg-primary transition-all shadow-xl shadow-brand-carbon/10 flex items-center justify-center gap-4 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        {editingId ? 'Actualizar Estilo' : 'Crear Estilo'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
