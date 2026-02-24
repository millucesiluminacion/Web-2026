import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, User, ArrowLeft, Loader2, BookOpen, Clock, Tag } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function BlogPostDetail() {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [relatedPosts, setRelatedPosts] = useState([]);

    useEffect(() => {
        if (post) {
            document.title = post.meta_title || `${post.title} | Blog Mil Luces`;
            const metaDesc = document.querySelector('meta[name="description"]');
            const content = post.meta_description || post.excerpt || '';
            if (metaDesc) {
                metaDesc.setAttribute('content', content.substring(0, 160));
            } else {
                const meta = document.createElement('meta');
                meta.name = 'description';
                meta.content = content.substring(0, 160);
                document.head.appendChild(meta);
            }
        }
    }, [post]);

    useEffect(() => {
        async function fetchPost() {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('blog_posts')
                    .select('*')
                    .eq('slug', slug)
                    .single();

                if (error) throw error;
                setPost(data);

                // Fetch related posts
                const { data: related, error: relError } = await supabase
                    .from('blog_posts')
                    .select('*')
                    .neq('id', data.id)
                    .eq('category', data.category)
                    .limit(3);

                if (!relError) setRelatedPosts(related || []);

            } catch (err) {
                console.error('Error fetching post:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchPost();
        window.scrollTo(0, 0);
    }, [slug]);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFDFD]">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[.4em] text-gray-400">Desvelando Insights...</p>
        </div>
    );

    if (!post) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFDFD] px-6">
            <BookOpen className="w-16 h-16 text-gray-200 mb-6" />
            <h1 className="text-2xl font-black text-brand-carbon uppercase italic text-center mb-4">Post no encontrado</h1>
            <Link to="/blog" className="text-[10px] font-black uppercase text-primary border-b-2 border-primary pb-1">Volver al Blog</Link>
        </div>
    );

    return (
        <div className="bg-[#FDFDFD] min-h-screen pb-20">
            {/* Hero Section */}
            <section className="relative h-[60vh] md:h-[70vh] overflow-hidden bg-brand-carbon">
                <img
                    src={post.image_url || 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?q=80&w=2000&auto=format&fit=crop'}
                    className="w-full h-full object-cover opacity-60 scale-105"
                    alt={post.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#FDFDFD] via-brand-carbon/20 to-transparent"></div>

                <div className="absolute inset-0 flex flex-col justify-end pb-20">
                    <div className="container mx-auto px-6 max-w-[900px]">
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                            <Link to="/blog" className="inline-flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest mb-8 hover:text-primary transition-colors group">
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al Magazin
                            </Link>
                            <div className="flex items-center gap-6 mb-6">
                                <span className="px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-lg">{post.category}</span>
                                <div className="flex items-center gap-2 text-[9px] font-bold text-white/60 uppercase tracking-widest">
                                    <Clock className="w-3 h-3" /> 5 min lectura
                                </div>
                            </div>
                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white uppercase italic leading-[0.9] tracking-tighter drop-shadow-2xl">
                                {post.title}
                            </h1>
                        </div>
                    </div>
                </div>
            </section>

            {/* Content Section */}
            <article className="container mx-auto px-6 max-w-[900px] -mt-10 relative z-10">
                <div className="bg-white rounded-[3rem] p-8 md:p-16 shadow-luxury border border-gray-100">
                    {/* Meta info */}
                    <div className="flex flex-wrap items-center justify-between gap-6 mb-12 pb-12 border-b border-gray-50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-primary border border-gray-100">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Escrito por</p>
                                <p className="text-sm font-black text-brand-carbon uppercase italic">{post.author || 'Mil Luces Editor'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Publicado el</p>
                                <p className="text-sm font-black text-brand-carbon uppercase italic">{new Date(post.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                        </div>
                    </div>

                    {/* Pro-Excerpt */}
                    <div className="mb-12">
                        <p className="text-xl md:text-2xl font-bold text-brand-carbon/80 leading-relaxed italic border-l-4 border-primary pl-8">
                            {post.excerpt}
                        </p>
                    </div>

                    {/* Body content */}
                    <div
                        className="prose prose-lg max-w-none text-gray-600 leading-relaxed space-y-6 font-medium"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                </div>
            </article>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
                <section className="container mx-auto px-6 max-w-[1200px] mt-24">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block">Seguir explorando</span>
                            <h2 className="text-3xl font-black text-brand-carbon uppercase italic tracking-tighter">Inspiraciones <span className="text-gray-300">Similares</span></h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {relatedPosts.map(rel => (
                            <Link key={rel.id} to={`/blog/${rel.slug}`} className="group bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100">
                                <div className="aspect-video overflow-hidden">
                                    <img src={rel.image_url} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                </div>
                                <div className="p-6">
                                    <h3 className="text-sm font-black text-brand-carbon uppercase italic leading-tight group-hover:text-primary transition-colors">{rel.title}</h3>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
