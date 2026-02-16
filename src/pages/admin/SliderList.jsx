import { useState, useEffect } from 'react';
import { Plus, Search, Loader2, Trash2, X, Image as ImageIcon, Link as LinkIcon, Edit2, Play, Pause } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ImageUpload from '../../components/admin/ImageUpload';

export default function SliderList() {
    const [sliders, setSliders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        image_url: '',
        link_url: '',
        title: '',
        subtitle: '',
        button_text: 'Ver Más',
        secondary_button_text: '',
        secondary_button_link: '',
        order_index: 0,
        is_active: true,
        type: 'main_slider'
    });

    useEffect(() => {
        fetchSliders();
    }, []);

    async function fetchSliders() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('sliders')
                .select('*')
                .order('order_index', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code === 'PGRST116' || error.message.includes('not found')) {
                    setSliders([]);
                } else {
                    throw error;
                }
            } else {
                setSliders(data || []);
            }
        } catch (error) {
            console.error('Error fetching sliders:', error.message);
        } finally {
            setLoading(false);
        }
    }

    function openEdit(slider) {
        setEditingId(slider.id);
        setFormData({
            image_url: slider.image_url,
            link_url: slider.link_url || '',
            title: slider.title || '',
            subtitle: slider.subtitle || '',
            button_text: slider.button_text || 'Ver Más',
            secondary_button_text: slider.secondary_button_text || '',
            secondary_button_link: slider.secondary_button_link || '',
            order_index: slider.order_index || 0,
            is_active: slider.is_active,
            type: slider.type || 'main_slider'
        });
        setIsModalOpen(true);
    }

    function openCreate() {
        setEditingId(null);
        setFormData({
            image_url: '',
            link_url: '',
            title: '',
            subtitle: '',
            button_text: 'Ver Más',
            secondary_button_text: '',
            secondary_button_link: '',
            order_index: sliders.length,
            is_active: true,
            type: 'main_slider'
        });
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setIsSaving(true);
            const payload = { ...formData, order_index: parseInt(formData.order_index) };

            if (editingId) {
                const { error } = await supabase.from('sliders').update(payload).eq('id', editingId);
                if (error) throw error;
                alert('Slider actualizado');
            } else {
                const { error } = await supabase.from('sliders').insert([payload]);
                if (error) throw error;
                alert('Slider añadido');
            }

            setIsModalOpen(false);
            fetchSliders();
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteSlider(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este banner?')) return;

        try {
            const { error } = await supabase.from('sliders').delete().eq('id', id);
            if (error) throw error;
            setSliders(sliders.filter(s => s.id !== id));
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    }

    async function toggleStatus(id, currentStatus) {
        try {
            const { error } = await supabase
                .from('sliders')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            setSliders(sliders.map(s => s.id === id ? { ...s, is_active: !currentStatus } : o));
            fetchSliders(); // Reload to be safe
        } catch (error) {
            alert('Error al actualizar estado: ' + error.message);
        }
    }

    const filteredSliders = sliders.filter(s =>
        (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.type || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-end mb-10 font-outfit">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Sliders y Banners</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em] mt-3">Gestión de la Experiencia Home</p>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-brand-carbon text-white h-14 px-8 rounded-2xl flex items-center gap-3 hover:bg-primary transition-all font-black uppercase italic text-[10px] shadow-xl shadow-brand-carbon/10 font-outfit"
                >
                    <Plus className="w-4 h-4 text-primary" /> Nuevo Banner
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por título o tipo..."
                            className="pl-10 w-full border border-gray-200 rounded-lg py-2 px-4 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-bold"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Cargando sliders...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 uppercase text-[10px] font-black text-gray-500 border-b">
                                <tr>
                                    <th className="p-4 whitespace-nowrap">Miniatura</th>
                                    <th className="p-4">Info / Enlace</th>
                                    <th className="p-4">Tipo</th>
                                    <th className="p-4 text-center">Orden</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSliders.length > 0 ? filteredSliders.map(slider => (
                                    <tr key={slider.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4">
                                            <div className="w-24 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
                                                {slider.image_url ? (
                                                    <img src={slider.image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <ImageIcon className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div>
                                                <p className="font-bold text-gray-900 uppercase text-xs truncate max-w-[200px]">{slider.title || 'Sin título'}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <LinkIcon className="w-3 h-3 text-blue-400" />
                                                    <p className="text-[10px] text-gray-400 font-mono truncate max-w-[150px]">{slider.link_url || 'Sin enlace'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${slider.type === 'main_slider' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {slider.type === 'main_slider' ? 'Slider Principal' : 'Banner Lateral'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center font-bold text-gray-400">#{slider.order_index}</td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => toggleStatus(slider.id, slider.is_active)}
                                                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-colors ${slider.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                            >
                                                {slider.is_active ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                                                {slider.is_active ? 'Publicado' : 'Pausado'}
                                            </button>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-1">
                                                <button onClick={() => openEdit(slider)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteSlider(slider.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="p-20 text-center text-gray-400 italic font-medium">
                                            No se encontraron sliders o banners.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="font-black uppercase italic text-gray-800 tracking-wider">
                                {editingId ? 'Editar Banner' : 'Nuevo Banner'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:rotate-90 transition-all duration-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <ImageUpload
                                defaultValue={formData.image_url}
                                onUpload={(url) => setFormData({ ...formData, image_url: url })}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Título Principal (H1)</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:outline-none font-bold text-sm"
                                        placeholder="Ej: La Luz que Define Tu Estilo"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Subtítulo (Etiqueta superior)</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:outline-none font-bold text-sm"
                                        placeholder="Ej: Colección Exclusiva 2026"
                                        value={formData.subtitle}
                                        onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                                    />
                                </div>

                                <div className="col-span-2 grid grid-cols-2 gap-4 border-t pt-4 mt-2">
                                    <div className="col-span-2">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Configuración de Botones</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Texto Botón 1 (Principal)</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none font-bold"
                                            placeholder="Ver Boutique"
                                            value={formData.button_text}
                                            onChange={e => setFormData({ ...formData, button_text: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Enlace Botón 1</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none font-mono"
                                            placeholder="/search"
                                            value={formData.link_url}
                                            onChange={e => setFormData({ ...formData, link_url: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Texto Botón 2 (Opcional)</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none font-bold"
                                            placeholder="Proyectos"
                                            value={formData.secondary_button_text}
                                            onChange={e => setFormData({ ...formData, secondary_button_text: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Enlace Botón 2</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none font-mono"
                                            placeholder="/proyectos"
                                            value={formData.secondary_button_link}
                                            onChange={e => setFormData({ ...formData, secondary_button_link: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Enlace de Destino (URL o Ruta)</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none font-mono"
                                        placeholder="/search?category=bombillas"
                                        value={formData.link_url}
                                        onChange={e => setFormData({ ...formData, link_url: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Ubicación</label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none font-bold bg-white"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="main_slider">Slider Principal (Grande)</option>
                                        <option value="side_banner">Banner Lateral (Estrecho)</option>
                                    </select>
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
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <input
                                    type="checkbox"
                                    id="is_active_slider"
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <label htmlFor="is_active_slider" className="text-xs font-bold text-gray-700 uppercase cursor-pointer">Publicar inmediatamente</label>
                            </div>

                            <button
                                disabled={isSaving || !formData.image_url}
                                type="submit"
                                className="w-full bg-blue-600 text-white font-black py-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase italic tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'Guardar Cambios' : 'Crear Banner'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
