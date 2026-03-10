import React from 'react';
import { ShoppingCart, Star, Heart, Clock, Zap, Shield, Sparkles, Award, Info } from 'lucide-react';

/**
 * BadgeRenderer - Componente centralizado para la taxonomía de badges
 * Informa el estado, urgencia y valor del producto.
 */
export const BadgeRenderer = ({ product }) => {
    const badges = [];

    // 1. AUTOMATIC BADGES (System Driven)
    if (product.stock === 0) {
        badges.push({
            label: 'AGOTADO',
            className: 'bg-gray-800 text-white'
        });
    } else if (product.stock > 0 && product.stock <= 5) {
        badges.push({
            label: 'ÚLTIMAS UNIDADES',
            icon: Clock,
            className: 'bg-orange-500 text-white animate-pulse shadow-lg shadow-orange-500/30'
        });
    }

    if (product.original_price && product.original_price > product.price) {
        const pct = Math.round(((product.original_price - product.price) / product.original_price) * 100);
        badges.push({
            label: `-${pct}%`,
            className: 'bg-red-500 text-white shadow-lg shadow-red-500/30'
        });
    }

    const isNew = () => {
        const createdDate = new Date(product.created_at);
        const now = new Date();
        const diffDays = Math.ceil((now - createdDate) / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
    };
    if (isNew()) {
        badges.push({
            label: 'NUEVO',
            icon: Sparkles,
            className: 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30'
        });
    }

    if (product.price >= 100) {
        badges.push({
            label: 'ENVÍO GRATIS',
            icon: Zap,
            className: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
        });
    }

    // 2. DYNAMIC BADGES (From DB)
    if (product.product_badges && Array.isArray(product.product_badges)) {
        product.product_badges.forEach(pb => {
            const b = pb.badges;
            if (!b || !b.is_active) return;
            const Icon = ICON_MAP[b.icon_name];
            badges.push({
                label: b.name.toUpperCase(),
                icon: Icon,
                style: { backgroundColor: b.bg_color, color: b.text_color },
                className: 'shadow-md'
            });
        });
    }

    // 3. LEGACY TAGS (badge_tags)
    if (product.badge_tags && Array.isArray(product.badge_tags)) {
        product.badge_tags.forEach(tag => {
            const lowerTag = tag.toLowerCase();
            if (lowerTag === 'envío gratis' && product.price >= 100) return;
            if (lowerTag === 'agotado' && product.stock === 0) return;

            // Deduplicate if already added via dynamic
            if (badges.some(b => b.label === tag.toUpperCase())) return;

            badges.push({
                label: tag.toUpperCase(),
                className: 'bg-brand-carbon text-white'
            });
        });
    }

    const visibleBadges = badges.slice(0, 3);

    return (
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-20 pointer-events-none">
            {visibleBadges.map((badge, idx) => (
                <div
                    key={idx}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest backdrop-blur-sm transform transition-all duration-300 hover:scale-105 ${badge.className || ''}`}
                    style={badge.style}
                >
                    {badge.icon && <badge.icon className="w-3 h-3" />}
                    {badge.label}
                </div>
            ))}
        </div>
    );
};

const ICON_MAP = { Sparkles, Zap, Shield, Clock, Heart, Star, Award, Info };

/**
 * StarRating - Visualizador de valoración
 */
export const StarRating = ({ rating = 0, count = 0, variant = "small" }) => {
    const size = variant === "small" ? "w-3 h-3" : "w-4 h-4";
    const stars = Array.from({ length: 5 }, (_, i) => (
        <Star
            key={i}
            className={`${size} ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'}`}
        />
    ));

    return (
        <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">{stars}</div>
            {count > 0 && <span className="text-[9px] font-bold text-gray-400">({count})</span>}
        </div>
    );
};
