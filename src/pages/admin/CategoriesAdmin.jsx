import { useState, useEffect } from 'react';
import {
    Tag, Plus, Edit2, Trash2, ChevronRight, ChevronDown,
    BoxSelect, Square, Grid, Zap, Lightbulb, Save, X, Loader2,
    Settings, Search, ArrowLeft, Image as ImageIcon, Upload
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const ICON_OPTIONS = [
    { name: 'Tag', icon: Tag },
    { name: 'BoxSelect', icon: BoxSelect },
    { name: 'Square', icon: Square },
    { name: 'Grid', icon: Grid },
    { name: 'Zap', icon: Zap },
    { name: 'Lightbulb', icon: Lightbulb },
    { name: 'Settings', icon: Settings },
];

export default function CategoriesAdmin() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        parent_id: '',
        icon_name: 'Tag',
        image_url: '',
        order_index: 0
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const [modalType, setModalType] = useState('main'); // 'main' or 'sub'

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('order_index', { ascending: true });

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleOpenModal = (category = null, type = 'main') => {
        setModalType(type);
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                slug: category.slug,
                description: category.description || '',
                parent_id: category.parent_id || '',
                icon_name: category.icon_name || 'Tag',
                image_url: category.image_url || '',
                order_index: category.order_index || 0
            });
            setSelectedFile(null);
            // Auto-detect type based on parent_id presence
            setModalType(category.parent_id ? 'sub' : 'main');
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                slug: '',
                description: '',
                parent_id: type === 'sub' ? (mainCategories[0]?.id || '') : '',
                icon_name: 'Tag',
                image_url: '',
                order_index: categories.length
            });
            setSelectedFile(null);
        }
        setIsModalOpen(true);
    };

    const uploadImage = async (file) => {
        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('categories')
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
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Validation: Subcategories MUST have a parent
        if (modalType === 'sub' && !formData.parent_id) {
            alert('Una subcategoría debe tener obligatoriamente una categoría padre.');
            return;
        }

        try {
            setIsSaving(true);
            let imageUrl = formData.image_url;

            if (selectedFile) {
                imageUrl = await uploadImage(selectedFile);
            }

            const payload = {
                ...formData,
                image_url: imageUrl
            };
            if (payload.parent_id === '') payload.parent_id = null;

            if (editingCategory) {
                const { error } = await supabase
                    .from('categories')
                    .update(payload)
                    .eq('id', editingCategory.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('categories')
                    .insert([payload]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            fetchCategories();
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta categoría? Esto podría afectar a los productos asociados.')) return;
        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchCategories();
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    };

    const mainCategories = categories.filter(c => !c.parent_id);
    const getSubcategories = (parentId) => categories.filter(c => c.parent_id === parentId);

    const getIcon = (category) => {
        if (category.image_url) {
            return (
                <img
                    src={category.image_url}
                    alt={category.name}
                    className="w-full h-full object-cover rounded-xl"
                />
            );
        }
        const option = ICON_OPTIONS.find(o => o.name === category.icon_name);
        const Icon = option ? option.icon : Tag;
        return <Icon className="w-4 h-4" />;
    };

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sincronizando Catálogo...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto font-outfit">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8">
                <div>
                    <span className="text-[9px] font-black text-primary uppercase tracking-[.3em] mb-2 block opacity-60">Arquitectura de Catálogo</span>
                    <h1 className="text-3xl md:text-4xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Categorías <br /><span className="text-gray-300">& Niveles</span></h1>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleOpenModal(null, 'main')}
                        className="h-12 px-8 bg-brand-carbon text-white rounded-2xl flex items-center gap-2 font-black uppercase italic text-[10px] tracking-widest hover:bg-primary transition-all shadow-lg active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Nueva Principal
                    </button>
                </div>
            </header>

            {/* Section 1: Main Categories Maestras */}
            <section className="mb-12">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary">
                        <Tag className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-brand-carbon uppercase italic leading-none tracking-tight">Categorías Maestras</h2>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Estructura Global del Catálogo</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {mainCategories.map(category => (
                        <div key={category.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 group hover:border-primary/20 transition-all flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-1 right-1 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDelete(category.id)} className="p-1.5 text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                            <div>
                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:scale-105 transition-transform overflow-hidden">
                                    {getIcon(category)}
                                </div>
                                <h3 className="text-lg font-black text-brand-carbon uppercase italic leading-none mb-1">{category.name}</h3>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-4">/{category.slug}</p>

                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl w-fit">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{getSubcategories(category.id).length} Subs</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleOpenModal(category)}
                                className="w-full h-10 mt-6 bg-gray-50 rounded-xl text-brand-carbon flex items-center justify-center gap-2 font-black uppercase italic text-[9px] tracking-widest hover:bg-brand-carbon hover:text-white transition-all"
                            >
                                <Edit2 className="w-3.5 h-3.5" /> Configurar
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Section 2: Estructura Jerárquica Detallada */}
            <section className="bg-gray-50/50 rounded-3xl p-6 md:p-10 border border-gray-100">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-10 h-10 bg-brand-carbon rounded-xl flex items-center justify-center text-white">
                        <Grid className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-brand-carbon uppercase italic leading-none tracking-tight">Estructura de Subniveles</h2>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Gestión Detallada de Dependencias</p>
                    </div>
                </div>

                <div className="space-y-10">
                    {mainCategories.map(parent => (
                        <div key={parent.id} className="relative">
                            <div className="flex items-center gap-3 mb-6 group cursor-default">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm border border-gray-100 group-hover:border-primary/20 transition-all overflow-hidden">
                                    {getIcon(parent)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-brand-carbon uppercase italic leading-none">{parent.name}</h3>
                                    <span className="text-[8px] font-black text-primary uppercase tracking-[.2em] opacity-40">Categoría Raíz</span>
                                </div>
                                <div className="flex-1 h-[1px] bg-gradient-to-r from-gray-100 to-transparent"></div>
                                <button
                                    onClick={() => handleOpenModal(null, 'sub')}
                                    className="p-2 text-gray-300 hover:text-primary transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pl-0 md:pl-12 relative">
                                {/* Connection Line */}
                                <div className="absolute left-5 top-[-30px] bottom-12 w-[1px] bg-gradient-to-b from-primary/10 to-transparent rounded-full hidden md:block"></div>

                                {getSubcategories(parent.id).map(sub => (
                                    <div key={sub.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all group/sub relative flex flex-col justify-between h-36">
                                        <div className="absolute left-[-30px] top-1/2 w-8 h-[1px] bg-primary/10 hidden md:block"></div>
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-primary group-hover/sub:bg-primary group-hover/sub:text-white transition-all shadow-sm overflow-hidden">
                                                    {getIcon(sub)}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                                    <button onClick={() => handleOpenModal(sub)} className="p-1.5 text-gray-300 hover:text-primary"><Edit2 className="w-3 h-3" /></button>
                                                    <button onClick={() => handleDelete(sub.id)} className="p-1.5 text-gray-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                                </div>
                                            </div>
                                            <h4 className="text-sm font-black text-brand-carbon uppercase italic leading-none">{sub.name}</h4>
                                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-1.5">/{sub.slug}</p>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, parent_id: parent.id }));
                                        setModalType('sub');
                                        setIsModalOpen(true);
                                    }}
                                    className="flex flex-col items-center justify-center gap-3 p-4 border-2 border-dashed border-gray-100 rounded-2xl hover:border-primary/20 hover:bg-white transition-all group h-36"
                                >
                                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-white transition-all">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest leading-none group-hover:text-primary">Nuevo Subnivel</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Modal - Premium Floating */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-carbon/60 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 font-outfit border border-white/20">
                        <div className="p-8 md:p-10">
                            <header className="mb-6">
                                <span className="text-[9px] font-black text-primary uppercase tracking-[.3em] mb-2 block opacity-60">Configuración de Nivel</span>
                                <h2 className="text-2xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">
                                    {editingCategory ? 'Configurar' : 'Definir'} <br />
                                    <span className="text-primary">{modalType === 'main' ? 'Categoría' : 'Subcategoría'}</span>
                                </h2>
                            </header>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Etimología / Nombre</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                            placeholder="Ej: Downlights Pro"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Slug (Ruta Semántica)</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.slug}
                                            onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                            className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                            placeholder="downlights-pro"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                        {modalType === 'main' ? 'Asociación (Opcional)' : 'Vínculo Padre (OBLIGATORIO)'}
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={formData.parent_id}
                                            required={modalType === 'sub'}
                                            onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                                            className={`w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none ${modalType === 'sub' && !formData.parent_id ? 'ring-2 ring-red-100' : ''}`}
                                        >
                                            <option value="">-- Nodo Raíz (Principal) --</option>
                                            {mainCategories.filter(c => c.id !== editingCategory?.id).map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                                    </div>
                                    {modalType === 'sub' && !formData.parent_id && (
                                        <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mt-1.5 italic px-1">⚠️ Requiere categoría superior.</p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Iconografía Boutique</label>

                                    {/* Image Upload Input */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div
                                                className={`relative w-full h-24 bg-gray-50 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-gray-100 ${selectedFile || formData.image_url ? 'border-primary/50 bg-primary/5' : 'border-gray-100'}`}
                                                onClick={() => document.getElementById('icon-upload').click()}
                                            >
                                                {selectedFile || formData.image_url ? (
                                                    <>
                                                        <img
                                                            src={selectedFile ? URL.createObjectURL(selectedFile) : formData.image_url}
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
                                                    id="icon-upload"
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => setSelectedFile(e.target.files[0])}
                                                />
                                            </div>
                                            {(selectedFile || formData.image_url) && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedFile(null);
                                                        setFormData({ ...formData, image_url: '' });
                                                    }}
                                                    className="text-[8px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors"
                                                >
                                                    Eliminar Imagen
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2 auto-rows-min">
                                            {ICON_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.name}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, icon_name: opt.name, image_url: '' });
                                                        setSelectedFile(null);
                                                    }}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${formData.icon_name === opt.name && !formData.image_url && !selectedFile ? 'bg-primary text-white shadow-md' : 'bg-gray-50 text-gray-300 hover:bg-white hover:border-primary/20 border border-transparent'}`}
                                                >
                                                    <opt.icon className="w-4 h-4" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="h-12 bg-gray-50 text-brand-carbon rounded-xl font-black uppercase italic text-[10px] tracking-widest hover:bg-gray-100 transition-all"
                                    >
                                        Descartar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="h-12 bg-brand-carbon text-white rounded-xl flex items-center justify-center gap-2 font-black uppercase italic text-[10px] tracking-widest hover:bg-primary transition-all shadow-lg shadow-brand-carbon/20 disabled:opacity-50 active:scale-95"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {editingCategory ? 'Guardar' : 'Confirmar'}
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
