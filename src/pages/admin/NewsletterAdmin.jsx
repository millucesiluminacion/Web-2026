import { useState, useEffect } from 'react';
import { Mail, Users, Send, Download, Plus, X, Loader2, Save, Trash2, Search, Filter, PieChart, ArrowUpRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function NewsletterAdmin() {
    const [subscribers, setSubscribers] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        lastCampaignSent: null,
        avgOpenRate: '24.5%' // Mocked for UI
    });

    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        content: '',
        target_group: 'all'
    });

    useEffect(() => {
        fetchNewsletterData();
    }, []);

    async function fetchNewsletterData() {
        try {
            setLoading(true);
            const [subsRes, campRes] = await Promise.all([
                supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false }),
                supabase.from('newsletter_campaigns').select('*').order('created_at', { ascending: false })
            ]);

            if (subsRes.error) throw subsRes.error;
            if (campRes.error) throw campRes.error;

            setSubscribers(subsRes.data || []);
            setCampaigns(campRes.data || []);

            setStats({
                total: subsRes.data.length,
                active: subsRes.data.filter(s => s.is_active).length,
                lastCampaignSent: campRes.data.find(c => c.status === 'sent')?.sent_at || null,
                avgOpenRate: '24.5%'
            });
        } catch (error) {
            console.error('Error fetching newsletter data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateCampaign(e) {
        e.preventDefault();
        try {
            setIsSaving(true);
            const { error } = await supabase.from('newsletter_campaigns').insert([{
                ...formData,
                status: 'draft'
            }]);
            if (error) throw error;
            setIsCampaignModalOpen(false);
            fetchNewsletterData();
            alert('Campaña creada como borrador');
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function toggleSubscriber(id, currentStatus) {
        try {
            const { error } = await supabase.from('newsletter_subscribers').update({ is_active: !currentStatus }).eq('id', id);
            if (error) throw error;
            fetchNewsletterData();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async function deleteSubscriber(id) {
        if (!confirm('¿Eliminar suscriptor?')) return;
        try {
            const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', id);
            if (error) throw error;
            fetchNewsletterData();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    const exportSubscribers = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Email,Nombre,Fecha Registro,Estado\n"
            + subscribers.map(s => `${s.email},${s.name || ''},${new Date(s.created_at).toLocaleDateString()},${s.is_active ? 'Activo' : 'Inactivo'}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `newsletter_subscribers_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="font-outfit">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Marketing & Newsletter</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em] mt-3">Gestión de Audiencia y Campañas</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={exportSubscribers}
                        className="bg-white border border-gray-200 text-gray-600 h-14 px-6 rounded-2xl flex items-center gap-3 hover:border-primary transition-all font-black uppercase italic shadow-sm text-[10px]"
                    >
                        <Download className="w-4 h-4 text-primary" /> Exportar Lista
                    </button>
                    <button
                        onClick={() => {
                            setFormData({ title: '', subject: '', content: '', target_group: 'all' });
                            setIsCampaignModalOpen(true);
                        }}
                        className="bg-brand-carbon text-white h-14 px-8 rounded-2xl flex items-center gap-3 hover:bg-primary transition-all font-black uppercase italic text-[10px] shadow-xl shadow-brand-carbon/10 group"
                    >
                        <Send className="w-4 h-4 text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Nueva Campaña
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[
                    { label: 'Total Suscriptores', value: stats.total, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Tasa de Apertura', value: stats.avgOpenRate, icon: PieChart, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Correos Activos', value: stats.active, icon: Mail, color: 'text-purple-500', bg: 'bg-purple-50' },
                    { label: 'Último Envío', value: stats.lastCampaignSent ? new Date(stats.lastCampaignSent).toLocaleDateString() : 'N/A', icon: CheckCircle2, color: 'text-amber-500', bg: 'bg-amber-50' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
                        <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{stat.label}</p>
                            <p className="text-xl font-black text-brand-carbon italic tracking-tighter">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Listado de Suscriptores */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <h2 className="text-sm font-black text-brand-carbon uppercase italic tracking-tight">Audiencia Reciente</h2>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por email..."
                                    className="pl-9 pr-4 py-2 bg-gray-50/50 border-none rounded-xl text-[10px] font-bold outline-none focus:ring-2 ring-primary/10 transition-all w-48"
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 uppercase text-[9px] font-black text-gray-400 border-b border-gray-50 tracking-[0.2em]">
                                    <tr>
                                        <th className="px-8 py-4">Suscriptor</th>
                                        <th className="px-8 py-4">Estado</th>
                                        <th className="px-8 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {subscribers.map((sub) => (
                                        <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-8 py-4">
                                                <div>
                                                    <p className="text-[11px] font-black text-brand-carbon mb-0.5">{sub.email}</p>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase">{sub.name || 'Sin nombre'} • Reg: {new Date(sub.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${sub.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                    {sub.is_active ? 'Suscrito' : 'Unsubscribed'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => toggleSubscriber(sub.id, sub.is_active)}
                                                        className="p-2 text-gray-400 hover:text-primary transition-colors hover:bg-primary/5 rounded-lg"
                                                    >
                                                        <Clock className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteSubscriber(sub.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-lg"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {subscribers.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="px-8 py-20 text-center text-gray-400 italic text-xs">Aún no hay suscriptores registrados.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Historial de Campañas */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
                        <h2 className="text-sm font-black text-brand-carbon uppercase italic tracking-tight mb-8">Campañas & Drafts</h2>
                        <div className="space-y-6">
                            {campaigns.map((camp) => (
                                <div key={camp.id} className="relative pl-6 border-l-2 border-gray-100 pb-1 group cursor-pointer">
                                    <div className={`absolute -left-1.5 top-0 w-2.5 h-2.5 rounded-full border-2 border-white ${camp.status === 'sent' ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                                    <div className="group-hover:translate-x-1 transition-transform">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{camp.status === 'sent' ? `Enviada • ${new Date(camp.sent_at).toLocaleDateString()}` : 'Borrador'}</p>
                                        <p className="text-xs font-black text-brand-carbon uppercase leading-tight mb-2">{camp.title}</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> {camp.target_group === 'all' ? 'Toda la lista' : 'Socios'}</span>
                                            {camp.status === 'sent' && <span className="text-[9px] font-black text-emerald-500">22% Abierto</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {campaigns.length === 0 && (
                                <div className="text-center py-10">
                                    <AlertCircle className="w-8 h-8 text-gray-100 mx-auto mb-3" />
                                    <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">No hay historial de envío</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Banner Informativo */}
                    <div className="bg-brand-carbon text-white rounded-[2.5rem] p-8 shadow-xl shadow-brand-carbon/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/30 transition-all"></div>
                        <h3 className="text-xs font-black uppercase italic tracking-widest mb-4 flex items-center gap-2">
                            Consejo Maestro
                        </h3>
                        <p className="text-[10px] text-gray-400 leading-relaxed font-bold uppercase italic tracking-wider">
                            Combina cupones "Socio" con el newsletter para aumentar la retención un 40% este trimestre.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal Campaña */}
            {isCampaignModalOpen && (
                <div className="fixed inset-0 bg-brand-carbon/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <form onSubmit={handleCreateCampaign}>
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-black uppercase italic text-brand-carbon tracking-tighter">Plan Maestro de Envío</h2>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Crea una comunicación de impacto</p>
                                </div>
                                <button type="button" onClick={() => setIsCampaignModalOpen(false)} className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-brand-carbon transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Título de Referencia (Interno)</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full h-12 bg-gray-50 border-none rounded-2xl px-5 text-sm font-bold focus:ring-2 ring-primary/20 transition-all outline-none"
                                            placeholder="Ej: Promo Re-Estructuración Marzo"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Asunto del Correo (Público)</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full h-12 bg-gray-50 border-none rounded-2xl px-5 text-sm font-bold focus:ring-2 ring-primary/20 transition-all outline-none"
                                            placeholder="Ej: 💡 Nueva Iluminación Premium Solo Para Ti"
                                            value={formData.subject}
                                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Público Objetivo</label>
                                        <div className="flex gap-4">
                                            {['all', 'partners'].map(group => (
                                                <button
                                                    key={group}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, target_group: group })}
                                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.target_group === group ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                                                >
                                                    {group === 'all' ? 'Toda la Lista' : 'Solo Socios'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cuerpo del Mensaje (Maquetación)</label>
                                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                        <ReactQuill
                                            theme="snow"
                                            value={formData.content}
                                            onChange={val => setFormData({ ...formData, content: val })}
                                            className="h-64 mb-12"
                                        />
                                    </div>
                                    <p className="text-[9px] text-gray-400 mt-4 leading-relaxed font-bold uppercase italic tracking-widest flex items-center gap-2">
                                        <AlertCircle className="w-3 h-3" /> Recuerda incluir el enlace de baja automático.
                                    </p>
                                </div>
                            </div>

                            <div className="p-8 border-t border-gray-100 flex justify-end">
                                <button
                                    disabled={isSaving}
                                    type="submit"
                                    className="bg-brand-carbon text-white h-14 px-10 rounded-2xl font-black uppercase italic tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-carbon/10 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Save className="w-4 h-4 text-primary" />}
                                    Guardar Como Borrador
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
