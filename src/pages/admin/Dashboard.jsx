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
        topProducts: []
    });
    const [loading, setLoading] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);

            // 1. Conteos básicos
            const [prodRes, catRes, custRes, orderRes] = await Promise.all([
                supabase.from('products').select('*', { count: 'exact', head: true }),
                supabase.from('categories').select('*', { count: 'exact', head: true }),
                supabase.from('customers').select('*', { count: 'exact', head: true }),
                supabase.from('orders').select('total', { count: 'exact' })
            ]);

            // 2. Calcular Ventas Totales (Solo pedidos no cancelados)
            const totalSales = (orderRes.data || [])
                .reduce((acc, curr) => acc + (curr.total || 0), 0);

            // 3. Obtener Top Products (Simulado por ahora con los últimos creados, o real si hay items)
            const { data: topProds } = await supabase
                .from('order_items')
                .select('product_name, quantity, unit_price')
                .limit(5);

            setStats({
                totalSales,
                orderCount: orderRes.count || 0,
                productCount: prodRes.count || 0,
                customerCount: custRes.count || 0,
                categoryCount: catRes.count || 0,
                topProducts: topProds || []
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

    const cards = [
        { label: 'Ventas Totales', value: `${stats.totalSales.toFixed(2)} €`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Pedidos Realizados', value: stats.orderCount, icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Productos Activos', value: stats.productCount, icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Clientes', value: stats.customerCount, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block">Central Intelligence</span>
                    <h1 className="text-4xl lg:text-5xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Panel de <span className="text-primary/40">Control</span></h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSeed}
                        disabled={isSeeding}
                        className="flex items-center gap-3 bg-brand-carbon text-white px-8 py-4 rounded-2xl font-black uppercase italic text-[10px] shadow-2xl hover:bg-primary transition-all disabled:opacity-50"
                    >
                        {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4 text-primary" />}
                        Sincronizar Boutique
                    </button>
                    <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-2.5 rounded-xl flex items-center gap-2 border border-blue-100 uppercase italic tracking-widest">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Live
                    </div>
                </div>
            </div>

            {!loading && stats.categoryCount === 0 && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-4 animate-pulse">
                    <div className="p-3 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-100">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-amber-900 uppercase italic">Base de datos vacía</p>
                        <p className="text-[10px] text-amber-700 font-bold uppercase opacity-80">Sincroniza los datos iniciales para empezar.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                {cards.map((card, i) => (
                    <div key={i} className="group bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-luxury transition-all duration-500 border border-gray-100 flex flex-col justify-between h-[210px]">
                        <div className="flex justify-between items-start">
                            <div className={`p-4 rounded-2xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-500`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <div className="bg-green-50 text-green-600 text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 uppercase italic tracking-tighter">
                                <ArrowUpRight className="w-3 h-3" />
                                Live
                            </div>
                        </div>
                        <div>
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[.2em] mb-1">{card.label}</p>
                            <h3 className="text-3xl font-black text-brand-carbon italic tracking-tighter">
                                {loading ? <span className="animate-pulse text-gray-100">...</span> : card.value}
                            </h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-xl font-black text-brand-carbon uppercase italic tracking-tighter">Últimas <span className="text-primary">Ventas</span></h3>
                        <button className="text-[10px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20 pb-1">Ver Reporte Completo</button>
                    </div>
                    <div className="space-y-6">
                        {loading ? (
                            <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>
                        ) : stats.topProducts.length > 0 ? (
                            stats.topProducts.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-5 hover:bg-gray-50 rounded-[2rem] transition-all duration-300 border border-transparent hover:border-gray-100 group">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">💡</div>
                                        <div>
                                            <p className="text-sm font-black text-brand-carbon uppercase italic truncate max-w-[300px]">{item.product_name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Ref: #ML-{(2000 + i).toString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-brand-carbon italic">{(item.unit_price * item.quantity).toFixed(2)} €</p>
                                        <div className="flex items-center justify-end gap-2 mt-1">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                            <p className="text-[8px] text-green-500 font-bold uppercase tracking-widest">Pago Confirmado</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
                                <Package className="w-10 h-10 mx-auto text-gray-200 mb-4" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Esperando primeras operaciones</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-brand-carbon rounded-[3rem] p-10 shadow-2xl text-white relative overflow-hidden flex flex-col justify-between min-h-[500px]">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-10 leading-tight">Métricas <br /><span className="text-primary">Boutique</span></h3>
                        <div className="space-y-10">
                            <div>
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-[.3em] mb-4">
                                    <span className="text-gray-400">Objetivo Mensual</span>
                                    <span className="text-primary">78.4%</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-[78%] rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]"></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-[.3em] mb-4">
                                    <span className="text-gray-400">Satisfacción Cliente</span>
                                    <span className="text-primary">99.2%</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-white w-[99%] rounded-full opacity-40"></div>
                                </div>
                            </div>

                            <p className="text-[11px] text-gray-500 leading-relaxed italic border-l border-primary/30 pl-6 mt-12 font-medium">
                                "La excelencia no es un acto, sino un hábito. Nuestro panel refleja el compromiso con la alta iluminación."
                            </p>
                        </div>
                    </div>

                    <button className="relative z-10 w-full py-5 bg-white/5 hover:bg-white text-white hover:text-brand-carbon rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500 border border-white/10 group overflow-hidden">
                        <span className="relative z-10 italic">Descargar Reporte Anual</span>
                        <div className="absolute inset-x-0 bottom-0 h-0 bg-primary group-hover:h-full transition-all duration-500 -z-0"></div>
                    </button>

                    {/* Ambient Glow */}
                    <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>
                </div>
            </div>
        </div>
    )
}
