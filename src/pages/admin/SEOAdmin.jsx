import { useState, useEffect } from 'react';
import {
    Search, Globe, Package, Menu, Sofa, BookOpen,
    Save, Loader2, AlertCircle, CheckCircle2,
    ExternalLink, Settings, Layout, Image as ImageIcon,
    Tag, BarChart3, Zap, FileText, ChevronDown, ChevronUp, X, Map, Copy, CheckCheck, Bot
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const TABS = [
    { id: 'global', label: 'Sitio Global', icon: Settings },
    { id: 'sitemap', label: 'Sitemap', icon: Map },
    { id: 'pages', label: 'Páginas Landing', icon: Layout },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'categories', label: 'Categorías', icon: Menu },
    { id: 'rooms', label: 'Estancias', icon: Sofa },
    { id: 'blog', label: 'Blog (Posts)', icon: BookOpen },
    { id: 'cms_pages', label: 'Páginas CMS', icon: FileText },
];

const SITEMAP_URL = 'https://2026.millucesiluminacion.com/api/sitemap';
const ROBOTS_URL = 'https://2026.millucesiluminacion.com/robots.txt';

export default function SEOAdmin() {
    const [activeTab, setActiveTab] = useState('global');
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [globalSettings, setGlobalSettings] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [toast, setToast] = useState(null);
    const [savingId, setSavingId] = useState(null); // id of row being saved
    const [isSavingGlobal, setIsSavingGlobal] = useState(false);
    const [expandedId, setExpandedId] = useState(null); // row expanded for description edit

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const [copied, setCopied] = useState(null);
    const handleCopy = (text, key) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    useEffect(() => {
        setExpandedId(null);
        setSearchQuery('');
        if (activeTab === 'global') fetchGlobalSettings();
        else if (activeTab === 'sitemap') return; // static panel, no fetch
        else if (activeTab === 'pages') fetchStaticPages();
        else fetchItems(activeTab);
    }, [activeTab]);

    async function fetchStaticPages() {
        try {
            setLoading(true);
            const { data } = await supabase
                .from('app_settings')
                .select('*')
                .eq('key', 'seo_pages')
                .maybeSingle();

            const defaultPages = [
                { id: 'home', name: 'Home / Portada', slug: '', },
                { id: 'tienda', name: 'Catálogo / Tienda', slug: 'search', },
                { id: 'ofertas', name: 'Ofertas y Descuentos', slug: 'ofertas', },
                { id: 'proyectos', name: 'Inspírate', slug: 'inspirate', },
                { id: 'blog_index', name: 'Blog Boutique (Index)', slug: 'blog', },
                { id: 'profesionales', name: 'Área Profesionales', slug: 'profesionales', },
                { id: 'cart', name: 'Carrito de Compra', slug: 'cart', },
                { id: 'contacto', name: 'Página de Contacto', slug: 'contacto', },
                { id: 'marcas', name: 'Nuestras Marcas', slug: 'marcas', },
                { id: 'estancias', name: 'Iluminación por Estancias', slug: 'estancias', },
                { id: 'login', name: 'Acceso Clientes', slug: 'login', },
                { id: 'register', name: 'Registro Clientes', slug: 'register', },
            ].map(p => ({ ...p, meta_title: '', meta_description: '' }));

            const stored = data?.value || {};
            const merged = defaultPages.map(p => ({ ...p, ...(stored[p.id] || {}) }));
            setItems(merged);
        } catch (err) {
            console.error('fetchStaticPages:', err);
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
                .maybeSingle();
            if (error && error.code !== 'PGRST116') throw error;
            setGlobalSettings(data?.value || { home_title: '', home_description: '', og_image: '', site_name: '' });
        } catch (err) {
            console.error('fetchGlobalSettings:', err);
        } finally {
            setLoading(false);
        }
    }

    async function fetchItems(tab) {
        try {
            setLoading(true);
            let table = tab === 'blog' ? 'blog_posts' : tab;
            // Include focus_keywords for tables that support it (products, categories, rooms)
            const supportsKeywords = ['products', 'categories', 'rooms'].includes(tab);
            let select = (tab === 'blog' || tab === 'cms_pages')
                ? 'id, title, slug, meta_title, meta_description'
                : `id, name, slug, meta_title, meta_description${supportsKeywords ? ', focus_keywords' : ''}`;

            if (tab === 'cms_pages') table = 'cms_pages';

            const { data, error } = await supabase
                .from(table)
                .select(select)
                .order(tab === 'blog' ? 'created_at' : (tab === 'cms_pages' ? 'title' : 'name'), { ascending: tab !== 'blog' });

            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error('fetchItems:', err);
            showToast('Error al cargar datos: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    const handleSaveRow = async (item) => {
        try {
            setSavingId(item.id);
            const supportsKeywords = ['products', 'categories', 'rooms'].includes(activeTab);
            const updates = {
                slug: item.slug,
                meta_title: item.meta_title,
                meta_description: item.meta_description,
                ...(supportsKeywords && { focus_keywords: item.focus_keywords || '' }),
            };

            if (activeTab === 'pages') {
                const { data } = await supabase.from('app_settings').select('value').eq('key', 'seo_pages').maybeSingle();
                const currentPages = data?.value || {};
                currentPages[item.id] = { ...currentPages[item.id], ...updates };
                const { error } = await supabase.from('app_settings').upsert({ key: 'seo_pages', value: currentPages, updated_at: new Date().toISOString() });
                if (error) throw error;
            } else {
                const table = (activeTab === 'blog') ? 'blog_posts' : (activeTab === 'cms_pages' ? 'cms_pages' : activeTab);
                const { error } = await supabase.from(table).update(updates).eq('id', item.id);
                if (error) throw error;
            }

            setItems(items.map(i => i.id === item.id ? { ...i, ...updates } : i));
            showToast('✅ Guardado correctamente');
        } catch (err) {
            showToast('❌ Error al guardar: ' + err.message, 'error');
        } finally {
            setSavingId(null);
        }
    };

    const handleSaveGlobal = async (e) => {
        e.preventDefault();
        try {
            setIsSavingGlobal(true);
            const { error } = await supabase.from('app_settings').upsert({
                key: 'seo_global', value: globalSettings, updated_at: new Date().toISOString()
            });
            if (error) throw error;
            showToast('✅ Configuración global actualizada');
        } catch (err) {
            showToast('❌ Error al guardar: ' + err.message, 'error');
        } finally {
            setIsSavingGlobal(false);
        }
    };

    const updateItem = (id, field, val) =>
        setItems(items.map(i => i.id === id ? { ...i, [field]: val } : i));

    const suggestSlug = (item) => {
        const raw = (item.name || item.title || '').toLowerCase().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        updateItem(item.id, 'slug', raw);
        handleSaveRow({ ...item, slug: raw });
    };

    const getHealthScore = (item) => {
        const supportsKeywords = ['products', 'categories', 'rooms'].includes(activeTab);
        if (supportsKeywords) {
            let s = 0;
            if (item.slug) s += 25;
            if (item.meta_title) s += 25;
            if (item.meta_description) s += 25;
            if (item.focus_keywords) s += 25;
            return s;
        }
        let s = 0;
        if (item.slug) s += 33;
        if (item.meta_title) s += 33;
        if (item.meta_description) s += 34;
        return s;
    };

    const filteredItems = items.filter(item =>
        (item.name || item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.slug || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const optimizedCount = items.filter(i => getHealthScore(i) === 100).length;
    const pendingCount = items.length - optimizedCount;

    const tabIconForRow = () => {
        switch (activeTab) {
            case 'products': return <Package className="w-4 h-4" />;
            case 'categories': return <Tag className="w-4 h-4" />;
            case 'rooms': return <Sofa className="w-4 h-4" />;
            case 'blog': return <BookOpen className="w-4 h-4" />;
            case 'pages': return <FileText className="w-4 h-4" />;
            case 'cms_pages': return <Layout className="w-4 h-4" />;
            default: return <Globe className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-8 font-outfit">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-luxury text-[11px] font-black uppercase tracking-widest animate-in slide-in-from-right-4 duration-300 ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-brand-carbon text-white'}`}>
                    {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-200" /> : <CheckCircle2 className="w-4 h-4 text-primary" />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-brand-carbon text-primary rounded-xl flex items-center justify-center">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">SEO Boutique</h1>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em]">Centro de Control · Visibilidad & Search Intelligence</p>
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
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all
                                ${activeTab === tab.id ? 'bg-brand-carbon text-white shadow-lg shadow-brand-carbon/20 scale-[1.02]' : 'text-gray-500 hover:text-brand-carbon hover:bg-white'}`}>
                            <Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-32 flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-6" />
                        <p className="text-[10px] font-black uppercase tracking-[.4em] text-gray-400">Analizando Metadatos SEO...</p>
                    </div>
                ) : activeTab === 'sitemap' ? (
                    /* ── Sitemap Panel ── */
                    <div className="p-10 space-y-8 max-w-3xl mx-auto">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                <Map className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-brand-carbon uppercase italic">Sitemap Dinámico · Activo</h2>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Generado en tiempo real desde Supabase · Caché 24h</p>
                            </div>
                        </div>

                        {/* Sitemap URL */}
                        <div className="bg-gray-50 rounded-3xl border border-gray-100 p-6 space-y-3">
                            <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest block">URL del Sitemap (para Google Search Console)</label>
                            <div className="flex items-center gap-3">
                                <code className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono text-primary break-all">{SITEMAP_URL}</code>
                                <button onClick={() => handleCopy(SITEMAP_URL, 'sitemap')}
                                    className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center" title="Copiar URL">
                                    {copied === 'sitemap' ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <a href={SITEMAP_URL} target="_blank" rel="noopener noreferrer"
                                    className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-100 text-gray-500 hover:bg-brand-carbon hover:text-white transition-all flex items-center justify-center" title="Abrir sitemap">
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>

                        {/* Robots.txt */}
                        <div className="bg-gray-50 rounded-3xl border border-gray-100 p-6 space-y-3">
                            <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest block">robots.txt</label>
                            <div className="flex items-center gap-3">
                                <code className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono text-gray-600 break-all">{ROBOTS_URL}</code>
                                <a href={ROBOTS_URL} target="_blank" rel="noopener noreferrer"
                                    className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-100 text-gray-500 hover:bg-brand-carbon hover:text-white transition-all flex items-center justify-center" title="Abrir robots.txt">
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="bg-blue-50/60 border border-blue-100 rounded-3xl p-6 space-y-4">
                            <h3 className="text-[10px] font-black text-blue-800 uppercase tracking-widest flex items-center gap-2">
                                <Bot className="w-4 h-4" /> Cómo registrarlo en Google Search Console
                            </h3>
                            <ol className="space-y-2 text-[11px] text-blue-900 font-medium leading-relaxed list-decimal list-inside">
                                <li>Accede a <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="underline font-bold">Google Search Console</a></li>
                                <li>Selecciona tu propiedad <strong>2026.millucesiluminacion.com</strong></li>
                                <li>En el menú lateral, haz clic en <strong>Sitemaps</strong></li>
                                <li>Pega la URL del sitemap y pulsa <strong>Enviar</strong></li>
                            </ol>
                        </div>

                        {/* What's included */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Páginas Estáticas', count: '9', icon: FileText, color: 'bg-violet-50 text-violet-600' },
                                { label: 'Categorías', count: 'Auto', icon: Menu, color: 'bg-amber-50 text-amber-600' },
                                { label: 'Productos', count: 'Auto', icon: Package, color: 'bg-emerald-50 text-emerald-600' },
                                { label: 'Blog Posts', count: 'Auto', icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
                            ].map(({ label, count, icon: Icon, color }) => (
                                <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
                                    <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mx-auto mb-2`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <p className="text-lg font-black text-brand-carbon italic leading-none">{count}</p>
                                    <p className="text-[8px] font-bold uppercase text-gray-400 tracking-widest mt-1">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : activeTab === 'global' ? (
                    /* ── Global Form ── */
                    <form onSubmit={handleSaveGlobal} className="p-12 max-w-4xl mx-auto space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                {/* Site Identity */}
                                <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                                    <div className="flex items-center gap-3 mb-4 text-blue-900">
                                        <Settings className="w-5 h-5" />
                                        <h3 className="text-xs font-black uppercase tracking-widest">Identidad del Sitio</h3>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Nombre del Proyecto / Marca</label>
                                        <input
                                            className="w-full border border-gray-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                            placeholder="Mil Luces Boutique"
                                            value={globalSettings?.site_name || ''}
                                            onChange={e => setGlobalSettings({ ...globalSettings, site_name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* OG Image */}
                                <div className="p-6 bg-brand-carbon/[0.02] rounded-3xl border border-gray-100">
                                    <div className="flex items-center gap-3 mb-4 text-brand-carbon">
                                        <ImageIcon className="w-5 h-5" />
                                        <h3 className="text-xs font-black uppercase tracking-widest">Open Graph (Redes Sociales)</h3>
                                    </div>
                                    <p className="text-[10px] text-gray-400 leading-relaxed font-bold uppercase italic mb-3">Imagen al compartir el enlace de la web.</p>
                                    <input
                                        placeholder="URL de la imagen (ej: /og-image.jpg)"
                                        className="w-full border border-gray-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                        value={globalSettings?.og_image || ''}
                                        onChange={e => setGlobalSettings({ ...globalSettings, og_image: e.target.value })}
                                    />
                                    {globalSettings?.og_image && (
                                        <img src={globalSettings.og_image} alt="OG Preview" className="mt-3 rounded-2xl w-full h-32 object-cover border border-gray-100" onError={e => e.target.style.display = 'none'} />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Google Preview */}
                                <div className="p-8 bg-gray-50 border border-gray-200 rounded-[2.5rem] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Globe className="w-24 h-24" />
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-primary" /> Preview Google · Home
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-blue-600 mb-2 block">Meta Título Home</label>
                                            <input required
                                                placeholder="Ej: Mil Luces | Boutique de Iluminación"
                                                className="w-full border border-gray-200 rounded-xl p-4 text-base font-bold text-blue-600 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                                value={globalSettings?.home_title || ''}
                                                onChange={e => setGlobalSettings({ ...globalSettings, home_title: e.target.value })}
                                            />
                                            <p className={`text-[9px] mt-1 font-bold uppercase tracking-widest ${(globalSettings?.home_title || '').length > 60 ? 'text-red-400' : 'text-gray-300'}`}>
                                                {(globalSettings?.home_title || '').length}/60 caracteres (recomendado ≤60)
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">Meta Descripción Home</label>
                                            <textarea required rows="4"
                                                placeholder="Breve resumen de tu tienda (120-160 caracteres)..."
                                                className="w-full border border-gray-200 rounded-[1.5rem] p-4 text-xs font-medium text-gray-600 focus:ring-2 focus:ring-primary/20 resize-none focus:outline-none"
                                                value={globalSettings?.home_description || ''}
                                                onChange={e => setGlobalSettings({ ...globalSettings, home_description: e.target.value })}
                                            />
                                            <p className={`text-[9px] mt-1 font-bold uppercase tracking-widest ${(globalSettings?.home_description || '').length > 160 ? 'text-red-400' : 'text-gray-300'}`}>
                                                {(globalSettings?.home_description || '').length}/160 caracteres
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button disabled={isSavingGlobal} type="submit"
                                    className="w-full bg-brand-carbon text-white h-16 rounded-2xl font-black uppercase italic tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-carbon/10 disabled:opacity-50">
                                    {isSavingGlobal ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Save className="w-4 h-4 text-primary" />}
                                    Actualizar SEO Maestro
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    /* ── Entity Table ── */
                    <div>
                        {/* Table header */}
                        <div className="grid grid-cols-[2fr_1.5fr_2fr_1fr_auto] gap-4 px-6 py-4 bg-gray-50/80 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <span>Nombre / Referencia</span>
                            <span>Slug (URL)</span>
                            <span>Meta Título</span>
                            <span>Salud SEO</span>
                            <span></span>
                        </div>

                        <div className="divide-y divide-gray-50">
                            {filteredItems.map(item => {
                                const score = getHealthScore(item);
                                const isSaving = savingId === item.id;
                                const isOpen = expandedId === item.id;

                                return (
                                    <div key={item.id} className="group hover:bg-gray-50/40 transition-colors">
                                        {/* Main Row */}
                                        <div className="grid grid-cols-[2fr_1.5fr_2fr_1fr_auto] gap-4 px-6 py-4 items-center">
                                            {/* Name */}
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                                    {tabIconForRow()}
                                                </div>
                                                <p className="text-[11px] font-bold text-brand-carbon uppercase italic leading-tight truncate max-w-[160px]">
                                                    {item.name || item.title}
                                                </p>
                                            </div>

                                            {/* Slug */}
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 w-fit max-w-full">
                                                    <span className="text-[9px] font-black text-gray-300">/</span>
                                                    <input
                                                        className="bg-transparent border-none p-0 text-[10px] font-mono font-bold text-gray-600 focus:ring-0 focus:outline-none w-28"
                                                        value={item.slug || ''}
                                                        onChange={e => updateItem(item.id, 'slug', e.target.value)}
                                                        onBlur={() => handleSaveRow(item)}
                                                        placeholder="mi-slug"
                                                    />
                                                    {!item.slug && (
                                                        <button onClick={() => suggestSlug(item)} title="Sugerir slug" className="text-primary hover:scale-110 transition-transform shrink-0">
                                                            <Zap className="w-3 h-3 fill-current" />
                                                        </button>
                                                    )}
                                                </div>
                                                {item.slug && (
                                                    <a href={`${window.location.origin}/${item.slug}`} target="_blank" rel="noopener noreferrer"
                                                        className="text-[8px] font-bold text-primary/40 uppercase tracking-tighter pl-1 hover:text-primary transition-colors flex items-center gap-1">
                                                        {window.location.host}/{item.slug}
                                                        <ExternalLink className="w-2 h-2" />
                                                    </a>
                                                )}
                                            </div>

                                            {/* Meta Title */}
                                            <input
                                                placeholder="Meta título SEO..."
                                                className="w-full bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary p-1 text-[11px] font-bold text-brand-carbon focus:ring-0 focus:outline-none transition-colors"
                                                value={item.meta_title || ''}
                                                onChange={e => updateItem(item.id, 'meta_title', e.target.value)}
                                                onBlur={() => handleSaveRow(item)}
                                            />

                                            {/* Health */}
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-14 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-700 ${score === 100 ? 'bg-emerald-500' : score > 33 ? 'bg-amber-400' : 'bg-red-400'}`}
                                                        style={{ width: `${score}%` }}
                                                    />
                                                </div>
                                                <span className={`text-[9px] font-black tracking-tighter ${score === 100 ? 'text-emerald-500' : score > 33 ? 'text-amber-500' : 'text-red-400'}`}>
                                                    {score}%
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setExpandedId(isOpen ? null : item.id)}
                                                    className="p-2 text-gray-300 hover:text-brand-carbon transition-colors rounded-lg hover:bg-gray-100" title="Editar descripción">
                                                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => handleSaveRow(item)} disabled={isSaving}
                                                    className="p-2 text-gray-300 hover:text-primary transition-colors disabled:opacity-50 rounded-lg hover:bg-primary/5" title="Guardar">
                                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded: Meta Description + Keywords */}
                                        {isOpen && (
                                            <div className="px-6 pb-5 animate-in slide-in-from-top-2 duration-200">
                                                <div className="ml-11 bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-4">
                                                    {/* Meta Description */}
                                                    <div>
                                                        <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-2 block">Meta Descripción (120-160 caracteres)</label>
                                                        <textarea rows="3"
                                                            placeholder="Breve descripción persuasiva para Google..."
                                                            className="w-full bg-white border border-gray-100 rounded-xl p-3 text-[11px] font-medium text-gray-600 focus:ring-2 focus:ring-primary/10 resize-none focus:outline-none"
                                                            value={item.meta_description || ''}
                                                            onChange={e => updateItem(item.id, 'meta_description', e.target.value)}
                                                        />
                                                        <p className={`text-[9px] mt-1 font-bold uppercase tracking-widest ${(item.meta_description || '').length > 160 ? 'text-red-400' : 'text-gray-300'}`}>
                                                            {(item.meta_description || '').length} / 160 caracteres
                                                        </p>
                                                    </div>

                                                    {/* Focus Keywords — only for products, categories, rooms */}
                                                    {'focus_keywords' in item && (
                                                        <div>
                                                            <label className="text-[9px] font-black uppercase text-amber-500 tracking-widest mb-2 flex items-center gap-1.5">
                                                                <Tag className="w-3 h-3" /> Palabras Clave Objetivo
                                                            </label>
                                                            <input
                                                                placeholder="Ej: tira led, iluminación cocina, luz led 220v..."
                                                                className="w-full bg-white border border-amber-100 rounded-xl p-3 text-[11px] font-medium text-gray-700 focus:ring-2 focus:ring-amber-300/30 focus:outline-none"
                                                                value={item.focus_keywords || ''}
                                                                onChange={e => updateItem(item.id, 'focus_keywords', e.target.value)}
                                                            />
                                                            <p className="text-[9px] mt-1 text-gray-300 font-bold uppercase tracking-widest">
                                                                Separadas por coma · {(item.focus_keywords || '').split(',').filter(k => k.trim()).length} palabra(s) clave
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-end">
                                                        <button onClick={() => { handleSaveRow(item); setExpandedId(null); }}
                                                            className="px-4 py-2 bg-brand-carbon text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center gap-2">
                                                            <Save className="w-3 h-3" /> Guardar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {filteredItems.length === 0 && (
                            <div className="p-20 text-center text-gray-400 italic font-medium text-xs">
                                <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                No se encontraron elementos para optimizar...
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Intelligence Bar */}
            <div className="bg-brand-carbon p-8 rounded-[2rem] text-white/80 flex flex-col md:flex-row items-center gap-8 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <AlertCircle className="w-32 h-32" />
                </div>
                <div className="flex-1 space-y-3 relative z-10">
                    <h4 className="text-sm font-black uppercase italic text-primary flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Boutique SEO Intelligence
                    </h4>
                    <p className="text-xs leading-relaxed font-medium">
                        Los campos se guardan automáticamente al perder el foco o con el botón 💾. Usa el botón <strong>↓</strong> para expandir y editar la <strong>meta descripción</strong> y las <strong>palabras clave objetivo</strong> (productos, categorías y estancias). Los slugs deben ser únicos, en minúsculas y sin acentos.
                    </p>
                </div>
                <div className="flex gap-4 relative z-10 flex-shrink-0">
                    <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/5 text-center min-w-[100px]">
                        <span className="block text-2xl font-black text-primary italic leading-none">{items.length}</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mt-2 block">Analizados</span>
                    </div>
                    <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/5 text-center min-w-[100px]">
                        <span className="block text-2xl font-black text-emerald-400 italic leading-none">{optimizedCount}</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mt-2 block">Optimizados</span>
                    </div>
                    <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/5 text-center min-w-[100px]">
                        <span className="block text-2xl font-black text-amber-400 italic leading-none">{pendingCount}</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mt-2 block">Pendientes</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
