import { useState, useEffect } from 'react';
import { Plus, Search, Loader2, Trash2, X, Tag, Calendar, CheckCircle, XCircle, Users, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function OffersAdmin() {
    const [offers, setOffers] = useState([]);
    const [usesMap, setUsesMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Modal para ver redenciones
    const [selectedOfferForUses, setSelectedOfferForUses] = useState(null);
    const [offerUsesList, setOfferUsesList] = useState([]);
    const [loadingUses, setLoadingUses] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        discount_percentage: '',
        is_active: true,
        expiry_date: '',
        max_uses_per_user: '1',
        max_uses_total: ''
    });

    useEffect(() => {
        fetchOffers();
    }, []);

    async function fetchOffers() {
        try {
            setLoading(true);
            const { data: offersData, error } = await supabase
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
                setOffers(offersData || []);
                fetchCouponUsesCounts(offersData || []);
            }
        } catch (error) {
            console.error('Error fetching offers:', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchCouponUsesCounts() {
        try {
            const { data: usesData, error } = await supabase
                .from('coupon_uses')
                .select('offer_id, id');

            if (!error && usesData) {
                const map = {};
                usesData.forEach(u => {
                    map[u.offer_id] = (map[u.offer_id] || 0) + 1;
                });
                setUsesMap(map);
            }
        } catch (e) {
            console.error('Error fetching coupon uses count:', e);
        }
    }

    async function handleViewUses(offer) {
        setSelectedOfferForUses(offer);
        setLoadingUses(true);
        try {
            const { data, error } = await supabase
                .from('coupon_uses')
                .select('*, orders(id, total, status)')
                .eq('offer_id', offer.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOfferUsesList(data || []);
        } catch (e) {
            console.error('Error fetching coupon redemptions:', e);
            alert('Error al cargar historial de uso: ' + e.message);
        } finally {
            setLoadingUses(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setIsSaving(true);
            const payload = {
                code: formData.code.toUpperCase(),
                discount_percentage: parseFloat(formData.discount_percentage),
                is_active: formData.is_active,
                expiry_date: formData.expiry_date || null,
                max_uses_per_user: formData.max_uses_per_user !== '' ? parseInt(formData.max_uses_per_user, 10) : null,
                max_uses_total: formData.max_uses_total !== '' ? parseInt(formData.max_uses_total, 10) : null,
            };

            const { error } = await supabase.from('offers').insert([payload]);

            if (error) throw error;

            setIsModalOpen(false);
            setFormData({
                code: '',
                discount_percentage: '',
                is_active: true,
                expiry_date: '',
                max_uses_per_user: '1',
                max_uses_total: ''
            });
            fetchOffers();
            alert('Promoción creada con éxito');
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
            <div className="flex justify-between items-end mb-10 font-outfit">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Ofertas y Cupones</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em] mt-3">Gestión de Promociones y Control de Usos</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-brand-carbon text-white h-14 px-8 rounded-2xl flex items-center gap-3 hover:bg-primary transition-all font-black uppercase italic text-[10px] shadow-xl shadow-brand-carbon/10 font-outfit"
                >
                    <Plus className="w-4 h-4 text-primary" /> Nueva Promo
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
                                <th className="p-4 text-center">Usos Registrados</th>
                                <th className="p-4">Límite / Cliente</th>
                                <th className="p-4">Expira</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOffers.length > 0 ? filteredOffers.map(offer => {
                                const totalUses = usesMap[offer.id] || 0;
                                return (
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
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleViewUses(offer)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-lg text-xs font-bold transition-all border border-gray-200"
                                                title="Ver clientes que han usado este cupón"
                                            >
                                                <Users className="w-3.5 h-3.5 text-gray-500" />
                                                <span>{totalUses} {offer.max_uses_total ? `/ ${offer.max_uses_total}` : ''} usos</span>
                                                <Eye className="w-3 h-3 ml-0.5 opacity-60" />
                                            </button>
                                        </td>
                                        <td className="p-4 font-bold text-xs text-gray-700">
                                            {offer.max_uses_per_user ? (
                                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded text-[11px] font-black">
                                                    {offer.max_uses_per_user} por cliente
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 font-medium">Ilimitado</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {offer.expiry_date ? new Date(offer.expiry_date).toLocaleDateString() : 'Sin límite'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => toggleStatus(offer.id, offer.is_active)}
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${offer.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                            >
                                                {offer.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                {offer.is_active ? 'Activo' : 'Pausado'}
                                            </button>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => deleteOffer(offer.id)} className="text-gray-300 hover:text-red-600 transition-colors p-1" title="Eliminar promoción">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="7" className="p-20 text-center text-gray-400 italic">
                                        {offers.length === 0 ? 'No hay promociones creadas.' : 'No se encontraron resultados.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Crear Promoción */}
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
                                    placeholder="BIENVENIDA5"
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
                                            placeholder="5"
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

                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Límite usos / cliente</label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2.5 text-xs font-bold bg-white focus:outline-none"
                                        value={formData.max_uses_per_user}
                                        onChange={e => setFormData({ ...formData, max_uses_per_user: e.target.value })}
                                    >
                                        <option value="1">1 uso por cliente</option>
                                        <option value="2">2 usos por cliente</option>
                                        <option value="3">3 usos por cliente</option>
                                        <option value="">Ilimitado por cliente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Límite global (Opcional)</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                                        placeholder="Ej: 100 usos"
                                        value={formData.max_uses_total}
                                        onChange={e => setFormData({ ...formData, max_uses_total: e.target.value })}
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

            {/* Modal Historial de Usos por Cliente */}
            {selectedOfferForUses && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="font-black uppercase italic text-gray-800 tracking-wider flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-blue-600" />
                                    Historial de Usos: <span className="text-blue-600">{selectedOfferForUses.code}</span>
                                </h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                    {offerUsesList.length} canjes registrados
                                </p>
                            </div>
                            <button onClick={() => setSelectedOfferForUses(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {loadingUses ? (
                                <div className="p-12 flex flex-col items-center justify-center text-gray-500">
                                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                    <p className="text-xs font-bold uppercase tracking-widest opacity-50">Cargando canjes...</p>
                                </div>
                            ) : offerUsesList.length > 0 ? (
                                <table className="w-full text-left text-xs text-gray-600">
                                    <thead className="bg-gray-50 uppercase text-[9px] font-black text-gray-400 border-b">
                                        <tr>
                                            <th className="p-3">Email del Cliente</th>
                                            <th className="p-3">Fecha de Uso</th>
                                            <th className="p-3 text-right">Pedido ID</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-medium">
                                        {offerUsesList.map(use => (
                                            <tr key={use.id} className="hover:bg-gray-50">
                                                <td className="p-3 font-bold text-gray-900">{use.user_email}</td>
                                                <td className="p-3 text-gray-500">{new Date(use.created_at).toLocaleString()}</td>
                                                <td className="p-3 text-right font-mono font-bold text-blue-600">
                                                    #{use.order_id?.slice(0, 8).toUpperCase() || 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-12 text-center text-gray-400 italic">
                                    Ningún cliente ha utilizado este cupón todavía.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
