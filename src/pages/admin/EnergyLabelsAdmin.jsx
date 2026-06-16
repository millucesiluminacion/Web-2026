import { useState, useEffect } from 'react';
import {
    Save, Loader2, Plus, Pencil, Trash2, X, CheckCircle, AlertTriangle,
    Zap, Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ImageUpload from '../../components/admin/ImageUpload';

const EMPTY_LABEL = { name: '', image_url: '', color: '#16a34a' };

const PRESET_COLORS = [
    { name: 'Verde A++', value: '#008000' },
    { name: 'Verde A+', value: '#32cd32' },
    { name: 'Verde A', value: '#16a34a' },
    { name: 'Amarillo B', value: '#eab308' },
    { name: 'Naranja C', value: '#f97316' },
    { name: 'Rojo D', value: '#dc2626' },
    { name: 'Gris G', value: '#4b5563' },
];

export default function EnergyLabelsAdmin() {
    const [labels, setLabels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null);
    const [toast, setToast] = useState(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => { fetchLabels(); }, []);

    async function fetchLabels() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('energy_labels')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setLabels(data || []);
        } catch (err) {
            console.error('fetchLabels error:', err.message);
            showToast('error', 'Error al cargar: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    const openCreate = () => { setEditing({ ...EMPTY_LABEL }); setModalOpen(true); };
    const openEdit = (label) => { setEditing({ ...label }); setModalOpen(true); };
    const closeModal = () => { setModalOpen(false); setEditing(null); };

    async function handleSave() {
        if (!editing.name.trim()) return;
        try {
            setIsSaving(true);
            const isNew = !editing.id;
            const payload = {
                name: editing.name,
                image_url: editing.image_url,
                color: editing.color,
            };
            if (!isNew) payload.id = editing.id;

            const { error } = await supabase.from('energy_labels').upsert(payload);
            if (error) throw error;

            await fetchLabels();
            showToast('success', isNew ? 'Etiqueta creada.' : 'Cambios guardados.');
            closeModal();
        } catch (err) {
            showToast('error', err.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('¿Eliminar esta etiqueta energética?')) return;
        try {
            setIsDeleting(id);
            const { error } = await supabase.from('energy_labels').delete().eq('id', id);
            if (error) throw error;
            setLabels(prev => prev.filter(r => r.id !== id));
            showToast('success', 'Etiqueta eliminada.');
        } catch (err) {
            showToast('error', err.message);
        } finally {
            setIsDeleting(null);
        }
    }

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="font-outfit">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 ${toast.type === 'success' ? 'bg-green-50 border border-green-100 text-green-800' : 'bg-red-50 border border-red-100 text-red-800'}`}>
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <p className="text-[11px] font-black uppercase tracking-wider">{toast.msg}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Eficiencia Energética</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em] mt-3">Gestión de Etiquetas Europeas</p>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-brand-carbon text-white h-14 px-8 rounded-2xl flex items-center gap-3 hover:bg-primary transition-all font-black uppercase italic text-[10px] shadow-xl shadow-brand-carbon/10"
                >
                    <Plus className="w-4 h-4 text-primary" /> Nueva Etiqueta
                </button>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {labels.map((label) => (
                    <div
                        key={label.id}
                        className="group relative bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 overflow-hidden"
                    >
                        <div className="h-32 bg-gray-50 flex items-center justify-center p-6 relative">
                            <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black italic text-xl shadow-lg group-hover:scale-110 transition-transform duration-500"
                                style={{ backgroundColor: label.color }}
                            >
                                {label.name}
                            </div>
                            {label.image_url && (
                                <img src={label.image_url} alt={label.name} className="absolute inset-0 w-full h-full object-contain opacity-0 group-hover:opacity-10 transition-opacity" />
                            )}
                        </div>

                        <div className="p-6 text-center">
                            <h3 className="text-sm font-black text-brand-carbon uppercase italic tracking-tight leading-tight mb-1">
                                Clase {label.name}
                            </h3>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label.color}</span>
                            </div>
                        </div>

                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => openEdit(label)}
                                className="flex-1 h-10 bg-gray-50 hover:bg-brand-carbon hover:text-primary text-gray-500 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase italic tracking-widest transition-all"
                            >
                                <Pencil className="w-3.5 h-3.5" /> Editar
                            </button>
                            <button
                                onClick={() => handleDelete(label.id)}
                                disabled={isDeleting === label.id}
                                className="w-10 h-10 bg-gray-50 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50"
                            >
                                {isDeleting === label.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={openCreate}
                    className="group border-2 border-dashed border-gray-200 hover:border-primary rounded-[2rem] min-h-[220px] flex flex-col items-center justify-center gap-4 transition-all hover:bg-primary/5"
                >
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 group-hover:bg-primary/10 flex items-center justify-center transition-all">
                        <Plus className="w-6 h-6 text-gray-300 group-hover:text-primary" />
                    </div>
                    <p className="text-[10px] font-black text-gray-300 group-hover:text-primary uppercase italic tracking-widest transition-colors">Añadir Etiqueta</p>
                </button>
            </div>

            {/* Modal */}
            {modalOpen && editing && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-carbon/60 backdrop-blur-md animate-in fade-in duration-300"
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg animate-in slide-in-from-bottom-8 duration-500 overflow-hidden">
                        <div className="p-8 pb-0 flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-1">
                                    {editing.id ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
                                </p>
                                <h2 className="text-xl font-black text-brand-carbon uppercase italic tracking-tighter">
                                    {editing.id ? `Clase ${editing.name}` : 'Configurar Etiqueta'}
                                </h2>
                            </div>
                            <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre Clase</label>
                                    <input
                                        type="text"
                                        value={editing.name}
                                        onChange={(e) => setEditing(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Ej: A++, A, G"
                                        className="w-full h-12 bg-gray-50 border-none rounded-2xl px-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all focus:outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={editing.color}
                                            onChange={(e) => setEditing(prev => ({ ...prev, color: e.target.value }))}
                                            className="w-12 h-12 bg-transparent border-none p-0 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={editing.color}
                                            onChange={(e) => setEditing(prev => ({ ...prev, color: e.target.value }))}
                                            className="flex-1 h-12 bg-gray-50 border-none rounded-2xl px-4 text-xs font-mono focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preajustes de Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            onClick={() => setEditing(prev => ({ ...prev, color: c.value }))}
                                            className="w-8 h-8 rounded-lg border border-white shadow-sm transition-transform hover:scale-110"
                                            style={{ backgroundColor: c.value }}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            </div>

                            <ImageUpload
                                onUpload={(url) => setEditing(prev => ({ ...prev, image_url: url }))}
                                defaultValue={editing.image_url}
                                showLabel={true}
                            />

                            <div className="flex justify-center p-6 bg-gray-50 rounded-2xl">
                                <div
                                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black italic text-2xl shadow-xl animate-pulse"
                                    style={{ backgroundColor: editing.color }}
                                >
                                    {editing.name || '?'}
                                </div>
                            </div>
                        </div>

                        <div className="px-8 pb-8 flex gap-3">
                            <button onClick={closeModal} className="flex-1 h-14 bg-gray-50 rounded-2xl font-black uppercase italic text-[10px]">Cancelar</button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !editing.name.trim()}
                                className="flex-1 h-14 bg-brand-carbon text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase italic text-[10px] hover:bg-primary transition-all disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-primary" />}
                                {editing.id ? 'Guardar' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
