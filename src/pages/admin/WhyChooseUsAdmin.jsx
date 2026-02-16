import { useState, useEffect } from 'react';
import { Save, Loader2, Image, Type, AlignLeft, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function WhyChooseUsAdmin() {
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchReasons();
    }, []);

    async function fetchReasons() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('why_choose_us')
                .select('*')
                .order('order_index', { ascending: true });

            if (error) {
                if (error.code === 'PGRST116' || error.message.includes('not found')) {
                    setReasons([
                        { id: 1, title: 'Calidad Garantizada', description: 'Productos de alta durabilidad.', image_url: '', order_index: 0 },
                        { id: 2, title: 'Precio Competitivo', description: 'Los mejores precios del mercado.', image_url: '', order_index: 1 },
                        { id: 3, title: 'Soporte 24/7', description: 'Atención personalizada siempre.', image_url: '', order_index: 2 }
                    ]);
                } else {
                    throw error;
                }
            } else {
                setReasons(data || []);
            }
        } catch (error) {
            console.error('Error fetching reasons:', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdate(id, field, value) {
        setReasons(reasons.map(r => r.id === id ? { ...r, [field]: value } : r));
    }

    async function saveAll() {
        try {
            setIsSaving(true);
            const { error } = await supabase.from('why_choose_us').upsert(reasons);
            if (error) throw error;
            alert('Contenido actualizado correctamente');
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-end mb-10 font-outfit">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Por Qué Elegirnos</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em] mt-3">Valores de Marca Boutique</p>
                </div>
                <button
                    onClick={saveAll}
                    disabled={isSaving}
                    className="bg-brand-carbon text-white h-14 px-8 rounded-2xl flex items-center gap-3 hover:bg-primary transition-all font-black uppercase italic text-[10px] shadow-xl shadow-brand-carbon/10 disabled:bg-gray-400 font-outfit"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Save className="w-4 h-4 text-primary" />}
                    Guardar Cambios
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
                <p className="text-gray-500 mb-10 italic text-center max-w-2xl mx-auto font-medium">
                    Gestiona las tarjetas de valor que aparecen en la sección informativa de la página de inicio. Realiza los cambios y pulsa "Guardar Cambios" para aplicarlos.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {reasons.map((reason, index) => (
                        <div key={reason.id} className="p-6 rounded-xl border border-gray-100 bg-gray-50/50 space-y-5 relative group">
                            <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black italic shadow-lg">
                                #{reason.order_index}
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    <Type className="w-3 h-3" />
                                    Título del Beneficio
                                </label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    value={reason.title}
                                    onChange={(e) => handleUpdate(reason.id, 'title', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    <AlignLeft className="w-3 h-3" />
                                    Descripción / Subtítulo
                                </label>
                                <textarea
                                    className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none min-h-[80px] resize-none leading-relaxed"
                                    value={reason.description}
                                    onChange={(e) => handleUpdate(reason.id, 'description', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Orden</label>
                                <input
                                    type="number"
                                    className="w-full border rounded-lg px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    value={reason.order_index}
                                    onChange={(e) => handleUpdate(reason.id, 'order_index', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    <Image className="w-3 h-3" />
                                    URL del Icono / Imagen
                                </label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    placeholder="https://example.com/icon.svg"
                                    value={reason.image_url}
                                    onChange={(e) => handleUpdate(reason.id, 'image_url', e.target.value)}
                                />
                                {reason.image_url && (
                                    <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100 flex justify-center">
                                        <img src={reason.image_url} alt="Preview" className="h-12 w-auto object-contain brightness-0 group-hover:brightness-100 transition-all" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-4">
                    <div className="p-2 bg-blue-600 rounded-full text-white">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-blue-900 uppercase italic">Control de Contenidos Activo</p>
                        <p className="text-[10px] text-blue-700 font-bold uppercase opacity-70">Los cambios que guardes aquí se reflejarán inmediatamente en la portada de la web.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
