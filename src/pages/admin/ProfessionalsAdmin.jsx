import { useState, useEffect } from 'react';
import {
    Save, Loader2, Plus, Pencil, Trash2, X, Image, Type, AlignLeft,
    Hash, CheckCircle, AlertTriangle, Layout, Star, Image as ImageIcon, Upload
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const EMPTY_BENEFIT = { title: '', description: '', icon_name: 'Percent', image_url: '', order_index: 0 };

export default function ProfessionalsAdmin() {
    const [benefits, setBenefits] = useState([]);
    const [content, setContent] = useState({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingContent, setIsSavingContent] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDeleting, setIsDeleting] = useState(null);
    const [toast, setToast] = useState(null);

    // Modal state for benefits
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            setLoading(true);
            const [benefitsRes, contentRes] = await Promise.all([
                supabase.from('pro_benefits').select('*').order('order_index', { ascending: true }),
                supabase.from('pro_content').select('*')
            ]);

            if (benefitsRes.error) {
                console.error("Error fetching benefits:", benefitsRes.error);
                // Assume table might not exist yet
                showToast('error', 'La tabla pro_benefits no parece existir. Por favor ejecute la migración SQL.');
            } else {
                setBenefits(benefitsRes.data || []);
            }

            if (contentRes.error) {
                console.error("Error fetching content:", contentRes.error);
            } else {
                const contentMap = {};
                contentRes.data?.forEach(item => {
                    contentMap[item.key] = item.value;
                });
                setContent(contentMap);
            }
        } catch (err) {
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    }

    const openCreate = () => { setEditing({ ...EMPTY_BENEFIT }); setSelectedFile(null); setModalOpen(true); };
    const openEdit = (benefit) => { setEditing({ ...benefit }); setSelectedFile(null); setModalOpen(true); };
    const closeModal = () => { setModalOpen(false); setEditing(null); setSelectedFile(null); };

    async function uploadImage(file) {
        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `pro/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('categories') // Reusing categories bucket for simplicity or create 'pro'
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('categories')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        } finally {
            setUploading(false);
        }
    }

    async function handleSaveBenefit() {
        if (!editing.title.trim()) return;
        try {
            setIsSaving(true);
            let imageUrl = editing.image_url;

            if (selectedFile) {
                imageUrl = await uploadImage(selectedFile);
            }

            const isNew = !editing.id;
            const payload = {
                title: editing.title,
                description: editing.description,
                icon_name: editing.icon_name,
                image_url: imageUrl,
                order_index: Number(editing.order_index),
            };
            if (!isNew) payload.id = editing.id;

            const { error } = await supabase.from('pro_benefits').upsert(payload);
            if (error) throw error;

            await fetchData();
            showToast('success', isNew ? 'Beneficio creado.' : 'Cambios guardados.');
            closeModal();
        } catch (err) {
            showToast('error', err.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSaveContent() {
        try {
            setIsSavingContent(true);
            const updates = Object.entries(content).map(([key, value]) => ({
                key,
                value,
                section: key.includes('cta') ? 'cta' : 'hero'
            }));

            const { error } = await supabase.from('pro_content').upsert(updates, { onConflict: 'key' });
            if (error) throw error;

            showToast('success', 'Contenido general actualizado.');
        } catch (err) {
            showToast('error', err.message);
        } finally {
            setIsSavingContent(false);
        }
    }

    async function handleDeleteBenefit(id) {
        if (!confirm('¿Eliminar este beneficio?')) return;
        try {
            setIsDeleting(id);
            const { error } = await supabase.from('pro_benefits').delete().eq('id', id);
            if (error) throw error;
            setBenefits(prev => prev.filter(b => b.id !== id));
            showToast('success', 'Beneficio eliminado.');
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
        <div className="font-outfit pb-20">
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
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Área Profesional</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em] mt-3">Gestión de Landing B2B</p>
                </div>
            </div>

            {/* General Content Section */}
            <section className="bg-white rounded-[2.5rem] border border-gray-100 p-10 mb-12 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <Layout className="w-5 h-5 text-primary" />
                    <h2 className="text-sm font-black text-brand-carbon uppercase italic tracking-widest">Contenido Hero & CTA</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtítulo Hero</label>
                            <input
                                type="text"
                                value={content.subtitle || ''}
                                onChange={e => setContent({ ...content, subtitle: e.target.value })}
                                className="w-full h-12 bg-gray-50 border-none rounded-2xl px-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                placeholder="Service for Architects & Contractors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Título Principal</label>
                            <textarea
                                value={content.title || ''}
                                onChange={e => setContent({ ...content, title: e.target.value })}
                                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"
                                rows={2}
                                placeholder="La Alianza Perfecta para Tus Proyectos"
                            />
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción Hero</label>
                            <textarea
                                value={content.description || ''}
                                onChange={e => setContent({ ...content, description: e.target.value })}
                                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-xs focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none leading-relaxed"
                                rows={3}
                                placeholder="Impulsamos tu negocio con tecnología..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Título Sección CTA (Footer Landing)</label>
                            <input
                                type="text"
                                value={content.cta_title || ''}
                                onChange={e => setContent({ ...content, cta_title: e.target.value })}
                                className="w-full h-12 bg-gray-50 border-none rounded-2xl px-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                placeholder="Únete al ProClub de Mil Luces"
                            />
                        </div>
                        <button
                            onClick={handleSaveContent}
                            disabled={isSavingContent}
                            className="w-full h-14 bg-brand-carbon text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase italic text-[10px] tracking-widest hover:bg-primary transition-all shadow-xl shadow-brand-carbon/10 disabled:opacity-50"
                        >
                            {isSavingContent ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Save className="w-4 h-4 text-primary" />}
                            Guardar Contenidos
                        </button>
                    </div>
                </div>
            </section>

            {/* Benefits Grid */}
            <div className="mb-8 flex justify-between items-center px-2">
                <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-primary" />
                    <h2 className="text-sm font-black text-brand-carbon uppercase italic tracking-widest">Grid de Beneficios</h2>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-brand-carbon text-white h-12 px-6 rounded-xl flex items-center gap-2 hover:bg-primary transition-all font-black uppercase italic text-[9px] shadow-lg shadow-brand-carbon/10"
                >
                    <Plus className="w-3 h-3 text-primary" /> Añadir Beneficio
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {benefits.map((benefit) => (
                    <div
                        key={benefit.id}
                        className="group relative bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 p-8"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-primary font-bold text-lg overflow-hidden">
                                {benefit.image_url ? (
                                    <img src={benefit.image_url} alt={benefit.title} className="w-full h-full object-cover" />
                                ) : (
                                    <span>{benefit.icon_name || '✦'}</span>
                                )}
                            </div>
                            <div className="text-[10px] font-black text-gray-300 italic">#{benefit.order_index}</div>
                        </div>

                        <h3 className="text-sm font-black text-brand-carbon uppercase italic leading-tight mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                            {benefit.title}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide leading-relaxed line-clamp-3 mb-6">
                            {benefit.description}
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={() => openEdit(benefit)}
                                className="flex-1 h-10 bg-gray-50 hover:bg-brand-carbon hover:text-primary text-gray-400 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase italic tracking-widest transition-all"
                            >
                                <Pencil className="w-3 h-3" /> Editar
                            </button>
                            <button
                                onClick={() => handleDeleteBenefit(benefit.id)}
                                className="w-10 h-10 bg-gray-50 hover:bg-red-50 hover:text-red-500 text-gray-300 rounded-xl flex items-center justify-center transition-all"
                            >
                                {isDeleting === benefit.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal for Benefits */}
            {modalOpen && editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-carbon/60 backdrop-blur-md animate-in fade-in duration-300"
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg animate-in slide-in-from-bottom-8 duration-500 overflow-hidden">
                        <div className="p-8 pb-0 flex justify-between">
                            <div>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-1">Grid de Beneficios</p>
                                <h2 className="text-xl font-black text-brand-carbon uppercase italic tracking-tighter leading-none">
                                    {editing.id ? 'Editar Beneficio' : 'Nuevo Beneficio'}
                                </h2>
                            </div>
                            <button onClick={closeModal} className="text-gray-300 hover:text-brand-carbon hover:rotate-90 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Título</label>
                                <input
                                    type="text"
                                    value={editing.title}
                                    onChange={e => setEditing({ ...editing, title: e.target.value })}
                                    className="w-full h-12 bg-gray-50 border-none rounded-xl px-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción</label>
                                <textarea
                                    value={editing.description}
                                    onChange={e => setEditing({ ...editing, description: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-xl px-5 py-3 text-xs focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Iconografía Boutique</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div
                                        className={`relative h-24 bg-gray-50 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-gray-100 ${selectedFile || editing.image_url ? 'border-primary/50 bg-primary/5' : 'border-gray-100'}`}
                                        onClick={() => document.getElementById('pro-icon-upload').click()}
                                    >
                                        {selectedFile || editing.image_url ? (
                                            <>
                                                <img
                                                    src={selectedFile ? URL.createObjectURL(selectedFile) : editing.image_url}
                                                    className="w-full h-full object-contain p-2 rounded-2xl"
                                                    alt="Preview"
                                                />
                                                <div className="absolute inset-0 bg-brand-carbon/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                                                    <Upload className="w-6 h-6 text-white" />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <ImageIcon className="w-6 h-6 text-gray-300 mb-1" />
                                                <span className="text-[8px] font-black text-gray-400 uppercase">Subir Imagen</span>
                                            </>
                                        )}
                                        <input
                                            id="pro-icon-upload"
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => setSelectedFile(e.target.files[0])}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Icono Lucide (Backup)</label>
                                        <input
                                            type="text"
                                            value={editing.icon_name}
                                            onChange={e => setEditing({ ...editing, icon_name: e.target.value })}
                                            className="w-full h-12 bg-gray-50 border-none rounded-xl px-5 text-xs font-mono outline-none"
                                            placeholder="Percent, Zap, etc"
                                        />
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Orden</label>
                                            <input
                                                type="number"
                                                value={editing.order_index}
                                                onChange={e => setEditing({ ...editing, order_index: e.target.value })}
                                                className="w-16 h-8 bg-gray-50 border-none rounded-lg px-2 text-[10px] font-black text-brand-carbon outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 pb-8 flex gap-3">
                            <button onClick={closeModal} className="flex-1 h-12 bg-gray-50 text-gray-400 rounded-xl font-black uppercase italic text-[9px] tracking-widest">Cancelar</button>
                            <button
                                onClick={handleSaveBenefit}
                                disabled={isSaving || !editing.title}
                                className="flex-1 h-12 bg-brand-carbon text-white rounded-xl flex items-center justify-center gap-2 font-black uppercase italic text-[9px] tracking-widest hover:bg-primary transition-all disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin text-primary" /> : <Save className="w-3 h-3 text-primary" />}
                                Guardar Beneficio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
