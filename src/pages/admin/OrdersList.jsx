import { useState, useEffect } from 'react';
import { Search, Loader2, Eye, Truck, CheckCircle, Clock, XCircle, X, MapPin, Phone, Mail, Package, CreditCard as CardIcon, Plus, Minus, Trash2, ChevronRight, ChevronLeft, Download, Printer, Filter, MoreVertical, Trash, User } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function OrdersList() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('ALL');
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [isBulkLoading, setIsBulkLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [orderItems, setOrderItems] = useState([]);
    const [fetchingItems, setFetchingItems] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize] = useState(50);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({
        days7: { total: 0, count: 0 },
        days30: { total: 0, count: 0 },
        days90: { total: 0, count: 0 }
    });

    // Manual Order Creation States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [step, setStep] = useState(1); // 1: Customer, 2: Products, 3: Finalize
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [cart, setCart] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [orderForm, setOrderForm] = useState({
        status: 'PENDING',
        payment_method: 'TRANSFERENCIA',
    });

    useEffect(() => {
        fetchOrders();
    }, [page, statusFilter, dateFilter, searchQuery]); // Recargar al cambiar página o filtros

    async function fetchOrders() {
        try {
            setLoading(true);
            let query = supabase
                .from('orders')
                .select('*', { count: 'exact' });

            // Apply Server-side Filters
            if (searchQuery) {
                query = query.or(`id.ilike.%${searchQuery}%,customer_email.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%`);
            }
            if (statusFilter !== 'ALL') {
                query = query.eq('status', statusFilter);
            }
            if (dateFilter !== 'ALL') {
                const now = new Date();
                let cutoff;
                if (dateFilter === 'TODAY') cutoff = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                if (dateFilter === 'WEEK') cutoff = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString();
                if (dateFilter === 'MONTH') cutoff = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString();
                if (cutoff) query = query.gte('created_at', cutoff);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            setOrders(data || []);
            setTotalCount(count || 0);
            calculateStats(data || []);
        } catch (error) {
            console.error('Error fetching orders:', error.message);
        } finally {
            setLoading(false);
        }
    }

    function calculateStats(ordersData) {
        const now = new Date();
        const getStatsForDays = (days) => {
            const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
            const filtered = ordersData.filter(o => new Date(o.created_at) >= cutoff && o.status !== 'CANCELLED');
            return {
                count: filtered.length,
                total: filtered.reduce((acc, curr) => acc + (curr.total || 0), 0)
            };
        };

        setStats({
            days7: getStatsForDays(7),
            days30: getStatsForDays(30),
            days90: getStatsForDays(90)
        });
    }

    async function fetchCreateData() {
        const { data: custData } = await supabase.from('customers').select('*').order('full_name');
        const { data: prodData } = await supabase.from('products').select('*').order('name');
        setCustomers(custData || []);
        setProducts(prodData || []);
    }

    const openCreateModal = () => {
        setStep(1);
        setSelectedCustomer(null);
        setCart([]);
        setOrderForm({ status: 'PENDING', payment_method: 'TRANSFERENCIA' });
        setIsCreateModalOpen(true);
        fetchCreateData();
    };

    const addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
    };

    const updateQuantity = (id, delta) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));

    const calculateTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    async function handleCreateOrder() {
        if (!selectedCustomer || cart.length === 0) return;
        try {
            setIsCreating(true);
            const total = calculateTotal();

            // 1. Create Order
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    customer_id: selectedCustomer.id,
                    customer_name: selectedCustomer.full_name,
                    customer_email: selectedCustomer.email,
                    customer_phone: selectedCustomer.phone,
                    shipping_address: selectedCustomer.address,
                    total: total,
                    status: orderForm.status,
                    payment_method: orderForm.payment_method,
                    payment_status: orderForm.status === 'PAID' ? 'PAID' : 'PENDING'
                }])
                .select()
                .maybeSingle();

            if (orderError) throw orderError;

            // 2. Create Order Items
            const itemsToInsert = cart.map(item => ({
                order_id: order.id,
                product_id: item.id,
                product_name: item.name,
                quantity: item.quantity,
                unit_price: item.price
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            setIsCreateModalOpen(false);
            fetchOrders();
        } catch (error) {
            alert('Error al crear pedido: ' + error.message);
        } finally {
            setIsCreating(false);
        }
    }

    async function fetchOrderItems(orderId) {
        try {
            setFetchingItems(true);
            const { data, error } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);

            if (error) throw error;
            setOrderItems(data || []);
        } catch (error) {
            console.error('Error fetching items:', error.message);
        } finally {
            setFetchingItems(false);
        }
    }

    const handleViewOrder = (order) => {
        setSelectedOrder(order);
        setAdminNotes(order.admin_notes || '');
        fetchOrderItems(order.id);
    };

    async function saveAdminNotes() {
        if (!selectedOrder) return;
        try {
            const { error } = await supabase
                .from('orders')
                .update({ admin_notes: adminNotes })
                .eq('id', selectedOrder.id);
            if (error) throw error;
            setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, admin_notes: adminNotes } : o));
            setSelectedOrder({ ...selectedOrder, admin_notes: adminNotes });
            alert('Notas guardadas');
        } catch (error) {
            alert('Error guardando notas: ' + error.message);
        }
    }

    const printOrder = () => {
        document.body.classList.add('is-printing');
        window.print();
        setTimeout(() => {
            document.body.classList.remove('is-printing');
        }, 100);
    };

    const exportToCSV = () => {
        if (filteredOrders.length === 0) return alert('No hay pedidos para exportar');
        const headers = ['ID', 'Fecha', 'Cliente', 'Email', 'Telefono', 'Total', 'Estado', 'Metodo Pago', 'Direccion', 'CP', 'Ciudad', 'Notas Cliente', 'Notas Admin'];
        const rows = filteredOrders.map(o => [
            o.id,
            new Date(o.created_at).toLocaleString(),
            o.customer_name || '',
            o.customer_email || '',
            o.customer_phone || '',
            o.total || 0,
            o.status || '',
            o.payment_method || '',
            o.shipping_address || '',
            o.shipping_zip || '',
            o.shipping_city || '',
            o.notes || '',
            o.admin_notes || ''
        ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `pedidos_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleSelectOrder = (id) => {
        setSelectedOrders(prev => prev.includes(id) ? prev.filter(orderId => orderId !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedOrders.length === filteredOrders.length) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(filteredOrders.map(o => o.id));
        }
    };

    async function handleBulkDelete() {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar ${selectedOrders.length} pedido(s)? Esta acción no se puede deshacer.`)) return;
        setIsBulkLoading(true);
        try {
            const { error } = await supabase.from('orders').delete().in('id', selectedOrders);
            if (error) throw error;
            setOrders(orders.filter(o => !selectedOrders.includes(o.id)));
            setSelectedOrders([]);
        } catch (error) {
            alert('Error al eliminar pedidos: ' + error.message);
        } finally {
            setIsBulkLoading(false);
        }
    }

    async function handleBulkStatusChange(newStatus) {
        if (!newStatus) return;
        setIsBulkLoading(true);
        try {
            // Restore stock if transitioning to CANCELLED or RETURNED
            if (newStatus === 'CANCELLED' || newStatus === 'RETURNED') {
                for (const orderId of selectedOrders) {
                    const orderToCancel = orders.find(o => o.id === orderId);
                    if (orderToCancel && orderToCancel.status !== 'CANCELLED' && orderToCancel.status !== 'RETURNED') {
                        const { data: items } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', orderId);
                        if (items) {
                            for (const item of items) {
                                const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
                                if (prod) {
                                    await supabase.from('products').update({ stock: prod.stock + item.quantity }).eq('id', item.product_id);
                                }
                            }
                        }
                    }
                }
            }

            const { error } = await supabase.from('orders').update({ status: newStatus }).in('id', selectedOrders);
            if (error) throw error;
            setOrders(orders.map(o => selectedOrders.includes(o.id) ? { ...o, status: newStatus } : o));
            setSelectedOrders([]);
        } catch (error) {
            alert('Error al actualizar estados: ' + error.message);
        } finally {
            setIsBulkLoading(false);
        }
    }

    async function handleDeleteSingle(id) {
        if (!window.confirm('¿Eliminar este pedido definitivamente?')) return;
        try {
            const { error } = await supabase.from('orders').delete().eq('id', id);
            if (error) throw error;
            setOrders(orders.filter(o => o.id !== id));
            setSelectedOrders(selectedOrders.filter(selectedId => selectedId !== id));
        } catch (error) {
            alert('Error al eliminar pedido: ' + error.message);
        }
    }

    async function updateStatus(id, newStatus) {
        try {
            const currentOrder = orders.find(o => o.id === id);

            // Restore stock on cancellation/return
            if (currentOrder && (newStatus === 'CANCELLED' || newStatus === 'RETURNED') &&
                currentOrder.status !== 'CANCELLED' && currentOrder.status !== 'RETURNED') {
                const { data: items } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', id);
                if (items) {
                    for (const item of items) {
                        const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
                        if (prod) {
                            await supabase.from('products').update({ stock: prod.stock + item.quantity }).eq('id', item.product_id);
                        }
                    }
                }
            }

            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // Trigger Status Update Email
            try {
                const emailKey = import.meta.env.VITE_EMAIL_SYSTEM_KEY || 'MilLucesSeguro2026';
                const resp = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': emailKey
                    },
                    body: JSON.stringify({
                        to: currentOrder.customer_email,
                        templateKey: 'order_status_update',
                        variables: {
                            name: currentOrder.customer_name || 'Cliente',
                            order_id: id.slice(0, 8).toUpperCase(),
                            status: newStatus,
                            site_name: 'Mil Luces Iluminación'
                        }
                    })
                });
                console.log('[OrdersList] Status Update Email:', resp.status);
                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    console.error('[OrdersList] Email Error:', err);
                }
            } catch (emailErr) {
                console.error('Error triggering status update email:', emailErr);
            }

            setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
            if (selectedOrder?.id === id) {
                setSelectedOrder({ ...selectedOrder, status: newStatus });
            }
        } catch (error) {
            alert('Error al actualizar estado: ' + error.message);
        }
    }

    const getStatusStyles = (status) => {
        switch (status?.toUpperCase()) {
            case 'PAID': return 'bg-emerald-100 text-emerald-700';
            case 'DELIVERED': return 'bg-green-100 text-green-700';
            case 'SHIPPED': return 'bg-cyan-100 text-cyan-700';
            case 'IN_TRANSIT': return 'bg-blue-100 text-blue-700';
            case 'READY_TO_SHIP': return 'bg-indigo-100 text-indigo-700';
            case 'PROCESSING': return 'bg-violet-100 text-violet-700';
            case 'AWAITING_PAYMENT': return 'bg-amber-100 text-amber-700';
            case 'PENDING': return 'bg-orange-100 text-orange-700';
            case 'RETURNED': return 'bg-pink-100 text-pink-700';
            case 'CANCELLED': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const formatPaymentMethod = (method) => {
        if (!method) return 'N/A';
        const m = method.toLowerCase();
        if (m === 'stripe') return 'TARJETA (STRIPE)';
        if (m === 'paypal') return 'PAYPAL';
        if (m === 'transfer' || m === 'transferencia') return 'TRANSFERENCIA';
        if (m === 'in_store') return 'PAGO EN TIENDA';
        return method.toUpperCase();
    };

    const filteredOrders = orders; // Ahora el filtrado es servidor, así que usamos el estado directo

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block font-outfit">Management Hub</span>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter font-outfit">
                        Gestión de <span className="text-primary/40">Pedidos</span>
                    </h1>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 bg-white text-gray-500 border border-gray-100 h-12 px-6 rounded-2xl font-black uppercase italic text-[10px] shadow-sm hover:border-primary/30 hover:text-primary transition-all font-outfit"
                    >
                        <Download className="w-4 h-4" /> Exportar CSV
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-3 bg-brand-carbon text-white h-12 px-8 rounded-2xl font-black uppercase italic text-[10px] shadow-2xl hover:bg-primary transition-all group font-outfit"
                    >
                        <Plus className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform" />
                        Nuevo Pedido
                    </button>
                </div>
            </div>

            {/* Analytics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {[
                    { label: 'Últimos 7 Días', data: stats.days7, color: 'blue' },
                    { label: 'Últimos 30 Días', data: stats.days30, color: 'purple' },
                    { label: 'Últimos 90 Días', data: stats.days90, color: 'emerald' }
                ].map((s) => (
                    <div key={s.label} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm group hover:border-primary/20 transition-all">
                        <div className="flex justify-between items-start mb-6">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-outfit">{s.label}</span>
                            <div className={`p-2 rounded-lg bg-${s.color}-50 text-${s.color}-500 group-hover:scale-110 transition-transform`}>
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl font-black text-brand-carbon italic font-outfit">
                                {s.data.total.toFixed(2)} €
                            </p>
                            <p className={`text-[10px] font-black text-${s.color}-600/70 uppercase tracking-tighter font-outfit`}>
                                {s.data.count} Pedidos Completados
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 mb-8">
                <div className="p-6 border-b border-gray-100 bg-gray-50/20 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="BUSCAR PEDIDO O EMAIL..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300 font-outfit"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="bg-white border border-gray-100 rounded-2xl px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-auto"
                        >
                            <option value="ALL">Todos los Estados</option>
                            <option value="PENDING">Pendiente</option>
                            <option value="AWAITING_PAYMENT">Pago en Espera</option>
                            <option value="PAID">Pagado</option>
                            <option value="PROCESSING">Procesando</option>
                            <option value="READY_TO_SHIP">Listo para envío</option>
                            <option value="SHIPPED">Enviado</option>
                            <option value="IN_TRANSIT">En tránsito</option>
                            <option value="DELIVERED">Entregado</option>
                            <option value="CANCELLED">Cancelado</option>
                            <option value="RETURNED">Reembolsado</option>
                        </select>
                        <select
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            className="bg-white border border-gray-100 rounded-2xl px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-auto"
                        >
                            <option value="ALL">Todo el Tiempo</option>
                            <option value="TODAY">Hoy</option>
                            <option value="WEEK">Últimos 7 Días</option>
                            <option value="MONTH">Últimos 30 Días</option>
                        </select>
                    </div>
                </div>

                {selectedOrders.length > 0 && (
                    <div className="bg-primary/5 border-b border-primary/10 p-4 flex items-center justify-between animate-in fade-in py-3 px-8">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                            {selectedOrders.length} pedido(s) seleccionado(s)
                        </span>
                        <div className="flex items-center gap-3">
                            <select
                                onChange={(e) => {
                                    handleBulkStatusChange(e.target.value);
                                    e.target.value = '';
                                }}
                                disabled={isBulkLoading}
                                className="bg-white border text-primary border-primary/20 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                            >
                                <option value="">CAMBIAR ESTADO LOTE...</option>
                                <option value="PENDING">Pendiente</option>
                                <option value="AWAITING_PAYMENT">Pago Pendiente</option>
                                <option value="PAID">Pagado</option>
                                <option value="PROCESSING">Procesando</option>
                                <option value="READY_TO_SHIP">Listo Envío</option>
                                <option value="SHIPPED">Enviado</option>
                                <option value="IN_TRANSIT">En Tránsito</option>
                                <option value="DELIVERED">Entregado</option>
                                <option value="CANCELLED">Cancelado</option>
                            </select>
                            <button
                                onClick={handleBulkDelete}
                                disabled={isBulkLoading}
                                className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                            >
                                {isBulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash className="w-4 h-4" />}
                                Eliminar
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50 font-outfit">Sincronizando Boutique Admin...</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 uppercase text-[10px] font-black text-gray-400 border-b">
                            <tr className="font-outfit">
                                <th className="p-7 w-10">
                                    <input
                                        type="checkbox"
                                        checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded text-primary focus:ring-primary/20 border-gray-300"
                                    />
                                </th>
                                <th className="p-7">Pedido</th>
                                <th className="p-7">Cliente</th>
                                <th className="p-7">Total</th>
                                <th className="p-7">Estado</th>
                                <th className="p-7">Tipo</th>
                                <th className="p-7">Pago</th>
                                <th className="p-7 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredOrders.length > 0 ? filteredOrders.map(order => (
                                <tr key={order.id} className={`hover:bg-gray-50/80 transition-colors group ${selectedOrders.includes(order.id) ? 'bg-primary/5' : ''}`}>
                                    <td className="p-7">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.includes(order.id)}
                                            onChange={() => toggleSelectOrder(order.id)}
                                            className="w-4 h-4 rounded text-primary focus:ring-primary/20 border-gray-300"
                                        />
                                    </td>
                                    <td className="p-7">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg w-fit mb-1 shadow-sm">
                                                #{order.id.slice(0, 8).toUpperCase()}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter font-outfit">
                                                {new Date(order.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-7">
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-900 text-xs uppercase italic font-outfit">{order.customer_name || 'Invitado'}</span>
                                            <span className="text-[10px] text-gray-400 font-bold lowercase tracking-tight font-outfit">{order.customer_email}</span>
                                        </div>
                                    </td>
                                    <td className="p-7">
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-900 text-sm font-outfit">{(order.total || 0).toFixed(2)} €</span>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase font-outfit">Boutique Price</span>
                                        </div>
                                    </td>
                                    <td className="p-7">
                                        <select
                                            value={order.status || 'PENDING'}
                                            onChange={(e) => updateStatus(order.id, e.target.value)}
                                            className={`appearance-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-none focus:ring-0 cursor-pointer shadow-sm font-outfit ${getStatusStyles(order.status)}`}
                                        >
                                            <option value="PENDING">Pendiente</option>
                                            <option value="AWAITING_PAYMENT">Pago Pendiente</option>
                                            <option value="PAID">Pagado / Confirmado</option>
                                            <option value="PROCESSING">Procesando</option>
                                            <option value="READY_TO_SHIP">Listo para Envío</option>
                                            <option value="SHIPPED">Enviado</option>
                                            <option value="IN_TRANSIT">En Tránsito</option>
                                            <option value="DELIVERED">Entregado</option>
                                            <option value="CANCELLED">Cancelado</option>
                                            <option value="RETURNED">Devuelto / Reembolsado</option>
                                        </select>
                                    </td>
                                    <td className="p-7">
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg w-fit ${order.shipping_method === 'pickup' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                            }`}>
                                            {order.shipping_method === 'pickup' ? (
                                                <><Package className="w-3 h-3 hover:rotate-0" /> <span className="text-[8px] font-black uppercase">Recogida</span></>
                                            ) : (
                                                <><Truck className="w-3 h-3" /> <span className="text-[8px] font-black uppercase">Envio</span></>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-7">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                            <span className="text-[9px] font-black text-gray-400 uppercase italic tracking-widest font-outfit">{formatPaymentMethod(order.payment_method)}</span>
                                        </div>
                                    </td>
                                    <td className="p-7 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleViewOrder(order)}
                                                title="Ver Detalle"
                                                className="w-9 h-9 bg-white border border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50 rounded-xl transition-all flex items-center justify-center shadow-sm"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSingle(order.id)}
                                                title="Eliminar Pedido"
                                                className="w-9 h-9 bg-white border border-gray-100 text-gray-400 hover:text-red-600 hover:border-red-100 hover:bg-red-50 rounded-xl transition-all flex items-center justify-center shadow-sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="p-32 text-center text-gray-200 italic font-black uppercase text-xs tracking-[.4em] font-outfit">
                                        {orders.length === 0 ? 'Sin pedidos en la boutique' : 'Sin resultados encontrados'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* Pagination Controls */}
                {totalCount > pageSize && (
                    <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-luxury animate-in fade-in slide-in-from-bottom-4 duration-700 font-outfit">
                        <div className="flex items-center gap-4">
                            <div className="flex -space-x-2">
                                <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center text-primary font-black text-xs">
                                    {Math.ceil(totalCount / pageSize)}
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-carbon italic">Flujo de Caja</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">
                                    Mostrando <span className="text-primary">{orders.length}</span> de <span className="text-brand-carbon">{totalCount}</span> transacciones
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
            </div>

            {/* Detalle Modal (EXISTENTE) */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-brand-carbon/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-luxury overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
                        {/* Header */}
                        <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <div className="flex items-center gap-4 mb-2">
                                    <h2 className="text-3xl font-black text-brand-carbon uppercase italic leading-none font-outfit">Pedido #{selectedOrder.id.slice(0, 8).toUpperCase()}</h2>
                                    <select
                                        value={selectedOrder.status || 'PENDING'}
                                        onChange={(e) => updateStatus(selectedOrder.id, e.target.value)}
                                        className={`appearance-none px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-none focus:ring-0 cursor-pointer shadow-sm font-outfit ${getStatusStyles(selectedOrder.status)}`}
                                    >
                                        <option value="PENDING">Pendiente</option>
                                        <option value="AWAITING_PAYMENT">Pago Pendiente</option>
                                        <option value="PAID">Pagado / Confirmado</option>
                                        <option value="PROCESSING">Procesando</option>
                                        <option value="READY_TO_SHIP">Listo para Envío</option>
                                        <option value="SHIPPED">Enviado</option>
                                        <option value="IN_TRANSIT">En Tránsito</option>
                                        <option value="DELIVERED">Entregado</option>
                                        <option value="CANCELLED">Cancelado</option>
                                        <option value="RETURNED">Devuelto / Reembolsado</option>
                                    </select>
                                </div>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest font-outfit">Ref: {selectedOrder.id} • {new Date(selectedOrder.created_at).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={printOrder}
                                    className="px-5 py-3 border border-gray-200 text-gray-600 rounded-full flex items-center gap-2 hover:bg-gray-50 transition-all font-outfit text-xs font-black uppercase tracking-widest shadow-sm"
                                >
                                    <Printer className="w-4 h-4" /> Imprimir
                                </button>
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="p-4 bg-white border border-gray-100 rounded-full flex items-center justify-center hover:bg-gray-50 transition-all text-gray-400 shadow-sm"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar" id="printable-order">
                            {/* Print-only Header */}
                            <div className="hidden print:block mb-8 border-b-2 border-brand-carbon pb-6">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h1 className="text-3xl font-black uppercase italic leading-none mb-2">Mil Luces <span className="text-gray-400">Iluminación</span></h1>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Factura de Pedido / Albarán de Entrega</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-brand-carbon uppercase italic tabular-nums">#{selectedOrder.id.toUpperCase()}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                                {/* Columna Izquierda: Información del Cliente y Envío */}
                                <div className="lg:col-span-1 space-y-12">
                                    <section>
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-black text-sm text-brand-carbon uppercase italic tracking-tight font-outfit">Información Cliente</h3>
                                        </div>
                                        <div className="space-y-6 bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100 font-outfit">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5">Nombre Completo</p>
                                                <p className="text-xs font-black text-brand-carbon uppercase italic">{selectedOrder.customer_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5">Email Contacto</p>
                                                <p className="text-xs font-black text-brand-carbon">{selectedOrder.customer_email}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5">Teléfono Directo</p>
                                                <p className="text-xs font-black text-brand-carbon">{selectedOrder.customer_phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-black text-sm text-brand-carbon uppercase italic tracking-tight font-outfit">Dirección Boutique</h3>
                                        </div>
                                        <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100 font-outfit space-y-4">
                                            {selectedOrder.shipping_method === 'pickup' ? (
                                                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mb-2">
                                                    <Package className="w-5 h-5 text-emerald-500" />
                                                    <div>
                                                        <p className="text-[10px] font-black text-emerald-600 uppercase italic">Recogida en Tienda</p>
                                                        <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest leading-none">El cliente vendrá al local</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs font-bold text-gray-600 leading-relaxed uppercase tracking-wider">
                                                    {selectedOrder.shipping_address}<br />
                                                    <span className="text-brand-carbon font-black">{selectedOrder.shipping_zip} {selectedOrder.shipping_city}</span>
                                                </p>
                                            )}
                                            {selectedOrder.notes && (
                                                <div className="pt-4 border-t border-gray-200/50">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Notas del Cliente</p>
                                                    <p className="text-xs font-bold text-brand-carbon italic">{selectedOrder.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <section>
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-100">
                                                <CardIcon className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-black text-sm text-brand-carbon uppercase italic tracking-tight font-outfit">Transacción</h3>
                                        </div>
                                        <div className="bg-brand-carbon p-8 rounded-[2rem] text-white shadow- luxury">
                                            <p className="text-[10px] font-black text-primary uppercase italic mb-1.5 font-outfit tracking-widest">{formatPaymentMethod(selectedOrder.payment_method)}</p>
                                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[.3em] font-outfit">ID: {selectedOrder.payment_id || 'PROCESO_MANUAL'}</p>
                                        </div>
                                    </section>
                                </div>

                                {/* Columna Derecha: Artículos */}
                                <div className="lg:col-span-2 space-y-10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-black text-sm text-brand-carbon uppercase italic tracking-tight font-outfit">Items Seleccionados</h3>
                                        </div>
                                        <span className="text-[10px] font-black text-gray-300 uppercase italic font-outfit">{orderItems.length} Unidades</span>
                                    </div>

                                    {fetchingItems ? (
                                        <div className="py-24 flex flex-col items-center justify-center gap-4">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Consultando Caja...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="max-h-[400px] overflow-y-auto pr-4 custom-scrollbar space-y-4">
                                                {orderItems.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-6 bg-white rounded-3xl border border-gray-100 group hover:border-primary/20 hover:shadow-xl transition-all font-outfit">
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-xl font-black text-gray-200 group-hover:text-primary transition-colors border border-gray-100/50">
                                                                {idx + 1}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-brand-carbon uppercase italic">{item.product_name}</p>
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Precio: {item.unit_price.toFixed(2)} €</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-black text-gray-300 uppercase mb-1.5 tracking-tighter">Cant: x{item.quantity}</p>
                                                            <p className="text-lg font-black text-brand-carbon italic">{(item.unit_price * item.quantity).toFixed(2)} €</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="p-10 bg-neutral-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-1000"></div>
                                                <div className="space-y-5 relative z-10">
                                                    <div className="flex justify-between text-[11px] font-bold text-white/30 uppercase tracking-[.4em] font-outfit">
                                                        <span>Subtotal Boutique</span>
                                                        <span>{(selectedOrder.total / 1.21).toFixed(2)} €</span>
                                                    </div>
                                                    <div className="flex justify-between text-[11px] font-bold text-white/30 uppercase tracking-[.4em] font-outfit">
                                                        <span>Impuestos (21%)</span>
                                                        <span>{(selectedOrder.total - (selectedOrder.total / 1.21)).toFixed(2)} €</span>
                                                    </div>
                                                    <div className="pt-6 border-t border-white/5 flex justify-between items-end">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-black uppercase text-primary tracking-widest italic font-outfit">Total de Facturación</span>
                                                            <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest font-outfit">IVA Incluido</span>
                                                        </div>
                                                        <span className="text-5xl font-black italic text-white flex items-start gap-2 font-outfit">
                                                            {selectedOrder.total.toFixed(2)} <span className="text-xl text-primary mt-2">€</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Admin Notes */}
                                    <div className="mt-8 border-t border-gray-100 pt-8 print:hidden">
                                        <h3 className="font-black text-sm text-brand-carbon uppercase italic tracking-tight font-outfit mb-4">Notas Internas (Admin)</h3>
                                        <textarea
                                            value={adminNotes}
                                            onChange={(e) => setAdminNotes(e.target.value)}
                                            placeholder="Información privada, llamadas al cliente, problemas con stock..."
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs font-bold text-brand-carbon placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 outline-none resize-none h-32"
                                        />
                                        <div className="mt-3 flex justify-end">
                                            <button onClick={saveAdminNotes} className="px-6 py-2.5 bg-brand-carbon text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-colors">
                                                Guardar Notas
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Creación Nuevo Pedido */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-brand-carbon/60 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-6xl h-[85vh] rounded-[4rem] shadow-luxury overflow-hidden flex flex-col font-outfit animate-in zoom-in-95 duration-500">
                        {/* Header Modular */}
                        <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <span className="text-[10px] font-black text-primary uppercase tracking-[.5em] mb-2 block">Paso {step} de 3</span>
                                <h2 className="text-3xl font-black text-brand-carbon uppercase italic leading-none">
                                    {step === 1 ? 'Seleccionar Cliente' : step === 2 ? 'Configurar Carrito' : 'Finalizar Pedido'}
                                </h2>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-4 bg-white rounded-full text-gray-300 hover:text-brand-carbon transition-colors shadow-sm">
                                <X className="w-8 h-8" />
                            </button>
                        </div>

                        {/* Content Scrollable */}
                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                            {step === 1 && (
                                <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {customers.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => { setSelectedCustomer(c); setStep(2); }}
                                                className={`p-8 rounded-[2.5rem] border text-left transition-all group ${selectedCustomer?.id === c.id ? 'bg-brand-carbon text-white border-brand-carbon shadow-2xl scale-105' : 'bg-white border-gray-100 hover:border-primary/30 hover:shadow-xl'}`}
                                            >
                                                <div className="flex items-center gap-5 mb-6">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black italic shadow-inner ${selectedCustomer?.id === c.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                                        {c.full_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black uppercase italic tracking-tighter line-clamp-1">{c.full_name}</p>
                                                        <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedCustomer?.id === c.id ? 'text-white/40' : 'text-gray-300'}`}>ID: {c.id.slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className={`text-[10px] font-bold flex items-center gap-2 ${selectedCustomer?.id === c.id ? 'text-white/60' : 'text-gray-400'}`}>
                                                        <Mail className="w-3.5 h-3.5" /> {c.email}
                                                    </p>
                                                    <p className={`text-[10px] font-bold flex items-center gap-2 ${selectedCustomer?.id === c.id ? 'text-white/60' : 'text-gray-400'}`}>
                                                        <MapPin className="w-3.5 h-3.5" /> {c.address || 'Sin dirección'}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 animate-in slide-in-from-right-10 duration-500">
                                    {/* Catalogo */}
                                    <div className="lg:col-span-12 space-y-8">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[11px] font-black uppercase text-primary tracking-[.3em] font-outfit italic">Productos de la Boutique</h3>
                                            <span className="text-[10px] font-bold text-gray-300 uppercase italic">{products.length} Disponibles</span>
                                        </div>
                                        <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar">
                                            {products.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => addToCart(p)}
                                                    className="min-w-[280px] bg-white border border-gray-100 p-6 rounded-[2rem] hover:shadow-2xl hover:border-primary/20 transition-all text-left flex flex-col gap-4 group"
                                                >
                                                    <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center p-4">
                                                        {p.image_url ? (
                                                            <img src={p.image_url} className="w-full h-full object-contain group-hover:scale-110 transition-transform" alt="" />
                                                        ) : (
                                                            <Package className="w-12 h-12 text-gray-200" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-brand-carbon uppercase italic leading-tight mb-2 h-8 line-clamp-2">{p.name}</p>
                                                        <p className="text-xl font-black text-primary italic leading-none">{p.price} €</p>
                                                    </div>
                                                    <div className="h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[9px] font-black uppercase text-gray-400 tracking-widest group-hover:bg-primary group-hover:text-white transition-all">
                                                        Añadir al Carrito
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Carrito */}
                                    <div className="lg:col-span-12 space-y-8">
                                        <h3 className="text-[11px] font-black uppercase text-primary tracking-[.3em] font-outfit italic">Carrito del Pedido</h3>
                                        <div className="bg-gray-50/50 rounded-[3rem] border border-gray-100 p-10">
                                            {cart.length === 0 ? (
                                                <div className="py-20 flex flex-col items-center justify-center text-gray-300 opacity-40">
                                                    <ShoppingBag className="w-16 h-16 mb-4" />
                                                    <p className="text-xs font-black uppercase tracking-[.4em]">Carrito Vacío</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {cart.map(item => (
                                                        <div key={item.id} className="flex items-center justify-between bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm">
                                                            <div className="flex items-center gap-6">
                                                                <div className="w-20 h-20 bg-gray-50 rounded-2xl p-2 hidden sm:block">
                                                                    <img src={item.image_url} className="w-full h-full object-contain" alt="" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-black text-brand-carbon uppercase italic">{item.name}</p>
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Ref: {item.id.slice(0, 8)}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-12">
                                                                <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-xl">
                                                                    <button onClick={() => updateQuantity(item.id, -1)} className="font-black text-gray-400 p-2 hover:text-brand-carbon">-</button>
                                                                    <span className="text-xs font-black text-brand-carbon w-8 text-center">{item.quantity}</span>
                                                                    <button onClick={() => updateQuantity(item.id, 1)} className="font-black text-gray-400 p-2 hover:text-primary">+</button>
                                                                </div>
                                                                <div className="text-right w-24">
                                                                    <p className="text-sm font-black text-brand-carbon italic">{(item.price * item.quantity).toFixed(2)} €</p>
                                                                </div>
                                                                <button onClick={() => removeFromCart(item.id)} className="text-red-300 hover:text-red-500 transition-colors p-2">
                                                                    <Trash2 className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="pt-10 flex justify-end">
                                                        <div className="text-right bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl min-w-[300px]">
                                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-2">Total Estimado</span>
                                                            <p className="text-4xl font-black text-brand-carbon italic">{calculateTotal().toFixed(2)} €</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="max-w-2xl mx-auto space-y-12 animate-in slide-in-from-right-10 duration-500">
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[.4em] text-gray-400">Estado Inicial</label>
                                            <select
                                                value={orderForm.status}
                                                onChange={e => setOrderForm({ ...orderForm, status: e.target.value })}
                                                className="w-full p-6 bg-gray-50 border-none rounded-[1.5rem] font-black text-xs uppercase italic tracking-widest focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                                            >
                                                <option value="PENDING">⚡ Pendiente</option>
                                                <option value="AWAITING_PAYMENT">⏳ Pago en Espera</option>
                                                <option value="PAID">💎 Pagado / Confirmado</option>
                                            </select>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[.4em] text-gray-400">Método de Pago</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {['TRANSFERENCIA', 'CONTRAREEMBOLSO', 'PAYPAL', 'STRIPE'].map(method => (
                                                    <button
                                                        key={method}
                                                        onClick={() => setOrderForm({ ...orderForm, payment_method: method })}
                                                        className={`p-6 rounded-3xl border-2 text-[10px] font-black uppercase italic tracking-widest transition-all ${orderForm.payment_method === method ? 'border-primary bg-primary/5 text-primary shadow-lg scale-105' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                                                    >
                                                        {method}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-brand-carbon p-10 rounded-[3rem] text-white shadow- luxury">
                                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-6">
                                            <span className="text-[11px] font-bold text-white/40 uppercase tracking-[.3em]">Resumen de Pedido</span>
                                            <span className="text-[10px] font-black italic text-primary">{cart.length} Artículos</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1.5 leading-none">Cliente Seleccionado</p>
                                                <p className="text-xl font-black uppercase italic leading-none">{selectedCustomer?.full_name}</p>
                                            </div>
                                            <p className="text-5xl font-black italic flex items-start gap-2">
                                                {calculateTotal().toFixed(2)} <span className="text-sm text-primary mt-2">€</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Modular */}
                        <div className="p-10 border-t border-gray-100 flex items-center justify-between">
                            <button
                                onClick={() => step > 1 ? setStep(step - 1) : setIsCreateModalOpen(false)}
                                className="px-10 py-5 rounded-[1.5rem] font-black uppercase italic text-xs text-gray-400 hover:text-brand-carbon transition-all"
                            >
                                {step === 1 ? 'Cancelar' : 'Retroceder'}
                            </button>
                            <button
                                onClick={() => {
                                    if (step === 1 && selectedCustomer) setStep(2);
                                    else if (step === 2 && cart.length > 0) setStep(3);
                                    else if (step === 3) handleCreateOrder();
                                }}
                                disabled={isCreating || (step === 1 && !selectedCustomer) || (step === 2 && cart.length === 0)}
                                className={`px-12 py-6 rounded-[2rem] font-black uppercase italic text-xs shadow-2xl transition-all flex items-center gap-3 active:scale-95 ${isCreating || (step === 1 && !selectedCustomer) || (step === 2 && cart.length === 0) ? 'bg-gray-100 text-gray-300' : 'bg-brand-carbon text-white hover:bg-primary'}`}
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{step === 3 ? 'Finalizar y Crear' : 'Siguiente Paso'}</span>
                                        <ChevronRight className={`w-5 h-5 ${step === 3 ? 'hidden' : ''}`} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Professional Print Template (Hidden on Screen) ──────────────── */}
            {selectedOrder && (
                <div id="invoice-print" className="hidden print:block font-outfit text-brand-carbon bg-white">
                    {/* Header: Logo & Branding */}
                    <div className="flex justify-between items-start border-b-4 border-brand-carbon pb-8 mb-12">
                        <div>
                            <h1 className="text-4xl font-black uppercase italic leading-none mb-2">
                                Mil Luces <span className="text-gray-300">Iluminación</span>
                            </h1>
                            <p className="text-[11px] font-black uppercase tracking-[.4em] text-primary italic">Iluminación Lineal & LED Profesional</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-black uppercase italic mb-1">Orden de Pedido</h2>
                            <p className="text-xl font-black text-brand-carbon tabular-nums uppercase">Ref: #{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                            <p className="text-[10px] font-black text-primary uppercase italic mt-1">{formatPaymentMethod(selectedOrder.payment_method)}</p>
                        </div>
                    </div>

                    {/* Customer & Shipping Grid */}
                    <div className="grid grid-cols-2 gap-12 mb-16">
                        <section className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary border-b border-primary/10 pb-2 mb-4">Información del Cliente</h3>
                            <div className="space-y-1">
                                <p className="text-sm font-black uppercase italic">{selectedOrder.customer_name}</p>
                                <p className="text-[11px] font-bold text-gray-500">{selectedOrder.customer_email}</p>
                                <p className="text-[11px] font-bold text-gray-500">{selectedOrder.customer_phone || 'Teléfono no facilitado'}</p>
                            </div>
                        </section>
                        <section className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary border-b border-primary/10 pb-2 mb-4">Método de Entrega / Envío</h3>
                            <div className="space-y-1">
                                {selectedOrder.shipping_method === 'pickup' ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <p className="text-sm font-black uppercase italic text-emerald-600">RECOGIDA EN TIENDA</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm font-black uppercase italic">Entrega a Domicilio</p>
                                        <p className="text-[11px] font-medium leading-relaxed">
                                            {selectedOrder.shipping_address}<br />
                                            {selectedOrder.shipping_zip} {selectedOrder.shipping_city}
                                        </p>
                                    </>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Items Table */}
                    <div className="mb-16">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-brand-carbon uppercase text-[10px] font-black tracking-widest text-gray-400">
                                    <th className="py-4 pr-4">Concepto</th>
                                    <th className="py-4 px-4 text-center">Cant.</th>
                                    <th className="py-4 px-4 text-right">Precio Ud.</th>
                                    <th className="py-4 pl-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orderItems.map((item, idx) => (
                                    <tr key={idx} className="group italic">
                                        <td className="py-6 pr-4">
                                            <p className="text-[11px] font-black uppercase text-brand-carbon mb-0.5">{item.product_name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">REF: {item.product_id?.slice(-6).toUpperCase()}</p>
                                        </td>
                                        <td className="py-6 px-4 text-center font-black text-sm">x{item.quantity}</td>
                                        <td className="py-6 px-4 text-right text-xs font-bold">{item.unit_price.toFixed(2)}€</td>
                                        <td className="py-6 pl-4 text-right text-sm font-black italic">{(item.unit_price * item.quantity).toFixed(2)}€</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Summary */}
                    <div className="flex justify-end mb-12">
                        <div className="w-full max-w-[280px] space-y-3 bg-gray-50 p-8 rounded-3xl border border-gray-100">
                            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <span>Base Imponible</span>
                                <span>{(selectedOrder.total / 1.21).toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <span>Impuestos (21%)</span>
                                <span>{(selectedOrder.total - (selectedOrder.total / 1.21)).toFixed(2)}€</span>
                            </div>
                            <div className="pt-4 border-t border-gray-200 flex justify-between items-end">
                                <span className="text-xs font-black uppercase italic text-brand-carbon">Total Factura</span>
                                <div className="text-right leading-none">
                                    <span className="text-3xl font-black italic">{selectedOrder.total.toFixed(2)}</span>
                                    <span className="text-lg font-black ml-1">€</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div id="invoice-print-footer" className="border-t border-gray-100 pt-6 text-center space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-[.4em] text-gray-300 italic">Mil Luces Iluminación · Iluminación Lineal & LED Profesional</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                            Calle Rio Tormes, 5, Local 3 · 28943 Fuenlabrada, Madrid<br />
                            milluces@millucesiluminacion.com · +34 917 654 062
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

