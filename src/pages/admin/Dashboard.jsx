import { useState, useEffect } from 'react';
import { Package, ShoppingCart, Users, TrendingUp, ArrowUpRight, Loader2, Database, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { seedDatabase } from '../../lib/seeder';

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalSales: 0,
        orderCount: 0,
        productCount: 0,
        customerCount: 0,
        categoryCount: 0,
        avgTicket: 0,
        recentOrders: [],
        prevMonthSales: 0,
        prevMonthOrders: 0,
        conversionRate: 0,
        topB2BCustomers: []
    });
    const [loading, setLoading] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);

            // Time periods
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

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

            // 4. Top B2B Customers
            const { data: b2bCustomers } = await supabase
                .from('profiles')
                .select('id, full_name, company_name, user_type')
                .eq('user_type', 'profesional');

            // Note: In a real app we'd aggregate order totals in SQL, here we simulate for the Top 5
            const { data: orderTotals } = await supabase.from('orders').select('customer_id, total');
            const customerRevenue = {};
            orderTotals?.forEach(o => {
                if (o.customer_id) {
                    customerRevenue[o.customer_id] = (customerRevenue[o.customer_id] || 0) + (o.total || 0);
                }
            });

            const topB2B = (b2bCustomers || [])
                .map(c => ({ ...c, totalSpent: customerRevenue[c.id] || 0 }))
                .sort((a, b) => b.totalSpent - a.totalSpent)
                .slice(0, 5);

            setStats({
                totalSales,
                orderCount: orderRes.count || 0,
                productCount: prodRes.count || 0,
                customerCount: custRes.count || 0,
                categoryCount: catRes.count || 0,
                avgTicket,
                recentOrders: recentOrders || [],
                prevMonthSales,
                prevMonthOrders,
                conversionRate,
                topB2BCustomers: topB2B
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

    const calculateGrowth = (current, previous) => {
        if (!previous) return '0%';
        const growth = ((current - previous) / previous) * 100;
        return growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
    };

    const cards = [
        {
            label: 'Volumen Negocio',
            value: `${stats.totalSales.toFixed(2)} €`,
            icon: TrendingUp,
            color: 'text-primary',
            bg: 'bg-primary/10',
            trend: calculateGrowth(stats.totalSales, stats.prevMonthSales),
            sub: 'vs últimos 30 días'
        },
        {
            label: 'Pedidos',
            value: stats.orderCount,
            icon: ShoppingCart,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
            trend: calculateGrowth(stats.orderCount, stats.prevMonthOrders),
            sub: 'frecuencia compra'
        },
        {
            label: 'Tasa Conversión',
            value: `${stats.conversionRate.toFixed(1)}%`,
            icon: ArrowUpRight,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            trend: 'Live',
            sub: 'pedidos / clientes'
        },
        {
            label: 'Ticket Medio',
            value: `${stats.avgTicket.toFixed(2)} €`,
            icon: Users,
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
                        <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] font-outfit">Core Intelligence v2.6</span>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border font-outfit ${(stats.totalSales >= 5000) ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            (stats.totalSales >= 3000) ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${(stats.totalSales >= 5000) ? 'bg-emerald-500' : (stats.totalSales >= 3000) ? 'bg-amber-500' : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`}></span>
                            {(stats.totalSales >= 5000) ? 'Estado Óptimo' : (stats.totalSales >= 3000) ? 'Rendimiento Medio' : 'Atención Crítica'}
                        </div>
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter font-outfit">
                        la<span className="text-primary/40">Boutique</span> dashboard
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">
                    {/* Compact Goal Alert Integration - Normalized to h-14 */}
                    {stats.totalSales < 5000 && (
                        <div className="flex items-center gap-4 bg-red-50 px-5 h-14 rounded-2xl border border-red-100 animate-pulse">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <div>
                                <p className="text-[10px] font-black text-red-700 uppercase leading-none font-outfit">Hito en Riesgo</p>
                                <p className="text-[9px] font-bold text-red-500 uppercase tracking-tight mt-1 font-outfit">
                                    -{(5000 - stats.totalSales).toFixed(0)}€ p. Objetivo Estándar
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Goal Performance Integration - Normalized to h-14 */}
                    <div className="flex items-center gap-6 bg-white px-4 h-14 rounded-2xl border border-gray-100 shadow-sm flex-1 md:flex-none">
                        <div className="relative w-10 h-10 flex items-center justify-center group/info">
                            <svg className="w-full h-full -rotate-90">
                                <circle cx="20" cy="20" r="18" fill="transparent" stroke="#f3f4f6" strokeWidth="4" />
                                <circle cx="20" cy="20" r="18" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={113} strokeDashoffset={113 - (113 * Math.min((stats.totalSales / 5000) * 100, 100)) / 100} className="text-primary" />
                            </svg>
                            <span className="absolute text-[8px] font-black text-brand-carbon italic font-outfit">{Math.floor((stats.totalSales / 5000) * 100)}%</span>

                            {/* Definition Context Tooltip (CSS based) */}
                            <div className="absolute bottom-full mb-4 hidden group-hover/info:block w-48 p-4 bg-brand-carbon text-white rounded-2xl text-[8px] font-bold uppercase tracking-widest leading-relaxed shadow-2xl z-20">
                                <p className="border-b border-white/10 pb-2 mb-2 text-primary">Origen del Objetivo</p>
                                Definido por gerencia como "Hito de Crecimiento Estándar" mensual para asegurar la viabilidad de la boutique.
                            </div>
                        </div>
                        <div className="border-l border-gray-100 pl-4">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5 font-outfit">Hito Mensual</p>
                            <span className="text-sm font-black text-brand-carbon italic block leading-none font-outfit">{stats.totalSales.toFixed(0)}€</span>
                        </div>
                    </div>

                    <button
                        onClick={handleSeed}
                        disabled={isSeeding}
                        className="bg-brand-carbon text-white h-14 px-8 rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-primary transition-all flex items-center gap-4 shadow-xl shadow-brand-carbon/10 disabled:opacity-50 group font-outfit"
                    >
                        {isSeeding ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Database className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />}
                        Sincronizar
                    </button>
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

            {/* Split Operations & Elite B2B */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                <div className="lg:col-span-3">
                    <div className="flex items-center justify-between mb-8 px-2 font-outfit">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-black text-brand-carbon uppercase tracking-tighter italic">Operaciones de Directo</h2>
                            <div className="text-[8px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-widest border border-blue-100 shadow-sm">Live Feed</div>
                        </div>
                        <button className="text-[10px] font-black text-primary uppercase tracking-[.2em] hover:opacity-70 transition-opacity">Ver Historial Completo</button>
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
                        <h2 className="text-lg font-black text-brand-carbon uppercase tracking-tighter italic">Clientes Élite B2B</h2>
                        <Users className="w-5 h-5 text-gray-200" />
                    </div>
                    <div className="bg-gray-50/50 rounded-[3rem] p-4 border border-gray-100 space-y-4 shadow-inner">
                        {loading ? (
                            <div className="py-24 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary/10" /></div>
                        ) : stats.topB2BCustomers.length > 0 ? (
                            stats.topB2BCustomers.map((customer, i) => (
                                <div key={i} className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-50 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-500 group font-outfit">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-2xl bg-brand-carbon text-white flex items-center justify-center text-sm font-black italic shadow-lg shadow-brand-carbon/20 group-hover:scale-110 transition-transform">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-brand-carbon uppercase italic leading-none truncate max-w-[140px]">{customer.company_name || customer.full_name}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Cuenta PRO</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-base font-black text-primary italic leading-none">{(customer.totalSpent || 0).toFixed(0)}€</p>
                                        <p className="text-[7px] text-gray-300 font-black uppercase tracking-widest mt-1">Facturación</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-24 text-center">
                                <Users className="w-10 h-10 mx-auto text-gray-100 mb-4" />
                                <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest font-outfit">Sin datos destacados</p>
                            </div>
                        )}

                        {/* Motivation Insight */}
                        <div className="p-8 bg-brand-carbon rounded-[2.5rem] text-center mt-8 shadow-2xl shadow-brand-carbon/20 group hover:bg-primary transition-colors duration-700">
                            <p className="text-white text-[10px] font-black uppercase italic leading-relaxed tracking-wider font-outfit">
                                "La exclusividad brilla más con datos claros"
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
