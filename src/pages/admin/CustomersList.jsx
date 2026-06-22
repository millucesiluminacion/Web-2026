import { useState, useEffect } from 'react';
import { Search, Loader2, User, Mail, Calendar, Trash2, Edit2, ShoppingBag, X, Star, Plus, Download, Upload, FileText, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Papa from 'papaparse';

export default function CustomersList() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 50;

    const [activeTab, setActiveTab] = useState('all'); // all, persona, profesional
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        user_type: 'persona',
        company_name: '',
        vat_id: '',
        discount_percent: 0,
        is_partner: false
    });

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isModalOpen]);

    useEffect(() => {
        fetchCustomers();
    }, [page, searchQuery, activeTab]);

    async function fetchCustomers() {
        try {
            setLoading(true);
            let query = supabase
                .from('customers')
                .select('*', { count: 'exact' });

            if (searchQuery) {
                query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
            }

            if (activeTab !== 'all') {
                query = query.eq('user_type', activeTab);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            // Calculate Total Spent (Bird's-eye view)
            const customersWithSpend = await Promise.all((data || []).map(async (cust) => {
                const { data: orderData } = await supabase
                    .from('orders')
                    .select('total')
                    .eq('customer_email', cust.email)
                    .neq('status', 'CANCELLED');

                const totalSpent = (orderData || []).reduce((acc, curr) => acc + (curr.total || 0), 0);
                return { ...cust, totalSpent };
            }));

            setCustomers(customersWithSpend);
            setTotalCount(count || 0);
        } catch (error) {
            console.error('Error fetching customers:', error.message);
        } finally {
            setLoading(false);
        }
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
            is_partner: false
        });
        setIsModalOpen(true);
    }

    function openEdit(customer) {
        setEditingId(customer.id);
        setFormData({
            full_name: customer.full_name,
            email: customer.email,
            phone: customer.phone || '',
            address: customer.address || '',
            user_type: customer.user_type || 'persona',
            company_name: customer.company_name || '',
            vat_id: customer.vat_id || '',
            tax_document_url: customer.tax_document_url || '',
            discount_percent: customer.discount_percent || 0,
            is_partner: customer.is_partner || false
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

    const handleExport = () => {
        const csv = Papa.unparse(customers.map(c => ({
            ID: c.id,
            Nombre: c.full_name,
            Email: c.email,
            Teléfono: c.phone || '',
            Dirección: c.address || '',
            Tipo: c.user_type === 'profesional' ? 'Profesional' : 'Particular',
            Empresa: c.company_name || '',
            NIF_CIF: c.vat_id || '',
            Socio: c.is_partner ? 'SÍ' : 'NO',
            Descuento: `${c.discount_percent || 0}%`,
            Creado: c.created_at
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
            delimiter: "", // Auto-detect delimiter explicitly
            complete: async (results) => {
                const importedData = results.data;
                const headers = results.meta.fields || [];
                const errors_papa = results.errors;

                if (importedData.length === 0) {
                    alert('No se encontraron datos. Verifica el formato del CSV.');
                    return;
                }

                console.log('--- DEBUG IMPORTACIÓN ---');
                console.log('Headers detectados:', headers);
                console.log('Total filas PapaParse:', importedData.length);
                if (errors_papa.length > 0) console.warn('Errores de parsing:', errors_papa);

                let created = 0;
                let updated = 0;
                let errors = 0;
                let skipped = 0;
                const processedEmails = new Set();
                let duplicatesInFile = 0;

                // Muestreo para diagnóstico
                const skippedSamples = [];

                for (let i = 0; i < importedData.length; i++) {
                    const row = importedData[i];

                    // 1. Detección de Email ultra-agresiva
                    let email = '';
                    // Prioridad 1: Columna directa
                    const emailKey = Object.keys(row).find(k => k.toLowerCase().trim() === 'email' || k.toLowerCase().includes('correo'));
                    if (emailKey) email = row[emailKey];

                    // Prioridad 2: Buscar un valor con @ en cualquier columna
                    if (!email) {
                        email = Object.values(row).find(v => typeof v === 'string' && v.includes('@') && v.includes('.'));
                    }

                    if (!email || String(email).trim() === '') {
                        skipped++;
                        if (skippedSamples.length < 3) skippedSamples.push(JSON.stringify(row).slice(0, 50));
                        continue;
                    }

                    const cleanEmail = String(email).toLowerCase().trim();

                    if (processedEmails.has(cleanEmail)) {
                        duplicatesInFile++;
                    }
                    processedEmails.add(cleanEmail);

                    // 2. Nombre
                    let fullName = row.full_name || row['Full name'] || row.Nombre || row.nombre;
                    if (!fullName) {
                        const first = row['First name'] || row.Name || row.name || '';
                        const last = row['Last name'] || row.Surname || '';
                        fullName = `${first} ${last}`.trim();
                    }
                    if (!fullName || fullName === ' ') fullName = 'Sin Nombre';

                    // 3. Dirección
                    const addressParts = [
                        row.Address1 || row['Dirección 1'] || row.address,
                        row.Address2 || row['Dirección 2'],
                        row.City || row.Ciudad,
                        row['Postal code'] || row.CP || row.Zip
                    ].filter(Boolean);

                    const customerData = {
                        full_name: fullName,
                        email: cleanEmail,
                        phone: String(row.Phone || row['Teléfono'] || row.phone || '').trim(),
                        address: addressParts.join(', '),
                        company_name: String(row.Organization || row.Empresa || '').trim(),
                        vat_id: String(row.vat_id || row['VAT ID'] || row.NIF || '').trim(),
                        is_partner: row.Member === true || row.Member === 'true' || row.Member === 'SÍ',
                        discount_percent: parseFloat(row.Descuento || row.discount_percent) || 0,
                        user_type: (row.Organization || row['Job title']?.toLowerCase().includes('pro')) ? 'profesional' : 'persona',
                        metadata: { ...row, imported_at: new Date().toISOString() }
                    };

                    try {
                        const { data: existing } = await supabase.from('customers').select('id').eq('email', cleanEmail).maybeSingle();

                        if (existing) {
                            const { error } = await supabase.from('customers').update(customerData).eq('id', existing.id);
                            if (error) throw error;
                            updated++;
                        } else {
                            const { error } = await supabase.from('customers').insert([customerData]);
                            if (error) throw error;
                            created++;
                        }

                        // Sincronización de Newsletter (Opcional, no bloquea el proceso)
                        const isSubscriber =
                            row.Subscriber === true || row.Subscriber === 'true' || row.Subscriber === 'SÍ' ||
                            row['Blog subscriber'] === true || row['Blog subscriber'] === 'true';

                        if (isSubscriber) {
                            try {
                                await supabase.from('newsletter_subscribers').upsert(
                                    { email: cleanEmail, is_active: true },
                                    { onConflict: 'email' }
                                );
                            } catch (nErr) { console.warn('Newsletter sync error:', nErr); }
                        }
                    } catch (err) {
                        console.error(`Error en fila ${i}:`, err);
                        errors++;
                    }
                }

                alert(
                    `IMPORTACIÓN FINALIZADA CON ÉXITO:\n\n` +
                    `✅ ${created} Clientes creados\n` +
                    `🔄 ${updated} Clientes actualizados\n` +
                    `👥 ${duplicatesInFile} Correos duplicados en el archivo\n` +
                    `❌ ${errors} Errores críticos\n` +
                    `⚠️ ${skipped} Filas sin email ignoradas\n\n` +
                    `Total de clientes únicos en tu base de datos: ${processedEmails.size}`
                );
                fetchCustomers();
            }
        });
    };

    const filteredCustomers = customers.filter(c => {
        const matchesSearch =
            c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesTab =
            activeTab === 'all' ||
            (c.user_type || 'persona') === activeTab;

        return matchesSearch && matchesTab;
    });

    const customerCounts = {
        all: customers.length,
        persona: customers.filter(c => (c.user_type || 'persona') === 'persona').length,
        profesional: customers.filter(c => c.user_type === 'profesional').length
    };

    return (
        <div className="pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block font-outfit">Customer Relations</span>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter font-outfit">
                        Base de <span className="text-primary/40">Clientes</span>
                    </h1>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-3 bg-brand-carbon text-white h-14 px-8 rounded-2xl font-black uppercase italic text-[10px] shadow-2xl hover:bg-primary transition-all group font-outfit"
                >
                    <Plus className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform" />
                    Registrar Cliente
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100">
                <div className="p-8 border-b border-gray-100 bg-gray-50/20 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-col md:flex-row gap-6 items-center justify-between w-full">
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

                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                            {[
                                { id: 'all', label: 'Todos', count: customerCounts.all },
                                { id: 'persona', label: 'Particulares', count: customerCounts.persona },
                                { id: 'profesional', label: 'Profesionales', count: customerCounts.profesional }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === tab.id
                                        ? 'bg-brand-carbon text-white shadow-lg'
                                        : 'text-gray-400 hover:text-brand-carbon hover:bg-gray-50'
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
                </div>

                {loading ? (
                    <div className="p-24 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary/20" />
                        <p className="text-[10px] font-black uppercase tracking-widest font-outfit">Sincronizando Boutique CRM...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400 font-outfit">Identidad</th>
                                        <th className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400 font-outfit">Contacto</th>
                                        <th className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400 font-outfit">Gasto Total</th>
                                        <th className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400 font-outfit">Doc. Fiscal</th>
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
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-outfit">Ref: {customer.id.slice(0, 8)}</span>
                                                            {customer.user_type === 'profesional' && (
                                                                <span className="text-[8px] font-black text-primary uppercase bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                                                    PRO
                                                                </span>
                                                            )}
                                                        </div>
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
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-emerald-600 font-outfit">{(customer.totalSpent || 0).toFixed(2)} €</span>
                                                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">Inversión Boutique</span>
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                {customer.tax_document_url ? (
                                                    <a
                                                        href={customer.tax_document_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all uppercase flex items-center gap-2 w-fit"
                                                    >
                                                        <FileText className="w-3 h-3" /> Ver Documento
                                                    </a>
                                                ) : (
                                                    <span className="text-[8px] font-bold text-gray-300 uppercase italic">No aportado</span>
                                                )}
                                            </td>
                                            <td className="p-8 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEdit(customer)}
                                                        className="p-3 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                        title="Editar Datos"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteCustomer(customer.id)}
                                                        className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Eliminar Perfil"
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


                        {/* Pagination Controls */}
                        {totalCount > pageSize && (
                            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-luxury animate-in fade-in slide-in-from-bottom-4 duration-700 font-outfit mx-8 mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="flex -space-x-2">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center text-primary font-black text-xs">
                                            {Math.ceil(totalCount / pageSize)}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-carbon italic">CRM - Clientes</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">
                                            Mostrando <span className="text-primary">{customers.length}</span> de <span className="text-brand-carbon">{totalCount}</span> clientes
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                        disabled={page === 1}
                                        className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary disabled:opacity-30 disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all shadow-sm"
                                    >
                                        <ChevronRight className="w-6 h-6 rotate-180" />
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {[...Array(Math.min(5, Math.ceil(totalCount / pageSize)))].map((_, i) => {
                                            const pageNum = i + 1;
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setPage(pageNum)}
                                                    className={`w-12 h-12 rounded-xl text-[10px] font-black transition-all ${page === pageNum ? 'bg-brand-carbon text-white shadow-lg scale-110' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                        {Math.ceil(totalCount / pageSize) > 5 && <span className="px-2 text-gray-300">...</span>}
                                    </div>

                                    <button
                                        onClick={() => setPage(prev => Math.min(Math.ceil(totalCount / pageSize), prev + 1))}
                                        disabled={page >= Math.ceil(totalCount / pageSize)}
                                        className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary disabled:opacity-30 disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all shadow-sm"
                                    >
                                        <ChevronRight className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Loyalty Widget */}
                <div className="mt-10 bg-neutral-900 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 text-white">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400">
                            <Star className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase italic tracking-widest font-outfit">Programa de Fidelizacion Activo</p>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1 leading-relaxed font-outfit max-w-xl">
                                Visualización en tiempo real de los usuarios integrados con tu base de datos central de Supabase.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-6 relative z-10">
                        <label className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-[1.2rem] font-black uppercase italic text-xs hover:bg-primary hover:border-primary transition-all cursor-pointer font-outfit shadow-xl flex items-center gap-3">
                            <Upload className="w-4 h-4" />
                            Importar (.CSV)
                            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
                        </label>
                        <button
                            onClick={handleExport}
                            className="px-10 py-4 bg-white text-black rounded-[1.2rem] font-black uppercase italic text-xs hover:bg-blue-400 hover:text-white transition-all shadow-xl shadow-black/50 font-outfit flex items-center gap-3"
                        >
                            <Download className="w-4 h-4" />
                            Exportar Base (.CSV)
                        </button>
                    </div>
                </div>

                {/* Modal de Cliente */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-12 overflow-y-auto">
                        <div className="fixed inset-0 bg-brand-carbon/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
                        <div className="relative bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-auto">
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
                                    <div className="md:col-span-2 space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">Perfil de Segmentación</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, user_type: 'persona' })}
                                                className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${formData.user_type === 'persona'
                                                    ? 'border-primary bg-primary/5 text-primary shadow-xl shadow-primary/10'
                                                    : 'border-gray-50 bg-gray-50/50 text-gray-400 hover:border-gray-100'}`}
                                            >
                                                <User className="w-6 h-6" />
                                                <span className="text-[10px] font-black uppercase tracking-widest font-outfit">Particular (B2C)</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, user_type: 'profesional' })}
                                                className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${formData.user_type === 'profesional'
                                                    ? 'border-brand-carbon bg-brand-carbon text-white shadow-xl shadow-black/10'
                                                    : 'border-gray-50 bg-gray-50/50 text-gray-400 hover:border-gray-100'}`}
                                            >
                                                <ShoppingBag className="w-6 h-6" />
                                                <span className="text-[10px] font-black uppercase tracking-widest font-outfit">Profesional (B2B)</span>
                                            </button>
                                        </div>
                                    </div>
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
                                </div>

                                {formData.user_type === 'profesional' && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">Nombre de Empresa</label>
                                            <input
                                                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                                value={formData.company_name}
                                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                                placeholder="Fiscal Name"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">NIF / CIF</label>
                                            <input
                                                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                                value={formData.vat_id}
                                                onChange={(e) => setFormData({ ...formData, vat_id: e.target.value })}
                                                placeholder="Tax ID"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">URL Documento Fiscal</label>
                                            <input
                                                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                                value={formData.tax_document_url}
                                                onChange={(e) => setFormData({ ...formData, tax_document_url: e.target.value })}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">Email de Contacto</label>
                                        <input
                                            required
                                            type="email"
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">Teléfono Directo</label>
                                        <input
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="+34 600 000 000"
                                        />
                                    </div>
                                </div>
                                <div className="p-6 bg-brand-carbon/5 rounded-3xl space-y-6">
                                    <p className="text-[10px] font-black uppercase tracking-[.3em] text-primary/60 font-outfit">Programa de Fidelización</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="checkbox"
                                                id="is_partner"
                                                className="w-5 h-5 rounded-lg border-gray-300 text-primary focus:ring-primary/20"
                                                checked={formData.is_partner}
                                                onChange={(e) => setFormData({ ...formData, is_partner: e.target.checked })}
                                            />
                                            <label htmlFor="is_partner" className="text-[11px] font-black uppercase text-brand-carbon italic font-outfit cursor-pointer">Es Socio VIP / Partner</label>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">Descuento Global (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                className="w-full bg-white border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                                value={formData.discount_percent}
                                                onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })}
                                                placeholder="Ej: 10"
                                            />
                                        </div>
                                    </div>
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
        </div>
    );
}
