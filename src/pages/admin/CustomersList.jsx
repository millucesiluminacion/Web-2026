import { useState, useEffect } from 'react';
import {
    Search, Loader2, User, Mail, Calendar, Trash2, Edit2,
    ShoppingBag, X, Star, Plus, Download, Upload, FileText,
    ChevronRight, ChevronLeft, ArrowUpDown, Eye, ShoppingCart, Award, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Papa from 'papaparse';

export default function CustomersList() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('created_at_desc'); // created_at_desc, created_at_asc, spent_desc, orders_desc, name_asc, name_desc
    const [activeTab, setActiveTab] = useState('all'); // all, persona, profesional, partner, has_orders

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [viewingCustomer, setViewingCustomer] = useState(null); // Detail modal

    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 50;

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        user_type: 'persona',
        company_name: '',
        vat_id: '',
        tax_document_url: '',
        discount_percent: 0,
        is_partner: false,
        has_pro_prices: false
    });

    // Prevent body scroll when any modal is open
    useEffect(() => {
        if (isModalOpen || viewingCustomer) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isModalOpen, viewingCustomer]);

    useEffect(() => {
        fetchCustomers();
    }, [page, searchQuery, activeTab, sortBy]);

    async function fetchCustomers() {
        try {
            setLoading(true);
            let query = supabase
                .from('customers')
                .select('*', { count: 'exact' });

            if (searchQuery) {
                query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
            }

            // Apply Tab Filters at DB level if applicable
            if (activeTab === 'persona' || activeTab === 'profesional') {
                query = query.eq('user_type', activeTab);
            } else if (activeTab === 'partner') {
                query = query.eq('is_partner', true);
            }

            // Apply SQL sorting where possible
            if (sortBy === 'created_at_desc') {
                query = query.order('created_at', { ascending: false });
            } else if (sortBy === 'created_at_asc') {
                query = query.order('created_at', { ascending: true });
            } else if (sortBy === 'name_asc') {
                query = query.order('full_name', { ascending: true });
            } else if (sortBy === 'name_desc') {
                query = query.order('full_name', { ascending: false });
            } else {
                // Fallback DB sort for spent/orders sort (will be re-sorted in memory after batch orders fetch)
                query = query.order('created_at', { ascending: false });
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, error, count } = await query.range(from, to);
            if (error) throw error;

            // OPTIMIZATION: Single Batch Query for Orders instead of 50 individual queries
            const customerEmails = (data || []).map(c => c.email?.toLowerCase()).filter(Boolean);
            const orderStatsMap = {};

            if (customerEmails.length > 0) {
                const { data: orderData, error: orderErr } = await supabase
                    .from('orders')
                    .select('customer_email, total, status')
                    .in('customer_email', customerEmails)
                    .neq('status', 'CANCELLED');

                if (!orderErr && orderData) {
                    orderData.forEach(ord => {
                        const email = ord.customer_email?.toLowerCase();
                        if (!email) return;
                        if (!orderStatsMap[email]) {
                            orderStatsMap[email] = { count: 0, spent: 0 };
                        }
                        orderStatsMap[email].count += 1;
                        orderStatsMap[email].spent += (ord.total || 0);
                    });
                }
            }

            let processed = (data || []).map(cust => {
                const stats = orderStatsMap[cust.email?.toLowerCase()] || { count: 0, spent: 0 };
                return {
                    ...cust,
                    orderCount: stats.count,
                    totalSpent: stats.spent
                };
            });

            // Tab filter for 'has_orders'
            if (activeTab === 'has_orders') {
                processed = processed.filter(c => c.orderCount > 0);
            }

            // In-Memory Sorting for Spent & Orders Count
            if (sortBy === 'spent_desc') {
                processed.sort((a, b) => b.totalSpent - a.totalSpent);
            } else if (sortBy === 'spent_asc') {
                processed.sort((a, b) => a.totalSpent - b.totalSpent);
            } else if (sortBy === 'orders_desc') {
                processed.sort((a, b) => b.orderCount - a.orderCount);
            }

            setCustomers(processed);
            setTotalCount(count || 0);
        } catch (error) {
            console.error('Error fetching customers:', error.message);
        } finally {
            setLoading(false);
        }
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'Desconocido';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'Desconocido';
        return d.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return 'Desconocido';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'Desconocido';
        return d.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function openCreate() {
        setEditingId(null);
        setFormData({
            full_name: '',
            email: '',
            phone: '',
            address: '',
            user_type: 'persona',
            company_name: '',
            vat_id: '',
            tax_document_url: '',
            discount_percent: 0,
            is_partner: false,
            has_pro_prices: false
        });
        setIsModalOpen(true);
    }

    function openEdit(customer) {
        setEditingId(customer.id);
        setFormData({
            full_name: customer.full_name || '',
            email: customer.email || '',
            phone: customer.phone || '',
            address: customer.address || '',
            user_type: customer.user_type || 'persona',
            company_name: customer.company_name || '',
            vat_id: customer.vat_id || '',
            tax_document_url: customer.tax_document_url || '',
            discount_percent: customer.discount_percent || 0,
            is_partner: customer.is_partner || false,
            has_pro_prices: customer.has_pro_prices || false
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
            if (viewingCustomer?.id === id) setViewingCustomer(null);
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    }

    const handleExport = () => {
        const csv = Papa.unparse(customers.map(c => ({
            ID: c.id,
            Fecha_Registro: formatDateTime(c.created_at),
            Nombre: c.full_name,
            Email: c.email,
            Telefono: c.phone || '',
            Direccion: c.address || '',
            Tipo: c.user_type === 'profesional' ? 'Profesional' : 'Particular',
            Empresa: c.company_name || '',
            NIF_CIF: c.vat_id || '',
            Socio_VIP: c.is_partner ? 'SÍ' : 'NO',
            Tarifa_Pro: c.has_pro_prices ? 'SÍ' : 'NO',
            Descuento_Global: `${c.discount_percent || 0}%`,
            Total_Pedidos: c.orderCount || 0,
            Gasto_Total_EUR: (c.totalSpent || 0).toFixed(2)
        })));
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `clientes_mil_luces_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: 'greedy',
            dynamicTyping: true,
            delimiter: "",
            complete: async (results) => {
                const importedData = results.data;
                if (importedData.length === 0) {
                    alert('No se encontraron datos. Verifica el formato del CSV.');
                    return;
                }

                let created = 0;
                let updated = 0;
                let errors = 0;

                for (let i = 0; i < importedData.length; i++) {
                    const row = importedData[i];
                    let email = row.email || row.Email || row['Correo electrónico'];
                    if (!email) {
                        email = Object.values(row).find(v => typeof v === 'string' && v.includes('@') && v.includes('.'));
                    }
                    if (!email || String(email).trim() === '') continue;

                    const cleanEmail = String(email).toLowerCase().trim();
                    let fullName = row.full_name || row['Full name'] || row.Nombre || row.nombre || 'Sin Nombre';

                    const customerData = {
                        full_name: fullName,
                        email: cleanEmail,
                        phone: String(row.Phone || row['Teléfono'] || row.phone || '').trim(),
                        address: String(row.Address || row['Dirección'] || row.address || '').trim(),
                        company_name: String(row.Organization || row.Empresa || '').trim(),
                        vat_id: String(row.vat_id || row['VAT ID'] || row.NIF || '').trim(),
                        is_partner: row.Member === true || row.Member === 'SÍ',
                        discount_percent: parseFloat(row.Descuento || row.discount_percent) || 0,
                        user_type: (row.Organization || row.Empresa) ? 'profesional' : 'persona',
                        has_pro_prices: row.Tarifa_Pro === true || row.Tarifa_Pro === 'SÍ' || row.has_pro_prices === true
                    };

                    try {
                        const { data: existing } = await supabase.from('customers').select('id').eq('email', cleanEmail).maybeSingle();
                        if (existing) {
                            await supabase.from('customers').update(customerData).eq('id', existing.id);
                            updated++;
                        } else {
                            await supabase.from('customers').insert([customerData]);
                            created++;
                        }
                    } catch (err) {
                        errors++;
                    }
                }

                alert(`IMPORTACIÓN FINALIZADA:\n✅ ${created} Creados | 🔄 ${updated} Actualizados | ❌ ${errors} Errores`);
                fetchCustomers();
            }
        });
    };

    const customerCounts = {
        all: totalCount || customers.length,
        persona: customers.filter(c => (c.user_type || 'persona') === 'persona').length,
        profesional: customers.filter(c => c.user_type === 'profesional').length,
        partner: customers.filter(c => c.is_partner).length,
        has_orders: customers.filter(c => c.orderCount > 0).length
    };

    return (
        <div className="pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 font-outfit">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block">Customer Relations</span>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">
                        Base de <span className="text-primary/40">Clientes</span>
                    </h1>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-3 bg-brand-carbon text-white h-14 px-8 rounded-2xl font-black uppercase italic text-[10px] shadow-2xl hover:bg-primary transition-all group"
                >
                    <Plus className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform" />
                    Registrar Cliente
                </button>
            </div>

            {/* Filter & Controls Card */}
            <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100">
                <div className="p-8 border-b border-gray-100 bg-gray-50/20 space-y-6">
                    <div className="flex flex-col xl:flex-row gap-6 items-stretch xl:items-center justify-between">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[280px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="BUSCAR POR NOMBRE, EMAIL O TELÉFONO..."
                                className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Sort Selector */}
                        <div className="flex items-center gap-3 bg-white p-2 border border-gray-200 rounded-2xl shadow-sm">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-3 flex items-center gap-2">
                                <ArrowUpDown className="w-3.5 h-3.5 text-primary" /> Ordenar:
                            </span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-brand-carbon py-2.5 px-4 rounded-xl outline-none cursor-pointer hover:bg-gray-100 transition-colors border-none"
                            >
                                <option value="created_at_desc">📅 Registro: Más Recientes</option>
                                <option value="created_at_asc">📅 Registro: Más Antiguos</option>
                                <option value="spent_desc">💎 Mayor Gasto Total</option>
                                <option value="orders_desc">📦 Más Pedidos Realizados</option>
                                <option value="name_asc">🔤 Nombre (A-Z)</option>
                                <option value="name_desc">🔤 Nombre (Z-A)</option>
                            </select>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                        {[
                            { id: 'all', label: 'Todos', count: customerCounts.all },
                            { id: 'persona', label: 'Particulares (B2C)', count: customerCounts.persona },
                            { id: 'profesional', label: 'Profesionales (B2B)', count: customerCounts.profesional },
                            { id: 'partner', label: 'Socios VIP', count: customerCounts.partner },
                            { id: 'has_orders', label: 'Con Compras', count: customerCounts.has_orders }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${activeTab === tab.id
                                        ? 'bg-brand-carbon text-white shadow-lg scale-[1.02]'
                                        : 'bg-white text-gray-400 hover:text-brand-carbon hover:bg-gray-100 border border-gray-100'
                                    }`}
                            >
                                {tab.label}
                                <span className={`px-2 py-0.5 rounded-md text-[8px] ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table Content */}
                {loading ? (
                    <div className="p-24 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary/20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Cargando base de clientes...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/60 border-b border-gray-100">
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Identidad</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Contacto</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha de Registro</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Actividad & Gasto</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Segmentación</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {customers.length > 0 ? customers.map((customer) => (
                                        <tr key={customer.id} className="group hover:bg-gray-50/40 transition-all">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-brand-carbon text-white flex items-center justify-center font-black italic text-base shadow-md group-hover:bg-primary transition-colors shrink-0">
                                                        {customer.full_name?.charAt(0)?.toUpperCase() || 'C'}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black uppercase italic text-brand-carbon leading-tight">{customer.full_name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ref: {customer.id.slice(0, 8)}</span>
                                                            {customer.user_type === 'profesional' && (
                                                                <span className="text-[8px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                                                    PRO
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-6">
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-[11px] font-bold text-gray-700 flex items-center gap-2">
                                                        <Mail className="w-3.5 h-3.5 text-primary shrink-0" /> {customer.email}
                                                    </p>
                                                    {customer.phone && (
                                                        <p className="text-[10px] font-bold text-gray-400 pl-5">{customer.phone}</p>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-6">
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    <div>
                                                        <p className="text-[11px] font-black text-brand-carbon leading-tight">
                                                            {formatDate(customer.created_at)}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-gray-400">
                                                            {formatDateTime(customer.created_at).split(',')[1] || ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-6">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-emerald-600">{(customer.totalSpent || 0).toFixed(2)} €</span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1.5">
                                                        <ShoppingCart className="w-3 h-3 text-brand-carbon" />
                                                        {customer.orderCount || 0} {customer.orderCount === 1 ? 'pedido' : 'pedidos'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="p-6">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {customer.is_partner && (
                                                        <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                                            <Star className="w-2.5 h-2.5 fill-amber-400" /> VIP
                                                        </span>
                                                    )}
                                                    {customer.has_pro_prices && (
                                                        <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                            Tarifa PRO
                                                        </span>
                                                    )}
                                                    {customer.discount_percent > 0 && (
                                                        <span className="text-[8px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                                            -{customer.discount_percent}% Desc.
                                                        </span>
                                                    )}
                                                    {!customer.is_partner && !customer.has_pro_prices && !(customer.discount_percent > 0) && (
                                                        <span className="text-[8px] font-bold text-gray-300 italic">Estándar</span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-6 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => setViewingCustomer(customer)}
                                                        className="p-2.5 text-gray-400 hover:text-brand-carbon hover:bg-gray-100 rounded-xl transition-all"
                                                        title="Ver Ficha Completa"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(customer)}
                                                        className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                        title="Editar Cliente"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteCustomer(customer.id)}
                                                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Eliminar Perfil"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="p-24 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-300">
                                                    <User className="w-16 h-16 mb-4 opacity-20" />
                                                    <p className="text-xs font-black uppercase tracking-[.4em]">Sin clientes registrados</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalCount > pageSize && (
                            <div className="p-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-50/30">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Mostrando <span className="text-primary">{customers.length}</span> de <span className="text-brand-carbon">{totalCount}</span> registros
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                        disabled={page === 1}
                                        className="p-3.5 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-primary disabled:opacity-30 transition-all shadow-sm"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="px-4 text-[10px] font-black text-brand-carbon">
                                        Página {page} de {Math.ceil(totalCount / pageSize)}
                                    </span>
                                    <button
                                        onClick={() => setPage(prev => Math.min(Math.ceil(totalCount / pageSize), prev + 1))}
                                        disabled={page >= Math.ceil(totalCount / pageSize)}
                                        className="p-3.5 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-primary disabled:opacity-30 transition-all shadow-sm"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Import / Export Footer Bar */}
                <div className="p-8 bg-neutral-900 text-white flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                            <Star className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase italic tracking-wider">Gestor Centralizado de Clientes</p>
                            <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">
                                Base sincronizada en tiempo real con Supabase
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="px-6 py-3.5 bg-white/10 text-white rounded-xl font-black uppercase italic text-[10px] hover:bg-primary transition-all cursor-pointer flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Importar (.CSV)
                            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
                        </label>
                        <button
                            onClick={handleExport}
                            className="px-6 py-3.5 bg-white text-black rounded-xl font-black uppercase italic text-[10px] hover:bg-primary hover:text-white transition-all flex items-center gap-2 shadow-lg"
                        >
                            <Download className="w-4 h-4" />
                            Exportar (.CSV)
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Customer Detail Drawer / Modal */}
            {viewingCustomer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    <div className="fixed inset-0 bg-brand-carbon/60 backdrop-blur-sm" onClick={() => setViewingCustomer(null)}></div>
                    <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto border border-gray-100">
                        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-brand-carbon text-white flex items-center justify-center font-black italic text-xl shadow-lg">
                                    {viewingCustomer.full_name?.charAt(0)?.toUpperCase() || 'C'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase italic tracking-tight text-brand-carbon">
                                        {viewingCustomer.full_name}
                                    </h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                        Ref: {viewingCustomer.id}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setViewingCustomer(null)} className="p-3 hover:bg-gray-200/50 rounded-full transition-all">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 text-xs">
                            {/* Summary Badges */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <span className="text-[9px] font-black uppercase text-emerald-600 block mb-1">Gasto Acumulado</span>
                                    <span className="text-base font-black text-emerald-700">{(viewingCustomer.totalSpent || 0).toFixed(2)} €</span>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                    <span className="text-[9px] font-black uppercase text-blue-600 block mb-1">Total Pedidos</span>
                                    <span className="text-base font-black text-blue-700">{viewingCustomer.orderCount || 0} pedidos</span>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 col-span-2 sm:col-span-1">
                                    <span className="text-[9px] font-black uppercase text-purple-600 block mb-1">Tipo de Cliente</span>
                                    <span className="text-xs font-black text-purple-700 uppercase">
                                        {viewingCustomer.user_type === 'profesional' ? 'Profesional (B2B)' : 'Particular (B2C)'}
                                    </span>
                                </div>
                            </div>

                            {/* Contact & Registration Data */}
                            <div className="space-y-3 bg-gray-50/60 p-5 rounded-2xl border border-gray-100">
                                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-[10px] font-black uppercase text-gray-400">Email:</span>
                                    <span className="font-bold text-brand-carbon">{viewingCustomer.email}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-[10px] font-black uppercase text-gray-400">Teléfono:</span>
                                    <span className="font-bold text-brand-carbon">{viewingCustomer.phone || 'No registrado'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-[10px] font-black uppercase text-gray-400">Fecha de Alta:</span>
                                    <span className="font-bold text-brand-carbon">{formatDateTime(viewingCustomer.created_at)}</span>
                                </div>
                                {viewingCustomer.company_name && (
                                    <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                        <span className="text-[10px] font-black uppercase text-gray-400">Empresa:</span>
                                        <span className="font-bold text-brand-carbon">{viewingCustomer.company_name}</span>
                                    </div>
                                )}
                                {viewingCustomer.vat_id && (
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-[10px] font-black uppercase text-gray-400">NIF / CIF:</span>
                                        <span className="font-bold text-brand-carbon">{viewingCustomer.vat_id}</span>
                                    </div>
                                )}
                            </div>

                            {/* Address */}
                            {viewingCustomer.address && (
                                <div className="bg-gray-50/60 p-5 rounded-2xl border border-gray-100">
                                    <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Dirección de Envío:</span>
                                    <p className="font-bold text-brand-carbon leading-relaxed">{viewingCustomer.address}</p>
                                </div>
                            )}

                            {/* Tax Document Link if present */}
                            {viewingCustomer.tax_document_url && (
                                <a
                                    href={viewingCustomer.tax_document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 font-black uppercase text-[10px] flex items-center justify-between hover:bg-blue-100 transition-colors"
                                >
                                    <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Documento Fiscal Aportado</span>
                                    <span>Ver Archivo ↗</span>
                                </a>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
                            <button
                                onClick={() => {
                                    const c = viewingCustomer;
                                    setViewingCustomer(null);
                                    openEdit(c);
                                }}
                                className="flex-1 bg-brand-carbon text-white py-3.5 rounded-xl font-black uppercase italic text-[10px] hover:bg-primary transition-colors flex items-center justify-center gap-2"
                            >
                                <Edit2 className="w-3.5 h-3.5 text-primary" /> Editar Perfil
                            </button>
                            <button
                                onClick={() => setViewingCustomer(null)}
                                className="px-6 bg-gray-200 text-gray-700 py-3.5 rounded-xl font-black uppercase italic text-[10px] hover:bg-gray-300 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
                    <div className="fixed inset-0 bg-brand-carbon/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto border border-gray-100">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-black uppercase italic tracking-tight text-brand-carbon">
                                    {editingId ? 'Editar' : 'Nuevo'} <span className="text-primary/40">Cliente</span>
                                </h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Información del perfil de cliente</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-200/50 rounded-full transition-all">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 text-xs">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Perfil de Segmentación</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, user_type: 'persona' })}
                                        className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 font-black uppercase text-[10px] ${formData.user_type === 'persona'
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-gray-100 bg-gray-50 text-gray-400'
                                            }`}
                                    >
                                        <User className="w-4 h-4" /> Particular (B2C)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, user_type: 'profesional' })}
                                        className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 font-black uppercase text-[10px] ${formData.user_type === 'profesional'
                                                ? 'border-brand-carbon bg-brand-carbon text-white'
                                                : 'border-gray-100 bg-gray-50 text-gray-400'
                                            }`}
                                    >
                                        <ShoppingBag className="w-4 h-4" /> Profesional (B2B)
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nombre Completo *</label>
                                    <input
                                        required
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Contacto *</label>
                                    <input
                                        required
                                        type="email"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Teléfono</label>
                                    <input
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+34 600 000 000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Descuento Global (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                        value={formData.discount_percent}
                                        onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {formData.user_type === 'profesional' && (
                                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-primary focus:ring-primary/20"
                                            checked={formData.has_pro_prices}
                                            onChange={(e) => setFormData({ ...formData, has_pro_prices: e.target.checked })}
                                        />
                                        <span className="text-[10px] font-black uppercase text-brand-carbon">Activar tarifas profesionales B2B</span>
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <input
                                            className="bg-white border border-gray-200 rounded-xl p-3 font-bold text-xs"
                                            value={formData.company_name}
                                            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                            placeholder="Nombre de Empresa"
                                        />
                                        <input
                                            className="bg-white border border-gray-200 rounded-xl p-3 font-bold text-xs"
                                            value={formData.vat_id}
                                            onChange={(e) => setFormData({ ...formData, vat_id: e.target.value })}
                                            placeholder="NIF / CIF"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="is_partner_chk"
                                    className="w-4 h-4 rounded text-primary focus:ring-primary/20"
                                    checked={formData.is_partner}
                                    onChange={(e) => setFormData({ ...formData, is_partner: e.target.checked })}
                                />
                                <label htmlFor="is_partner_chk" className="text-[10px] font-black uppercase text-brand-carbon cursor-pointer">
                                    Socio VIP / Partner
                                </label>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Dirección de Envío Principal</label>
                                <textarea
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-primary/20 resize-none h-24"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Calle, Ciudad, Código Postal..."
                                ></textarea>
                            </div>

                            <div className="pt-4">
                                <button
                                    disabled={isSaving}
                                    className="w-full bg-brand-carbon text-white py-4 rounded-xl font-black uppercase italic text-[11px] shadow-xl hover:bg-primary transition-all flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                                    {editingId ? 'Guardar Cambios' : 'Crear Registro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
