import { useState, useEffect } from 'react';
import {
    Briefcase, Plus, Edit2, Trash2, Save, X, Loader2,
    Search, Image as ImageIcon, Upload, Grid
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ImageUpload from '../../components/admin/ImageUpload';

export default function ProfessionsAdmin() {
    const [professions, setProfessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        image_url: '',
        icon_name: 'Briefcase',
        order_index: 0
    });

    useEffect(() => {
        fetchProfessions();
    }, []);

    async function fetchProfessions() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('professions')
                .select('*')
                .order('order_index', { ascending: true });

            if (error) throw error;
            setProfessions(data || []);
        } catch (error) {
            console.error('Error fetching professions:', error);
        } finally {
            setLoading(false);
        }
    }

    const openCreate = () => {
        setEditingId(null);
        setFormData({
            name: '',
            slug: '',
            description: '',
            image_url: '',
            icon_name: 'Briefcase',
            order_index: professions.length
        });
        setIsModalOpen(true);
    };

    const openEdit = (prof) => {
        setEditingId(prof.id);
        setFormData({
            name: prof.name,
            slug: prof.slug,
            description: prof.description || '',
            image_url: prof.image_url || '',
            icon_name: prof.icon_name || 'Briefcase',
            order_index: prof.order_index || 0
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const slug = formData.slug || formData.name.toLowerCase().trim().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const payload = { ...formData, slug, order_index: parseInt(formData.order_index) };

            if (editingId) {
                const { error } = await supabase.from('professions').update(payload).eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('professions').insert([payload]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            fetchProfessions();
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este sector? Solo se eliminará el sector, no los productos.')) return;
        try {
            const { error } = await supabase.from('professions').delete().eq('id', id);
            if (error) throw error;
            fetchProfessions();
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    };

    const filtered = professions.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading) return (
        <div className="p-20 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Sectores...</p>
        </div>
    );

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto font-outfit">
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8">
                <div>
                    <span className="text-[9px] font-black text-primary uppercase tracking-[.3em] mb-2 block opacity-60">Fuerza de Ventas B2B</span>
                    <h1 className="text-3xl md:text-4xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Sectores <br /><span className="text-gray-300">Profesionales</span></h1>
                </div>
                <button
                    onClick={openCreate}
                    className="h-12 px-8 bg-brand-carbon text-white rounded-2xl flex items-center gap-2 font-black uppercase italic text-[10px] tracking-widest hover:bg-primary transition-all shadow-lg active:scale-95"
                >
                    <Plus className="w-4 h-4 text-primary" /> Nuevo Sector
                </button>
            </header>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar sector profesional..."
                            className="w-full h-11 pl-12 pr-4 bg-white border border-gray-100 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 uppercase text-[9px] font-black text-gray-400 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Sector / Slug</th>
                                <th className="px-6 py-4">Descripción</th>
                                <th className="px-6 py-4 text-center">Orden</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.length > 0 ? filtered.map(prof => (
                                <tr key={prof.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                                                {prof.image_url ? (
                                                    <img src={prof.image_url} alt={prof.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Briefcase className="w-5 h-5 text-primary" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-brand-carbon uppercase italic leading-none">{prof.name}</p>
                                                <p className="text-[9px] text-gray-400 font-mono tracking-tighter mt-1">/{prof.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-xs text-gray-500 line-clamp-1 max-w-xs">{prof.description || 'Sin descripción'}</p>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className="text-[10px] font-black text-gray-300 tracking-widest italic">#{prof.order_index}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => openEdit(prof)} className="p-2 text-gray-300 hover:text-primary transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(prof.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-20 text-center text-gray-400 italic text-xs">No se encontraron sectores.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-carbon/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                        <div className="p-8">
                            <header className="mb-6">
                                <span className="text-[9px] font-black text-primary uppercase tracking-[.3em] mb-2 block opacity-60">Configuración Sector B2B</span>
                                <h2 className="text-2xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">
                                    {editingId ? 'Editar' : 'Nuevo'} <br />
                                    <span className="text-primary">Sector Profesional</span>
                                </h2>
                            </header>

                            <form onSubmit={handleSave} className="space-y-6">
                                <ImageUpload
                                    defaultValue={formData.image_url}
                                    onUpload={(url) => setFormData({ ...formData, image_url: url })}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Sector</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                            placeholder="Ej: Reformas"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Orden</label>
                                        <input
                                            type="number"
                                            value={formData.order_index}
                                            onChange={e => setFormData({ ...formData, order_index: e.target.value })}
                                            className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción Corta</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full h-24 bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"
                                        placeholder="Ventajas y productos para este sector..."
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 h-14 bg-gray-50 text-brand-carbon rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-gray-100 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 h-14 bg-brand-carbon text-white rounded-2xl flex items-center justify-center gap-2 font-black uppercase italic text-[10px] tracking-widest hover:bg-primary transition-all shadow-xl disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Save className="w-4 h-4 text-primary" />}
                                        <span className="ml-2">{editingId ? 'Guardar Cambios' : 'Crear Sector'}</span>
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
