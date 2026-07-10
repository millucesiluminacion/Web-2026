/**
 * Centralized pricing logic for Mil Luces Boutique
 */

export const IVA_RATE = 0.21;

export const calculateProductPrice = (product, userProfile, quantity = 1) => {
    if (!product) {
        return {
            originalPrice: 0,
            finalPrice: 0,
            basePrice: 0,
            ivaAmount: 0,
            displayPrice: 0,
            showPriceWithoutVat: false,
            isShowingProDiscount: false,
            displayDiscountPercent: 0,
            hasAnyDiscount: false,
            isPartnerPrice: false,
            isProPrice: false
        };
    }

    // 1. Base reference: Original Price (PVP) or standard Price
    const referencePrice = parseFloat(product.original_price || product.price || 0);
    const standardPrice = parseFloat(product.price || 0);
    const dbDiscountPrice = parseFloat(product.discount_price || 0);
    const partnerPrice = parseFloat(product.partner_price || 0);
    const professionalPrice = parseFloat(product.professional_price || 0);

    const hasDbDiscount = dbDiscountPrice > 0 && dbDiscountPrice < standardPrice;

    // User profile data
    const isProUser = userProfile?.user_type === 'profesional';
    const hasProPrices = isProUser && !!userProfile?.has_pro_prices;
    const isPartner = !!userProfile?.is_partner;

    // Base price for calculations (standard B2C)
    let basePriceFromDb = hasDbDiscount ? dbDiscountPrice : standardPrice;
    let isPartnerPrice = false;
    let isProPrice = false;

    // HIERARCHY OF PRICES
    let finalPrice = basePriceFromDb;

    // Only apply B2B tier prices if NOT a measurement-based override
    // (Measurements have absolute prices defined per size that apply to all roles)
    const isMeasurementProduct = product.is_by_measurement || (product.selectedOptions && product.selectedOptions.measure);

    if (!isMeasurementProduct) {
        // 1. Partner (Socio) - Highest Priority
        if (isPartner) {
            if (partnerPrice > 0) {
                finalPrice = partnerPrice;
                isPartnerPrice = true;
            }
        }
        // 2. Professional - Second Priority
        else if (hasProPrices) {
            if (professionalPrice > 0) {
                finalPrice = professionalPrice;
                isProPrice = true;
            }
        }
    }

    // VOLUME PRICING APPLICATION
    const volumeConfig = product.volume_pricing || {};
    let roleKey = 'individual';
    if (isPartner) roleKey = 'partner';
    else if (hasProPrices) roleKey = 'profesional';

    const scales = volumeConfig[roleKey] || [];
    if (scales.length > 0 && quantity > 1) {
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

    // VAT CALCULATIONS
    // Prices in DB already include VAT (confirmed by USER)
    const showPriceWithoutVat = isProUser || isPartner;
    const basePrice = finalPrice / (1 + IVA_RATE);
    const ivaAmount = finalPrice - basePrice;
    const displayPrice = showPriceWithoutVat ? basePrice : finalPrice;

    return {
        originalPrice: referencePrice,
        finalPrice, // This remains the total price with VAT (for checkout)
        basePrice, // Tax base
        ivaAmount, // Total VAT
        displayPrice, // Price to show in UI
        showPriceWithoutVat,
        isShowingProDiscount: isProPrice,
        isPartnerPrice,
        isProPrice,
        displayDiscountPercent: appliedDiscountPercent,
        hasAnyDiscount: finalPrice < referencePrice
    };
};

