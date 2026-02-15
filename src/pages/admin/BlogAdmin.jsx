import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Loader2, X, BookOpen, User as UserIcon, Tag, Layout } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ImageUpload from '../../components/admin/ImageUpload';

export default function BlogAdmin() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        image_url: '',
        author: '',
        category: 'Diseño'
    });

    useEffect(() => {
        fetchPosts();
    }, []);

    async function fetchPosts() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('blog_posts')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setPosts(data || []);
        } catch (error) {
            console.error('Error:', error.message);
        } finally {
            setLoading(false);
        }
    }

    function generateSlug(title) {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    function openCreate() {
        setEditingId(null);
        setFormData({
            title: '', slug: '', excerpt: '', content: '',
            image_url: '', author: '', category: 'Diseño'
        });
        setIsModalOpen(true);
    }

    function openEdit(post) {
        setEditingId(post.id);
        setFormData({ ...post });
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

    const filtered = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-black text-brand-carbon uppercase italic">Gestión de Blog</h1>
                <button onClick={openCreate} className="bg-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all font-black uppercase italic text-xs">
                    <Plus className="w-4 h-4" /> Nuevo Artículo
                </button>
            </div>

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
                    <div className="p-20 flex flex-col items-center"><Loader2 className="w-8 h-8 animate-spin text-primary mb-4" /><p className="text-[10px] font-black uppercase text-gray-400">Sincronizando Magazzino...</p></div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="p-6">Artículo</th>
                                <th className="p-6">Categoría / Autor</th>
                                <th className="p-6 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map(post => (
                                <tr key={post.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                {post.image_url ? <img src={post.image_url} className="w-full h-full object-cover" /> : <BookOpen className="w-full h-full p-2 text-gray-300" />}
                                            </div>
                                            <div>
                                                <p className="font-black text-brand-carbon uppercase italic text-sm line-clamp-1">{post.title}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(post.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 text-[10px] font-black uppercase tracking-widest">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-primary bg-primary/5 px-2 py-1 rounded w-fit">{post.category}</span>
                                            <span className="text-gray-400 flex items-center gap-1"><UserIcon className="w-3 h-3" /> {post.author}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(post)} className="p-2 text-gray-400 hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => deletePost(post.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-brand-carbon/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <header className="p-8 border-b border-gray-100 flex justify-between items-center text-brand-carbon">
                            <h2 className="text-xl font-black uppercase italic tracking-tighter">{editingId ? 'Editar Artículo' : 'Nuevo Artículo'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-brand-carbon"><X className="w-6 h-6" /></button>
                        </header>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <ImageUpload defaultValue={formData.image_url} onUpload={url => setFormData({ ...formData, image_url: url })} />
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Título</label>
                                        <input required className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Categoría</label>
                                            <input className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Autor</label>
                                            <input className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20" value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Resumen (Excerpt)</label>
                                        <textarea rows="3" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-medium focus:ring-2 focus:ring-primary/20 resize-none" value={formData.excerpt} onChange={e => setFormData({ ...formData, excerpt: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Contenido Completo (Markdown/HTML compatible)</label>
                                        <textarea rows="10" className="w-full bg-gray-50 border-none rounded-[2rem] p-6 text-xs font-medium focus:ring-2 focus:ring-primary/20" value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <button disabled={isSaving} className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase italic tracking-widest hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-3">
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Artículo'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
