import { useState, useEffect } from 'react';
import {
    Filter, Plus, Edit2, Trash2, Save, X, Loader2,
    Search, ArrowLeft, Layers, Sliders, ChevronDown, ChevronUp,
    Eye, EyeOff, GripVertical, Info
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function FiltersAdmin() {
    const [filters, setFilters] = useState([]);
    const [categories, setCategories] = useState([]);
    const [discoveredKeys, setDiscoveredKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFilter, setEditingFilter] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        attribute_key: '',
        label: '',
        category_ids: [],
        order_index: 0,
        is_active: true
    });

    useEffect(() => {
        fetchData();
        discoverAttributes();
    }, []);

    async function fetchData() {
        try {
            setLoading(true);
            const [filtersRes, catsRes] = await Promise.all([
                supabase
                    .from('dynamic_filters')
                    .select('*, categories:dynamic_filter_categories(category_id, categories(name))')
                    .order('order_index', { ascending: true }),
                supabase
                    .from('categories')
                    .select('id, name')
                    .order('name')
            ]);

            if (filtersRes.error) throw filtersRes.error;
            if (catsRes.error) throw catsRes.error;

            setFilters(filtersRes.data || []);
            setCategories(catsRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function discoverAttributes() {
        try {
            // Get a sample of products to find common attribute keys
            const { data } = await supabase
                .from('products')
                .select('attributes')
                .limit(100);

            if (data) {
                const keys = new Set();
                data.forEach(p => {
                    if (p.attributes) {
                        Object.keys(p.attributes).forEach(k => keys.add(k));
                    }
                });
                setDiscoveredKeys(Array.from(keys).sort());
            }
        } catch (error) {
            console.error('Error discovering attributes:', error);
        }
    }

    const handleOpenModal = (filter = null) => {
        if (filter) {
            setEditingFilter(filter);
            setFormData({
                attribute_key: filter.attribute_key,
                label: filter.label,
                category_ids: filter.categories?.map(c => c.category_id) || [],
                order_index: filter.order_index || 0,
                is_active: filter.is_active ?? true
            });
        } else {
            setEditingFilter(null);
            setFormData({
                attribute_key: discoveredKeys[0] || '',
                label: '',
                category_ids: [],
                order_index: filters.length,
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const { category_ids, ...filterPayload } = formData;

            let filterId;

            if (editingFilter) {
                const { data, error } = await supabase
                    .from('dynamic_filters')
                    .update(filterPayload)
                    .eq('id', editingFilter.id)
                    .select()
                    .single();
                if (error) throw error;
                filterId = editingFilter.id;
            } else {
                const { data, error } = await supabase
                    .from('dynamic_filters')
                    .insert([filterPayload])
                    .select()
                    .single();
                if (error) throw error;
                filterId = data.id;
            }

            // Sync categories (Many-to-Many)
            // 1. Delete previous
            await supabase.from('dynamic_filter_categories').delete().eq('filter_id', filterId);

            // 2. Insert new ones
            if (category_ids.length > 0) {
                const junctionData = category_ids.map(catId => ({
                    filter_id: filterId,
                    category_id: catId
                }));
                const { error: juncError } = await supabase.from('dynamic_filter_categories').insert(junctionData);
                if (juncError) throw juncError;
            }

            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleActive = async (filter) => {
        try {
            const { error } = await supabase
                .from('dynamic_filters')
                .update({ is_active: !filter.is_active })
                .eq('id', filter.id);
            if (error) throw error;
            setFilters(prev => prev.map(f => f.id === filter.id ? { ...f, is_active: !f.is_active } : f));
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este filtro? Dejará de aparecer en la tienda.')) return;
        try {
            const { error } = await supabase.from('dynamic_filters').delete().eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const moveOrder = async (filter, direction) => {
        const newOrder = direction === 'up' ? filter.order_index - 1 : filter.order_index + 1;
        try {
            const { error } = await supabase
                .from('dynamic_filters')
                .update({ order_index: Math.max(0, newOrder) })
                .eq('id', filter.id);
            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cargando Motores de Filtrado...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto font-outfit">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8">
                <div>
                    <span className="text-[9px] font-black text-primary uppercase tracking-[.3em] mb-2 block opacity-60">Configuración Avanzada</span>
                    <h1 className="text-3xl md:text-4xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Filtros <br /><span className="text-gray-300">Dinámicos</span></h1>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="h-12 px-8 bg-brand-carbon text-white rounded-2xl flex items-center gap-2 font-black uppercase italic text-[10px] tracking-widest hover:bg-primary transition-all shadow-lg active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Nuevo Filtro
                </button>
            </header>

            <div className="grid grid-cols-1 gap-4">
                {filters.length === 0 ? (
                    <div className="bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 p-20 text-center">
                        <Filter className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No hay filtros configurados</p>
                        <p className="text-[10px] text-gray-300 mt-2">Usa el sistema por defecto hasta que añadas el primero.</p>
                    </div>
                ) : (
                    <div className="overflow-hidden bg-white rounded-[2.5rem] shadow-sm border border-gray-100 mt-4">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-50">
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Orden</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Etiqueta / Filtro</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Atributo Técnico</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estado</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filters.map((filter) => (
                                    <tr key={filter.id} className={`group hover:bg-gray-50/50 transition-colors ${!filter.is_active ? 'opacity-50' : ''}`}>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col items-center gap-1">
                                                <button onClick={() => moveOrder(filter, 'up')} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-primary"><ChevronUp className="w-3 h-3" /></button>
                                                <span className="text-[10px] font-black italic text-brand-carbon">{filter.order_index}</span>
                                                <button onClick={() => moveOrder(filter, 'down')} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-primary"><ChevronDown className="w-3 h-3" /></button>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-sm font-black text-brand-carbon uppercase italic">{filter.label}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <code className="text-[10px] bg-gray-100 px-2 py-1 rounded-md text-primary font-bold">{filter.attribute_key}</code>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-wrap gap-1">
                                                {filter.categories && filter.categories.length > 0 ? (
                                                    filter.categories.map(c => (
                                                        <span key={c.category_id} className="px-2 py-0.5 bg-primary/5 text-primary rounded-full text-[8px] font-black uppercase tracking-widest">
                                                            {c.categories.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Global</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <button
                                                onClick={() => toggleActive(filter)}
                                                className={`p-2 rounded-xl transition-all ${filter.is_active ? 'text-primary bg-primary/5 hover:bg-primary/10' : 'text-gray-300 bg-gray-50'}`}
                                            >
                                                {filter.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                            </button>
                                        </td>
                                        <td className="px-8 py-6 text-right space-x-2">
                                            <button onClick={() => handleOpenModal(filter)} className="p-2 text-gray-400 hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(filter.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-carbon/60 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 font-outfit border border-white/20">
                        <div className="p-8 md:p-10">
                            <header className="mb-6">
                                <span className="text-[9px] font-black text-primary uppercase tracking-[.3em] mb-2 block opacity-60">Filtro Inteligente</span>
                                <h2 className="text-2xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">
                                    {editingFilter ? 'Configurar' : 'Nuevo'} <br />
                                    <span className="text-primary">Filtro Avanzado</span>
                                </h2>
                            </header>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Etiqueta Pública (Frontend)</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.label}
                                        onChange={e => setFormData({ ...formData, label: e.target.value })}
                                        className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                        placeholder="Ej: Potencia (W), Color de Luz..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Atributo Técnico (DB)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                list="discovered-keys"
                                                required
                                                value={formData.attribute_key}
                                                onChange={e => setFormData({ ...formData, attribute_key: e.target.value })}
                                                className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                                placeholder="Ej: Potencia"
                                            />
                                            <datalist id="discovered-keys">
                                                {discoveredKeys.map(k => <option key={k} value={k} />)}
                                            </datalist>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Orden (0-99)</label>
                                        <input
                                            type="number"
                                            value={formData.order_index}
                                            onChange={e => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                                            className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Categorías Asociadas (Multiselección)</label>
                                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        {categories.map(c => (
                                            <label key={c.id} className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.category_ids.includes(c.id)}
                                                    onChange={e => {
                                                        const newIds = e.target.checked
                                                            ? [...formData.category_ids, c.id]
                                                            : formData.category_ids.filter(id => id !== c.id);
                                                        setFormData({ ...formData, category_ids: newIds });
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary transition-all"
                                                />
                                                <span className="text-[10px] font-bold text-gray-600 group-hover:text-brand-carbon transition-colors">{c.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="flex items-start gap-2 mt-2 px-1">
                                        <Info className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider leading-relaxed">
                                            Selecciona una o varias categorías. Si no marcas ninguna, el filtro será **Global**.
                                        </p>
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
                                        {editingFilter ? 'Guardar' : 'Confirmar'}
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

