import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Search, ArrowRight, Zap, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATIC_ROOMS = [
    { name: 'Salón / Comedor', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=500&fit=crop' },
    { name: 'Cocina', img: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=500&fit=crop' },
    { name: 'Baño', img: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=500&fit=crop' },
    { name: 'Dormitorio', img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&h=500&fit=crop' },
    { name: 'Pasillos', img: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=400&h=500&fit=crop' },
];

export default function RoomsPage() {
    const [rooms, setRooms] = useState([]);
    const [cmsData, setCmsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [counts, setCounts] = useState({});

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                // Fetch Rooms, CMS and Product Counts simultaneously
                const [roomsRes, cmsRes, productsRes] = await Promise.all([
                    supabase.from('rooms').select('*').order('order_index', { ascending: true }).order('name', { ascending: true }),
                    supabase.from('cms_pages').select('*').eq('slug', 'estancias').maybeSingle(),
                    supabase.from('products').select('room_id').is('parent_id', null).neq('is_active', false)
                ]);

                if (roomsRes.error) throw roomsRes.error;

                // Process Product Counts
                const dataForCounts = productsRes.data || [];
                const roomCounts = dataForCounts.reduce((acc, p) => {
                    if (p.room_id) acc[p.room_id] = (acc[p.room_id] || 0) + 1;
                    return acc;
                }, {});
                setCounts(roomCounts);

                if (cmsRes.data) setCmsData(cmsRes.data);

                if (roomsRes.data && roomsRes.data.length > 0) {
                    const formatted = roomsRes.data.map(room => ({
                        id: room.id,
                        name: room.name,
                        img: room.image_url || 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=2000',
                        slug: room.slug || room.name.toLowerCase()
                    }));
                    setRooms(formatted);
                } else {
                    setRooms(STATIC_ROOMS);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
                setRooms(STATIC_ROOMS);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    const filteredRooms = rooms.filter(room =>
        (room.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-[#FDFDFD] min-h-screen pt-8 pb-12">
            <div className="container mx-auto px-6 max-w-[1400px]">
                <header className="mb-12 text-center relative group">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.45em] mb-4 block animate-slide-right">
                        {cmsData?.content?.header_subtitle || 'Mil Luces Boutique'}
                    </span>
                    <h1 className="text-5xl lg:text-7xl font-black text-brand-carbon uppercase italic leading-tight tracking-tighter animate-reveal-up drop-shadow-sm">
                        {cmsData?.content?.header_title || (
                            <>Iluminación por <span className="text-primary/40">Estancias</span> <br /> <span className="text-brand-carbon">Exclusivas</span></>
                        )}
                    </h1>
                    <div className="w-20 h-1 bg-primary/20 mx-auto mt-8 rounded-full"></div>
                </header>

                {/* Minimalist Search */}
                <div className="mb-16 max-w-md mx-auto relative group">
                    <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative flex items-center bg-white border border-gray-100 rounded-2xl px-6 py-4 shadow-luxury focus-within:shadow-luxury-hover focus-within:border-primary/20 transition-all">
                        <Search className="w-5 h-5 text-gray-300 mr-4" />
                        <input
                            type="text"
                            placeholder="Buscar estancia..."
                            className="bg-transparent border-none outline-none w-full text-sm font-medium text-brand-carbon placeholder:text-gray-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20 bg-white rounded-[3rem] shadow-luxury border border-gray-100/50">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-5 xl:gap-x-7 mb-24">
                        {filteredRooms.length > 0 ? filteredRooms.map((room, i) => (
                            <li key={i}>
                                <div className="rounded-lg overflow-hidden relative group h-80 shadow-md hover:shadow-xl transition-shadow duration-500">
                                    <div className="absolute top-4 right-4 z-10">
                                        <span className="bg-black/60 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-[9px] font-black text-white uppercase italic shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                            {counts[room.id] || 0} Piezas
                                        </span>
                                    </div>
                                    <div className="h-full">
                                        <Link to={`/catalogo?room=${room.id || room.slug}`} className="block h-full">
                                            <img
                                                src={room.img}
                                                alt={room.name}
                                                className="w-full object-cover xl:group-hover:scale-110 duration-500 h-full"
                                                loading="lazy"
                                            />
                                        </Link>
                                    </div>
                                    <div className="duration-500 xl:group-hover:-translate-y-[15px] w-full absolute bottom-7 text-center pb-5 px-3 text-white">
                                        <p className="font-outfit font-black text-lg xl:text-xl uppercase italic tracking-tighter drop-shadow-lg">{room.name}</p>
                                        <p className="absolute left-1/2 duration-500 opacity-0 -translate-x-1/2 translate-y-[20px] xl:group-hover:opacity-100 xl:group-hover:translate-y-[5px] text-[10px] font-black uppercase tracking-widest text-center w-full">
                                            Ver productos
                                        </p>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-40 transition-opacity pointer-events-none"></div>
                                </div>
                            </li>
                        )) : (
                            <div className="col-span-full py-20 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">No se encontraron estancias con "{searchTerm}"</p>
                            </div>
                        )}
                    </ul>
                )}

                {/* Consultancy Banner */}
                <div className="relative group overflow-hidden bg-brand-carbon rounded-[2.5rem] p-12 md:p-20 shadow-3xl">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 justify-between">
                        <div className="max-w-xl text-center md:text-left">
                            <span className="flex items-center justify-center md:justify-start gap-2 text-[9px] font-black text-primary uppercase tracking-[0.4em] mb-6">
                                <Zap className="w-3 h-3 animate-pulse" /> Advanced Lighting Projects
                            </span>
                            <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic leading-tight tracking-tighter mb-8">
                                ¿Buscas un ambiente <br /> <span className="text-primary/60">único para tu espacio?</span>
                            </h2>
                            <p className="text-gray-400 text-sm md:text-base font-medium leading-relaxed mb-0">
                                Nuestros consultores lumínicos te ayudarán a seleccionar las mejores piezas para cada estancia, optimizando la eficiencia y el diseño estético de tu hogar.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                            <Link to="/contacto" className="inline-flex items-center gap-4 px-10 py-5 bg-white text-brand-carbon rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl shadow-black/20 group">
                                Solicitar Asesoría <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                            </Link>
                            <a href="tel:+34900000000" className="inline-flex items-center gap-4 px-10 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-white/10 transition-all">
                                <Headphones className="w-4 h-4" /> Hablar con Consultor
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
