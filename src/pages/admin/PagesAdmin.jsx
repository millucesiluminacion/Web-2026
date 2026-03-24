import { useState, useEffect } from 'react';
import {
    FileText, Plus, Search, Edit2, Trash2, Save, X, Loader2,
    Settings, Globe, AlertCircle, CheckCircle2, ChevronRight,
    Eye, MoreVertical, Layout, Type, Link as LinkIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function PagesAdmin() {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPage, setEditingPage] = useState(null);
    const [toast, setToast] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        content: { body: '', sections: [] },
        meta_title: '',
        meta_description: '',
        is_active: true
    });

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('cms_pages')
                .select('*')
                .order('title');
            if (error) throw error;
            setPages(data || []);
        } catch (err) {
            showToast('Error al cargar páginas: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (page = null) => {
        if (page) {
            setEditingPage(page);
            setFormData({
                title: page.title,
                slug: page.slug,
                content: page.content || { body: '', sections: [] },
                meta_title: page.meta_title || '',
                meta_description: page.meta_description || '',
                is_active: page.is_active
            });
        } else {
            setEditingPage(null);
            setFormData({
                title: '',
                slug: '',
                content: { body: '', sections: [] },
                meta_title: '',
                meta_description: '',
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const payload = {
                ...formData,
                updated_at: new Date().toISOString()
            };

            if (editingPage) {
                const { error } = await supabase
                    .from('cms_pages')
                    .update(payload)
                    .eq('id', editingPage.id);
                if (error) throw error;
                showToast('Página actualizada correctamente');
            } else {
                const { error } = await supabase
                    .from('cms_pages')
                    .insert([payload]);
                if (error) throw error;
                showToast('Página creada correctamente');
            }
            fetchPages();
            setIsModalOpen(false);
        } catch (err) {
            showToast('Error al guardar: ' + err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Seguro que quieres eliminar esta página?')) return;
        try {
            const { error } = await supabase.from('cms_pages').delete().eq('id', id);
            if (error) throw error;
            showToast('Página eliminada');
            fetchPages();
        } catch (err) {
            showToast('Error al eliminar: ' + err.message, 'error');
        }
    };

    const filteredPages = pages.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const suggestSlug = () => {
        const slug = formData.title.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        setFormData({ ...formData, slug });
    };

    return (
        <div className="space-y-8 font-outfit">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-luxury text-[11px] font-black uppercase tracking-widest animate-in slide-in-from-right-4 duration-300 ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-brand-carbon text-white'}`}>
                    {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-200" /> : <CheckCircle2 className="w-4 h-4 text-primary" />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-brand-carbon text-primary rounded-xl flex items-center justify-center shadow-xl shadow-brand-carbon/10">
                            <FileText className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Páginas CMS</h1>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em]">Gestión de contenido legal e informativo</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar páginas..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold uppercase focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="h-12 px-8 bg-brand-carbon text-white rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-primary transition-all flex items-center gap-3 shadow-xl shadow-brand-carbon/10 group"
                    >
                        <Plus className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform" />
                        Nueva Página
                    </button>
                </div>
            </header>

            {/* Pages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-64 bg-gray-100 rounded-[2.5rem] animate-pulse"></div>
                    ))
                ) : filteredPages.map(page => (
                    <div key={page.id} className="group bg-white rounded-[2.5rem] border border-gray-100 p-8 hover:shadow-2xl hover:shadow-gray-100/50 transition-all duration-500 relative flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-colors ${page.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                {page.is_active ? 'Publicada' : 'Borrador'}
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenModal(page)} className="p-2 text-gray-400 hover:text-brand-carbon hover:bg-gray-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(page.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="flex-1">
                            <h3 className="text-xl font-black text-brand-carbon uppercase italic leading-tight mb-2 truncate group-hover:text-primary transition-colors">{page.title}</h3>
                            <div className="flex items-center gap-2 mb-6">
                                <Globe className="w-3 h-3 text-gray-300" />
                                <span className="text-[10px] font-mono font-bold text-gray-400">/{page.slug}</span>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-xs opacity-50">✍️</div>
                                <div className="w-8 h-8 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-xs opacity-50">🔍</div>
                            </div>
                            <button onClick={() => handleOpenModal(page)} className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-2 group/btn">
                                Gestionar <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {!loading && filteredPages.length === 0 && (
                <div className="bg-white rounded-[3rem] border-2 border-dashed border-gray-100 py-32 text-center">
                    <FileText className="w-16 h-16 mx-auto text-gray-100 mb-6" />
                    <p className="text-sm font-black text-brand-carbon uppercase italic leading-none mb-4">No se encontraron activos</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Inicia una nueva secuencia maestra para publicar contenido</p>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-carbon/60 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col border border-white/20">
                        <header className="p-8 md:p-10 border-b border-gray-50 flex items-center justify-between shrink-0">
                            <div>
                                <span className="text-[9px] font-black text-primary uppercase tracking-[.3em] mb-2 block opacity-60">Editor Maestro de Contenido</span>
                                <h2 className="text-2xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">
                                    {editingPage ? 'Actualizar' : 'Configurar'} <span className="text-primary">Evolución</span>
                                </h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 bg-gray-50 text-gray-400 hover:text-brand-carbon rounded-full transition-all"><X className="w-5 h-5" /></button>
                        </header>

                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 md:p-10 space-y-10 custom-scrollbar pb-32">
                            {/* General Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Type className="w-3 h-3" /> Título de la Página
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                        placeholder="Ej: Política de Privacidad"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2 justify-between">
                                        <div className="flex items-center gap-2"><LinkIcon className="w-3 h-3" /> Slug / URL</div>
                                        <button type="button" onClick={suggestSlug} className="text-[8px] text-primary hover:underline">Sugerir</button>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 font-mono font-bold text-xs">/</span>
                                        <input
                                            type="text"
                                            required
                                            value={formData.slug}
                                            onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                            className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-6 text-sm font-mono font-bold text-gray-600 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                            placeholder="politica-privacidad"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Content Body */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Layout className="w-3 h-3" /> Contenido Maestro (HTML/Markdown)
                                </label>
                                <textarea
                                    required
                                    rows="12"
                                    value={formData.content.body}
                                    onChange={e => setFormData({
                                        ...formData,
                                        content: { ...formData.content, body: e.target.value }
                                    })}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-[2rem] p-8 text-sm font-medium text-gray-600 focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none leading-relaxed"
                                    placeholder="Escribe el contenido de la página aquí. Soporta etiquetas HTML básicas como <p>, <h3>, <ul>..."
                                />
                            </div>

                            {/* SEO Panel */}
                            <div className="p-8 bg-brand-carbon/[0.02] rounded-[2.5rem] border border-gray-100 space-y-8">
                                <div className="flex items-center gap-3 text-brand-carbon">
                                    <Globe className="w-5 h-5 text-primary" />
                                    <h3 className="text-xs font-black uppercase tracking-[.2em] italic">Atributos Visibilidad SEO</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Meta Título</label>
                                            <input
                                                type="text"
                                                value={formData.meta_title}
                                                onChange={e => setFormData({ ...formData, meta_title: e.target.value })}
                                                className={`w-full h-12 bg-white border border-gray-100 rounded-xl px-4 text-xs font-bold focus:ring-2 focus:ring-primary/10 transition-all outline-none ${formData.meta_title.length > 60 ? 'border-amber-300' : ''}`}
                                                placeholder="Recomendado: Máximo 60 caracteres"
                                            />
                                        </div>
                                        <p className="text-[8px] font-bold uppercase text-gray-300 tracking-widest pl-1">{formData.meta_title.length}/60</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Meta Descripción</label>
                                            <textarea
                                                rows="3"
                                                value={formData.meta_description}
                                                onChange={e => setFormData({ ...formData, meta_description: e.target.value })}
                                                className={`w-full bg-white border border-gray-100 rounded-xl p-4 text-[11px] font-medium text-gray-500 focus:ring-2 focus:ring-primary/10 transition-all outline-none resize-none ${formData.meta_description.length > 160 ? 'border-amber-300' : ''}`}
                                                placeholder="Resumen atractivo para buscadores..."
                                            />
                                        </div>
                                        <p className="text-[8px] font-bold uppercase text-gray-300 tracking-widest pl-1">{formData.meta_description.length}/160</p>
                                    </div>
                                </div>
                            </div>

                            {/* Visibility Toggle */}
                            <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-brand-carbon uppercase tracking-widest mb-1 italic">Estado de Exposición</p>
                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-none">Controlar si la página es accesible públicamente</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                    className={`relative w-14 h-7 rounded-full transition-all duration-500 ${formData.is_active ? 'bg-primary' : 'bg-gray-200'}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-500 ${formData.is_active ? 'left-8' : 'left-1'}`}></div>
                                </button>
                            </div>

                            {/* Sticky Save Button */}
                            <div className="fixed bottom-0 left-0 right-0 p-8 md:p-10 bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-center z-10 rounded-b-[3rem]">
                                <button
                                    disabled={isSaving}
                                    type="submit"
                                    className="w-full max-w-4xl bg-brand-carbon text-white h-16 rounded-[2.5rem] font-black uppercase italic tracking-widest hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-4 shadow-xl shadow-brand-carbon/30 border border-white/10 group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    {isSaving ? (
                                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    ) : (
                                        <Save className="w-5 h-5 text-primary group-hover:rotate-12 transition-transform" />
                                    )}
                                    <span className="text-lg">{isSaving ? 'Sincronizando...' : 'Publicar Evolución Digital'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
