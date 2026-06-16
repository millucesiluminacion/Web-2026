import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATIC_ROOMS = [
    { name: 'Salón / Comedor', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=500&fit=crop' },
    { name: 'Cocina', img: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=500&fit=crop' },
    { name: 'Baño', img: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=500&fit=crop' },
    { name: 'Dormitorio', img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&h=500&fit=crop' },
    { name: 'Pasillos', img: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=400&h=500&fit=crop' },
];

export function RoomsSection() {
    const [rooms, setRooms] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

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

    const nextRoom = useCallback(() => {
        if (rooms.length > 5) {
            setCurrentIndex((prev) => (prev + 1) % rooms.length);
        }
    }, [rooms.length]);

    const prevRoom = useCallback(() => {
        if (rooms.length > 5) {
            setCurrentIndex((prev) => (prev - 1 + rooms.length) % rooms.length);
        }
    }, [rooms.length]);

    // Rotation effect
    useEffect(() => {
        if (rooms.length <= 5 || !isAutoPlaying) return;
        const interval = setInterval(nextRoom, 6000);
        return () => clearInterval(interval);
    }, [rooms.length, isAutoPlaying, nextRoom]);

    const handleManualAction = (action) => {
        setIsAutoPlaying(false);
        action();
        // Resume autoplay after 10 seconds of inactivity
        setTimeout(() => setIsAutoPlaying(true), 10000);
    };

    const displayedRooms = rooms.length > 5
        ? [...rooms, ...rooms].slice(currentIndex, currentIndex + 5)
        : rooms;

    return (
        <section className="mb-12 max-w-[1440px] mx-auto px-4" style={{ width: 'calc(100% - 60px)' }}>
            <div className="flex justify-between mb-6 items-center">
                <div>
                    <h2 className="max-sm:max-w-[70%] text-xl xl:text-3xl">Iluminación por estancias</h2>
                    <p className="mt-2 text-sm text-gray-500 hidden md:block">Descubre luminarias perfectas para cada rincón de tu hogar.</p>
                </div>
                <div className="flex items-center gap-4">
                    {rooms.length > 5 && (
                        <div className="flex items-center gap-2 mr-4">
                            <button
                                onClick={() => handleManualAction(prevRoom)}
                                className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-blue-300 transition-all text-gray-400 hover:text-blue-600 shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleManualAction(nextRoom)}
                                className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-blue-300 transition-all text-gray-400 hover:text-blue-600 shadow-sm"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <Link to="/estancias" className="text-base font-medium text-blue-600 hover:underline">
                        Ver estancias
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 xl:gap-x-7 transition-all duration-500">
                    {displayedRooms.map((room, i) => (
                        <li key={`${room.id || room.name}-${currentIndex}-${i}`} className="animate-in fade-in duration-700 slide-in-from-right-4">
                            <div className="rounded-lg overflow-hidden relative group h-80 shadow-md transition-shadow hover:shadow-xl">
                                <div className="h-full">
                                    <Link to={`/catalogo?room=${room.id || room.slug}`} className="block h-full">
                                        <img
                                            src={room.img}
                                            alt={room.name}
                                            className="w-full object-cover xl:group-hover:scale-110 duration-300 h-full"
                                            loading="lazy"
                                        />
                                    </Link>
                                </div>
                                <div className="duration-500 xl:group-hover:-translate-y-[15px] w-full absolute bottom-7 text-center pb-5 px-3 text-white">
                                    <p className="font-medium text-lg xl:text-xl drop-shadow-lg">{room.name}</p>
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
