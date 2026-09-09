import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, Loader2, X, BookOpen, User as UserIcon, ChevronDown, Wand2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ImageUpload from '../../components/admin/ImageUpload';
import BLOG_CATEGORIES from '../../data/blogTaxonomy';

// Plantillas de snippets de formateo para insertar en el editor
const SNIPPETS = [
    {
        label: '💡 Consejo',
        template: `\n<!-- CALLOUT:tip -->\n💡 Consejo: Escribe aquí el consejo para el lector.\n<!-- /CALLOUT -->\n`
    },
    {
        label: '⚠️ Advertencia',
        template: `\n<!-- CALLOUT:warning -->\n⚠️ Advertencia: Escribe aquí la advertencia técnica.\n<!-- /CALLOUT -->\n`
    },
    {
        label: '⚡ Ficha técnica',
        template: `\n<!-- CALLOUT:tech -->\n⚡ Ficha Técnica: Escribe aquí los datos técnicos clave.\n<!-- /CALLOUT -->\n`
    },
    {
        label: '📌 Resumen',
        template: `\n<!-- CALLOUT:summary -->\n📌 Resumen: Escribe aquí los puntos clave.\n<!-- /CALLOUT -->\n`
    },
    {
        label: '• Lista <ul>',
        template: `\n<ul>\n  <li>Primer elemento de la lista</li>\n  <li>Segundo elemento de la lista</li>\n  <li>Tercer elemento de la lista</li>\n</ul>\n`
    },
    {
        label: '1. Lista <ol>',
        template: `\n<ol>\n  <li>Primer paso numerado</li>\n  <li>Segundo paso numerado</li>\n</ol>\n`
    },
    {
        label: '❓ FAQ <details>',
        template: `\n<details>\n  <summary>¿Título de la pregunta frecuente?</summary>\n  <p>Respuesta detallada a la pregunta...</p>\n</details>\n`
    },
];

const SNIPPET_BLOCKS = [
    {
        label: '📊 Tabla comparativa',
        template: `\n{"type":"tabla","cols":["Característica","Opción A","Opción B"],"filas":[["Característica 1","Valor A","Valor B"],["Característica 2","Valor A","Valor B"]]}\n`
    },
    {
        label: '🔢 Pasos',
        template: `\n{"type":"pasos","pasos":[{"titulo":"Primer paso","descripcion":"Descripción del primer paso."},{"titulo":"Segundo paso","descripcion":"Descripción del segundo paso."}]}\n`
    },
    {
        label: '📷 Imagen + Pie',
        template: `\n{"type":"imagen","url":"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1200","alt":"Descripción","caption":"Pie de foto descriptivo del proyecto"}\n`
    },
    {
        label: '🌡️ Escala Kelvin',
        template: `\n{"type":"kelvinScale"}\n`
    },
    {
        label: '✓/✕ Pros & Contras',
        template: `\n{"type":"prosCons","pros":["Ventaja 1","Ventaja 2"],"cons":["Inconveniente 1","Inconveniente 2"]}\n`
    },
    {
        label: '❓ Preguntas FAQ',
        template: `\n{"type":"faq","items":[{"pregunta":"¿Pregunta frecuente 1?","respuesta":"Respuesta detallada 1."},{"pregunta":"¿Pregunta frecuente 2?","respuesta":"Respuesta detallada 2."}]}\n`
    },
    {
        label: '⭐ Producto Destacado',
        template: `\n{"type":"destacadoProducto","titulo":"Nombre del Producto","desc":"Descripción breve del producto recomendado","imagen":"https://images.unsplash.com/photo-1572635148818-ef6fd45eb394?w=400","badge":"Recomendado","url":"/catalogo"}\n`
    },
    {
        label: '🛒 CTA Producto',
        template: `\n{"type":"productoCTA","texto":"Ver productos relacionados en nuestro catálogo","url":"/catalogo"}\n`
    },
];

export default function BlogAdmin() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const contentRef = useRef(null);

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        image_url: '',
        author: '',
        category: BLOG_CATEGORIES[0].slug,
        subcategory: '',
        meta_title: '',
        meta_description: '',
    });

    useEffect(() => { fetchPosts(); }, []);

    async function fetchPosts() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('blog_posts').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setPosts(data || []);
        } catch (error) {
            console.error('Error:', error.message);
        } finally {
            setLoading(false);
        }
    }

    function generateSlug(title) {
        return title.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    function openCreate() {
        setEditingId(null);
        setFormData({
            title: '', slug: '', excerpt: '', content: '',
            image_url: '', author: '',
            category: BLOG_CATEGORIES[0].slug,
            subcategory: BLOG_CATEGORIES[0].subcategorias[0]?.slug || '',
            meta_title: '', meta_description: '',
        });
        setIsModalOpen(true);
    }

    function openEdit(post) {
        setEditingId(post.id);
        setFormData({
            title: post.title || '',
            slug: post.slug || '',
            excerpt: post.excerpt || '',
            content: post.content || '',
            image_url: post.image_url || '',
            author: post.author || '',
            category: post.category || BLOG_CATEGORIES[0].slug,
            subcategory: post.subcategory || '',
            meta_title: post.meta_title || '',
            meta_description: post.meta_description || '',
        });
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setIsSaving(true);
            const payload = { ...formData, slug: formData.slug || generateSlug(formData.title) };
            if (editingId) {
                const { error } = await supabase.from('blog_posts').update(payload).eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('blog_posts').insert([payload]);
                if (error) throw error;
            }
            setIsModalOpen(false);
            fetchPosts();
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function deletePost(id) {
        if (!confirm('¿Eliminar este artículo?')) return;
        try {
            const { error } = await supabase.from('blog_posts').delete().eq('id', id);
            if (error) throw error;
            setPosts(posts.filter(p => p.id !== id));
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    // Insertar snippet en la posición actual del cursor
    function insertarSnippet(tpl) {
        const el = contentRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const before = formData.content.substring(0, start);
        const after = formData.content.substring(end);
        const nuevo = before + tpl + after;
        setFormData(prev => ({ ...prev, content: nuevo }));
        setTimeout(() => {
            el.focus();
            el.selectionStart = el.selectionEnd = start + tpl.length;
        }, 10);
    }

    const categoriaActivaData = BLOG_CATEGORIES.find(c => c.slug === formData.category);
    const filtered = posts.filter(p => p.title?.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end mb-10 font-outfit">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Artículos de Blog</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em] mt-3">Gestión de Contenidos · {posts.length} artículos</p>
                </div>
                <button onClick={openCreate} className="bg-brand-carbon text-white h-14 px-8 rounded-2xl flex items-center gap-3 hover:bg-primary transition-all font-black uppercase italic text-[10px] shadow-xl shadow-brand-carbon/10 font-outfit">
                    <Plus className="w-4 h-4 text-primary" /> Nuevo Artículo
                </button>
            </div>

            {/* Tabla de artículos */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar artículos..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-xs focus:ring-2 focus:ring-primary/20 transition-all"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                        <p className="text-[10px] font-black uppercase text-gray-400">Cargando...</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="p-6">Artículo</th>
                                <th className="p-6">Categoría</th>
                                <th className="p-6 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map(post => {
                                const catData = BLOG_CATEGORIES.find(c => c.slug === post.category);
                                return (
                                    <tr key={post.id} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                    {post.image_url ? (
                                                        <img src={post.image_url} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <BookOpen className="w-full h-full p-2 text-gray-300" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-black text-brand-carbon uppercase italic text-sm line-clamp-1">{post.title}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(post.created_at).toLocaleDateString('es-ES')}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-[10px] font-black uppercase tracking-widest">
                                            <div className="flex flex-col gap-1">
                                                {catData ? (
                                                    <span className="px-2 py-1 rounded-lg text-white w-fit text-[8px]"
                                                        style={{ background: catData.color }}>
                                                        {catData.nombre}
                                                    </span>
                                                ) : (
                                                    <span className="text-primary bg-primary/5 px-2 py-1 rounded w-fit">{post.category}</span>
                                                )}
                                                {post.author && (
                                                    <span className="text-gray-400 flex items-center gap-1">
                                                        <UserIcon className="w-3 h-3" /> {post.author}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(post)} className="p-2 text-gray-400 hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => deletePost(post.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal de edición */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-brand-carbon/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
                        <header className="p-8 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-black uppercase italic tracking-tighter text-brand-carbon">
                                {editingId ? 'Editar Artículo' : 'Nuevo Artículo'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-brand-carbon"><X className="w-6 h-6" /></button>
                        </header>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                                {/* Columna izquierda */}
                                <div className="space-y-5">
                                    <ImageUpload defaultValue={formData.image_url} onUpload={url => setFormData({ ...formData, image_url: url })} />

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Título</label>
                                        <input required
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value, slug: generateSlug(e.target.value) })}
                                            placeholder="Título del artículo..."
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Slug (URL)</label>
                                        <input
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold text-gray-500 focus:ring-2 focus:ring-primary/20"
                                            value={formData.slug}
                                            onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                        />
                                    </div>

                                    {/* Categoría y Subcategoría */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Categoría principal</label>
                                            <div className="relative">
                                                <select
                                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 appearance-none pr-8"
                                                    value={formData.category}
                                                    onChange={e => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                                                >
                                                    {BLOG_CATEGORIES.map(c => (
                                                        <option key={c.id} value={c.slug}>{c.nombre}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Subcategoría</label>
                                            <div className="relative">
                                                <select
                                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 appearance-none pr-8"
                                                    value={formData.subcategory}
                                                    onChange={e => setFormData({ ...formData, subcategory: e.target.value })}
                                                >
                                                    <option value="">— Sin subcategoría —</option>
                                                    {(BLOG_CATEGORIES.find(c => c.slug === formData.category)?.subcategorias || []).map(s => (
                                                        <option key={s.id} value={s.slug}>{s.nombre}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Autor</label>
                                        <input
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20"
                                            value={formData.author}
                                            onChange={e => setFormData({ ...formData, author: e.target.value })}
                                            placeholder="Equipo Mil Luces"
                                        />
                                    </div>
                                </div>

                                {/* Columna derecha */}
                                <div className="space-y-5">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Extracto (Excerpt)</label>
                                        <textarea rows="3"
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-medium focus:ring-2 focus:ring-primary/20 resize-none"
                                            value={formData.excerpt}
                                            onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                                            placeholder="Resumen breve del artículo (aparece en las tarjetas del blog)..."
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Meta Título (SEO)</label>
                                        <input
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20"
                                            value={formData.meta_title}
                                            onChange={e => setFormData({ ...formData, meta_title: e.target.value })}
                                            placeholder="Título para Google (max 60 caracteres)..."
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Meta Descripción (SEO)</label>
                                        <textarea rows="2"
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-medium focus:ring-2 focus:ring-primary/20 resize-none"
                                            value={formData.meta_description}
                                            onChange={e => setFormData({ ...formData, meta_description: e.target.value })}
                                            placeholder="Descripción para Google (max 160 caracteres)..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Barra de snippets + Editor de contenido */}
                            <div>
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1 mr-2">
                                        <Wand2 className="w-3 h-3" /> Insertar formato:
                                    </span>
                                    {SNIPPETS.map(s => (
                                        <button key={s.label} type="button"
                                            onClick={() => insertarSnippet(s.template)}
                                            className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-primary hover:text-white hover:border-primary transition-all">
                                            {s.label}
                                        </button>
                                    ))}
                                    <span className="w-px h-4 bg-gray-200" />
                                    {SNIPPET_BLOCKS.map(s => (
                                        <button key={s.label} type="button"
                                            onClick={() => insertarSnippet(s.template)}
                                            className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-brand-carbon hover:text-white hover:border-brand-carbon transition-all">
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                                <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Contenido completo (HTML / JSON estructurado)</label>
                                <textarea
                                    ref={contentRef}
                                    rows="14"
                                    className="w-full bg-gray-50 border-none rounded-[2rem] p-6 text-xs font-mono focus:ring-2 focus:ring-primary/20"
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    placeholder='Escribe HTML o un array JSON de bloques. Usa los botones de arriba para insertar plantillas de formato...'
                                />
                            </div>

                            <button disabled={isSaving}
                                className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase italic tracking-widest hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-3">
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Artículo'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
