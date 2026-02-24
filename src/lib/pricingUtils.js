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
            hasAnyDiscount: false
        };
    }
    const originalPrice = parseFloat(product.price || 0);
    const dbDiscountPrice = parseFloat(product.discount_price || 0);
    const hasDbDiscount = dbDiscountPrice > 0 && dbDiscountPrice < originalPrice;

    // User profile data
    const isPro = userProfile?.user_type === 'profesional';
    const proDiscountPercent = userProfile?.discount_percent || 0;

    // Calculate potential professional price
    const proPrice = isPro ? originalPrice * (1 - proDiscountPercent / 100) : originalPrice;

    // Public price (offer or original)
    const publicPrice = hasDbDiscount ? dbDiscountPrice : originalPrice;

    // Rule of Gold: Best price available for the specific user
    let finalPrice = originalPrice;
    let isShowingProDiscount = false;
    let appliedDiscountPercent = 0;

    if (isPro) {
        if (proPrice < publicPrice) {
            finalPrice = proPrice;
            isShowingProDiscount = true;
            appliedDiscountPercent = proDiscountPercent;
        } else if (hasDbDiscount) {
            finalPrice = publicPrice;
            appliedDiscountPercent = Math.round(((originalPrice - publicPrice) / originalPrice) * 100);
        }
    } else {
        finalPrice = publicPrice;
        appliedDiscountPercent = hasDbDiscount ? Math.round(((originalPrice - publicPrice) / originalPrice) * 100) : 0;
    }

    return {
        originalPrice,
        finalPrice,
        isShowingProDiscount,
        displayDiscountPercent: appliedDiscountPercent,
        hasAnyDiscount: finalPrice < originalPrice
    };
};
