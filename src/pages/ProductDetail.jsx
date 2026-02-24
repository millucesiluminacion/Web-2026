import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ShoppingCart, Truck, ShieldCheck, ArrowLeft, Loader2, AlertCircle, ChevronRight, Zap, Package, BadgePercent } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { calculateProductPrice } from '../lib/pricingUtils';

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
    "Beige": "#F5F5DC"
};

export default function ProductDetail() {
    const { slug } = useParams();
    const { addToCart } = useCart();
    const { isPro, discountPercent: proDiscountPercent } = useAuth();
    const [qty, setQty] = useState(1);

    // State management
    const [parentProduct, setParentProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [categoryName, setCategoryName] = useState('');

    // Selection state
    const [selectedAttributes, setSelectedAttributes] = useState({});
    const [currentVariant, setCurrentVariant] = useState(null);
    // Image gallery state
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    useEffect(() => {
        fetchProductAndVariants();
    }, [slug]);

    useEffect(() => {
        // SEO centralized via SEOManager
    }, [parentProduct]);

    async function fetchProductAndVariants() {
        try {
            setLoading(true);

            // 1. Fetch Main Product (Trial 1: By Slug)
            let { data: product, error } = await supabase
                .from('products')
                .select('*, categories(name)')
                .eq('slug', slug)
                .single();

            // Trial 2: By ID (Fallback for legacy links or missing slugs)
            if (error || !product) {
                const { data: productById, error: idError } = await supabase
                    .from('products')
                    .select('*, categories(name)')
                    .eq('id', slug)
                    .single();

                if (idError) throw idError;
                product = productById;
            }

            if (!product) throw new Error("Producto no encontrado");
            setParentProduct(product);
            setCategoryName(product.categories?.name || '');

            // Fetch related products (same category, excluding self)
            if (product.category_id) {
                const { data: related } = await supabase
                    .from('products')
                    .select('id, slug, name, price, discount_price, image_url, stock')
                    .eq('category_id', product.category_id)
                    .is('parent_id', null)
                    .neq('id', product.id)
                    .limit(4);
                setRelatedProducts(related || []);
            }

            // 2. Fetch Variants (Children)
            const { data: children, error: varError } = await supabase
                .from('products')
                .select('*')
                .eq('parent_id', product.id);

            if (varError) console.error("Error fetching variants:", varError);

            const variantList = children || [];
            setVariants(variantList);

            // 3. Initialize: NO auto-select, let user choose
            setCurrentVariant(null);
            setSelectedAttributes({});

        } catch (error) {
            console.error('Error fetching details:', error.message);
        } finally {
            setLoading(false);
        }
    }

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
    const hasOptions = Object.keys(availableOptions).length > 0;

    const { profile } = useAuth();

    // Compute prices using centralized utility
    const {
        originalPrice,
        finalPrice,
        isShowingProDiscount,
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
                <Link to="/search" className="text-blue-600 hover:underline">Volver a la tienda</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-32 pb-20 bg-brand-porcelain">
            <div className="container mx-auto px-6 max-w-[1400px]">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 mb-8 text-[10px] font-bold uppercase tracking-[.3em]">
                    <Link to="/" className="text-brand-carbon/30 hover:text-primary transition-colors">Inicio</Link>
                    <ChevronRight className="w-3 h-3 text-brand-carbon/20" />
                    <Link to="/search" className="text-brand-carbon/30 hover:text-primary transition-colors">Catálogo</Link>
                    {categoryName && (
                        <>
                            <ChevronRight className="w-3 h-3 text-brand-carbon/20" />
                            <Link to={`/search?category=${parentProduct?.category_id}`} className="text-brand-carbon/30 hover:text-primary transition-colors">{categoryName}</Link>
                        </>
                    )}
                    <ChevronRight className="w-3 h-3 text-brand-carbon/20" />
                    <span className="text-brand-carbon/60 italic">{parentProduct?.name?.slice(0, 40)}</span>
                </nav>

                {/* Back link */}
                <div className="flex items-center justify-between mb-12">
                    <Link to="/search" className="group flex items-center gap-3 text-[10px] font-black text-brand-carbon/40 uppercase italic tracking-[.3em] hover:text-primary transition-all">
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-2" />
                        Volver a la Galería
                    </Link>
                    <div className="hidden md:block text-[10px] font-black text-brand-carbon/20 uppercase tracking-[.4em]">
                        Mil Luces Boutique Selection
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 xl:gap-24 items-start">
                    {/* Art Gallery Display */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* Main Image */}
                        <div className="bg-white rounded-[3rem] p-12 lg:p-20 shadow-luxury border border-gray-100/50 flex items-center justify-center min-h-[500px] lg:h-[700px] overflow-hidden group relative">
                            {/* Discount Badge */}
                            {(isShowingProDiscount || hasAnyDiscount) && (
                                <div className={`absolute top-8 left-8 z-10 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg ${isShowingProDiscount ? 'bg-primary' : 'bg-red-500'}`}>
                                    <BadgePercent className="w-4 h-4" />
                                    <span className="font-black text-sm italic">-{displayDiscountPercent}% {isShowingProDiscount ? 'PRO' : ''}</span>
                                </div>
                            )}

                            {/* Stock Badge */}
                            <div className={`absolute top-8 right-8 z-10 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-sm ${parseInt(displayProduct?.stock) > 0
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : 'bg-amber-50 text-amber-600 border border-amber-200'
                                }`}>
                                <Package className="w-3.5 h-3.5" />
                                {parseInt(displayProduct?.stock) > 0 ? 'En Stock' : 'Bajo Pedido'}
                            </div>

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
                                    <div className="flex text-primary">
                                        {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-3 h-3 ${i <= 4 ? 'fill-current' : 'text-gray-200'}`} />)}
                                    </div>
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">(4.9/5)</span>
                                </div>
                            </div>

                            <div className="mb-10">
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-2 leading-none">
                                    {isShowingProDiscount ? 'Inversión Profesional' : 'Inversión Exclusiva'}
                                </span>
                                {(isShowingProDiscount || hasAnyDiscount) ? (
                                    <div>
                                        <div className="flex items-baseline gap-3 mb-1">
                                            <span className="text-2xl font-bold text-gray-300 line-through italic tracking-tighter">
                                                {originalPrice.toFixed(2)}€
                                            </span>
                                            <span className={`px-2 py-0.5 text-white text-[10px] font-black rounded-lg uppercase italic ${isShowingProDiscount ? 'bg-primary' : 'bg-red-500'}`}>
                                                {isShowingProDiscount ? `Pro -${displayDiscountPercent}%` : `Ahorra ${displayDiscountPercent}%`}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-5xl font-black italic tracking-tighter ${isShowingProDiscount ? 'text-brand-carbon' : 'text-red-600'}`}>
                                                {finalPrice.toFixed(2)}
                                            </span>
                                            <span className={`text-2xl font-black italic tracking-tighter ${isShowingProDiscount ? 'text-brand-carbon' : 'text-red-600'}`}>€</span>
                                            <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">+ IVA Incluido</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black text-brand-carbon italic tracking-tighter">
                                            {displayProduct ? originalPrice.toFixed(2) : '---'}
                                        </span>
                                        <span className="text-2xl font-black text-brand-carbon italic tracking-tighter">€</span>
                                        <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">+ IVA Incluido</span>
                                    </div>
                                )}
                            </div>

                            {/* --- OPTIONS SELECTOR (multi-valor) --- */}
                            {hasOptions && (
                                <div className="space-y-6 mb-10 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                    {Object.entries(availableOptions).map(([attrName, values]) => (
                                        <div key={attrName}>
                                            <p className="text-[10px] font-black text-brand-carbon uppercase tracking-widest mb-3">
                                                {attrName}: <span className="text-primary italic">{selectedAttributes[attrName] || 'Seleccionar'}</span>
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {values.map(val => {
                                                    const isSelected = selectedAttributes[attrName] === val;

                                                    // Render Color Swatches
                                                    if (attrName === 'Color' || attrName === 'Acabado') {
                                                        const colorCode = COLOR_MAP[val] || val;
                                                        return (
                                                            <button
                                                                key={val}
                                                                onClick={() => handleAttributeSelect(attrName, val)}
                                                                title={val}
                                                                className={`
                                                                    w-10 h-10 rounded-full border-2 transition-all shadow-sm
                                                                    ${isSelected
                                                                        ? 'border-brand-carbon scale-110 ring-2 ring-brand-carbon/20'
                                                                        : 'border-gray-200 hover:scale-105'
                                                                    }
                                                                `}
                                                                style={{ backgroundColor: colorCode }}
                                                            >
                                                                {isSelected && (
                                                                    <span className={`block w-2 h-2 mx-auto rounded-full ${['Blanco', 'Beige', 'Plateado'].includes(val) ? 'bg-black' : 'bg-white'}`}></span>
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
                                <p className="text-sm text-brand-carbon/60 font-medium leading-relaxed max-w-lg">
                                    {displayProduct?.description || parentProduct.description || 'Esta pieza de iluminación boutique ha sido seleccionada por su excelencia técnica y estética.'}
                                </p>

                                {/* Ficha Técnica - Attributes as Specs */}
                                {hasOptions && (
                                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                        <h3 className="text-[10px] font-black text-brand-carbon uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Zap className="w-3.5 h-3.5 text-primary" />
                                            Especificaciones
                                        </h3>
                                        <div className="divide-y divide-gray-50">
                                            {Object.entries(availableOptions).map(([key, values]) => (
                                                <div key={key} className="flex justify-between py-2">
                                                    <span className="text-[11px] font-bold text-gray-400 uppercase">{key}</span>
                                                    <span className="text-[11px] font-bold text-brand-carbon">
                                                        {selectedAttributes[key] || values.join(' / ')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Luxury Action Section */}
                            <div className="bg-white p-8 rounded-[2rem] shadow-luxury border border-gray-100 flex flex-col gap-6 mb-12">
                                <div className="flex items-center gap-6">
                                    <div className="flex-1 flex items-center justify-between bg-gray-50 rounded-2xl px-6 py-4 border border-gray-100">
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
                                            flex-[2] rounded-2xl py-4 px-8 font-black uppercase italic text-xs transition-all shadow-xl flex items-center justify-center gap-4 group
                                            ${(!displayProduct || parseInt(displayProduct.stock) <= 0)
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                                : 'bg-brand-carbon text-white hover:bg-primary shadow-black/20'
                                            }
                                        `}
                                    >
                                        <ShoppingCart className="w-5 h-5 transition-transform group-hover:scale-110" />
                                        {parseInt(displayProduct?.stock) > 0 ? 'Adquirir Pieza' : 'Agotado'}
                                    </button>
                                </div>
                            </div>

                            {/* Trust Manifesto */}
                            <div className="grid grid-cols-2 gap-8 py-8 border-t border-gray-100">
                                <div className="flex items-start gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-brand-carbon uppercase italic leading-none mb-1">Envío Boutique</p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">24/48h Business Days</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-brand-carbon uppercase italic leading-none mb-1">Garantía Real</p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">3 Años de Excelencia</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Envío Badge */}
                <div className="mt-16 flex items-center justify-center gap-8 py-6 border-t border-b border-gray-100">
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-gray-400">
                        <Truck className="w-5 h-5 text-primary" /> Envío 24/48h Península
                    </div>
                    <div className="w-px h-6 bg-gray-200"></div>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-gray-400">
                        <ShieldCheck className="w-5 h-5 text-primary" /> Garantía 3 Años
                    </div>
                    <div className="w-px h-6 bg-gray-200"></div>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-gray-400">
                        <Zap className="w-5 h-5 text-primary" /> Pago 100% Seguro
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
                                    <Link key={rp.id} to={`/product/${rp.slug}`} className="group">
                                        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                                            <div className="aspect-square p-6 flex items-center justify-center relative">
                                                {rpHasDiscount && (
                                                    <span className="absolute top-3 left-3 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase italic">
                                                        -{Math.round(((parseFloat(rp.price) - parseFloat(rp.discount_price)) / parseFloat(rp.price)) * 100)}%
                                                    </span>
                                                )}
                                                <span className={`absolute top-3 right-3 text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${rp.stock > 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'
                                                    }`}>
                                                    {rp.stock > 0 ? 'Stock' : 'Pedido'}
                                                </span>
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
            </div>
        </div>
    );
}
