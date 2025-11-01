"use client";
import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';

// --- TYPES ---
interface MenuItem { id: string; name: string; price: number; isAvailable: boolean; imageUrl: string; locationId?: string; }
interface CartItem extends MenuItem { quantity: number; }
interface CartState {
    cart: CartItem[];
    locationId: string | null;
    locationName: string | null;
}
interface CartContextType extends CartState {
    addToCart: (item: MenuItem) => void;
    updateQuantity: (itemId: string, change: number) => void;
    clearCart: () => void;
    isCartOpen: boolean;
    setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>;
    cartCount: number;
    summary: { subtotal: number; deliveryCharge: number; total: number; isFreeDelivery: boolean; };
}

const DELIVERY_CHARGE = 50;
const FREE_DELIVERY_THRESHOLD = 500;

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const [cartState, setCartState] = useState<CartState>({ cart: [], locationId: null, locationName: null });
    const [isCartOpen, setIsCartOpen] = useState(false);

    useEffect(() => {
        try {
            const savedState = localStorage.getItem('cafe_cart_state');
            if (savedState) {
                setCartState(JSON.parse(savedState));
            }
        } catch (error) {
            console.error("Failed to parse cart state from localStorage", error);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('cafe_cart_state', JSON.stringify(cartState));
    }, [cartState]);

    const addToCart = useCallback((item: MenuItem & { locationName?: string }) => {
        if (!item.isAvailable || !item.locationId) return;

        setCartState(prevState => {
            // Case 1: Cart is empty OR item is from the same location
            if (prevState.cart.length === 0 || prevState.locationId === item.locationId) {
                const existingItem = prevState.cart.find(i => i.id === item.id);
                let newCart;
                if (existingItem) {
                    newCart = prevState.cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
                } else {
                    newCart = [...prevState.cart, { ...item, quantity: 1 }];
                }
                return { cart: newCart, locationId: item.locationId ?? null, locationName: item.locationName || prevState.locationName };
            }
            
            // Case 2: Item is from a different location
            if (window.confirm(`You can only order from one location at a time. Start a new cart at ${item.locationName || 'this location'}?`)) {
                return { cart: [{ ...item, quantity: 1 }], locationId: item.locationId ?? null, locationName: item.locationName || null };
            } else {
                return prevState; // Do nothing if user cancels
            }
        });
        setIsCartOpen(true);
    }, []);

    const updateQuantity = useCallback((itemId: string, change: number) => {
        setCartState(prevState => ({
            ...prevState,
            cart: prevState.cart.map(i => i.id === itemId ? { ...i, quantity: i.quantity + change } : i).filter(i => i.quantity > 0)
        }));
    }, []);

    const clearCart = useCallback(() => {
        setCartState({ cart: [], locationId: null, locationName: null });
    }, []);

    const cartCount = useMemo(() => cartState.cart.reduce((sum, item) => sum + item.quantity, 0), [cartState.cart]);

    const summary = useMemo(() => {
        const subtotal = cartState.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const isFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;
        const deliveryCharge = isFreeDelivery ? 0 : (subtotal > 0 ? DELIVERY_CHARGE : 0);
        const total = subtotal + deliveryCharge;
        return { subtotal, deliveryCharge, total, isFreeDelivery };
    }, [cartState.cart]);

    const value = {
        ...cartState,
        addToCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        cartCount,
        summary
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};