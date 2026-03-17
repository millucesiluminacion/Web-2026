import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase as supabaseClient } from '../lib/supabaseClient';

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

    const addToCart = (product, quantity = 1) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...prev, { ...product, quantity }];
        });
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
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

            if (data?.value) {
                setShippingConfig(data.value);
            }
        };
        fetchShippingConfig();
    }, []);

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Dynamic Shipping Logic
    const getShippingDetails = () => {
        let tier = 'b2c';
        if (profile?.is_partner) tier = 'socio';
        else if (profile?.user_type === 'profesional') tier = 'b2b';

        const tierConfig = shippingConfig.tiers?.[tier] || shippingConfig.tiers?.['b2c'];
        const zoneConfig = tierConfig?.zones?.[shippingZone] || tierConfig?.zones?.['peninsula'];

        return zoneConfig || { base_cost: 5.95, free_shipping_threshold: 150, delivery_time: '48-72h' };
    };

    const currentShipping = getShippingDetails();
    const shippingCost = subtotal >= currentShipping.free_shipping_threshold ? 0 : currentShipping.base_cost;
    const totalPrice = subtotal + shippingCost;

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
            shippingCost,
            shippingConfig,
            shippingZone,
            setShippingZone,
            currentShipping,
            totalOriginal,
            totalSavings,
            discountPercent: profile?.user_type === 'profesional' ? discountPercent : 0
        }}>
            {children}
        </CartContext.Provider>
    );
}
