import { useState, useEffect } from 'react';
import { Search, MapPin, ArrowUpRight, Loader2, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function ProyectosPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProjects() {
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .order('order_index', { ascending: true });

                if (error) throw error;
                setProjects(data || []);
            } catch (err) {
                console.error('Error fetching projects:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchProjects();
    }, []);

    return (
        <div className="bg-[#FDFDFD] min-h-screen pt-8 pb-12">
            <div className="container mx-auto px-6 max-w-[1400px]">
                <header className="mb-12 text-center relative">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-4 block">Archive Mil Luces</span>
                    <h1 className="text-4xl lg:text-7xl font-black text-brand-carbon uppercase italic leading-tight tracking-tighter">
                        Obras <span className="text-primary/40 italic">de</span> <br /> <span className="text-brand-carbon">Luz Pura</span>
                    </h1>
                    <div className="w-20 h-1 bg-primary/10 mx-auto mt-8 rounded-full"></div>
                </header>

                {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center text-gray-400 glass rounded-[3rem]">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Obras...</p>
                    </div>
                ) : projects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                        {projects.map((project, i) => (
                            <div key={project.id} className={`group relative rounded-[3rem] overflow-hidden shadow-2xl transition-all duration-1000 ${i % 3 === 0 ? 'md:col-span-2 aspect-[21/9]' : 'aspect-square md:aspect-[4/5]'}`}>
                                <img
                                    src={project.image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop'}
                                    alt={project.name}
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-40 transition-opacity"></div>

                                <div className="absolute inset-x-0 bottom-0 p-10 lg:p-16 flex justify-between items-end translate-y-4 group-hover:translate-y-0 transition-transform duration-500 text-white">
                                    <div>
                                        <div className="flex items-center gap-3 text-[10px] font-black text-primary uppercase tracking-widest mb-4">
                                            <MapPin className="w-3 h-3" />
                                            {project.location}
                                        </div>
                                        <h2 className="text-3xl lg:text-5xl font-black uppercase italic leading-none mb-2 drop-shadow-lg">
                                            {project.name}
                                        </h2>
                                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-[.3em] drop-shadow-sm">{project.category} // {project.year}</span>
                                    </div>
                                    <button className="w-16 h-16 rounded-full glass flex items-center justify-center hover:bg-white hover:text-brand-carbon transition-all border border-white/20">
                                        <ArrowUpRight className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="col-span-full py-32 text-center bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
                        <Briefcase className="w-12 h-12 mx-auto mb-6 text-gray-200" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[.4em] italic leading-loose">Compilando portafolio<br />arquitectónico...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
