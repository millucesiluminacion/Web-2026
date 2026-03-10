import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
    Star,
    CheckCircle,
    XCircle,
    Trash2,
    MessageSquare,
    Loader2,
    Search,
    Filter,
    ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ReviewsAdmin() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('pending'); // pending, approved, all

    useEffect(() => {
        fetchReviews();
    }, []);

    async function fetchReviews() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('product_reviews')
                .select('*, products(name, slug, image_url)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReviews(data || []);
        } catch (error) {
            console.error('Error fetching reviews:', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function toggleApproval(reviewId, currentStatus) {
        try {
            const { error } = await supabase
                .from('product_reviews')
                .update({ is_approved: !currentStatus })
                .eq('id', reviewId);

            if (error) throw error;
            setReviews(reviews.map(r => r.id === reviewId ? { ...r, is_approved: !currentStatus } : r));
        } catch (error) {
            alert('Error al actualizar estado: ' + error.message);
        }
    }

    async function deleteReview(reviewId) {
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta reseña?')) return;
        try {
            const { error } = await supabase
                .from('product_reviews')
                .delete()
                .eq('id', reviewId);

            if (error) throw error;
            setReviews(reviews.filter(r => r.id !== reviewId));
        } catch (error) {
            alert('Error al eliminar reseña: ' + error.message);
        }
    }

    const filteredReviews = reviews.filter(review => {
        const matchesSearch =
            review.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
            review.products?.name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter =
            filter === 'all' ? true :
                filter === 'pending' ? !review.is_approved :
                    review.is_approved;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 uppercase italic tracking-tight">Gestión de <span className="text-primary">Reseñas</span></h1>
                        <p className="text-gray-500 text-sm">Modera las opiniones de tus clientes sobre los productos.</p>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por usuario, comentario o producto..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 ring-primary/10 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('pending')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'pending' ? 'bg-brand-carbon text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            Pendientes
                        </button>
                        <button
                            onClick={() => setFilter('approved')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'approved' ? 'bg-brand-carbon text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            Aprobadas
                        </button>
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-brand-carbon text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            Todas
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Loader2 className="w-10 h-10 animate-spin mb-4" />
                        <p className="uppercase text-[10px] font-black tracking-[0.2em]">Sincronizando Reseñas...</p>
                    </div>
                ) : filteredReviews.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredReviews.map(review => (
                            <div key={review.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6">
                                {/* Product Info */}
                                <div className="w-full md:w-48 flex-shrink-0">
                                    <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden p-4 mb-2">
                                        {review.products?.image_url ? (
                                            <img src={review.products.image_url} alt={review.products.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-200 text-3xl">💡</div>
                                        )}
                                    </div>
                                    <h4 className="text-[10px] font-black text-gray-800 uppercase italic line-clamp-1">{review.products?.name}</h4>
                                    <Link to={`/product/${review.products?.slug}`} className="text-[8px] font-bold text-primary uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all mt-1">
                                        Ver Producto <ExternalLink className="w-2 h-2" />
                                    </Link>
                                </div>

                                {/* Review Content */}
                                <div className="flex-1">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                                        <div>
                                            <span className="text-xs font-black text-brand-carbon uppercase italic mr-3">{review.user_name}</span>
                                            <div className="inline-flex gap-0.5">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-100'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">
                                            {new Date(review.created_at).toLocaleDateString()} {new Date(review.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4 mb-4 relative">
                                        <MessageSquare className="absolute -top-2 -left-2 w-5 h-5 text-primary/10" />
                                        <p className="text-sm text-gray-600 leading-relaxed italic">"{review.comment}"</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                                        <button
                                            onClick={() => deleteReview(review.id)}
                                            className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Eliminar Reseña"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => toggleApproval(review.id, review.is_approved)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${review.is_approved
                                                ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                                : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                                }`}
                                        >
                                            {review.is_approved ? (
                                                <><XCircle className="w-3.5 h-3.5" /> Desaprobar</>
                                            ) : (
                                                <><CheckCircle className="w-3.5 h-3.5" /> Aprobar</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-32 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                        <MessageSquare className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">No se han encontrado reseñas en esta categoría.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
