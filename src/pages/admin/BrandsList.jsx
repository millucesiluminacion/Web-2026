import { useState, useEffect } from 'react';
import { Plus, Search, Loader2, Trash2, X, Award, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ImageUpload from '../../components/admin/ImageUpload';

export default function BrandsList() {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        image_url: '',
        description: '',
        order_index: 0
    });

    useEffect(() => {
        fetchBrands();
    }, []);

    async function fetchBrands() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('brands')
                .select('*')
                .order('order_index', { ascending: true })
                .order('name', { ascending: true });

            if (error) {
                if (error.code === 'PGRST116' || error.message.includes('not found')) {
                    setBrands([]);
                } else {
                    throw error;
                }
            } else {
                setBrands(data || []);
            }
        } catch (error) {
            console.error('Error fetching brands:', error.message);
        } finally {
            setLoading(false);
        }
    }

    function openEdit(brand) {
        setEditingId(brand.id);
        setFormData({
            name: brand.name,
            image_url: brand.image_url || '',
            description: brand.description || '',
            order_index: brand.order_index || 0
        });
        setIsModalOpen(true);
    }

    function openCreate() {
        setEditingId(null);
        setFormData({ name: '', image_url: '', description: '', order_index: brands.length });
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setIsSaving(true);

            const payload = { ...formData, order_index: parseInt(formData.order_index) };

            if (editingId) {
                const { error } = await supabase.from('brands').update(payload).eq('id', editingId);
                if (error) throw error;
                alert('Marca actualizada');
            } else {
                const { error } = await supabase.from('brands').insert([payload]);
                if (error) throw error;
                alert('Marca añadida');
            }

            setIsModalOpen(false);
            fetchBrands();
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteBrand(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta marca?')) return;

        try {
            const { error } = await supabase.from('brands').delete().eq('id', id);
            if (error) throw error;
            setBrands(brands.filter(b => b.id !== id));
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    }

    const filteredBrands = brands.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black text-gray-800 uppercase italic">Marcas</h1>
                <button
                    onClick={openCreate}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors font-bold uppercase italic shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Nueva Marca
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar marcas..."
                            className="pl-10 w-full border border-gray-200 rounded-lg py-2 px-4 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Cargando marcas...</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 uppercase text-[10px] font-black text-gray-500 border-b">
                            <tr>
                                <th className="p-4 whitespace-nowrap">Marca</th>
                                <th className="p-4 font-black">Descripción</th>
                                <th className="p-4 text-center">Orden</th>
                                <th className="p-4 text-right font-black">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredBrands.length > 0 ? filteredBrands.map(brand => (
                                <tr key={brand.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-lg border border-gray-100 flex items-center justify-center p-2 overflow-hidden shadow-sm">
                                                {brand.image_url ? (
                                                    <img src={brand.image_url} alt={brand.name} className="max-w-full max-h-full object-contain" />
                                                ) : (
                                                    <Award className="w-5 h-5 text-gray-200" />
                                                )}
                                            </div>
                                            <p className="font-bold text-gray-900 uppercase text-xs">{brand.name}</p>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs text-gray-500 line-clamp-1 max-w-xs">{brand.description || 'Sin descripción'}</td>
                                    <td className="p-4 text-center font-bold text-gray-400">#{brand.order_index}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(brand)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => deleteBrand(brand.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="3" className="p-20 text-center text-gray-400 italic">
                                        {brands.length === 0 ? 'No hay marcas. Registra una nueva para empezar.' : 'No se encontraron resultados.'}
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
                                {editingId ? 'Editar Marca' : 'Nueva Marca'}
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
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nombre de la Marca</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:outline-none font-bold text-sm"
                                    placeholder="Ej: Philips, Samsung..."
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
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
                                    placeholder="Breve historia o descripción de la marca..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>
                            <button
                                disabled={isSaving}
                                type="submit"
                                className="w-full bg-blue-600 text-white font-black py-4 rounded-lg hover:bg-blue-700 transition-colors uppercase italic tracking-widest flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'Guardar Cambios' : 'Registrar Marca'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
