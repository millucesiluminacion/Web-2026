import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Truck, ShieldCheck, ArrowLeft, Loader2, AlertCircle, ChevronRight, Zap, Package, BadgePercent, Lock, Shield, Heart, Clock, MessageSquare, Send } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { calculateProductPrice } from '../lib/pricingUtils';
import { BadgeRenderer, StarRating } from '../components/commerce/BoutiqueUI';

const COLOR_MAP = {
    "Blanco": "#FFFFFF",
    "Negro": "#1a1a1a",
    "Gris": "#808080",
    "Dorado": "#D4AF37",
    "Plateado": "#C0C0C0",
    "Cobre": "#B87333",
    "Rojo": "#DC2626",
    "Azul": "#2563EB",
    "Verde": "#16A34A",
    "Madera": "#8B4513",
    "Beige": "#F5F5DC",
    // Temperaturas de Luz (Premium Glow Colors)
    "3000K": "#FFF1DC",
    "Blanco cálido": "#FFF1DC",
    "Blanco Cálido": "#FFF1DC",
    "Blanco calido": "#FFF1DC",
    "Blanco Calido": "#FFF1DC",
    "4000K": "#F3F4F6",
    "Blanco neutro": "#F3F4F6",
    "Blanco Neutro": "#F3F4F6",
    "6000K": "#EEF4FF",
    "Blanco frío": "#EEF4FF",
    "Blanco Frío": "#EEF4FF",
    "Blanco frio": "#EEF4FF",
    "Blanco Frio": "#EEF4FF"
};

export default function ProductDetail() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { isPro, discountPercent: proDiscountPercent, user } = useAuth();
    const [qty, setQty] = useState(1);

    // State management
    const [parentProduct, setParentProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [categoryName, setCategoryName] = useState('');
    const [categorySlug, setCategorySlug] = useState('');
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [newReview, setNewReview] = useState({
        rating: 5,
        comment: '',
        user_name: user?.user_metadata?.full_name || ''
    });
    const [submittingReview, setSubmittingReview] = useState(false);

    // Selection state
    const [selectedAttributes, setSelectedAttributes] = useState({});
    const [currentVariant, setCurrentVariant] = useState(null);
    // Image gallery state
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    // Dynamic Trust Badges
    const [trustBadges, setTrustBadges] = useState([]);

    useEffect(() => {
        fetchProductAndVariants();
        fetchTrustBadges();
    }, [slug]);

    useEffect(() => {
        if (parentProduct?.id) {
            fetchReviews(parentProduct.id);
        }
    }, [parentProduct?.id]);

    async function fetchReviews(productId) {
        if (!productId) return;
        try {
            setReviewsLoading(true);
            const { data, error } = await supabase
                .from('product_reviews')
                .select('*')
                .eq('product_id', productId)
                .eq('is_approved', true) // Solo mostrar aprobadas
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReviews(data || []);
        } catch (err) {
            console.error('Error fetching reviews:', err.message);
        } finally {
            setReviewsLoading(false);
        }
    }

    async function handleSubmitReview(e) {
        e.preventDefault();
        if (!newReview.comment || !newReview.user_name) return;

        try {
            setSubmittingReview(true);
            const { error } = await supabase
                .from('product_reviews')
                .insert([{
                    product_id: parentProduct.id,
                    user_name: newReview.user_name,
                    rating: newReview.rating,
                    comment: newReview.comment,
                    is_approved: false // Moderación por defecto
                }]);

            if (error) throw error;
            alert('Gracias por tu reseña. Se mostrará una vez aprobada por nuestro equipo.');
            setNewReview({ ...newReview, comment: '' });
            setShowReviewForm(false);
        } catch (err) {
            alert('Error al enviar la reseña: ' + err.message);
        } finally {
            setSubmittingReview(false);
        }
    }

    useEffect(() => {
        // SEO centralized via SEOManager
    }, [parentProduct]);

    async function fetchProductAndVariants() {
        try {
            setLoading(true);

            // 1. Fetch Main Product (Trial 1: By Slug)
            const selectWithBadges = '*, categories(name, slug), product_badges(badges(*))';
            const selectWithout = '*, categories(name, slug)';

            let { data: product, error } = await supabase
                .from('products')
                .select(selectWithBadges)
                .eq('slug', slug)
                .maybeSingle();

            // Fallback if product_badges table doesn't exist
            if (error && error.message.includes('product_badges')) {
                ({ data: product, error } = await supabase
                    .from('products')
                    .select(selectWithout)
                    .eq('slug', slug)
                    .maybeSingle());
            }

            // Trial 2: By ID (Fallback for legacy links or missing slugs)
            if (error || !product) {
                let res2 = await supabase
                    .from('products')
                    .select(selectWithBadges)
                    .eq('id', slug)
                    .maybeSingle();

                if (res2.error && res2.error.message.includes('product_badges')) {
                    res2 = await supabase
                        .from('products')
                        .select(selectWithout)
                        .eq('id', slug)
                        .maybeSingle();
                }

                if (res2.error) throw res2.error;
                product = res2.data;
            }

            if (!product) throw new Error("Producto no encontrado");
            setParentProduct(product);
            setCategoryName(product.categories?.name || '');
            setCategorySlug(product.categories?.slug || product.category_id);

            // Fetch related products (same category, excluding self)
            if (product.category_id) {
                const { data: related } = await supabase
                    .from('products')
                    .select('id, slug, name, price, discount_price, image_url, stock, created_at, product_badges(badges(*))')
                    .eq('category_id', product.category_id)
                    .is('parent_id', null)
                    .neq('id', product.id)
                    .limit(4);
                setRelatedProducts(related || []);
            }

            // 2. Fetch Variants (Children)
            const { data: children, error: varError } = await supabase
                .from('products')
                .select('*, product_badges(badges(*))')
                .eq('parent_id', product.id);

            if (varError) console.error("Error fetching variants:", varError);

            const variantList = children || [];
            setVariants(variantList);

            // 3. Compute immediate options for auto-select
            const initialOptions = {};
            if (product.attributes) {
                Object.entries(product.attributes).forEach(([k, v]) => {
                    const valArray = Array.isArray(v) ? v : [v];
                    initialOptions[k] = valArray;
                });
            }
            variantList.forEach(v => {
                if (!v.attributes) return;
                Object.entries(v.attributes).forEach(([k, vVal]) => {
                    if (!initialOptions[k]) initialOptions[k] = [];
                    const valArray = Array.isArray(vVal) ? vVal : [vVal];
                    valArray.forEach(val => {
                        if (!initialOptions[k].includes(val)) initialOptions[k].push(val);
                    });
                });
            });

            const initialSelected = {};
            Object.entries(initialOptions).forEach(([k, v]) => {
                if (v.length > 1) {
                    initialSelected[k] = v[0]; // Select the first available option for selectables
                }
            });

            let initialVariant = null;
            if (variantList.length > 0) {
                initialVariant = variantList.find(v => {
                    if (!v.attributes) return false;
                    return Object.entries(initialSelected).every(([k, val]) => v.attributes[k] === val);
                }) || null;
            }

            setCurrentVariant(initialVariant);
            setSelectedAttributes(initialSelected);

            // Fetch related products (manual or category-based fallback)
            if (product.category_id) {
                if (product.related_product_ids && product.related_product_ids.length > 0) {
                    const { data: related } = await supabase
                        .from('products')
                        .select('id, slug, name, price, discount_price, image_url, stock')
                        .in('id', product.related_product_ids);
                    setRelatedProducts(related || []);
                } else {
                    const { data: related } = await supabase
                        .from('products')
                        .select('id, slug, name, price, discount_price, image_url, stock, product_badges(badges(*))')
                        .eq('category_id', product.category_id)
                        .is('parent_id', null)
                        .neq('id', product.id)
                        .limit(4);
                    setRelatedProducts(related || []);
                }
            }

        } catch (error) {
            console.error('Error fetching details:', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchTrustBadges() {
        try {
            const { data, error } = await supabase
                .from('trust_badges')
                .select('*')
                .order('order_index', { ascending: true });

            if (error) throw error;
            setTrustBadges(data || []);
        } catch (err) {
            console.error('Error fetching trust badges:', err.message);
            // Fallback to defaults
            setTrustBadges([
                { id: 1, title: 'Envío Boutique', subtitle: '24/48h Business Days', icon_name: 'Truck' },
                { id: 2, title: 'Garantía Real', subtitle: '3 Años de Excelencia', icon_name: 'ShieldCheck' },
                { id: 3, title: 'Pago Seguro', subtitle: 'SSL Protegido', icon_name: 'Lock' }
            ]);
        }
    }

    const availableIcons = { Truck, ShieldCheck, Lock, Zap, Package, Shield, Star, Heart, Clock };

    // Helper: Build options from PARENT attributes (multi-valor arrays)
    // OR from variant children (legacy single-value format)
    const getAvailableOptions = () => {
        const options = {};

        // 1. Read from parent product's attributes (new multi-value format)
        if (parentProduct?.attributes && Object.keys(parentProduct.attributes).length > 0) {
            Object.entries(parentProduct.attributes).forEach(([key, values]) => {
                if (!options[key]) options[key] = [];
                // Support both array and single-value formats
                const valArray = Array.isArray(values) ? values : [values];
                valArray.forEach(v => {
                    if (!options[key].includes(v)) options[key].push(v);
                });
            });
        }

        // 2. Also merge from variants (legacy support / overrides)
        variants.forEach(v => {
            if (!v.attributes) return;
            Object.entries(v.attributes).forEach(([key, value]) => {
                if (!options[key]) options[key] = [];
                const valArray = Array.isArray(value) ? value : [value];
                valArray.forEach(val => {
                    if (!options[key].includes(val)) options[key].push(val);
                });
            });
        });

        return options;
    };

    const handleAttributeSelect = (key, value) => {
        const newAttributes = { ...selectedAttributes, [key]: value };
        setSelectedAttributes(newAttributes);

        // Try to find a matching variant (legacy mode)
        if (variants.length > 0) {
            const match = variants.find(v => {
                if (!v.attributes) return false;
                return Object.entries(newAttributes).every(([k, val]) => v.attributes[k] === val);
            });
            setCurrentVariant(match || null);
        }
    };

    const handleAdd = () => {
        const productToAdd = currentVariant || parentProduct;
        if (!productToAdd) return;

        // Build selected options label for cart
        const selectedLabel = Object.entries(selectedAttributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ');

        addToCart({
            ...productToAdd,
            price: finalPrice, // Use the already computed best price
            original_price: originalPrice, // Keep original for reference in cart
            // Include selected options as extra info for the cart
            selectedOptions: selectedAttributes,
            cartLabel: selectedLabel || null
        }, qty);
        alert('Producto añadido al carrito');
    };

    // Derived values for display
    const displayProduct = currentVariant || parentProduct;
    const availableOptions = getAvailableOptions();
    const selectableOptions = Object.entries(availableOptions).filter(([k, v]) => v.length > 1);
    const hasSelectableOptions = selectableOptions.length > 0;
    const staticSpecs = Object.entries(availableOptions).filter(([k, v]) => v.length === 1);
    const hasStaticSpecs = staticSpecs.length > 0;

    const { profile } = useAuth();

    // Compute prices using centralized utility
    const {
        originalPrice,
        finalPrice,
        isShowingProDiscount,
        isPartnerPrice,
        displayDiscountPercent,
        hasAnyDiscount
    } = calculateProductPrice(displayProduct || parentProduct, profile);

    // Gallery images: if product has extra_images array, use it; otherwise single image
    const productImages = displayProduct?.extra_images && Array.isArray(displayProduct.extra_images) && displayProduct.extra_images.length > 0
        ? [displayProduct.image_url, ...displayProduct.extra_images].filter(Boolean)
        : [displayProduct?.image_url].filter(Boolean);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p>Cargando detalles del producto...</p>
            </div>
        );
    }

    if (!parentProduct) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h2 className="text-2xl font-bold mb-4">Producto no encontrado</h2>
                <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">Volver a la tienda</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-12 pb-20 bg-brand-porcelain">
            <div className="container mx-auto px-6 max-w-[1400px]">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 mb-8 text-[10px] font-bold uppercase tracking-[.3em]">
                    <Link to="/" className="text-brand-carbon/30 hover:text-primary transition-colors">Inicio</Link>
                    <ChevronRight className="w-3 h-3 text-brand-carbon/20" />
                    <Link to="/search" className="text-brand-carbon/30 hover:text-primary transition-colors">Catálogo</Link>
                    {categoryName && (
                        <>
                            <ChevronRight className="w-3 h-3 text-brand-carbon/20" />
                            <Link to={`/search?category=${categorySlug}`} className="text-brand-carbon/30 hover:text-primary transition-colors">{categoryName}</Link>
                        </>
                    )}
                    <ChevronRight className="w-3 h-3 text-brand-carbon/20" />
                    <span className="text-brand-carbon/60 italic">{parentProduct?.name?.slice(0, 40)}</span>
                </nav>

                {/* Back link */}
                <div className="flex items-center justify-between mb-12">
                    <button onClick={() => navigate(-1)} className="group flex items-center gap-3 text-[10px] font-black text-brand-carbon/40 uppercase italic tracking-[.3em] hover:text-primary transition-all">
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-2" />
                        Volver a la Galería
                    </button>
                    <div className="hidden md:block text-[10px] font-black text-brand-carbon/20 uppercase tracking-[.4em]">
                        Mil Luces Boutique Selection
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 xl:gap-24 items-start">
                    {/* Art Gallery Display */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* Main Image */}
                        <div className="bg-white rounded-[3rem] p-12 lg:p-20 shadow-luxury border border-gray-100/50 flex items-center justify-center min-h-[500px] lg:h-[700px] overflow-hidden group relative">
                            {/* Advanced Badges */}
                            <BadgeRenderer product={displayProduct} />

                            {productImages.length > 0 && productImages[activeImageIndex] ? (
                                <img
                                    src={productImages[activeImageIndex]}
                                    alt={displayProduct?.name}
                                    className="w-full h-full object-contain transition-transform duration-1000 group-hover:scale-110"
                                />
                            ) : (
                                <div className="text-gray-100 text-[200px] animate-float">💡</div>
                            )}
                        </div>

                        {/* Thumbnail Gallery */}
                        {productImages.length > 1 && (
                            <div className="flex gap-3 justify-center">
                                {productImages.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImageIndex(idx)}
                                        className={`w-20 h-20 rounded-2xl border-2 overflow-hidden transition-all bg-white p-2 ${activeImageIndex === idx
                                            ? 'border-brand-carbon shadow-lg scale-105'
                                            : 'border-gray-100 hover:border-gray-300 opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        <img src={img} alt={`Vista ${idx + 1}`} className="w-full h-full object-contain" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Long Description Section - Repositioned Below Images */}
                        {parentProduct.long_description && (
                            <div className="mt-12 p-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden prose prose-sm max-w-none prose-headings:font-black prose-headings:italic prose-headings:uppercase prose-headings:tracking-tight prose-p:text-gray-600 prose-p:leading-relaxed">
                                <h3 className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-6 flex items-center gap-3">
                                    <div className="w-8 h-px bg-primary/20"></div>
                                    Descripción Detallada
                                </h3>
                                <div
                                    className="rich-text-content"
                                    dangerouslySetInnerHTML={{ __html: parentProduct.long_description }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Product Narrative & Actions */}
                    <div className="lg:col-span-5 lg:sticky lg:top-40">
                        <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                            <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-[.3em] rounded-lg mb-6 border border-primary/20">
                                {parentProduct.category || "Colección"}
                            </span>

                            <h1 className="text-4xl lg:text-5xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter mb-4">
                                {parentProduct.name}
                            </h1>

                            <div className="flex items-center gap-4 mb-8">
                                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[.4em]">Ref. {displayProduct?.reference?.slice(0, 15) || '---'}</p>
                                <div className="w-[1px] h-3 bg-gray-200"></div>
                                <div className="flex items-center gap-1.5">
                                    <StarRating
                                        rating={parentProduct.rating_avg || 0}
                                        count={parentProduct.reviews_count || 0}
                                        variant="normal"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <p className="text-sm text-brand-carbon/60 font-medium leading-relaxed max-w-lg italic">
                                {displayProduct?.description || parentProduct.description || 'Esta pieza de iluminación boutique ha sido seleccionada por su excelencia técnica y estética.'}
                            </p>
                        </div>

                        {/* Recovered Price Block */}
                        <div className="mb-10">
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-2 leading-none">
                                {isPartnerPrice ? 'Precio Exclusivo Socio' : isShowingProDiscount ? 'Precio Profesional' : 'Precio Exclusivo'}
                            </span>
                            {(isShowingProDiscount || hasAnyDiscount) ? (
                                <div>
                                    <div className="flex items-baseline gap-3 mb-1">
                                        <span className="text-2xl font-bold text-gray-300 line-through italic tracking-tighter">
                                            {originalPrice.toFixed(2)}€
                                        </span>
                                        <span className={`px-2 py-0.5 text-white text-[10px] font-black rounded-lg uppercase italic ${isPartnerPrice ? 'bg-indigo-600' : isShowingProDiscount ? 'bg-primary' : 'bg-red-500'}`}>
                                            {isPartnerPrice ? 'Tarifa Socio' : isShowingProDiscount ? `Pro -${displayDiscountPercent}%` : `Ahorra ${displayDiscountPercent}%`}
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-5xl font-black italic tracking-tighter ${isPartnerPrice ? 'text-indigo-600' : isShowingProDiscount ? 'text-brand-carbon' : 'text-red-600'}`}>
                                            {finalPrice.toFixed(2)}
                                        </span>
                                        <span className={`text-2xl font-black italic tracking-tighter ${isPartnerPrice ? 'text-indigo-600' : isShowingProDiscount ? 'text-brand-carbon' : 'text-red-600'}`}>€</span>
                                        <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">IVA Incluido</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-brand-carbon italic tracking-tighter">
                                        {displayProduct ? originalPrice.toFixed(2) : '---'}
                                    </span>
                                    <span className="text-2xl font-black text-brand-carbon italic tracking-tighter">€</span>
                                    <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">IVA Incluido</span>
                                </div>
                            )}
                        </div>

                        {/* Stock & Urgency Badges */}
                        <div className="flex flex-col gap-3 mb-8">
                            {parseInt(displayProduct?.stock) > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest italic">En Stock, entrega en 24/48h</span>
                                </div>
                            )}
                            {(() => {
                                const now = new Date();
                                const hours = now.getHours();
                                if (hours < 15 && parseInt(displayProduct?.stock) > 0) {
                                    return (
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-primary" />
                                            Compra antes de las 15h, te lo enviamos hoy.
                                        </p>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        {/* Luxury Action Section - Repositioned UP */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-luxury border border-gray-100 flex flex-col gap-4 mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-32 flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
                                    <button
                                        onClick={() => setQty(Math.max(1, qty - 1))}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-carbon font-black text-xl transition-colors"
                                    >
                                        -
                                    </button>
                                    <span className="text-sm font-black italic text-brand-carbon">{qty}</span>
                                    <button
                                        onClick={() => setQty(qty + 1)}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-carbon font-black text-xl transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                                <button
                                    onClick={handleAdd}
                                    disabled={!displayProduct || parseInt(displayProduct.stock) <= 0}
                                    className={`
                                            flex-1 rounded-2xl py-4 px-6 font-black uppercase italic text-[11px] transition-all shadow-xl flex items-center justify-center gap-3 group
                                            ${(!displayProduct || parseInt(displayProduct.stock) <= 0)
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                            : 'bg-brand-carbon text-white hover:bg-primary shadow-black/20'
                                        }
                                        `}
                                >
                                    <ShoppingCart className="w-4 h-4 transition-transform group-hover:scale-110" />
                                    {parseInt(displayProduct?.stock) > 0
                                        ? `Añadir al carrito por (${(finalPrice * qty).toFixed(2)}€)`
                                        : 'Pieza Agotada'
                                    }
                                </button>
                            </div>
                        </div>

                        {/* --- OPTIONS SELECTOR (multi-valor) --- */}
                        {hasSelectableOptions && (
                            <div className="space-y-6 mb-10 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                {selectableOptions.map(([attrName, values]) => (
                                    <div key={attrName}>
                                        <p className="text-[10px] font-black text-brand-carbon uppercase tracking-widest mb-3">
                                            {attrName}: <span className="text-primary italic">{selectedAttributes[attrName] || 'Seleccionar'}</span>
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {values.map(val => {
                                                const isSelected = selectedAttributes[attrName] === val;

                                                // Render Color or Temperature Swatches
                                                const isColorSwatch = ['Color', 'Acabado', 'Temperatura', 'Temperatura de Color', 'Tono de Luz'].includes(attrName);

                                                if (isColorSwatch) {
                                                    const normalizedVal = val.toLowerCase().trim();
                                                    const mapKey = Object.keys(COLOR_MAP).find(k => k.toLowerCase() === normalizedVal);
                                                    const colorCode = mapKey ? COLOR_MAP[mapKey] : val;

                                                    const isLightTemp = normalizedVal.includes('k') || normalizedVal.includes('blanco ');
                                                    let displayLabel = val;
                                                    if (isLightTemp) {
                                                        displayLabel = val.replace(/blanco/ig, '').trim();
                                                        if (!displayLabel) displayLabel = 'Blanco';
                                                    }

                                                    return (
                                                        <button
                                                            key={val}
                                                            onClick={() => handleAttributeSelect(attrName, val)}
                                                            title={val}
                                                            className={`
                                                                    relative w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-300
                                                                    ${isSelected
                                                                    ? 'scale-110 ring-4 ring-brand-carbon/10 border-brand-carbon shadow-lg z-10'
                                                                    : 'border-gray-200 hover:scale-105 hover:shadow-md'
                                                                }
                                                                `}
                                                            style={{
                                                                backgroundColor: colorCode,
                                                                boxShadow: isSelected ? `0 0 20px ${colorCode}` : `0 4px 14px ${colorCode}60`
                                                            }}
                                                        >
                                                            {isLightTemp ? (
                                                                <span className="text-[9px] font-black uppercase tracking-tighter text-gray-800/70 text-center leading-none px-0.5">
                                                                    {displayLabel}
                                                                </span>
                                                            ) : (
                                                                isSelected && (
                                                                    <span className={`block w-2.5 h-2.5 mx-auto rounded-full shadow-sm ${['Blanco', 'Beige', 'Plateado'].includes(val) ? 'bg-brand-carbon' : 'bg-white'}`}></span>
                                                                )
                                                            )}
                                                        </button>
                                                    );
                                                }

                                                // Standard Text Button (Power, Size, etc.)
                                                return (
                                                    <button
                                                        key={val}
                                                        onClick={() => handleAttributeSelect(attrName, val)}
                                                        className={`
                                                                px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all
                                                                ${isSelected
                                                                ? 'bg-brand-carbon text-white shadow-lg scale-105'
                                                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                                            }
                                                            `}
                                                    >
                                                        {val}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="space-y-6 mb-12">
                            {/* Ficha Técnica - Attributes as Specs */}
                            {hasStaticSpecs && (
                                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                    <h3 className="text-[10px] font-black text-brand-carbon uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Zap className="w-3.5 h-3.5 text-primary" />
                                        Especificaciones
                                    </h3>
                                    <div className="divide-y divide-gray-50">
                                        {staticSpecs.map(([key, values]) => (
                                            <div key={key} className="flex justify-between py-2">
                                                <span className="text-[11px] font-bold text-gray-400 uppercase">{key}</span>
                                                <span className="text-[11px] font-bold text-brand-carbon">
                                                    {values[0]}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Trust Manifesto - Dynamic Horizontal */}
                {trustBadges.length > 0 && (
                    <div className={`mt-16 grid grid-cols-1 sm:grid-cols-2 ${trustBadges.length >= 3 ? 'lg:grid-cols-3' : ''} ${trustBadges.length >= 4 ? 'xl:grid-cols-4' : ''} gap-8 py-10 border-t border-b border-gray-100 bg-white/50 rounded-[3rem] px-10`}>
                        {trustBadges.map((badge, idx) => {
                            const IconComponent = availableIcons[badge.icon_name] || Truck;
                            const isFirst = idx === 0;
                            const isLast = idx === trustBadges.length - 1;

                            return (
                                <div key={badge.id || idx} className={`flex items-center justify-center ${isFirst ? 'md:justify-start' : isLast ? 'md:justify-end' : ''} gap-6 group`}>
                                    <div className="w-12 h-12 flex-shrink-0 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-primary transition-all duration-500 group-hover:bg-primary group-hover:text-white group-hover:scale-110">
                                        <IconComponent className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-brand-carbon uppercase italic leading-none mb-1.5">{badge.title}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.2em] leading-none">{badge.subtitle}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}


                {/* Reviews Section */}
                <div className="mt-20 border-t border-gray-100 pt-16">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-6">
                        <div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] block mb-2">Opiniones Reales</span>
                            <h2 className="text-3xl font-black text-brand-carbon uppercase italic tracking-tight">Experiencias de <span className="text-primary/60">Clientes</span></h2>
                            <div className="flex items-center gap-4 mt-4">
                                <StarRating rating={parentProduct.rating_avg || 0} count={parentProduct.reviews_count || 0} variant="normal" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">{parentProduct.rating_avg?.toFixed(1) || '0.0'} Media Global</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowReviewForm(!showReviewForm)}
                            className="px-8 py-3 bg-brand-carbon text-white rounded-xl font-black uppercase italic text-[10px] hover:bg-primary transition-all shadow-xl flex items-center gap-3"
                        >
                            <MessageSquare className="w-4 h-4" />
                            {showReviewForm ? 'Cancelar Reseña' : 'Escribir una Reseña'}
                        </button>
                    </div>

                    {showReviewForm && (
                        <div className="mb-16 bg-white p-8 lg:p-12 rounded-[2.5rem] shadow-luxury border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-500">
                            <h3 className="text-xl font-black text-brand-carbon uppercase italic mb-8">Cuéntanos tu <span className="text-primary/60">experiencia</span></h3>
                            <form onSubmit={handleSubmitReview} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Tu Nombre</label>
                                        <input
                                            type="text"
                                            required
                                            value={newReview.user_name}
                                            onChange={(e) => setNewReview({ ...newReview, user_name: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                                            placeholder="Ej. Alejandro G."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Valoración</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setNewReview({ ...newReview, rating: star })}
                                                    className="transition-transform hover:scale-125"
                                                >
                                                    <Star className={`w-8 h-8 ${star <= newReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-100'}`} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Tu Comentario</label>
                                        <textarea
                                            required
                                            rows="5"
                                            value={newReview.comment}
                                            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-sm focus:ring-2 ring-primary/20 outline-none transition-all resize-none"
                                            placeholder="¿Qué te ha parecido la calidad, el diseño o la iluminación?"
                                        ></textarea>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submittingReview}
                                        className="w-full py-4 bg-primary text-white rounded-xl font-black uppercase italic text-xs hover:bg-brand-carbon transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {submittingReview ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Enviar Reseña para Moderación
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {reviewsLoading ? (
                            <div className="col-span-full py-12 text-center text-gray-400 italic text-sm">Cargando experiencias...</div>
                        ) : reviews.length > 0 ? (
                            reviews.map(review => (
                                <div key={review.id} className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="font-black text-brand-carbon uppercase text-xs italic mb-1">{review.user_name}</p>
                                            <StarRating rating={review.rating} variant="small" />
                                        </div>
                                        <span className="text-[9px] font-bold text-gray-300 uppercase italic">
                                            {new Date(review.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed italic line-clamp-4">"{review.comment}"</p>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center glass rounded-[3rem] border-2 border-dashed border-gray-100">
                                <MessageSquare className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Sé el primero en compartir su experiencia con esta pieza</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Related Products */}
                {relatedProducts.length > 0 && (
                    <div className="mt-20">
                        <div className="text-center mb-12">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] block mb-2">Explorar Más</span>
                            <h2 className="text-3xl font-black text-brand-carbon uppercase italic tracking-tight">Piezas de la Misma Colección</h2>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {relatedProducts.map(rp => {
                                const rpHasDiscount = rp.discount_price && parseFloat(rp.discount_price) > 0 && parseFloat(rp.discount_price) < parseFloat(rp.price);
                                return (
                                    <Link key={rp.id} to={`/product/${rp.slug || rp.id}`} className="group">
                                        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                                            <div className="aspect-square p-6 flex items-center justify-center relative">
                                                <BadgeRenderer product={rp} />
                                                {rp.image_url ? (
                                                    <img src={rp.image_url} alt={rp.name} className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110" />
                                                ) : (
                                                    <div className="text-6xl text-gray-100">💡</div>
                                                )}
                                            </div>
                                            <div className="p-4 border-t border-gray-50">
                                                <p className="text-[10px] font-black text-brand-carbon uppercase italic line-clamp-2 mb-2 tracking-tight">{rp.name}</p>
                                                <div className="flex items-baseline gap-2">
                                                    {rpHasDiscount ? (
                                                        <>
                                                            <span className="text-sm font-black text-red-600 italic">{parseFloat(rp.discount_price).toFixed(2)}€</span>
                                                            <span className="text-[10px] text-gray-300 line-through">{parseFloat(rp.price).toFixed(2)}€</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-sm font-black text-brand-carbon italic">{parseFloat(rp.price).toFixed(2)}€</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div >
        </div >
    );
}
