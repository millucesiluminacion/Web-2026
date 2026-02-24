import { useState, useEffect } from 'react';
import {
    Search, Globe, Package, Menu, Sofa, BookOpen,
    Save, Loader2, AlertCircle, CheckCircle2,
    ExternalLink, Settings, Layout, Image as ImageIcon,
    Tag, ChevronRight, BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const TABS = [
    { id: 'global', label: 'Propiedades Sitio', icon: Settings },
    { id: 'pages', label: 'Páginas Landing', icon: Layout },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'categories', label: 'Categorías', icon: Menu },
    { id: 'rooms', label: 'Estancias', icon: Sofa },
    { id: 'blog', label: 'Blog (Posts)', icon: BookOpen },
];

export default function SEOAdmin() {
    const [activeTab, setActiveTab] = useState('global');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [items, setItems] = useState([]);
    const [globalSettings, setGlobalSettings] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (activeTab === 'global') {
            fetchGlobalSettings();
        } else if (activeTab === 'pages') {
            fetchStaticPages();
        } else {
            fetchItems(activeTab);
        }
    }, [activeTab]);

    async function fetchStaticPages() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .eq('key', 'seo_pages')
                .single();

            const defaultPages = [
                { id: 'home', name: 'Home / Portada', slug: '', meta_title: '', meta_description: '' },
                { id: 'tienda', name: 'Tienda / Decoración', slug: 'listing', meta_title: '', meta_description: '' },
                { id: 'ofertas', name: 'Ofertas y Descuentos', slug: 'ofertas', meta_title: '', meta_description: '' },
                { id: 'proyectos', name: 'Proyectos Luz & Arte', slug: 'proyectos', meta_title: '', meta_description: '' },
                { id: 'blog_index', name: 'Blog Boutique (Index)', slug: 'blog', meta_title: '', meta_description: '' },
                { id: 'profesionales', name: 'Área Profesionales', slug: 'profesionales', meta_title: '', meta_description: '' },
            ];

            const storedPages = data?.value || {};
            const mergedPages = defaultPages.map(p => ({
                ...p,
                ...(storedPages[p.id] || {})
            }));

            setItems(mergedPages);
        } catch (error) {
            console.error('Error fetching static pages:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchGlobalSettings() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .eq('key', 'seo_global')
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            setGlobalSettings(data?.value || {
                home_title: '',
                home_description: '',
                og_image: '',
                site_name: ''
            });
        } catch (error) {
            console.error('Error fetching global settings:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchItems(tab) {
        try {
            setLoading(true);
            let table = '';
            let select = 'id, name, slug, meta_title, meta_description';

            switch (tab) {
                case 'products': table = 'products'; break;
                case 'categories': table = 'categories'; break;
                case 'rooms': table = 'rooms'; break;
                case 'blog':
                    table = 'blog_posts';
                    select = 'id, title, slug, meta_title, meta_description';
                    break;
            }

            const { data, error } = await supabase
                .from(table)
                .select(select)
                .order(tab === 'blog' ? 'created_at' : 'name', { ascending: tab !== 'blog' });

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching items:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleUpdateItem = async (id, updates) => {
        try {
            setIsSaving(true);

            if (activeTab === 'pages') {
                // Actualizar en app_settings
                const { data } = await supabase.from('app_settings').select('value').eq('key', 'seo_pages').single();
                const currentPages = data?.value || {};
                currentPages[id] = { ...currentPages[id], ...updates };

                const { error } = await supabase.from('app_settings').upsert({
                    key: 'seo_pages',
                    value: currentPages,
                    updated_at: new Date().toISOString()
                });
                if (error) throw error;
            } else {
                let table = activeTab === 'blog' ? 'blog_posts' : activeTab;
                const { error } = await supabase
                    .from(table)
                    .update(updates)
                    .eq('id', id);

                if (error) throw error;
            }

            setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
        } catch (error) {
            alert('Error al actualizar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveGlobal = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    key: 'seo_global',
                    value: globalSettings,
                    updated_at: new Date().toISOString()
                });
            if (error) throw error;
            alert('Configuración global actualizada');
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredItems = items.filter(item =>
        (item.name || item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.slug || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getHealthScore = (item) => {
        let score = 0;
        if (item.slug) score += 33;
        if (item.meta_title) score += 33;
        if (item.meta_description) score += 34;
        return score;
    };

    return (
        <div className="space-y-8 font-outfit">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-brand-carbon text-primary rounded-xl flex items-center justify-center">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">SEO Boutique</h1>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em]">Centro de Control de Visibilidad y Search Intelligence</p>
                </div>

                {activeTab !== 'global' && (
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o slug..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold uppercase focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                )}
            </header>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100/50 rounded-2xl w-fit border border-gray-100">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                ? 'bg-brand-carbon text-white shadow-lg shadow-brand-carbon/20 scale-[1.02]'
                                : 'text-gray-500 hover:text-brand-carbon hover:bg-white'
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-32 flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-6" />
                        <p className="text-[10px] font-black uppercase tracking-[.4em] text-gray-400">Analizando Metadatos SEO...</p>
                    </div>
                ) : activeTab === 'global' ? (
                    /* Global SEO Form */
                    <form onSubmit={handleSaveGlobal} className="p-12 max-w-4xl mx-auto space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                                    <div className="flex items-center gap-3 mb-4 text-blue-900">
                                        <Settings className="w-5 h-5" />
                                        <h3 className="text-xs font-black uppercase tracking-widest">Identidad del Sitio</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Nombre del Proyecto</label>
                                            <input
                                                className="w-full bg-white border-gray-100 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                                                value={globalSettings?.site_name || ''}
                                                onChange={e => setGlobalSettings({ ...globalSettings, site_name: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-brand-carbon/[0.02] rounded-3xl border border-gray-100">
                                    <div className="flex items-center gap-3 mb-4 text-brand-carbon">
                                        <ImageIcon className="w-5 h-5" />
                                        <h3 className="text-xs font-black uppercase tracking-widest">Open Graph (Redes Sociales)</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-[10px] text-gray-400 leading-relaxed font-bold uppercase italic">Imagen que aparece al compartir el enlace de la web en redes sociales.</p>
                                        <input
                                            placeholder="URL de la imagen (ej: /og-image.jpg)"
                                            className="w-full bg-white border-gray-100 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-primary/20"
                                            value={globalSettings?.og_image || ''}
                                            onChange={e => setGlobalSettings({ ...globalSettings, og_image: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="p-8 bg-gray-50 border border-gray-200 rounded-[2.5rem] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Globe className="w-24 h-24" />
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-primary" /> Preview Google
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-blue-600 mb-2 block">Meta Título Home</label>
                                            <input
                                                required
                                                placeholder="Ej: Mil Luces | Boutique de Iluminación"
                                                className="w-full bg-white border-gray-200 rounded-xl p-4 text-base font-bold text-blue-600 focus:ring-2 focus:ring-primary/20"
                                                value={globalSettings?.home_title || ''}
                                                onChange={e => setGlobalSettings({ ...globalSettings, home_title: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">Meta Descripción Home</label>
                                            <textarea
                                                required
                                                rows="4"
                                                placeholder="Breve resumen de tu tienda..."
                                                className="w-full bg-white border-gray-200 rounded-[1.5rem] p-4 text-xs font-medium text-gray-600 focus:ring-2 focus:ring-primary/20 resize-none"
                                                value={globalSettings?.home_description || ''}
                                                onChange={e => setGlobalSettings({ ...globalSettings, home_description: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    disabled={isSaving}
                                    type="submit"
                                    className="w-full bg-brand-carbon text-white h-16 rounded-2xl font-black uppercase italic tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-carbon/10 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Save className="w-4 h-4 text-primary" />}
                                    Actualizar SEO Maestro
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    /* Entity List with In-Place Editing */
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                <tr>
                                    <th className="p-6">Nombre / Referencia</th>
                                    <th className="p-6">Slug (URL)</th>
                                    <th className="p-6">Meta Título</th>
                                    <th className="p-6">Estado / Salud</th>
                                    <th className="p-6 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredItems.map(item => {
                                    const score = getHealthScore(item);
                                    return (
                                        <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                                        {activeTab === 'products' && <Package className="w-4 h-4" />}
                                                        {activeTab === 'categories' && <Tag className="w-4 h-4" />}
                                                        {activeTab === 'rooms' && <Sofa className="w-4 h-4" />}
                                                        {activeTab === 'blog' && <BookOpen className="w-4 h-4" />}
                                                    </div>
                                                    <p className="text-[11px] font-bold text-brand-carbon uppercase italic leading-tight max-w-[180px] truncate">
                                                        {item.name || item.title}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 group/slug bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 w-fit">
                                                        <span className="text-[9px] font-black text-gray-300">/</span>
                                                        <input
                                                            disabled={activeTab === 'pages'}
                                                            className={`bg-transparent border-none p-0 text-[10px] font-mono font-bold text-gray-600 focus:ring-0 w-32 ${activeTab === 'pages' ? 'opacity-50 select-none' : ''}`}
                                                            value={item.slug || ''}
                                                            onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, slug: e.target.value } : i))}
                                                            onBlur={(e) => handleUpdateItem(item.id, { slug: e.target.value })}
                                                        />
                                                        {!item.slug && activeTab !== 'pages' && (
                                                            <button
                                                                onClick={() => {
                                                                    const suggest = (item.name || item.title || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                                                                    setItems(items.map(i => i.id === item.id ? { ...i, slug: suggest } : i));
                                                                    handleUpdateItem(item.id, { slug: suggest });
                                                                }}
                                                                title="Sugerir Slug"
                                                                className="text-primary hover:scale-110 transition-transform"
                                                            >
                                                                <Zap className="w-3 h-3 fill-current" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <a
                                                        href={`${window.location.origin}/${item.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[8px] font-bold text-primary/40 uppercase tracking-tighter pl-1 hover:text-primary transition-colors flex items-center gap-1"
                                                    >
                                                        {window.location.host}/{item.slug}
                                                        <ExternalLink className="w-2 h-2" />
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <input
                                                    placeholder="Títlo SEO..."
                                                    className="w-64 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary p-1 text-[11px] font-bold text-brand-carbon focus:ring-0 transition-colors"
                                                    value={item.meta_title || ''}
                                                    onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, meta_title: e.target.value } : i))}
                                                    onBlur={(e) => handleUpdateItem(item.id, { meta_title: e.target.value })}
                                                />
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${score === 100 ? 'bg-emerald-500' : score > 33 ? 'bg-amber-500' : 'bg-red-400'
                                                                }`}
                                                            style={{ width: `${score}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-tighter">
                                                        {score}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <button
                                                    className="p-2 text-gray-300 hover:text-primary transition-colors hover:scale-110 active:scale-90"
                                                    title="Guardar cambios manual"
                                                    onClick={() => handleUpdateItem(item.id, {
                                                        slug: item.slug,
                                                        meta_title: item.meta_title,
                                                        meta_description: item.meta_description
                                                    })}
                                                >
                                                    <Save className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {filteredItems.length === 0 && (
                            <div className="p-20 text-center text-gray-400 italic font-medium text-xs">
                                <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                No se encontraron elementos para optimizar...
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Hint Box */}
            <div className="bg-brand-carbon p-8 rounded-[2rem] text-white/80 flex flex-col md:flex-row items-center gap-8 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <AlertCircle className="w-32 h-32" />
                </div>
                <div className="flex-1 space-y-3 relative z-10">
                    <h4 className="text-sm font-black uppercase italic text-primary flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Boutique SEO Intelligence
                    </h4>
                    <p className="text-xs leading-relaxed font-medium">
                        El sistema guarda automáticamente al perder el foco (blur) en los campos de la tabla, pero también puedes forzar el guardado con el icono de disco. Recuerda que los slugs deben ser <b>únicos</b> y en minúsculas.
                    </p>
                </div>
                <div className="flex gap-4 relative z-10">
                    <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/5 text-center min-w-[120px]">
                        <span className="block text-2xl font-black text-primary italic leading-none">{items.length}</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mt-2 block">Analizados</span>
                    </div>
                    <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/5 text-center min-w-[120px]">
                        <span className="block text-2xl font-black text-emerald-400 italic leading-none">
                            {items.filter(i => getHealthScore(i) === 100).length}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mt-2 block">Optimizados</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
