/**
 * Google Analytics 4 (GA4) E-commerce tracking helper
 * Measurement ID: G-8Z16FYML7H (configured in index.html)
 */

function safeGtag(event, params) {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        try {
            window.gtag('event', event, params);
            if (import.meta.env.DEV) {
                console.log(`[GA4 Event] ${event}:`, params);
            }
        } catch (err) {
            console.warn('[GA4 Event Error]', err);
        }
    }
}

/**
 * Normaliza un producto a la estructura estándar de ítems de GA4
 */
export function formatGA4Item(item, quantity = 1) {
    if (!item) return null;
    const priceNum = parseFloat(item.discount_price && parseFloat(item.discount_price) > 0 ? item.discount_price : (item.price || 0));
    return {
        item_id: String(item.reference || item.id || ''),
        item_name: String(item.name || ''),
        price: Number(priceNum.toFixed(2)),
        quantity: Number(quantity || 1),
        item_brand: item.brands?.name || item.brand_name || 'Mil Luces',
        item_category: item.categories?.name || item.category_name || item.category || 'Iluminación'
    };
}

/**
 * 1. Visualización de detalle de producto (view_item)
 */
export function trackViewItem(product) {
    if (!product) return;
    const item = formatGA4Item(product, 1);
    safeGtag('view_item', {
        currency: 'EUR',
        value: item.price,
        items: [item]
    });
}

/**
 * 2. Añadir al carrito (add_to_cart)
 */
export function trackAddToCart(product, quantity = 1) {
    if (!product) return;
    const item = formatGA4Item(product, quantity);
    safeGtag('add_to_cart', {
        currency: 'EUR',
        value: Number((item.price * quantity).toFixed(2)),
        items: [item]
    });
}

/**
 * 3. Eliminar del carrito (remove_from_cart)
 */
export function trackRemoveFromCart(product, quantity = 1) {
    if (!product) return;
    const item = formatGA4Item(product, quantity);
    safeGtag('remove_from_cart', {
        currency: 'EUR',
        value: Number((item.price * quantity).toFixed(2)),
        items: [item]
    });
}

/**
 * 4. Ver el carrito de compras (view_cart)
 */
export function trackViewCart(cart, total) {
    if (!Array.isArray(cart) || cart.length === 0) return;
    const items = cart.map(i => formatGA4Item(i, i.quantity)).filter(Boolean);
    safeGtag('view_cart', {
        currency: 'EUR',
        value: Number(parseFloat(total || 0).toFixed(2)),
        items
    });
}

/**
 * 5. Iniciar proceso de pago (begin_checkout)
 */
export function trackBeginCheckout(cart, total) {
    if (!Array.isArray(cart) || cart.length === 0) return;
    const items = cart.map(i => formatGA4Item(i, i.quantity)).filter(Boolean);
    safeGtag('begin_checkout', {
        currency: 'EUR',
        value: Number(parseFloat(total || 0).toFixed(2)),
        items
    });
}

/**
 * 6. Compra realizada (purchase)
 */
export function trackPurchase(order, cart, total, shippingCost = 0) {
    if (!order) return;
    const items = Array.isArray(cart) ? cart.map(i => formatGA4Item(i, i.quantity)).filter(Boolean) : [];
    const totalVal = parseFloat(total || order.total || 0);
    const shippingVal = parseFloat(shippingCost || 0);
    const taxVal = Number((totalVal - (totalVal / 1.21)).toFixed(2));

    safeGtag('purchase', {
        transaction_id: String(order.id ? order.id.slice(0, 8).toUpperCase() : Date.now()),
        value: Number(totalVal.toFixed(2)),
        tax: taxVal,
        shipping: Number(shippingVal.toFixed(2)),
        currency: 'EUR',
        items
    });
}

/**
 * 7. Búsqueda en tienda (search)
 */
export function trackSearch(searchTerm) {
    if (!searchTerm || !searchTerm.trim()) return;
    safeGtag('search', {
        search_term: searchTerm.trim()
    });
}
