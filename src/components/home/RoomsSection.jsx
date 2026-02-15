import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Loader2 } from 'lucide-react';

const STATIC_ROOMS = [
    { name: 'Salón / Comedor', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=500&fit=crop' },
    { name: 'Cocina', img: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=500&fit=crop' },
    { name: 'Baño', img: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=500&fit=crop' },
    { name: 'Dormitorio', img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&h=500&fit=crop' },
    { name: 'Pasillos', img: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=400&h=500&fit=crop' },
];

export function RoomsSection() {
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
        <section className="mb-12 max-w-[1440px] mx-auto px-4" style={{ width: 'calc(100% - 60px)' }}>
            <div className="flex justify-between mb-6 items-center">
                <h2 className="max-sm:max-w-[70%] text-xl xl:text-3xl">Iluminación por estancias</h2>
                <a href="/estancias" className="text-base font-medium text-blue-600 hover:underline">
                    Ver estancias
                </a>
            </div>
            <p className="mb-6">Ilumina cada espacio con soluciones funcionales y elegantes para espacios industriales, comerciales y del hogar.</p>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-5 xl:gap-x-7">
                    {rooms.map((room, i) => (
                        <li key={i}>
                            <div className="rounded-lg overflow-hidden relative group h-80">
                                <div className="h-full">
                                    <a href={`/room/${room.slug || room.name.toLowerCase()}`} className="block h-full">
                                        <img
                                            src={room.img}
                                            alt={room.name}
                                            className="w-full object-cover xl:group-hover:scale-110 duration-300 h-full"
                                            loading="lazy"
                                        />
                                    </a>
                                </div>
                                <div className="duration-500 xl:group-hover:-translate-y-[15px] w-full absolute bottom-7 text-center pb-5 px-3 text-white">
                                    <p className="font-medium text-lg xl:text-xl">{room.name}</p>
                                    <p className="absolute left-1/2 duration-500 opacity-0 -translate-x-1/2 translate-y-[20px] xl:group-hover:opacity-100 xl:group-hover:translate-y-[5px] text-sm font-semibold text-center w-full">
                                        Ver todo
                                    </p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
