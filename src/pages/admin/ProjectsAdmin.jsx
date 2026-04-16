import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, Loader2, X, Briefcase, MapPin, Calendar, Layout, Info, MousePointer2, Package } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ImageUpload from '../../components/admin/ImageUpload';
import ProductSelector from '../../components/admin/ProductSelector';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function ProjectsAdmin() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [activeTab, setActiveTab] = useState('general'); // 'general' or 'hotspots'

    const [formData, setFormData] = useState({
        name: '',
        location: '',
        category: '',
        image_url: '',
        year: new Date().getFullYear().toString(),
        order_index: 0,
        description_rich: '',
        hotspots: [] // [{ x, y, product_id, product_name }]
    });

    const [tempHotspot, setTempHotspot] = useState(null); // {x, y}
    const imageRef = useRef(null);

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        fetchProjects();
    }, []);

    async function fetchProjects() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('order_index', { ascending: true });
            if (error) throw error;
            setProjects(data || []);
        } catch (error) {
            console.error('Error:', error.message);
        } finally {
            setLoading(false);
        }
    }

    function openCreate() {
        setEditingId(null);
        setActiveTab('general');
        setFormData({
            name: '', location: '', category: '',
            image_url: '', year: new Date().getFullYear().toString(),
            order_index: projects.length,
            description_rich: '',
            hotspots: []
        });
        setIsModalOpen(true);
    }

    function openEdit(project) {
        setEditingId(project.id);
        setActiveTab('general');
        setFormData({
            ...project,
            description_rich: project.description_rich || '',
            hotspots: project.hotspots || []
        });
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        if (e) e.preventDefault();
        try {
            setIsSaving(true);
            if (editingId) {
                const { error } = await supabase.from('projects').update(formData).eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('projects').insert([formData]);
                if (error) throw error;
            }
            setIsModalOpen(false);
            fetchProjects();
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteProject(id) {
        if (!confirm('¿Eliminar esta inspiración?')) return;
        try {
            const { error } = await supabase.from('projects').delete().eq('id', id);
            if (error) throw error;
            setProjects(projects.filter(p => p.id !== id));
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    const handleImageClick = (e) => {
        if (!imageRef.current) return;
        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setTempHotspot({ x: x.toFixed(2), y: y.toFixed(2) });
    };

    const addHotspot = (product) => {
        if (!tempHotspot) return;
        const newHotspot = {
            ...tempHotspot,
            product_id: product.id,
            product_name: product.name,
            product_image: product.image_url,
            product_price: product.price
        };
        setFormData(prev => ({
            ...prev,
            hotspots: [...(prev.hotspots || []), newHotspot]
        }));
        setTempHotspot(null);
    };

    const removeHotspot = (index) => {
        setFormData(prev => ({
            ...prev,
            hotspots: prev.hotspots.filter((_, i) => i !== index)
        }));
    };

    const filtered = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end mb-10 font-outfit">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Inspírate & Lookbook</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em] mt-3">Shoppable Scenes & Interiorismo</p>
                </div>
                <button onClick={openCreate} className="bg-brand-carbon text-white h-14 px-8 rounded-2xl flex items-center gap-3 hover:bg-primary transition-all font-black uppercase italic text-[10px] shadow-xl shadow-brand-carbon/10 font-outfit">
                    <Plus className="w-4 h-4 text-primary" /> Nuevo Look
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar escenas..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-xs focus:ring-2 focus:ring-primary/20 transition-all font-outfit"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center font-outfit"><Loader2 className="w-8 h-8 animate-spin text-primary mb-4" /><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Sincronizando Lookbook...</p></div>
                ) : (
                    <table className="w-full text-left font-outfit">
                        <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="p-6">Escena</th>
                                <th className="p-6">Hotspots</th>
                                <th className="p-6">Categoría</th>
                                <th className="p-6 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map(project => (
                                <tr key={project.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                {project.image_url ? <img src={project.image_url} className="w-full h-full object-cover" /> : <Briefcase className="w-full h-full p-2 text-gray-300" />}
                                            </div>
                                            <div>
                                                <p className="font-black text-brand-carbon uppercase italic text-sm line-clamp-1">{project.name}</p>
                                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{project.location} // {project.year}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-brand-carbon bg-gray-100 px-2.5 py-1 rounded-full">{project.hotspots?.length || 0}</span>
                                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tight">Puntos de venta</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className="text-[10px] font-black uppercase text-primary bg-primary/5 px-2 py-1 rounded">{project.category}</span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(project)} className="p-2 text-gray-400 hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => deleteProject(project.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-brand-carbon/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6 font-outfit">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
                        <header className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-black uppercase italic tracking-tighter text-brand-carbon">{editingId ? 'Editar Escena' : 'Nueva Escena de Inspiración'}</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Configura los hotspots interactivos</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-carbon transition-colors"><X className="w-5 h-5" /></button>
                        </header>

                        <div className="flex border-b border-gray-100 px-8 bg-white gap-6">
                            {['general', 'hotspots'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    {tab === 'general' ? '🏷️ Info General' : '🎯 Shoppable Hotspots'}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {activeTab === 'general' ? (
                                <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <ImageUpload defaultValue={formData.image_url} onUpload={url => setFormData({ ...formData, image_url: url })} />

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Título Look</label>
                                                <input required className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Salón Escandinavo..." />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Categoría</label>
                                                <input className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Ej: Interiorismo..." />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Ubicación</label>
                                                <input className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Madrid, Showroom..." />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Año / Colección</label>
                                                <input className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block italic">Narrativa del Look (Opcional)</label>
                                        <div className="h-[300px] mb-12">
                                            {mounted && (
                                                <ReactQuill
                                                    key={editingId || 'new'}
                                                    theme="snow"
                                                    className="h-[250px] rounded-2xl overflow-hidden border-none bg-gray-50"
                                                    value={formData.description_rich || ''}
                                                    onChange={val => setFormData({ ...formData, description_rich: val })}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-10 flex gap-10 h-full">
                                    <div className="flex-1 space-y-4 flex flex-col min-h-0">
                                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                                            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-primary/70 font-bold uppercase tracking-tight leading-relaxed">
                                                Haz clic en cualquier punto de la imagen para situar un nuevo marcador de producto.
                                            </p>
                                        </div>

                                        <div className="relative group/canvas flex-1 bg-gray-100 rounded-[2rem] overflow-hidden border border-gray-200 cursor-crosshair shadow-inner min-h-[400px]">
                                            {formData.image_url ? (
                                                <div className="relative w-full h-full flex items-center justify-center">
                                                    <img
                                                        ref={imageRef}
                                                        src={formData.image_url}
                                                        className="w-full h-full object-contain select-none"
                                                        onClick={handleImageClick}
                                                        alt="Lookbook Editor"
                                                    />

                                                    {/* Existing Hotspots */}
                                                    {formData.hotspots?.map((hs, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="absolute w-8 h-8 -ml-4 -mt-4 bg-primary text-white rounded-full flex items-center justify-center shadow-luxury border-2 border-white animate-pulse-slow z-10 group/hs"
                                                            style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                                                        >
                                                            <Package className="w-4 h-4" />
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-brand-carbon text-[8px] font-black text-white px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover/hs:opacity-100 transition-opacity z-20 shadow-xl">
                                                                {hs.product_name}
                                                                <button onClick={(e) => { e.stopPropagation(); removeHotspot(idx) }} className="ml-2 text-red-400 hover:text-red-500 underline uppercase">Quitar</button>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Temporary Placement Marker */}
                                                    {tempHotspot && (
                                                        <div
                                                            className="absolute w-8 h-8 -ml-4 -mt-4 bg-yellow-400 text-brand-carbon rounded-full flex items-center justify-center shadow-xl border-2 border-white z-20"
                                                            style={{ left: `${tempHotspot.x}%`, top: `${tempHotspot.y}%` }}
                                                        >
                                                            <MousePointer2 className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-gray-300">
                                                    <Layout className="w-12 h-12 mb-4 opacity-20" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest italic">Sube una imagen primero</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="w-80 space-y-6">
                                        {tempHotspot ? (
                                            <div className="bg-white p-6 rounded-[2rem] border-2 border-primary shadow-xl animate-in zoom-in-95 duration-200">
                                                <h4 className="text-[10px] font-black text-brand-carbon uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                                                    Vincular Producto en ({tempHotspot.x}%, {tempHotspot.y}%)
                                                </h4>
                                                <ProductSelector onSelect={addHotspot} />
                                                <button onClick={() => setTempHotspot(null)} className="w-full mt-4 text-[9px] font-black text-gray-400 uppercase hover:text-red-500 transition-colors">Cancelar</button>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 h-full">
                                                <h4 className="text-[11px] font-black text-brand-carbon uppercase italic tracking-tighter mb-4">Productos Etiquetados</h4>
                                                <div className="space-y-3">
                                                    {formData.hotspots?.length === 0 ? (
                                                        <p className="text-[9px] text-gray-400 italic">No hay productos en esta escena aún.</p>
                                                    ) : (
                                                        formData.hotspots.map((hs, idx) => (
                                                            <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 group">
                                                                <div className="w-10 h-10 rounded bg-gray-50 overflow-hidden flex-shrink-0">
                                                                    <img src={hs.product_image} alt="" className="w-full h-full object-contain" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[9px] font-black text-brand-carbon uppercase truncate">{hs.product_name}</p>
                                                                    <p className="text-[8px] text-gray-400 font-bold tracking-widest">{hs.x}% / {hs.y}%</p>
                                                                </div>
                                                                <button onClick={() => removeHotspot(idx)} className="text-gray-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <footer className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 hover:text-brand-carbon transition-colors tracking-widest">Cancelar</button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSaving || !formData.image_url}
                                className="bg-primary text-white px-10 py-4 rounded-2xl font-black uppercase italic text-[11px] tracking-[.2em] shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-3"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'Actualizar Look' : 'Publicar en Lookbook'}
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
