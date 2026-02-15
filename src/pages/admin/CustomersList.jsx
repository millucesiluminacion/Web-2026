import { useState, useEffect } from 'react';
import { Search, Loader2, User, Mail, Calendar, Trash2, Edit2, ShoppingBag, X, Star, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function CustomersList() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    async function fetchCustomers() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCustomers(data || []);
        } catch (error) {
            console.error('Error fetching customers:', error.message);
        } finally {
            setLoading(false);
        }
    }

    function openCreate() {
        setEditingId(null);
        setFormData({ full_name: '', email: '', phone: '', address: '' });
        setIsModalOpen(true);
    }

    function openEdit(customer) {
        setEditingId(customer.id);
        setFormData({
            full_name: customer.full_name,
            email: customer.email,
            phone: customer.phone || '',
            address: customer.address || ''
        });
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setIsSaving(true);
            if (editingId) {
                const { error } = await supabase
                    .from('customers')
                    .update(formData)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('customers')
                    .insert([formData]);
                if (error) throw error;
            }
            setIsModalOpen(false);
            fetchCustomers();
        } catch (error) {
            alert('Error al guardar cliente: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteCustomer(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) return;
        try {
            const { error } = await supabase.from('customers').delete().eq('id', id);
            if (error) throw error;
            setCustomers(customers.filter(c => c.id !== id));
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    }

    const filteredCustomers = customers.filter(c =>
        c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block font-outfit">Customer Relations</span>
                    <h1 className="text-4xl lg:text-5xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter font-outfit">
                        Base de <span className="text-primary/40">Clientes</span>
                    </h1>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-3 bg-brand-carbon text-white px-8 py-4 rounded-2xl font-black uppercase italic text-[10px] shadow-2xl hover:bg-primary transition-all group font-outfit"
                >
                    <Plus className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform" />
                    Registrar Cliente
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100">
                <div className="p-8 border-b border-gray-100 bg-gray-50/20 flex flex-wrap gap-4 items-center justify-between">
                    <div className="relative max-w-md flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="BUSCAR CLIENTE POR NOMBRE O EMAIL..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300 font-outfit"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100 uppercase italic tracking-widest font-outfit">
                        {filteredCustomers.length} Contactos
                    </div>
                </div>

                {loading ? (
                    <div className="p-24 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary/20" />
                        <p className="text-[10px] font-black uppercase tracking-widest font-outfit">Sincronizando Boutique CRM...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400 font-outfit">Identidad</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400 font-outfit">Contacto</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400 font-outfit">Dirección</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right font-outfit">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredCustomers.length > 0 ? filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="group hover:bg-gray-50/30 transition-all">
                                        <td className="p-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-brand-carbon text-white flex items-center justify-center font-black italic text-lg shadow-lg group-hover:scale-110 transition-transform">
                                                    {customer.full_name?.charAt(0) || 'C'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black uppercase italic text-brand-carbon font-outfit">{customer.full_name}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 font-outfit">Ref: {customer.id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <div className="flex flex-col gap-1">
                                                <p className="text-[11px] font-bold text-gray-600 flex items-center gap-2 font-outfit">
                                                    <Mail className="w-3 h-3 text-primary" /> {customer.email}
                                                </p>
                                                {customer.phone && (
                                                    <p className="text-[10px] font-bold text-gray-400 font-outfit">{customer.phone}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase leading-relaxed max-w-[200px] truncate font-outfit">
                                                {customer.address || '—'}
                                            </p>
                                        </td>
                                        <td className="p-8">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEdit(customer)}
                                                    className="p-3 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteCustomer(customer.id)}
                                                    className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="p-24 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-200">
                                                <User className="w-16 h-16 mb-4 opacity-20" />
                                                <p className="text-xs font-black uppercase tracking-[.4em] font-outfit">Sin registros</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Loyalty Widget */}
            <div className="mt-10 bg-neutral-900 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 text-white">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400">
                        <Star className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase italic tracking-widest font-outfit">Programa de Lealtad Activo</p>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1 leading-relaxed font-outfit max-w-xl">
                            Visualización en tiempo real de los usuarios integrados con tu base de datos central de Supabase.
                        </p>
                    </div>
                </div>
                <button className="px-10 py-4 bg-white text-black rounded-[1.2rem] font-black uppercase italic text-xs hover:bg-blue-400 hover:text-white transition-all shadow-xl shadow-black/50 font-outfit">
                    Exportar Base (.CSV)
                </button>
            </div>

            {/* Modal de Cliente */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
                    <div className="absolute inset-0 bg-brand-carbon/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-brand-carbon font-outfit">
                                    {editingId ? 'Editar' : 'Nuevo'} <span className="text-primary/40">Cliente</span>
                                </h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 font-outfit">Información de contacto para facturación y envío</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-4 hover:bg-gray-100 rounded-full transition-all">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">Nombre Completo</label>
                                    <input
                                        required
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="Ej: John Doe"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">Email Corporativo</label>
                                    <input
                                        required
                                        type="email"
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">Teléfono de Contacto</label>
                                <input
                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+34 600 000 000"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">Dirección de Envío Principal</label>
                                <textarea
                                    className="w-full bg-gray-50 border-none rounded-3xl p-6 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none h-32 font-outfit"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Calle, Ciudad, Código Postal..."
                                ></textarea>
                            </div>

                            <div className="pt-6">
                                <button
                                    disabled={isSaving}
                                    className="w-full bg-brand-carbon text-white py-5 rounded-[1.5rem] font-black uppercase italic text-xs shadow-2xl hover:bg-primary transition-all flex items-center justify-center gap-3 font-outfit active:scale-95"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                                    {editingId ? 'Confirmar Actualización' : 'Guardar Nuevo Registro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
