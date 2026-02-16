import { useState, useEffect } from 'react';
import { Plus, Search, Loader2, Trash2, X, Sofa, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ImageUpload from '../../components/admin/ImageUpload';

export default function RoomsList() {
    const [rooms, setRooms] = useState([]);
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
        fetchRooms();
    }, []);

    async function fetchRooms() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .order('order_index', { ascending: true })
                .order('name', { ascending: true });

            if (error) {
                if (error.code === 'PGRST116' || error.message.includes('not found')) {
                    setRooms([]);
                } else {
                    throw error;
                }
            } else {
                setRooms(data || []);
            }
        } catch (error) {
            console.error('Error fetching rooms:', error.message);
        } finally {
            setLoading(false);
        }
    }

    function openEdit(room) {
        setEditingId(room.id);
        setFormData({
            name: room.name,
            slug: room.slug || '',
            description: room.description || '',
            image_url: room.image_url || '',
            order_index: room.order_index || 0
        });
        setIsModalOpen(true);
    }

    function openCreate() {
        setEditingId(null);
        setFormData({ name: '', slug: '', description: '', image_url: '', order_index: rooms.length });
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setIsSaving(true);
            const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const payload = { ...formData, slug, order_index: parseInt(formData.order_index) };

            if (editingId) {
                const { error } = await supabase.from('rooms').update(payload).eq('id', editingId);
                if (error) throw error;
                alert('Estancia actualizada');
            } else {
                const { error } = await supabase.from('rooms').insert([payload]);
                if (error) throw error;
                alert('Estancia añadida');
            }

            setIsModalOpen(false);
            fetchRooms();
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteRoom(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta estancia?')) return;

        try {
            const { error } = await supabase.from('rooms').delete().eq('id', id);
            if (error) throw error;
            setRooms(rooms.filter(r => r.id !== id));
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    }

    const filteredRooms = rooms.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-end mb-10 font-outfit">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Estancias</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em] mt-3">Iluminación por Ambientes</p>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-brand-carbon text-white h-14 px-8 rounded-2xl flex items-center gap-3 hover:bg-primary transition-all font-black uppercase italic text-[10px] shadow-xl shadow-brand-carbon/10 font-outfit"
                >
                    <Plus className="w-4 h-4 text-primary" /> Nueva Estancia
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar estancias..."
                            className="pl-10 w-full border border-gray-200 rounded-lg py-2 px-4 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Cargando estancias...</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 uppercase text-[10px] font-black text-gray-500 border-b">
                            <tr>
                                <th className="p-4 whitespace-nowrap">Estancia / Slug</th>
                                <th className="p-4">Descripción</th>
                                <th className="p-4 text-center">Orden</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRooms.length > 0 ? filteredRooms.map(room => (
                                <tr key={room.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-lg text-indigo-600 flex items-center justify-center overflow-hidden">
                                                {room.image_url ? (
                                                    <img src={room.image_url} alt={room.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Sofa className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 uppercase text-xs">{room.name}</p>
                                                <p className="text-[10px] text-gray-400 font-mono tracking-tighter">{room.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs text-gray-500 line-clamp-1 max-w-xs">{room.description || 'Sin descripción'}</td>
                                    <td className="p-4 text-center font-bold text-gray-400">#{room.order_index}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(room)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => deleteRoom(room.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="3" className="p-20 text-center text-gray-400 italic">
                                        No se encontraron resultados.
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
                                {editingId ? 'Editar Estancia' : 'Nueva Estancia'}
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
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nombre (Estancia)</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:outline-none font-bold text-sm"
                                    placeholder="Ej: Salón, Cocina, Baño..."
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Slug (Opcional)</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none font-mono"
                                    placeholder="salon-comedor"
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
                                    placeholder="Breve descripción de la iluminación para este espacio..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>
                            <button
                                disabled={isSaving}
                                type="submit"
                                className="w-full bg-blue-600 text-white font-black py-4 rounded-lg hover:bg-blue-700 transition-colors uppercase italic tracking-widest flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'Guardar Cambios' : 'Crear Estancia'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
