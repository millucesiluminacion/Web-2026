/**
 * Centralized pricing logic for Mil Luces Boutique
 */

export const calculateProductPrice = (product, userProfile, quantity = 1) => {
    if (!product) {
        return {
            originalPrice: 0,
            finalPrice: 0,
            isShowingProDiscount: false,
            displayDiscountPercent: 0,
            hasAnyDiscount: false,
            isPartnerPrice: false,
            isProPrice: false
        };
    }

    // 1. Base reference: Original Price (PVP) or standard Price
    // We treat 'original_price' as the "Market/List Price" (tachado)
    // and 'price' as the "Our Store Price" (B2C standard)
    const referencePrice = parseFloat(product.original_price || product.price || 0);
    const standardPrice = parseFloat(product.price || 0);
    const dbDiscountPrice = parseFloat(product.discount_price || 0);
    const partnerPrice = parseFloat(product.partner_price || 0);
    const professionalPrice = parseFloat(product.professional_price || 0);

    const hasDbDiscount = dbDiscountPrice > 0 && dbDiscountPrice < standardPrice;

    // User profile data
    const isPro = userProfile?.user_type === 'profesional';
    const isPartner = !!userProfile?.is_partner;
    const proDiscountPercent = userProfile?.discount_percent || 0;

    // Base price for calculations (standard B2C)
    let basePrice = hasDbDiscount ? dbDiscountPrice : standardPrice;
    let isPartnerPrice = false;
    let isProPrice = false;

    // HIERARCHY OF PRICES
    let finalPrice = basePrice;

    // 1. Partner (Socio) - Highest Priority
    if (isPartner) {
        if (partnerPrice > 0) {
            finalPrice = partnerPrice;
            isPartnerPrice = true;
        } else {
            // Fallback to standard base price if no specific partner price set
            finalPrice = basePrice;
            isPartnerPrice = false;
        }
    }
    // 2. Professional - Second Priority (Professional Price ONLY, no fallback to % if user wants strict pricing)
    else if (isPro) {
        if (professionalPrice > 0) {
            finalPrice = professionalPrice;
            isProPrice = true;
        } else {
            // Updated logic: if no professional_price is defined, show standard price
            // to avoid unintended losses from general discount_percent.
            finalPrice = basePrice;
            isProPrice = false;
        }
    }

    // VOLUME PRICING APPLICATION
    // volume_pricing structure: { individual: [], profesional: [], partner: [] }
    // each array: [{ qty: 10, price: 50 }, { qty: 20, price: 45 }]
    const volumeConfig = product.volume_pricing || {};
    let roleKey = 'individual';
    if (isPartner) roleKey = 'partner';
    else if (isPro) roleKey = 'profesional';

    const scales = volumeConfig[roleKey] || [];
    if (scales.length > 0 && quantity > 1) {
        // Find best volume price for current quantity
        const applicableScale = [...scales]
            .filter(s => quantity >= s.qty)
            .sort((a, b) => b.qty - a.qty)[0];

        if (applicableScale && applicableScale.price < finalPrice) {
            finalPrice = applicableScale.price;
        }
    }

    const appliedDiscountPercent = referencePrice > 0
        ? Math.round(((referencePrice - finalPrice) / referencePrice) * 100)
        : 0;

    return {
        originalPrice: referencePrice,
        finalPrice,
        isShowingProDiscount: isProPrice,
        isPartnerPrice,
        isProPrice,
        displayDiscountPercent: appliedDiscountPercent,
        hasAnyDiscount: finalPrice < referencePrice
    };
};

