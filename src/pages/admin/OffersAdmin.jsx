import { useState, useEffect } from 'react';
import { Plus, Search, Loader2, Trash2, X, Tag, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function OffersAdmin() {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        discount_percentage: '',
        is_active: true,
        expiry_date: ''
    });

    useEffect(() => {
        fetchOffers();
    }, []);

    async function fetchOffers() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('offers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code === 'PGRST116' || error.message.includes('not found')) {
                    setOffers([]);
                } else {
                    throw error;
                }
            } else {
                setOffers(data || []);
            }
        } catch (error) {
            console.error('Error fetching offers:', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setIsSaving(true);
            const { error } = await supabase.from('offers').insert([
                { ...formData, discount_percentage: parseFloat(formData.discount_percentage) }
            ]);

            if (error) throw error;

            setIsModalOpen(false);
            setFormData({ code: '', discount_percentage: '', is_active: true, expiry_date: '' });
            fetchOffers();
            alert('Oferta creada con éxito');
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteOffer(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta promoción?')) return;

        try {
            const { error } = await supabase.from('offers').delete().eq('id', id);
            if (error) throw error;
            setOffers(offers.filter(o => o.id !== id));
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    }

    async function toggleStatus(id, currentStatus) {
        try {
            const { error } = await supabase
                .from('offers')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            setOffers(offers.map(o => o.id === id ? { ...o, is_active: !currentStatus } : o));
        } catch (error) {
            alert('Error al actualizar estado: ' + error.message);
        }
    }

    const filteredOffers = offers.filter(o =>
        o.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black text-gray-800 uppercase italic">Ofertas y Cupones</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors font-bold uppercase italic shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Nueva Promo
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por código de cupón..."
                            className="pl-10 w-full border border-gray-200 rounded-lg py-2 px-4 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-bold tracking-tight"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Cargando promociones...</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 uppercase text-[10px] font-black text-gray-500 border-b">
                            <tr>
                                <th className="p-4 whitespace-nowrap">Código</th>
                                <th className="p-4 text-center">Descuento</th>
                                <th className="p-4">Expira</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOffers.length > 0 ? filteredOffers.map(offer => (
                                <tr key={offer.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                                <Tag className="w-4 h-4" />
                                            </div>
                                            <p className="font-black text-blue-600 uppercase text-sm tracking-wider">{offer.code}</p>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center font-black text-gray-900 text-base">-{offer.discount_percentage}%</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {offer.expiry_date ? new Date(offer.expiry_date).toLocaleDateString() : 'Sin límite'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => toggleStatus(offer.id, offer.is_active)}
                                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${offer.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                        >
                                            {offer.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                            {offer.is_active ? 'Activo' : 'Pausado'}
                                        </button>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => deleteOffer(offer.id)} className="text-gray-300 hover:text-red-600 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center text-gray-400 italic">
                                        {offers.length === 0 ? 'No hay promociones activas.' : 'No se encontraron resultados.'}
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
                            <h2 className="font-black uppercase italic text-gray-800 tracking-wider">Nueva Promoción</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Código del Cupón</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:outline-none font-black text-blue-600 uppercase tracking-widest"
                                    placeholder="WINTER2024"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">% Descuento</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="number"
                                            className="w-full border rounded-lg pl-3 pr-8 py-2.5 text-sm focus:outline-none font-bold"
                                            placeholder="15"
                                            value={formData.discount_percentage}
                                            onChange={e => setFormData({ ...formData, discount_percentage: e.target.value })}
                                        />
                                        <span className="absolute right-3 top-2.5 text-gray-400 font-bold">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Fecha Expiración</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                                        value={formData.expiry_date}
                                        onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <label htmlFor="is_active" className="text-xs font-bold text-gray-700 uppercase">Activar promoción inmediatamente</label>
                            </div>
                            <button
                                disabled={isSaving}
                                type="submit"
                                className="w-full bg-blue-600 text-white font-black py-4 rounded-lg hover:bg-blue-700 transition-colors uppercase italic tracking-widest flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Promoción'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
