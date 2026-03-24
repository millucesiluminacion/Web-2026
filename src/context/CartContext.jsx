import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase as supabaseClient } from '../lib/supabaseClient';
import { calculateProductPrice } from '../lib/pricingUtils';

const CartContext = createContext();

export function useCart() {
    return useContext(CartContext);
}

export function CartProvider({ children }) {
    const { profile, discountPercent } = useAuth();
    const [cart, setCart] = useState(() => {
        // Persist in local storage
        const savedCallback = localStorage.getItem('cart');
        return savedCallback ? JSON.parse(savedCallback) : [];
    });

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    const [isSideCartOpen, setIsSideCartOpen] = useState(false);

    const addToCart = async (product, quantity = 1) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...prev, { ...product, quantity }];
        });

        // HANDLE MANDATORY ACCESSORIES
        if (product.mandatory_accessory_ids?.length > 0) {
            try {
                const { data: accessories, error } = await supabaseClient
                    .from('products')
                    .select('*')
                    .in('id', product.mandatory_accessory_ids);

                if (!error && accessories) {
                    accessories.forEach(acc => {
                        // We add them as separate items but marked as mandatory for this parent
                        setCart(prev => {
                            const existingAcc = prev.find(item => item.id === acc.id);
                            if (existingAcc) {
                                // If already there, we might not need to add more, or we increment
                                // For simplicity/insurance, we just ensure it exists with at least 1
                                return prev;
                            }
                            return [...prev, { ...acc, quantity: 1, isMandatory: true, parentId: product.id }];
                        });
                    });
                }
            } catch (err) {
                console.error("Error adding mandatory accessories:", err);
            }
        }

        setIsSideCartOpen(true);
    };

    const removeFromCart = (id) => {
        setCart(prev => {
            const newCart = prev.filter(item => item.id !== id);
            // Also remove mandatory accessories that were linked to this parent
            // and are not linked to any OTHER product still in the cart
            return newCart.filter(item => {
                if (item.isMandatory && item.parentId === id) {
                    // Check if another instance of the same parent product exists (unlikely in this simple impl)
                    return false;
                }
                return true;
            });
        });
    };

    const updateQuantity = (id, quantity) => {
        if (quantity < 1) return;
        setCart(prev => prev.map(item => item.id === id ? { ...item, quantity } : item));
    };

    const clearCart = () => setCart([]);

    const [shippingConfig, setShippingConfig] = useState({
        tiers: {
            b2c: {
                zones: {
                    peninsula: { base_cost: 5.95, free_shipping_threshold: 150, delivery_time: '48-72h' }
                }
            }
        }
    });

    const [shippingZone, setShippingZone] = useState('peninsula');

    useEffect(() => {
        const fetchShippingConfig = async () => {
            const { data } = await supabaseClient
                .from('app_settings')
                .select('value')
                .eq('key', 'shipping_config')
                .maybeSingle();

            if (data?.value && data.value.tiers) {
                setShippingConfig(data.value);
            }
        };
        fetchShippingConfig();
    }, []);

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = cart.reduce((acc, item) => {
        const pricing = calculateProductPrice(item, profile, item.quantity);
        return acc + (pricing.finalPrice * item.quantity);
    }, 0);

    // Dynamic Shipping Logic
    const getShippingDetails = () => {
        let tier = profile?.user_type === 'profesional' ? 'b2b' : (profile?.is_partner ? 'socio' : 'b2c');

        const tierConfig = shippingConfig.tiers?.[tier] || shippingConfig.tiers?.['b2c'];

        // Define robust hardcoded fallbacks per zone
        const zoneDefaults = {
            peninsula: { base_cost: 5.95, free_shipping_threshold: 150, delivery_time: '48-72h' },
            islands: { base_cost: 15.00, free_shipping_threshold: 300, delivery_time: '3-5 días' },
            international: { base_cost: 25.00, free_shipping_threshold: 500, delivery_time: '7-10 días' }
        };

        const zoneConfig = tierConfig?.zones?.[shippingZone] || tierConfig?.zones?.['peninsula'] || zoneDefaults[shippingZone] || zoneDefaults['peninsula'];

        // Ensure we always have numbers
        const base_cost = zoneConfig?.base_cost !== undefined ? Number(zoneConfig.base_cost) : zoneDefaults[shippingZone]?.base_cost || 5.95;
        const free_shipping_threshold = zoneConfig?.free_shipping_threshold !== undefined ? Number(zoneConfig.free_shipping_threshold) : zoneDefaults[shippingZone]?.free_shipping_threshold || 150;
        const delivery_time = zoneConfig?.delivery_time || zoneDefaults[shippingZone]?.delivery_time || '48-72h';

        return { base_cost, free_shipping_threshold, delivery_time };
    };

    const currentShipping = getShippingDetails();

    // Calculate shipping cost
    // It is FREE only if:
    // 1. subtotal >= free_shipping_threshold (and threshold is > 0)
    // 2. OR threshold is 0 AND subtotal > 0 (special case for Socio/Peninsula)
    let finalShippingCost = currentShipping.base_cost;

    if (subtotal > 0) {
        if (currentShipping.free_shipping_threshold === 0) {
            finalShippingCost = 0;
        } else if (subtotal >= currentShipping.free_shipping_threshold) {
            finalShippingCost = 0;
        }
    }

    const totalPrice = subtotal + finalShippingCost;

    const totalOriginal = cart.reduce((acc, item) => acc + ((item.original_price || item.price) * item.quantity), 0);
    const totalSavings = totalOriginal - subtotal;

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            totalItems,
            subtotal,
            totalPrice,
            shippingCost: finalShippingCost,
            shippingConfig,
            shippingZone,
            setShippingZone,
            currentShipping,
            totalOriginal,
            totalSavings,
            isSideCartOpen,
            setIsSideCartOpen,
            discountPercent: profile?.user_type === 'profesional' ? discountPercent : 0
        }}>
            {children}
        </CartContext.Provider>
    );
}
