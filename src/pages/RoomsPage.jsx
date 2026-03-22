import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2 } from 'lucide-react';
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRooms() {
            try {
                const { data, error } = await supabase
                    .from('rooms')
                    .select('*')
                    .order('order_index', { ascending: true })
                    .order('name', { ascending: true });

                if (error) throw error;

                if (data && data.length > 0) {
                    const formatted = data.map(room => ({
                        id: room.id,
                        name: room.name,
                        img: room.image_url || 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=500&fit=crop',
                        slug: room.slug || room.name.toLowerCase()
                    }));
                    setRooms(formatted);
                } else {
                    setRooms(STATIC_ROOMS);
                }
            } catch (err) {
                console.error('Error fetching rooms:', err);
                setRooms(STATIC_ROOMS);
            } finally {
                setLoading(false);
            }
        }

        fetchRooms();
    }, []);

    return (
        <div className="bg-brand-porcelain min-h-screen pt-32 pb-20">
            <div className="container mx-auto px-6 max-w-[1400px]">
                <header className="mb-16 text-center relative">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-4 block">Mil Luces Boutique</span>
                    <h1 className="text-5xl lg:text-7xl font-black text-brand-carbon uppercase italic leading-tight tracking-tighter">
                        Iluminación por <span className="text-primary/40">Estancias</span> <br /> <span className="text-brand-carbon">Exclusivas</span>
                    </h1>
                    <div className="w-20 h-1 bg-primary/20 mx-auto mt-8 rounded-full"></div>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20 bg-white rounded-[3rem] shadow-luxury border border-gray-100/50">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-5 xl:gap-x-7">
                        {rooms.map((room, i) => (
                            <li key={i}>
                                <div className="rounded-lg overflow-hidden relative group h-80 shadow-md hover:shadow-xl transition-shadow duration-500">
                                    <div className="h-full">
                                        <Link to={`/search?room=${room.id || room.slug}`} className="block h-full">
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
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
