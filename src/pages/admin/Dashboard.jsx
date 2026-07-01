import { useState, useEffect } from 'react';
import { Package, ShoppingCart, Users, TrendingUp, ArrowUpRight, Loader2, Database, AlertCircle, FileText, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { seedDatabase } from '../../lib/seeder';
import { seedCMS } from '../../lib/seedCMS';

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalSales: 0,
        currentMonthSales: 0,
        last30DaysSales: 0,
        orderCount: 0,
        productCount: 0,
        customerCount: 0,
        categoryCount: 0,
        avgTicket: 0,
        recentOrders: [],
        prevMonthSales: 0,
        prevMonthOrders: 0,
        conversionRate: 0,
        topB2BCustomers: [],
        activeCustomerRatio: 0,
        salesHistory: []
    });
    const [config, setConfig] = useState({
        monthlyGoals: {},
        activeClientThreshold: 6,
        predictionDays: 30
    });
    const [loading, setLoading] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);

            // 0. Fetch Dashboard Config
            const { data: configRes } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'dashboard_config')
                .maybeSingle();

            const dashConfig = configRes?.value || { monthlyGoals: {}, activeClientThreshold: 6, predictionDays: 30 };
            setConfig(dashConfig);

            // Time periods
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
            const thresholdDate = new Date(now);
            thresholdDate.setMonth(thresholdDate.getMonth() - dashConfig.activeClientThreshold);

            // 1. Current Period Data
            const [prodRes, catRes, custRes, orderRes] = await Promise.all([
                supabase.from('products').select('*', { count: 'exact', head: true }),
                supabase.from('categories').select('*', { count: 'exact', head: true }),
                supabase.from('customers').select('*', { count: 'exact', head: true }),
                supabase.from('orders').select('total, created_at, status', { count: 'exact' })
                    .neq('status', 'CANCELLED')
            ]);

            const currentOrders = orderRes.data || [];
            const totalSales = currentOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);

            // Calculate current calendar month start in local time
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const currentMonthOrders = currentOrders.filter(o => new Date(o.created_at) >= startOfMonth);
            const currentMonthSales = currentMonthOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);

            // Calculate last 30 days orders
            const last30DaysOrders = currentOrders.filter(o => new Date(o.created_at) >= thirtyDaysAgo);
            const last30DaysSales = last30DaysOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);

            const avgTicket = orderRes.count > 0 ? totalSales / orderRes.count : 0;
            const conversionRate = custRes.count > 0 ? (orderRes.count / custRes.count) * 100 : 0;

            // 2. Previous Period Data (for MoM comparison)
            const { data: prevOrders } = await supabase
                .from('orders')
                .select('total')
                .gte('created_at', sixtyDaysAgo.toISOString())
                .lt('created_at', thirtyDaysAgo.toISOString())
                .neq('status', 'CANCELLED');

            const prevMonthSales = prevOrders?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;
            const prevMonthOrders = prevOrders?.length || 0;

            // 3. Fetch Recent Real Orders
            const { data: recentOrders } = await supabase
                .from('orders')
                .select(`id, total, status, created_at, customers (full_name)`)
                .order('created_at', { ascending: false })
                .limit(4);

            // 4. Top Customers by LTV — all types, sorted by spending
            const { data: allCustomers } = await supabase
                .from('customers')
                .select('id, full_name, company_name, email, user_type, is_partner');

            const { data: allOrders } = await supabase
                .from('orders')
                .select('customer_email, total, created_at')
                .neq('status', 'CANCELLED');

            // Aggregate by email
            const revenueByEmail = {};
            const lastOrderByEmail = {};
            allOrders?.forEach(o => {
                if (!o.customer_email) return;
                revenueByEmail[o.customer_email] = (revenueByEmail[o.customer_email] || 0) + (o.total || 0);
                const d = new Date(o.created_at);
                if (!lastOrderByEmail[o.customer_email] || d > lastOrderByEmail[o.customer_email]) {
                    lastOrderByEmail[o.customer_email] = d;
                }
            });

            const topB2B = (allCustomers || [])
                .map(c => ({
                    ...c,
                    totalSpent: revenueByEmail[c.email] || 0,
                    lastOrder: lastOrderByEmail[c.email]
                }))
                .filter(c => c.totalSpent > 0)
                .sort((a, b) => b.totalSpent - a.totalSpent)
                .slice(0, 5);

            // 5. Active Customers Calculation
            const { data: activeOrders } = await supabase
                .from('orders')
                .select('customer_email')
                .gte('created_at', thresholdDate.toISOString())
                .neq('status', 'CANCELLED');

            const uniqueActiveEmails = new Set(activeOrders?.map(o => o.customer_email).filter(Boolean));
            const activeCustomerRatio = custRes.count > 0 ? (uniqueActiveEmails.size / custRes.count) * 100 : 0;

            // 6. Sales History (Last 12 Months)
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

            const { data: historyOrders } = await supabase
                .from('orders')
                .select('total, created_at')
                .gte('created_at', twelveMonthsAgo.toISOString())
                .neq('status', 'CANCELLED');

            const salesByMonth = {};
            historyOrders?.forEach(o => {
                const month = new Date(o.created_at).toISOString().slice(0, 7); // YYYY-MM
                salesByMonth[month] = (salesByMonth[month] || 0) + (o.total || 0);
            });

            const salesHistory = [];
            for (let i = 11; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const monthKey = d.toISOString().slice(0, 7);
                salesHistory.push({
                    month: monthKey,
                    total: salesByMonth[monthKey] || 0,
                    goal: dashConfig.monthlyGoals[monthKey.split('-')[1]] || 5000
                });
            }

            setStats({
                totalSales,
                currentMonthSales,
                last30DaysSales,
                orderCount: orderRes.count || 0,
                productCount: prodRes.count || 0,
                customerCount: custRes.count || 0,
                categoryCount: catRes.count || 0,
                avgTicket,
                recentOrders: recentOrders || [],
                prevMonthSales,
                prevMonthOrders,
                conversionRate,
                topB2BCustomers: topB2B,
                activeCustomerRatio,
                salesHistory
            });

        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSeed = async () => {
        if (!confirm('¿Quieres sincronizar los datos iniciales de la web? Esto poblará tus tablas con las categorías, marcas y beneficios predeterminados.')) return;

        try {
            setIsSeeding(true);
            const result = await seedDatabase();
            if (result.success) {
                alert('¡Datos sincronizados correctamente!');
                fetchStats();
                window.location.reload();
            }
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setIsSeeding(false);
        }
    };

    const handleSeedCMS = async () => {
        if (!confirm('¿Quieres sincronizar las páginas legales y de contacto del CMS? Esto creará borradores para Aviso Legal, Privacidad, Envíos, etc.')) return;

        try {
            setIsSeeding(true);
            await seedCMS();
            alert('¡Páginas CMS sincronizadas!');
            window.location.reload();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setIsSeeding(false);
        }
    };

    const calculateGrowth = (current, previous) => {
        if (!previous) return '0%';
        const growth = ((current - previous) / previous) * 100;
        return growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
    };

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const currentMonthKey = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const currentGoal = config.monthlyGoals[currentMonthKey] || 5000;

    // Progressive goal: pro-rated target based on elapsed days
    const currentDay = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const salesForecast = (stats.currentMonthSales / currentDay) * daysInMonth;
    const progressiveGoal = (currentGoal / daysInMonth) * currentDay;
    const isEarlyMonth = currentDay <= 3;
    const hasNoSalesYet = stats.currentMonthSales === 0;

    const cards = [
        {
            label: 'Volumen Negocio',
            value: `${stats.last30DaysSales.toFixed(2)} €`,
            icon: TrendingUp,
            color: 'text-primary',
            bg: 'bg-primary/10',
            trend: calculateGrowth(stats.last30DaysSales, stats.prevMonthSales),
            sub: 'vs últimos 30 días'
        },
        {
            label: 'Ratio Clientes Activos',
            value: `${stats.activeCustomerRatio.toFixed(1)}%`,
            icon: Users,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
            trend: `${config.activeClientThreshold} Meses`,
            sub: 'actividad reciente'
        },
        {
            label: 'Previsión Cierre',
            value: (isEarlyMonth && hasNoSalesYet) ? `${currentGoal.toFixed(0)} €` : `${salesForecast.toFixed(0)} €`,
            icon: ArrowUpRight,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            trend: (isEarlyMonth && hasNoSalesYet) ? 'Iniciando' : calculateGrowth(salesForecast, currentGoal),
            sub: 'proyección mensual'
        },
        {
            label: 'Ticket Medio',
            value: `${stats.avgTicket.toFixed(2)} €`,
            icon: ShoppingCart,
            color: 'text-purple-500',
            bg: 'bg-purple-50',
            trend: 'Premium',
            sub: 'valor por cesta'
        },
    ];

    const getRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) return 'Ahora mismo';
        if (diffInMinutes < 60) return `${diffInMinutes} min`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
        return `${Math.floor(diffInMinutes / 1440)}d`;
    };

    const getStatusStyles = (status) => {
        switch (status?.toUpperCase()) {
            case 'PAID': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
            case 'PENDING': return 'text-amber-500 bg-amber-50 border-amber-100';
            case 'SHIPPED': return 'text-blue-500 bg-blue-50 border-blue-100';
            default: return 'text-gray-400 bg-gray-50 border-gray-100';
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header Intelligence Hub */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-12 pb-8 border-b border-gray-100">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] font-outfit">Core Intelligence v2.0</span>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border font-outfit ${(isEarlyMonth && hasNoSalesYet)
                                ? 'bg-blue-50 text-blue-600 border-blue-100'
                                : (stats.currentMonthSales >= progressiveGoal)
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : (stats.currentMonthSales >= progressiveGoal * 0.6)
                                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                                        : 'bg-red-50 text-red-600 border-red-100'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${(isEarlyMonth && hasNoSalesYet)
                                    ? 'bg-blue-400'
                                    : (stats.currentMonthSales >= progressiveGoal)
                                        ? 'bg-emerald-500'
                                        : (stats.currentMonthSales >= progressiveGoal * 0.6)
                                            ? 'bg-amber-500'
                                            : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                                }`}></span>
                            {(isEarlyMonth && hasNoSalesYet)
                                ? 'Inicio de Mes'
                                : (stats.currentMonthSales >= progressiveGoal)
                                    ? 'Estado Óptimo'
                                    : (stats.currentMonthSales >= progressiveGoal * 0.6)
                                        ? 'Rendimiento Medio'
                                        : 'Atención Crítica'}
                        </div>
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter font-outfit">
                        MIL<span className="text-primary/40">LUCES</span> dashboard
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">
                    {/* Compact Goal Alert Integration - Normalized to h-14 */}
                    {!(isEarlyMonth && hasNoSalesYet) && stats.currentMonthSales < progressiveGoal && (
                        <div className="flex items-center gap-4 bg-red-50 px-5 h-14 rounded-2xl border border-red-100 animate-pulse">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <div>
                                <p className="text-[10px] font-black text-red-700 uppercase leading-none font-outfit">Hito en Riesgo</p>
                                <p className="text-[9px] font-bold text-red-500 uppercase tracking-tight mt-1 font-outfit">
                                    -{(progressiveGoal - stats.currentMonthSales).toFixed(0)}€ hoy · -{(currentGoal - stats.currentMonthSales).toFixed(0)}€ meta
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Goal Performance Integration - Normalized to h-14 */}
                    <div className="flex items-center gap-6 bg-white px-4 h-14 rounded-2xl border border-gray-100 shadow-sm flex-1 md:flex-none">
                        <div className="relative w-10 h-10 flex items-center justify-center group/info">
                            <svg className="w-full h-full -rotate-90">
                                <circle cx="20" cy="20" r="18" fill="transparent" stroke="#f3f4f6" strokeWidth="4" />
                                <circle cx="20" cy="20" r="18" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={113} strokeDashoffset={113 - (113 * Math.min((stats.currentMonthSales / currentGoal) * 100, 100)) / 100} className="text-primary" />
                            </svg>
                            <span className="absolute text-[8px] font-black text-brand-carbon italic font-outfit">{Math.floor((stats.currentMonthSales / currentGoal) * 100)}%</span>

                            {/* Definition Context Tooltip (CSS based) */}
                            <div className="absolute bottom-full mb-4 hidden group-hover/info:block w-48 p-4 bg-brand-carbon text-white rounded-2xl text-[8px] font-bold uppercase tracking-widest leading-relaxed shadow-2xl z-20">
                                <p className="border-b border-white/10 pb-2 mb-2 text-primary">Objetivo Dinámico</p>
                                Configurado mensualmente en el panel de inteligencia para asegurar la viabilidad de la boutique.
                            </div>
                        </div>
                        <div className="border-l border-gray-100 pl-4">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5 font-outfit">Hito Mensual</p>
                            <span className="text-sm font-black text-brand-carbon italic block leading-none font-outfit">{stats.currentMonthSales.toFixed(0)}€</span>
                        </div>
                    </div>

                    <button
                        onClick={handleSeed}
                        disabled={isSeeding}
                        className="bg-brand-carbon text-white h-14 px-8 rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-primary transition-all flex items-center gap-4 shadow-xl shadow-brand-carbon/10 disabled:opacity-50 group font-outfit"
                    >
                        {isSeeding ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Database className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />}
                        Sincronizar Base
                    </button>

                    <button
                        onClick={handleSeedCMS}
                        disabled={isSeeding}
                        className="bg-white text-brand-carbon h-14 px-8 rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-gray-50 transition-all flex items-center gap-4 shadow-xl shadow-gray-100/10 border border-gray-100 disabled:opacity-50 group font-outfit"
                    >
                        {isSeeding ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <FileText className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" />}
                        Sincronizar CMS
                    </button>

                    <Link
                        to="/admin/dashboard-settings"
                        className="bg-white text-brand-carbon h-14 w-14 rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-all shadow-xl shadow-gray-100/10 border border-gray-100 group"
                        title="Configuración del Dashboard"
                    >
                        <Settings className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors group-hover:rotate-90 duration-500" />
                    </Link>
                </div>
            </div>

            {/* Remove Old Prominent Alert Block */}

            {/* Smart KPI Grid - Clean & Consistent */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                {cards.map((card, i) => (
                    <div key={i} className="group bg-white p-8 rounded-[2.5rem] border border-gray-100 hover:border-primary/20 hover:shadow-2xl hover:shadow-gray-100/50 transition-all duration-500">
                        <div className="flex justify-between items-start mb-8">
                            <div className={`p-4 rounded-2xl ${card.bg} ${card.color} border border-transparent group-hover:border-current/20 shadow-sm transition-all duration-500`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${(card.trend || '').startsWith('+') ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                                (card.trend || '').startsWith('-') ? 'text-red-600 bg-red-50 border-red-100' : 'text-blue-600 bg-blue-50 border-blue-100'
                                }`}>
                                {card.trend}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[.3em] font-outfit">{card.label}</p>
                            <h3 className="text-4xl font-black text-brand-carbon italic tracking-tighter font-outfit">
                                {loading ? <span className="animate-pulse text-gray-100">...</span> : card.value}
                            </h3>
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/30"></span>
                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest font-outfit">{card.sub}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Evolution & Performance Analytics */}
            <div className="mb-16">
                <div className="flex items-center justify-between mb-8 px-2 font-outfit">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-black text-brand-carbon uppercase tracking-tighter italic">Evolución de Ventas (12 Meses)</h2>
                        <div className="text-[8px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md uppercase tracking-widest border border-emerald-100 shadow-sm">Tendencia Anual</div>
                    </div>
                </div>
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                    <div className="flex items-end gap-3 h-48">
                        {stats.salesHistory.length > 0 ? stats.salesHistory.map((item, i) => {
                            const maxVal = Math.max(...stats.salesHistory.map(h => Math.max(h.total, h.goal)));
                            const height = (item.total / maxVal) * 100;
                            const goalHeight = (item.goal / maxVal) * 100;
                            const isCurrentMonth = item.month === new Date().toISOString().slice(0, 7);

                            return (
                                <div key={i} className="flex-1 flex flex-col items-center group relative h-full">
                                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-all bg-brand-carbon text-white text-[9px] font-black px-3 py-1.5 rounded-xl z-20 pointer-events-none whitespace-nowrap shadow-xl border border-white/10">
                                        Ventas: {item.total.toFixed(0)}€ <span className="text-primary/60 ml-1">/ Meta: {item.goal.toFixed(0)}€</span>
                                    </div>

                                    {/* Goal Marker (Background) */}
                                    <div
                                        className="absolute w-full border-t-2 border-primary/20 border-dashed z-0 transition-all duration-700"
                                        style={{ bottom: `${goalHeight}%` }}
                                        title={`Meta: ${item.goal}€`}
                                    ></div>

                                    {/* Sales Bar */}
                                    <div
                                        className={`w-full rounded-t-xl transition-all duration-700 relative mt-auto z-10 ${isCurrentMonth ? 'bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]' :
                                            item.total >= item.goal ? 'bg-emerald-400' : 'bg-gray-100 group-hover:bg-primary/40'
                                            }`}
                                        style={{ height: `${Math.max(height, 2)}%` }} // Min height 2% to show something
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100"></div>
                                    </div>
                                    <p className={`text-[8px] font-black uppercase tracking-tighter mt-4 rotate-45 origin-left ${isCurrentMonth ? 'text-primary' : 'text-gray-300'}`}>
                                        {months[parseInt(item.month.split('-')[1]) - 1].slice(0, 3)}
                                    </p>
                                </div>
                            );
                        }) : (
                            <div className="flex-1 flex items-center justify-center text-gray-200 uppercase text-[10px] font-black tracking-widest">
                                Cargando histórico de facturación...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Split Operations & Elite B2B */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                <div className="lg:col-span-3">
                    <div className="flex items-center justify-between mb-8 px-2 font-outfit">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-black text-brand-carbon uppercase tracking-tighter italic">Operaciones de Directo</h2>
                            <div className="text-[8px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-widest border border-blue-100 shadow-sm">Live Feed</div>
                        </div>
                        <Link to="/admin/orders" className="text-[10px] font-black text-primary uppercase tracking-[.2em] hover:opacity-70 transition-opacity">Ver Historial Completo</Link>
                    </div>
                    <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-700">
                        {loading ? (
                            <div className="py-24 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary/10" /></div>
                        ) : stats.recentOrders.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                                {stats.recentOrders.map((order, i) => (
                                    <div key={i} className="flex items-center justify-between p-8 hover:bg-gray-50/30 transition-all duration-300 group font-outfit relative">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors shadow-inner">
                                                <Package className="w-6 h-6 text-gray-300 group-hover:text-primary transition-colors" />
                                            </div>
                                            <div>
                                                <p className="text-base font-black text-brand-carbon uppercase italic leading-none">{order.customers?.full_name || 'Venta Rápida'}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">{getRelativeTime(order.created_at)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-brand-carbon italic">{(order.total || 0).toFixed(2)}€</p>
                                            <span className={`inline-block mt-2 text-[8px] font-black uppercase px-2.5 py-1 rounded-lg border shadow-sm ${getStatusStyles(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-24 text-center">
                                <Package className="w-12 h-12 mx-auto text-gray-100 mb-4" />
                                <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest font-outfit">Sin movimientos recientes</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-8 px-2 font-outfit">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-black text-brand-carbon uppercase tracking-tighter italic">Top Clientes</h2>
                            <div className="text-[8px] font-black text-primary bg-primary/10 px-2 py-1 rounded-md uppercase tracking-widest border border-primary/20 shadow-sm">Por LTV</div>
                        </div>
                        <Link to="/admin/customers" className="text-[10px] font-black text-primary uppercase tracking-[.2em] hover:opacity-70 transition-opacity">Ver Todos</Link>
                    </div>
                    <div className="bg-gray-50/50 rounded-[3rem] p-4 border border-gray-100 space-y-3 shadow-inner">
                        {loading ? (
                            <div className="py-24 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary/10" /></div>
                        ) : stats.topB2BCustomers.length > 0 ? (
                            stats.topB2BCustomers.map((customer, i) => {
                                const daysSince = customer.lastOrder
                                    ? Math.floor((new Date() - new Date(customer.lastOrder)) / (1000 * 60 * 60 * 24))
                                    : null;
                                const isActive = daysSince !== null && daysSince <= (config.activeClientThreshold * 30);
                                const isVip = customer.is_partner;
                                const isPro = customer.user_type === 'profesional';

                                return (
                                    <Link
                                        key={i}
                                        to={`/admin/orders?email=${encodeURIComponent(customer.email)}`}
                                        className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-50 hover:border-primary/20 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 group font-outfit cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            {/* Rank */}
                                            <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center text-sm font-black italic shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform ${i === 0 ? 'bg-amber-400 shadow-amber-200' : 'bg-brand-carbon shadow-brand-carbon/20'}`}>
                                                {i + 1}
                                            </div>
                                            <div className="min-w-0">
                                                {/* Name + badge */}
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[11px] font-black text-brand-carbon uppercase italic leading-none truncate max-w-[100px]">
                                                        {customer.company_name || customer.full_name}
                                                    </p>
                                                    {isVip && (
                                                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-600 border border-amber-300/40 uppercase tracking-wider flex-shrink-0">VIP</span>
                                                    )}
                                                    {isPro && !isVip && (
                                                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 uppercase tracking-wider flex-shrink-0">PRO</span>
                                                    )}
                                                </div>
                                                {/* Activity */}
                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                    {daysSince !== null ? (
                                                        <>
                                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                                                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{daysSince}d sin comprar</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-200 flex-shrink-0"></span>
                                                            <p className="text-[8px] text-gray-300 font-bold uppercase tracking-widest">Sin pedidos</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                            <div className="text-right">
                                                <p className="text-sm font-black text-primary italic leading-none">{(customer.totalSpent || 0).toFixed(0)}€</p>
                                                <p className="text-[7px] text-gray-300 font-black uppercase tracking-widest mt-1">LTV</p>
                                            </div>
                                            <ArrowUpRight className="w-4 h-4 text-gray-200 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0" />
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="py-16 text-center">
                                <Users className="w-10 h-10 mx-auto text-gray-100 mb-4" />
                                <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest font-outfit">Sin datos de clientes aún</p>
                            </div>
                        )}

                        {/* Action Footer */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Link
                                to="/admin/customers"
                                className="flex flex-col items-center justify-center gap-2 p-5 bg-white rounded-2xl border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all group"
                            >
                                <Users className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center font-outfit group-hover:text-brand-carbon transition-colors">Gestionar<br />Clientes</p>
                            </Link>
                            <Link
                                to="/admin/dashboard-settings"
                                className="flex flex-col items-center justify-center gap-2 p-5 bg-white rounded-2xl border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all group"
                            >
                                <Settings className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors group-hover:rotate-90 duration-500" />
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center font-outfit group-hover:text-brand-carbon transition-colors">Configurar<br />Dashboard</p>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
