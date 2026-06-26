import { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp,
    ShoppingCart,
    Package,
    Loader2,
    Users as UsersIcon,
    Euro,
    PieChart as PieChartIcon,
    BarChart2,
    Activity,
    X,
    Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend,
    LineChart,
    Line
} from 'recharts';

const COLORS = ['#111827', '#EAB308', '#3B82F6', '#10B981', '#6366F1', '#8B5CF6', '#EC4899'];

export default function Statistics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSales: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalItemsSold: 0,
        salesHistory: [],
        customerGrowth: [],
        topProducts: [],
        paymentMethods: [],
        ordersByDay: [],
        aov: 0,
        comparison: { revenue: 0, orders: 0 },
        topClients: [],
        projection: 0,
        rawOrders: [],
        rawCustomers: [],
        rawItems: []
    });
    const [timeRange, setTimeRange] = useState('MONTH'); // MONTH, YEAR, ALL, CUSTOM
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [drillDown, setDrillDown] = useState(null); // { type, data, title }
    const [allProducts, setAllProducts] = useState([]);
    const [rawStats, setRawStats] = useState({
        orders: [],
        items: [],
        customers: [],
        prevRevenue: 0,
        startDate: null,
        endDate: null,
        useDaily: false
    });

    useEffect(() => {
        const fetchAllProducts = async () => {
            const { data } = await supabase.from('products').select('id, name').order('name');
            setAllProducts(data || []);
        };
        fetchAllProducts();
    }, []);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Confirmed statuses for "Revenue"
            const confirmedStatuses = ['PAID', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'READY_TO_SHIP', 'PROCESSING'];

            // Time filters
            let startDate, endDate;
            const now = new Date();
            endDate = new Date().toISOString();

            if (timeRange === 'MONTH') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            } else if (timeRange === 'YEAR') {
                startDate = new Date(now.getFullYear(), 0, 1).toISOString();
            } else if (timeRange === 'CUSTOM' && customRange.start) {
                startDate = new Date(customRange.start).toISOString();
                if (customRange.end) endDate = new Date(customRange.end).toISOString();
            } else {
                startDate = null; // ALL
            }

            // 1. Fetch Orders (ALL in period)
            let ordersQuery = supabase
                .from('orders')
                .select('id, total, created_at, status, payment_method, customer_name, customer_email')
                .in('status', confirmedStatuses);

            if (startDate) ordersQuery = ordersQuery.gte('created_at', startDate);
            if (endDate) ordersQuery = ordersQuery.lte('created_at', endDate);

            let { data: orders } = await ordersQuery;

            // 2. Fetch Order Items for ALL orders in period
            const orderIds = orders?.map(o => o.id) || [];
            const { data: orderItems } = await supabase
                .from('order_items')
                .select('quantity, product_name, product_id, order_id, unit_price')
                .in('order_id', orderIds);

            // 3. Fetch Customers
            let customersQuery = supabase
                .from('customers')
                .select('id, created_at, full_name, email');
            if (startDate) customersQuery = customersQuery.gte('created_at', startDate);
            const { data: customers } = await customersQuery;

            // 4. Comparison (vs Prev Month)
            const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
            const { data: prevOrders } = await supabase.from('orders').select('total').in('status', confirmedStatuses).gte('created_at', prevMonthStart).lte('created_at', prevMonthEnd);
            const prevRevenue = prevOrders?.reduce((acc, o) => acc + (o.total || 0), 0) || 0;

            const diffDays = startDate ? (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24) : 999;
            const useDaily = diffDays <= 31 && timeRange !== 'ALL';

            setRawStats({
                orders: orders || [],
                items: orderItems || [],
                customers: customers || [],
                prevRevenue,
                startDate,
                endDate,
                useDaily
            });

        } catch (error) {
            console.error('Error fetching statistics:', error);
        } finally {
            setLoading(false);
        }
    }, [timeRange, customRange]);

    // In-memory Processing Effect
    useEffect(() => {
        const { orders: rawOrders, items: rawItems, customers: rawCustomers, prevRevenue, startDate, useDaily } = rawStats;

        // Use local now to avoid stale closure issues if needed, but here it's fine
        const now = new Date();

        let filteredOrders = [...rawOrders];
        let filteredItems = [...rawItems];

        // Filter by Product if selected
        if (selectedProduct) {
            filteredItems = rawItems.filter(i => i.product_id === selectedProduct);
            const ordersWithProduct = new Set(filteredItems.map(i => i.order_id));
            filteredOrders = rawOrders.filter(o => ordersWithProduct.has(o.id));
        }

        const historyMap = {};
        filteredOrders.forEach(o => {
            const dateKey = useDaily
                ? new Date(o.created_at).toISOString().slice(0, 10)
                : new Date(o.created_at).toISOString().slice(0, 7);

            if (!historyMap[dateKey]) historyMap[dateKey] = { date: dateKey, sales: 0, orders: 0 };

            if (selectedProduct) {
                const items = filteredItems.filter(i => i.order_id === o.id);
                historyMap[dateKey].sales += items.reduce((acc, i) => acc + (i.quantity * i.unit_price), 0);
            } else {
                historyMap[dateKey].sales += o.total || 0;
            }
            historyMap[dateKey].orders += 1;
        });

        let salesHistory = Object.values(historyMap).sort((a, b) => a.date.localeCompare(b.date));

        // Fill Gaps if Daily
        if (useDaily && startDate) {
            const filledHistory = [];
            const start = new Date(startDate);
            const end = new Date(now);
            let current = new Date(start);
            while (current <= end) {
                const key = current.toISOString().slice(0, 10);
                filledHistory.push(historyMap[key] || { date: key, sales: 0, orders: 0 });
                current.setDate(current.getDate() + 1);
            }
            salesHistory = filledHistory;
        }

        const currentRevenue = filteredOrders.reduce((acc, o) => {
            if (selectedProduct) {
                const items = filteredItems.filter(i => i.order_id === o.id);
                return acc + items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
            }
            return acc + (o.total || 0);
        }, 0);

        const revenueDelta = prevRevenue ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

        const productStats = {};
        filteredItems.forEach(item => {
            if (!productStats[item.product_name]) productStats[item.product_name] = { name: item.product_name, quantity: 0, revenue: 0 };
            productStats[item.product_name].quantity += item.quantity;
            productStats[item.product_name].revenue += item.quantity * item.unit_price;
        });
        const topProducts = Object.values(productStats).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

        const clientStatsMap = {};
        filteredOrders.forEach(o => {
            if (!clientStatsMap[o.customer_email]) clientStatsMap[o.customer_email] = { name: o.customer_name, email: o.customer_email, totalSpent: 0, orders: 0 };
            if (selectedProduct) {
                const items = filteredItems.filter(i => i.order_id === o.id);
                clientStatsMap[o.customer_email].totalSpent += items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
            } else {
                clientStatsMap[o.customer_email].totalSpent += o.total || 0;
            }
            clientStatsMap[o.customer_email].orders += 1;
        });
        const topClients = Object.values(clientStatsMap).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

        const growthHistoryData = {};
        rawCustomers?.forEach(c => {
            const day = new Date(c.created_at).toISOString().slice(0, 10);
            growthHistoryData[day] = (growthHistoryData[day] || 0) + 1;
        });
        let cumCustomers = 0;
        const customerGrowth = Object.entries(growthHistoryData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => { cumCustomers += count; return { date, total: cumCustomers }; });

        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const weekdayStats = [0, 0, 0, 0, 0, 0, 0];
        filteredOrders.forEach(o => weekdayStats[new Date(o.created_at).getDay()]++);
        const ordersByDay = weekdayStats.map((count, i) => ({ day: dayNames[i], count }));

        // Sales Projection (Always based on current month for "Proyección Mes")
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const currentMonthOrders = rawOrders.filter(o => o.created_at >= currentMonthStart);
        let currentMonthRevenue = 0;
        if (selectedProduct) {
            const currentMonthItems = rawItems.filter(i => {
                const order = rawOrders.find(o => o.id === i.order_id);
                return i.product_id === selectedProduct && order && order.created_at >= currentMonthStart;
            });
            currentMonthRevenue = currentMonthItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
        } else {
            currentMonthRevenue = currentMonthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        }

        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const projection = now.getDate() > 0 ? (currentMonthRevenue / now.getDate()) * daysInMonth : 0;

        setStats({
            totalSales: currentRevenue,
            totalOrders: filteredOrders.length,
            totalCustomers: rawCustomers.length,
            totalItemsSold: filteredItems.reduce((acc, i) => acc + i.quantity, 0),
            salesHistory,
            customerGrowth,
            ordersByDay,
            topProducts,
            paymentMethods: Object.entries(filteredOrders.reduce((acc, o) => { acc[o.payment_method || 'OTRO'] = (acc[o.payment_method || 'OTRO'] || 0) + 1; return acc; }, {}) || {}).map(([name, value]) => ({ name, value })),
            aov: filteredOrders.length ? currentRevenue / filteredOrders.length : 0,
            comparison: { revenue: revenueDelta, orders: 0 },
            topClients,
            projection,
            rawOrders: filteredOrders,
            rawCustomers: rawCustomers,
            rawItems: filteredItems
        });
    }, [rawStats, selectedProduct]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40">
                <Loader2 className="w-12 h-12 animate-spin text-primary/20 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[.4em] text-gray-400 font-outfit">Inteligencia compilando de Negocio...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header & Main Filters */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] font-outfit">Stats Suite v3.0</span>
                        <div className="h-px w-8 bg-primary/20"></div>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest font-outfit ring-1 ring-emerald-500/20 px-2 py-0.5 rounded-full bg-emerald-500/5">Data Verified</span>
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter font-outfit">
                        Centro de <span className="text-primary/40">Inteligencia</span>
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    {/* Time Range Selector */}
                    <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto whitespace-nowrap">
                        {[
                            { label: 'Este Mes', value: 'MONTH' },
                            { label: 'Este Año', value: 'YEAR' },
                            { label: 'Todo', value: 'ALL' },
                            { label: 'Custom', value: 'CUSTOM' }
                        ].map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setTimeRange(opt.value)}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === opt.value ? 'bg-brand-carbon text-white shadow-lg' : 'text-gray-400 hover:text-brand-carbon'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom Range Inputs */}
                    {timeRange === 'CUSTOM' && (
                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                            <input
                                type="date"
                                value={customRange.start}
                                onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                                className="text-[10px] font-bold bg-transparent outline-none p-1"
                            />
                            <span className="text-gray-300">-</span>
                            <input
                                type="date"
                                value={customRange.end}
                                onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                                className="text-[10px] font-bold bg-transparent outline-none p-1"
                            />
                            <button onClick={fetchData} className="p-2 bg-primary text-white rounded-lg hover:bg-primary/80">
                                <Activity className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    {/* Product Selector */}
                    <div className="relative group min-w-[200px]">
                        <select
                            value={selectedProduct || ''}
                            onChange={(e) => setSelectedProduct(e.target.value || null)}
                            className="w-full appearance-none bg-white px-5 py-3.5 rounded-2x border border-gray-100 shadow-sm text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary/50 transition-all cursor-pointer"
                        >
                            <option value="">Todos los Productos</option>
                            {allProducts.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <Package className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                {[
                    {
                        label: 'Ventas Confirmadas',
                        value: `${stats.totalSales.toLocaleString()} €`,
                        icon: Euro,
                        color: 'text-primary',
                        bg: 'bg-primary/5',
                        delta: stats.comparison.revenue,
                        type: 'orders'
                    },
                    {
                        label: 'Pedidos',
                        value: stats.totalOrders,
                        icon: ShoppingCart,
                        color: 'text-blue-500',
                        bg: 'bg-blue-50',
                        sub: `Ticket Medio: ${stats.aov.toFixed(1)}€`,
                        type: 'orders'
                    },
                    {
                        label: 'Proyección Mes',
                        value: `${Math.round(stats.projection).toLocaleString()} €`,
                        icon: Activity,
                        color: 'text-indigo-500',
                        bg: 'bg-indigo-50',
                        sub: 'Estimado lineal',
                        type: 'orders'
                    },
                    {
                        label: 'Nuevos Clientes',
                        value: stats.totalCustomers,
                        icon: UsersIcon,
                        color: 'text-emerald-500',
                        bg: 'bg-emerald-50',
                        type: 'customers'
                    }
                ].map((card, i) => (
                    <div
                        key={i}
                        onClick={() => setDrillDown({ type: card.type, title: card.label, data: card.type === 'orders' ? stats.rawOrders : stats.rawCustomers })}
                        className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm group hover:border-primary/40 hover:shadow-xl transition-all duration-500 cursor-pointer relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className={`p-4 rounded-2xl ${card.bg} ${card.color} border border-transparent group-hover:scale-110 transition-all duration-500`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            {card.delta !== undefined && (
                                <div className={`text-[10px] font-black px-3 py-1 rounded-full ${card.delta >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {card.delta >= 0 ? '+' : ''}{card.delta.toFixed(1)}%
                                </div>
                            )}
                        </div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[.3em] mb-1 relative z-10">{card.label}</p>
                        <h3 className="text-3xl font-black text-brand-carbon italic tracking-tighter mb-2 relative z-10">{card.value}</h3>
                        {card.sub && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest relative z-10">{card.sub}</p>}

                        {/* Interactive Hint */}
                        <div className="absolute bottom-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <TrendingUp className="w-4 h-4 text-primary/20" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
                {/* Sales Chart */}
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col h-[500px]">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black text-brand-carbon uppercase italic leading-none">Evolución de Facturación</h3>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.salesHistory}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FBBC05" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#FBBC05" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => val.length > 7 ? val.slice(8, 10) : val}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }}
                                />
                                <Tooltip
                                    labelFormatter={(val) => val.length > 7 ? new Date(val).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : val}
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                                    itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                                />
                                <Area type="monotone" dataKey="sales" name="Ventas (€)" stroke="#FBBC05" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Orders Chart */}
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col h-[500px]">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                            <BarChart2 className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black text-brand-carbon uppercase italic leading-none">Volumen de Pedidos</h3>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.salesHistory}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => val.length > 7 ? val.slice(8, 10) : val}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }}
                                />
                                <Tooltip
                                    labelFormatter={(val) => val.length > 7 ? new Date(val).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : val}
                                    cursor={{ fill: '#f9fafb' }}
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                                />
                                <Bar dataKey="orders" name="Pedidos" fill="#111827" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Payment Methods */}
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col h-[450px]">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                            <PieChartIcon className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black text-brand-carbon uppercase italic leading-none">Métodos de Pago</h3>
                    </div>
                    <div className="flex-1 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.paymentMethods}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.paymentMethods.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Days of the week */}
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col h-[450px]">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black text-brand-carbon uppercase italic leading-none">Días de Mayor Actividad</h3>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.ordersByDay}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }} />
                                <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }} />
                                <Bar dataKey="count" name="Pedidos" fill="#FBBC05" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Customer Growth */}
                <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col h-[450px]">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                            <Activity className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black text-brand-carbon uppercase italic leading-none">Crecimiento de Clientes</h3>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.customerGrowth}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis
                                    dataKey="date"
                                    hide={timeRange === 'ALL'} // Hide if too many labels
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }}
                                    dy={10}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }} />
                                <Tooltip contentStyle={{ borderRadius: '1rem' }} />
                                <Line type="monotone" dataKey="total" name="Clientes Totales" stroke="#111827" strokeWidth={4} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Products & Top Clients */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
                {/* Items Vendidos */}
                <div className="bg-[#111827] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black uppercase italic leading-none">Top Artículos</h2>
                            <span className="text-[9px] font-black text-primary uppercase tracking-[.3em]">Por Unidades</span>
                        </div>
                        <div className="space-y-6">
                            {stats.topProducts.map((p, i) => (
                                <div key={i} className="flex items-center justify-between group cursor-pointer" onClick={() => setSelectedProduct(p.id)}>
                                    <div className="flex items-center gap-4">
                                        <span className="text-lg font-black italic text-primary/40 group-hover:text-primary transition-colors">0{i + 1}</span>
                                        <p className="text-[11px] font-bold uppercase truncate max-w-[200px]">{p.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black italic">{p.quantity}</p>
                                        <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest">uds</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top Clientes */}
                <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black uppercase italic text-brand-carbon leading-none">Top Clientes (LTV)</h2>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[.3em]">Valor de Vida</span>
                        </div>
                        <div className="space-y-6">
                            {stats.topClients.map((c, i) => (
                                <div key={i} className="flex items-center justify-between group cursor-pointer" onClick={() => setDrillDown({ type: 'orders', title: `Pedidos de ${c.name}`, data: stats.rawOrders.filter(o => o.customer_email === c.email) })}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                            <UsersIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black uppercase text-brand-carbon truncate max-w-[150px]">{c.name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 lowercase">{c.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black italic text-brand-carbon">{c.totalSpent.toLocaleString()} €</p>
                                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">{c.orders} pedidos</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Drill-down Modal */}
            {drillDown && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-20 bg-brand-carbon/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-6xl h-full rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative border border-white/20 animate-in zoom-in-95 duration-500">
                        {/* Modal Header */}
                        <div className="p-8 lg:p-12 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter mb-2">{drillDown.title}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[.3em]">Análisis en Profundidad • {drillDown.data.length} registros</p>
                            </div>
                            <button
                                onClick={() => setDrillDown(null)}
                                className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-brand-carbon hover:bg-brand-carbon hover:text-white transition-all duration-300 group"
                            >
                                <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-brand-carbon/5">
                                            {drillDown.type === 'orders' ? (
                                                <>
                                                    <th className="py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">ID Pedido</th>
                                                    <th className="py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Cliente</th>
                                                    <th className="py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha</th>
                                                    <th className="py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Total</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Cliente</th>
                                                    <th className="py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Email</th>
                                                    <th className="py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Registro</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {drillDown.data.map((item, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                                                {drillDown.type === 'orders' ? (
                                                    <>
                                                        <td className="py-5 text-[11px] font-black text-brand-carbon">#{item.id.slice(0, 8)}...</td>
                                                        <td className="py-5">
                                                            <p className="text-[11px] font-black text-brand-carbon uppercase italic">{item.customer_name}</p>
                                                            <p className="text-[9px] font-bold text-gray-400">{item.customer_email}</p>
                                                        </td>
                                                        <td className="py-5 text-[10px] font-bold text-gray-400">{new Date(item.created_at).toLocaleDateString()}</td>
                                                        <td className="py-5 text-right font-black italic text-brand-carbon">{item.total?.toLocaleString()} €</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="py-5 text-[11px] font-black text-brand-carbon uppercase italic">{item.full_name}</td>
                                                        <td className="py-5 text-[10px] font-bold text-gray-400">{item.email}</td>
                                                        <td className="py-5 text-[10px] font-bold text-gray-400">{new Date(item.created_at).toLocaleDateString()}</td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
