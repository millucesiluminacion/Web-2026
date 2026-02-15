import { useState, useEffect } from 'react';
import { ArrowRight, Calendar, User, Loader2, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function BlogPage() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPosts() {
            try {
                const { data, error } = await supabase
                    .from('blog_posts')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setPosts(data || []);
            } catch (err) {
                console.error('Error fetching blog posts:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchPosts();
    }, []);

    return (
        <div className="bg-[#FDFDFD] min-h-screen pt-8 pb-12">
            <div className="container mx-auto px-6 max-w-[1200px]">
                <header className="mb-12 text-center relative">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-4 block">Magazzino Mil Luces</span>
                    <h1 className="text-4xl lg:text-6xl font-black text-brand-carbon uppercase italic leading-tight tracking-tighter">
                        Nuestro <span className="text-primary/40">Blog de</span> <br /> <span className="text-brand-carbon">Diseño</span>
                    </h1>
                    <div className="w-20 h-1 bg-primary/10 mx-auto mt-8 rounded-full"></div>
                </header>

                {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center text-gray-400 glass rounded-[3rem]">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Magazzino...</p>
                    </div>
                ) : posts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {posts.map((post) => (
                            <article key={post.id} className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-luxury transition-all duration-500 border border-gray-100/50 flex flex-col">
                                <div className="aspect-[16/10] overflow-hidden">
                                    <img
                                        src={post.image_url || 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?q=80&w=1200&auto=format&fit=crop'}
                                        alt={post.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                </div>
                                <div className="p-8 flex-1 flex flex-col">
                                    <div className="flex items-center gap-4 mb-4">
                                        <span className="text-[9px] font-black uppercase text-primary bg-primary/5 px-2 py-1 rounded-md">{post.category}</span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{new Date(post.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h2 className="text-xl font-black text-brand-carbon uppercase italic leading-tight mb-4 group-hover:text-primary transition-colors">
                                        {post.title}
                                    </h2>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-6">
                                        {post.excerpt}
                                    </p>
                                    <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                                <User className="w-3 h-3 text-gray-400" />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">{post.author || 'MlL Admin'}</span>
                                        </div>
                                        <Link to={`/blog/${post.slug}`} className="p-2 bg-gray-50 rounded-full text-brand-carbon hover:bg-primary hover:text-white transition-all">
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="col-span-full py-32 text-center bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
                        <BookOpen className="w-12 h-12 mx-auto mb-6 text-gray-200" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[.4em] italic leading-loose">Próximamente nuevas<br />inspiraciones editorial...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
