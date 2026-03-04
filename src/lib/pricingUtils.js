/**
 * Centralized pricing logic for Mil Luces Boutique
 */

export const calculateProductPrice = (product, userProfile) => {
    if (!product) {
        return {
            originalPrice: 0,
            finalPrice: 0,
            isShowingProDiscount: false,
            displayDiscountPercent: 0,
            hasAnyDiscount: false,
            isPartnerPrice: false
        };
    }
    const originalPrice = parseFloat(product.price || 0);
    const dbDiscountPrice = parseFloat(product.discount_price || 0);
    const partnerPrice = parseFloat(product.partner_price || 0);
    const hasDbDiscount = dbDiscountPrice > 0 && dbDiscountPrice < originalPrice;

    // User profile data
    const isPro = userProfile?.user_type === 'profesional';
    const isPartner = userProfile?.is_partner === true;
    const proDiscountPercent = userProfile?.discount_percent || 0;

    // Public price (offer or original)
    const publicPrice = hasDbDiscount ? dbDiscountPrice : originalPrice;

    let finalPrice = publicPrice;
    let isShowingProDiscount = false;
    let isPartnerPrice = false;
    let appliedDiscountPercent = hasDbDiscount ? Math.round(((originalPrice - publicPrice) / originalPrice) * 100) : 0;

    // --- LOGIC HIERARCHY ---

    // 1. Check for Partner (Socio) specific fixed price
    if (isPartner && partnerPrice > 0) {
        finalPrice = partnerPrice;
        isPartnerPrice = true;
        isShowingProDiscount = true; // Still counts as a pro benefit
        appliedDiscountPercent = Math.round(((originalPrice - partnerPrice) / originalPrice) * 100);
    }
    // 2. Check for Professional percentage discount
    else if (isPro) {
        const proPriceByPercent = originalPrice * (1 - proDiscountPercent / 100);

        // Use the better price between pro discount and public offer
        if (proPriceByPercent < publicPrice) {
            finalPrice = proPriceByPercent;
            isShowingProDiscount = true;
            appliedDiscountPercent = proDiscountPercent;
        } else if (hasDbDiscount) {
            finalPrice = publicPrice;
            appliedDiscountPercent = Math.round(((originalPrice - publicPrice) / originalPrice) * 100);
        }
    }

    return {
        originalPrice,
        finalPrice,
        isShowingProDiscount,
        isPartnerPrice,
        displayDiscountPercent: appliedDiscountPercent,
        hasAnyDiscount: finalPrice < originalPrice
    };
};
