import { useState, useEffect } from 'react';
import {
    Save, Loader2, Plus, Pencil, Trash2, X, CheckCircle, AlertTriangle,
    Award, ShieldCheck, Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ImageUpload from '../../components/admin/ImageUpload';

const EMPTY_SEAL = { name: '', image_url: '', description: '' };

export default function QualitySealsAdmin() {
    const [seals, setSeals] = useState([]);
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

    useEffect(() => { fetchSeals(); }, []);

    async function fetchSeals() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('quality_seals')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setSeals(data || []);
        } catch (err) {
            console.error('fetchSeals error:', err.message);
            showToast('error', 'Error al cargar: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    const openCreate = () => { setEditing({ ...EMPTY_SEAL }); setModalOpen(true); };
    const openEdit = (seal) => { setEditing({ ...seal }); setModalOpen(true); };
    const closeModal = () => { setModalOpen(false); setEditing(null); };

    async function handleSave() {
        if (!editing.name.trim()) return;
        try {
            setIsSaving(true);
            const isNew = !editing.id;
            const payload = {
                name: editing.name,
                image_url: editing.image_url,
                description: editing.description,
            };
            if (!isNew) payload.id = editing.id;

            const { error } = await supabase.from('quality_seals').upsert(payload);
            if (error) throw error;

            await fetchSeals();
            showToast('success', isNew ? 'Sello creado correctamente.' : 'Cambios guardados.');
            closeModal();
        } catch (err) {
            showToast('error', err.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('¿Eliminar este sello de calidad?')) return;
        try {
            setIsDeleting(id);
            const { error } = await supabase.from('quality_seals').delete().eq('id', id);
            if (error) throw error;
            setSeals(prev => prev.filter(r => r.id !== id));
            showToast('success', 'Sello eliminado.');
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
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Sellos de Calidad</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em] mt-3">Certificaciones y Garantías Técnicas</p>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-brand-carbon text-white h-14 px-8 rounded-2xl flex items-center gap-3 hover:bg-primary transition-all font-black uppercase italic text-[10px] shadow-xl shadow-brand-carbon/10"
                >
                    <Plus className="w-4 h-4 text-primary" /> Nuevo Sello
                </button>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {seals.map((seal) => (
                    <div
                        key={seal.id}
                        className="group relative bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 overflow-hidden"
                    >
                        <div className="h-32 bg-gray-50 flex items-center justify-center p-6">
                            {seal.image_url ? (
                                <img src={seal.image_url} alt={seal.name} className="h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                            )}
                        </div>

                        <div className="p-6">
                            <h3 className="text-sm font-black text-brand-carbon uppercase italic tracking-tight leading-tight mb-1">
                                {seal.name}
                            </h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide line-clamp-1">
                                {seal.description || 'Sin descripción'}
                            </p>
                        </div>

                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => openEdit(seal)}
                                className="flex-1 h-10 bg-gray-50 hover:bg-brand-carbon hover:text-primary text-gray-500 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase italic tracking-widest transition-all"
                            >
                                <Pencil className="w-3.5 h-3.5" /> Editar
                            </button>
                            <button
                                onClick={() => handleDelete(seal.id)}
                                disabled={isDeleting === seal.id}
                                className="w-10 h-10 bg-gray-50 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50"
                            >
                                {isDeleting === seal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
                    <p className="text-[10px] font-black text-gray-300 group-hover:text-primary uppercase italic tracking-widest transition-colors">Añadir Sello</p>
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
                                    {editing.id ? 'Editar Sello' : 'Nuevo Sello'}
                                </p>
                                <h2 className="text-xl font-black text-brand-carbon uppercase italic tracking-tighter">
                                    {editing.id ? editing.name : 'Configurar Sello'}
                                </h2>
                            </div>
                            <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-8 space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre del Sello</label>
                                <input
                                    type="text"
                                    value={editing.name}
                                    onChange={(e) => setEditing(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ej: Marcado CE, RoHS, ISO 9001"
                                    className="w-full h-12 bg-gray-50 border-none rounded-2xl px-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all focus:outline-none"
                                />
                            </div>

                            <ImageUpload
                                onUpload={(url) => setEditing(prev => ({ ...prev, image_url: url }))}
                                defaultValue={editing.image_url}
                            />

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción / Info Corta</label>
                                <textarea
                                    value={editing.description || ''}
                                    onChange={(e) => setEditing(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Información relevante sobre la certificación..."
                                    rows="3"
                                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all focus:outline-none resize-none"
                                />
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
