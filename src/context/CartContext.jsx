import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

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

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalOriginal = cart.reduce((acc, item) => acc + ((item.original_price || item.price) * item.quantity), 0);
    const totalSavings = totalOriginal - totalPrice;

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            totalItems,
            totalPrice,
            totalOriginal,
            totalSavings,
            discountPercent: profile?.user_type === 'profesional' ? discountPercent : 0
        }}>
            {children}
        </CartContext.Provider>
    );
}
