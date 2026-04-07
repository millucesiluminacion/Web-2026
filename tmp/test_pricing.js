
const calculateProductPrice = (product, userProfile, quantity = 1) => {
    if (!product) return { finalPrice: 0 };

    const standardPrice = parseFloat(product.price || 0);
    const dbDiscountPrice = parseFloat(product.discount_price || 0);
    const partnerPrice = parseFloat(product.partner_price || 0);
    const professionalPrice = parseFloat(product.professional_price || 0);

    const hasDbDiscount = dbDiscountPrice > 0 && dbDiscountPrice < standardPrice;

    const isPro = userProfile?.user_type === 'profesional';
    const isPartner = !!userProfile?.is_partner;
    const proDiscountPercent = userProfile?.discount_percent || 0;

    let basePrice = hasDbDiscount ? dbDiscountPrice : standardPrice;
    let finalPrice = basePrice;
    let isPartnerPrice = false;
    let isProPrice = false;

    // Proposed New Logic:
    if (isPartner) {
        if (partnerPrice > 0) {
            finalPrice = partnerPrice;
            isPartnerPrice = true;
        } else {
            // Case reported by user: VIP without specific price
            finalPrice = basePrice;
            isPartnerPrice = false;
        }
    } else if (isPro) {
        if (professionalPrice > 0) {
            finalPrice = professionalPrice;
            isProPrice = true;
        } else {
            // Case reported by user: Pro without specific price
            // The user wants to avoid automatic percentage discount if it causes loss.
            // But usually Pro expects a discount. 
            // HOWEVER, the user explicitly said "esto pasa tanto en Tarifa Profesional como en la de socio"
            // and "deberia de mostrar el precio real, sin descontar nada".
            finalPrice = basePrice;
            isProPrice = false;
        }
    }

    return {
        finalPrice,
        isPartnerPrice,
        isProPrice,
        isShowingProDiscount: isPartnerPrice || isProPrice
    };
};

// TEST SCENARIOS
const product = {
    price: 100,
    discount_price: 90, // Offer price
    partner_price: 80,
    professional_price: 85
};

const productNoSpecial = {
    price: 100,
    discount_price: 0,
    partner_price: 0,
    professional_price: 0
};

console.log("--- TEST: VIP with Special Price ---");
console.log(calculateProductPrice(product, { is_partner: true }));
// Expected: 80

console.log("\n--- TEST: VIP without Special Price (BUG FIX) ---");
console.log(calculateProductPrice(productNoSpecial, { is_partner: true, user_type: 'profesional', discount_percent: 20 }));
// Expected: 100 (Previously was 80 because of fallback to Pro discount)

console.log("\n--- TEST: Pro with Special Price ---");
console.log(calculateProductPrice(product, { user_type: 'profesional' }));
// Expected: 85

console.log("\n--- TEST: Pro without Special Price (BUG FIX) ---");
console.log(calculateProductPrice(productNoSpecial, { user_type: 'profesional', discount_percent: 20 }));
// Expected: 100 (Previously was 80 because of fallback to discount_percent)

console.log("\n--- TEST: Guest ---");
console.log(calculateProductPrice(product, null));
// Expected: 90 (Show offer price if available)
