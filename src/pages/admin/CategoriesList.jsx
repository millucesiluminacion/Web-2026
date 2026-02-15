import { useState, useEffect } from 'react';
import { Plus, Search, Loader2, Trash2, X, Tag as TagIcon, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ImageUpload from '../../components/admin/ImageUpload';

export default function CategoriesList() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        image_url: '',
        order_index: 0
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('order_index', { ascending: true })
                .order('name', { ascending: true });

            if (error) {
                if (error.code === 'PGRST116' || error.message.includes('not found')) {
                    setCategories([]);
                } else {
                    throw error;
                }
            } else {
                setCategories(data || []);
            }
        } catch (error) {
            console.error('Error fetching categories:', error.message);
        } finally {
            setLoading(false);
        }
    }

    function openEdit(cat) {
        setEditingId(cat.id);
        setFormData({
            name: cat.name,
            slug: cat.slug || '',
            description: cat.description || '',
            image_url: cat.image_url || '',
            order_index: cat.order_index || 0
        });
        setIsModalOpen(true);
    }

    function openCreate() {
        setEditingId(null);
        setFormData({ name: '', slug: '', description: '', image_url: '', order_index: categories.length });
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setIsSaving(true);
            const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const payload = { ...formData, slug, order_index: parseInt(formData.order_index) };

            if (editingId) {
                const { error } = await supabase.from('categories').update(payload).eq('id', editingId);
                if (error) throw error;
                alert('Categoría actualizada');
            } else {
                const { error } = await supabase.from('categories').insert([payload]);
                if (error) throw error;
                alert('Categoría añadida');
            }

            setIsModalOpen(false);
            fetchCategories();
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteCategory(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta categoría?')) return;

        try {
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) throw error;
            setCategories(categories.filter(c => c.id !== id));
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    }

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black text-gray-800 uppercase italic">Categorías</h1>
                <button
                    onClick={openCreate}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors font-bold uppercase italic shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Nueva Categoría
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar categorías..."
                            className="pl-10 w-full border border-gray-200 rounded-lg py-2 px-4 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Cargando categorías...</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 uppercase text-[10px] font-black text-gray-500 border-b">
                            <tr>
                                <th className="p-4 whitespace-nowrap">Nombre / Slug</th>
                                <th className="p-4">Descripción</th>
                                <th className="p-4 text-center">Orden</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCategories.length > 0 ? filteredCategories.map(cat => (
                                <tr key={cat.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-50 rounded-lg text-blue-600 flex items-center justify-center overflow-hidden">
                                                {cat.image_url ? (
                                                    <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <TagIcon className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 uppercase text-xs">{cat.name}</p>
                                                <p className="text-[10px] text-gray-400 font-mono tracking-tighter">{cat.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs text-gray-500 line-clamp-1 max-w-xs">{cat.description || 'Sin descripción'}</td>
                                    <td className="p-4 text-center font-bold text-gray-400">#{cat.order_index}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(cat)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => deleteCategory(cat.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="3" className="p-20 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400 italic">
                                            <p className="mb-4">{categories.length === 0 ? 'No hay categorías creadas.' : 'No se encontraron resultados.'}</p>
                                            {categories.length === 0 && (
                                                <button
                                                    onClick={async () => {
                                                        const { seedDatabase } = await import('../../lib/seeder');
                                                        if (confirm('¿Quieres importar las categorías predeterminadas?')) {
                                                            await seedDatabase();
                                                            window.location.reload();
                                                        }
                                                    }}
                                                    className="text-xs font-black text-blue-600 border border-blue-100 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors uppercase italic"
                                                >
                                                    Importar categorías iniciales
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="font-black uppercase italic text-gray-800 tracking-wider">
                                {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <ImageUpload
                                defaultValue={formData.image_url}
                                onUpload={(url) => setFormData({ ...formData, image_url: url })}
                            />
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nombre</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:outline-none font-bold text-sm"
                                    placeholder="Ej: Iluminación Exterior"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Slug (Opcional)</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none font-mono"
                                    placeholder="iluminacion-exterior"
                                    value={formData.slug}
                                    onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Orden de Visualización</label>
                                <input
                                    type="number"
                                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none font-bold"
                                    value={formData.order_index}
                                    onChange={e => setFormData({ ...formData, order_index: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Descripción</label>
                                <textarea
                                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none min-h-[100px] resize-none"
                                    placeholder="Breve descripción de la categoría..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>
                            <button
                                disabled={isSaving}
                                type="submit"
                                className="w-full bg-blue-600 text-white font-black py-4 rounded-lg hover:bg-blue-700 transition-colors uppercase italic tracking-widest flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'Guardar Cambios' : 'Crear Categoría'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
