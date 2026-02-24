import { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Pencil, Trash2, X, Image, Type, AlignLeft, Hash, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const EMPTY_REASON = { title: '', description: '', image_url: '', order_index: 0 };

export default function WhyChooseUsAdmin() {
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null);
    const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null); // null = new, else reason obj

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => { fetchReasons(); }, []);

    async function fetchReasons() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('why_choose_us')
                .select('*')
                .order('order_index', { ascending: true });

            if (error) {
                if (error.code === 'PGRST116' || error.message.includes('not found')) {
                    setReasons([
                        { id: 1, title: 'Calidad Garantizada', description: 'Productos de alta durabilidad.', image_url: '', order_index: 0 },
                        { id: 2, title: 'Precio Competitivo', description: 'Los mejores precios del mercado.', image_url: '', order_index: 1 },
                        { id: 3, title: 'Soporte 24/7', description: 'Atención personalizada siempre.', image_url: '', order_index: 2 }
                    ]);
                } else throw error;
            } else {
                setReasons(data || []);
            }
        } catch (err) {
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    }

    const openCreate = () => { setEditing({ ...EMPTY_REASON }); setModalOpen(true); };
    const openEdit = (reason) => { setEditing({ ...reason }); setModalOpen(true); };
    const closeModal = () => { setModalOpen(false); setEditing(null); };

    async function handleSave() {
        if (!editing.title.trim()) return;
        try {
            setIsSaving(true);
            const isNew = !editing.id;
            const payload = {
                title: editing.title,
                description: editing.description,
                image_url: editing.image_url,
                order_index: Number(editing.order_index),
            };
            if (!isNew) payload.id = editing.id;

            const { data, error } = await supabase.from('why_choose_us').upsert(payload).select();
            if (error) throw error;

            await fetchReasons();
            showToast('success', isNew ? 'Valor creado correctamente.' : 'Cambios guardados.');
            closeModal();
        } catch (err) {
            showToast('error', err.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('¿Eliminar este valor de marca?')) return;
        try {
            setIsDeleting(id);
            const { error } = await supabase.from('why_choose_us').delete().eq('id', id);
            if (error) throw error;
            setReasons(prev => prev.filter(r => r.id !== id));
            showToast('success', 'Valor eliminado.');
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
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Por Qué Elegirnos</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em] mt-3">Valores de Marca Boutique</p>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-brand-carbon text-white h-14 px-8 rounded-2xl flex items-center gap-3 hover:bg-primary transition-all font-black uppercase italic text-[10px] shadow-xl shadow-brand-carbon/10"
                >
                    <Plus className="w-4 h-4 text-primary" /> Nuevo Valor
                </button>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {reasons.map((reason) => (
                    <div
                        key={reason.id}
                        className="group relative bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 overflow-hidden"
                    >
                        {/* Order badge */}
                        <div className="absolute top-5 left-5 w-8 h-8 bg-brand-carbon text-primary rounded-xl flex items-center justify-center font-black italic text-xs shadow-lg">
                            {reason.order_index}
                        </div>

                        {/* Image preview */}
                        <div className="h-36 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                            {reason.image_url ? (
                                <img src={reason.image_url} alt={reason.title} className="h-20 w-auto object-contain brightness-0 opacity-20 group-hover:opacity-60 group-hover:brightness-100 transition-all duration-500" />
                            ) : (
                                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl opacity-30">
                                    ✦
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <h3 className="text-sm font-black text-brand-carbon uppercase italic tracking-tight leading-tight mb-2 line-clamp-1">
                                {reason.title || <span className="text-gray-300">Sin título</span>}
                            </h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide leading-relaxed line-clamp-2">
                                {reason.description || '—'}
                            </p>
                        </div>

                        {/* Action row */}
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => openEdit(reason)}
                                className="flex-1 h-10 bg-gray-50 hover:bg-brand-carbon hover:text-primary text-gray-500 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase italic tracking-widest transition-all group/btn"
                            >
                                <Pencil className="w-3.5 h-3.5" /> Editar
                            </button>
                            <button
                                onClick={() => handleDelete(reason.id)}
                                disabled={isDeleting === reason.id}
                                className="w-10 h-10 bg-gray-50 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50"
                            >
                                {isDeleting === reason.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                ))}

                {/* Add new card shortcut */}
                <button
                    onClick={openCreate}
                    className="group border-2 border-dashed border-gray-200 hover:border-primary rounded-[2rem] min-h-[260px] flex flex-col items-center justify-center gap-4 transition-all hover:bg-primary/5"
                >
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 group-hover:bg-primary/10 flex items-center justify-center transition-all">
                        <Plus className="w-6 h-6 text-gray-300 group-hover:text-primary" />
                    </div>
                    <p className="text-[10px] font-black text-gray-300 group-hover:text-primary uppercase italic tracking-widest transition-colors">Añadir Valor</p>
                </button>
            </div>

            {/* ── EDIT / CREATE MODAL ── */}
            {modalOpen && editing && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-carbon/60 backdrop-blur-md animate-in fade-in duration-300"
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg animate-in slide-in-from-bottom-8 duration-500 overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-8 pb-0 flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-1">
                                    {editing.id ? 'Editar Valor' : 'Nuevo Valor'}
                                </p>
                                <h2 className="text-xl font-black text-brand-carbon uppercase italic tracking-tighter leading-none">
                                    {editing.id ? editing.title || 'Sin título' : 'Crear Tarjeta'}
                                </h2>
                            </div>
                            <button
                                onClick={closeModal}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:rotate-90 transition-all duration-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 space-y-5">
                            {/* Title */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <Type className="w-3 h-3" /> Título del Beneficio
                                </label>
                                <input
                                    type="text"
                                    value={editing.title}
                                    onChange={(e) => setEditing(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Calidad Garantizada"
                                    className="w-full h-12 bg-gray-50 border-none rounded-2xl px-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all focus:outline-none placeholder:text-gray-300"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <AlignLeft className="w-3 h-3" /> Descripción
                                </label>
                                <textarea
                                    value={editing.description}
                                    onChange={(e) => setEditing(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Breve descripción del beneficio..."
                                    rows={3}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-primary/10 transition-all focus:outline-none resize-none leading-relaxed placeholder:text-gray-300"
                                />
                            </div>

                            {/* Grid: Order + Image URL */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <Hash className="w-3 h-3" /> Orden
                                    </label>
                                    <input
                                        type="number"
                                        value={editing.order_index}
                                        onChange={(e) => setEditing(prev => ({ ...prev, order_index: e.target.value }))}
                                        className="w-full h-12 bg-gray-50 border-none rounded-2xl px-4 text-sm font-bold text-center focus:ring-4 focus:ring-primary/10 transition-all focus:outline-none"
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <Image className="w-3 h-3" /> URL Icono / Imagen
                                    </label>
                                    <input
                                        type="text"
                                        value={editing.image_url}
                                        onChange={(e) => setEditing(prev => ({ ...prev, image_url: e.target.value }))}
                                        placeholder="https://…/icon.svg"
                                        className="w-full h-12 bg-gray-50 border-none rounded-2xl px-5 text-xs font-mono focus:ring-4 focus:ring-primary/10 transition-all focus:outline-none placeholder:text-gray-300"
                                    />
                                </div>
                            </div>

                            {/* Image Preview */}
                            {editing.image_url && (
                                <div className="p-4 bg-gray-50 rounded-2xl flex justify-center border border-gray-100 animate-in fade-in">
                                    <img src={editing.image_url} alt="Preview" className="h-14 w-auto object-contain" />
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 pb-8 flex gap-3">
                            <button
                                onClick={closeModal}
                                className="flex-1 h-14 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl font-black uppercase italic text-[10px] tracking-widest transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !editing.title.trim()}
                                className="flex-1 h-14 bg-brand-carbon text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase italic text-[10px] tracking-widest hover:bg-primary transition-all shadow-xl shadow-brand-carbon/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-primary" />}
                                {editing.id ? 'Guardar Cambios' : 'Crear Valor'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
