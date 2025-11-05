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
const FREE_DELIVERY_THRESHOLD = 300;

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const [cartState, setCartState] = useState<CartState>({ cart: [], locationId: null, locationName: null });
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    // Load from localStorage ONCE on mount (prevent hydration mismatch)
    useEffect(() => {
        try {
            const savedState = localStorage.getItem('cafe_cart_state');
            if (savedState) {
                const parsed = JSON.parse(savedState);
                // Validate structure before setting
                if (parsed && typeof parsed === 'object' && Array.isArray(parsed.cart)) {
                    setCartState(parsed);
                } else {
                    console.warn('⚠️ Invalid cart state in localStorage, resetting...');
                    localStorage.removeItem('cafe_cart_state');
                }
            }
        } catch (error) {
            console.error("❌ Failed to parse cart state from localStorage:", error);
            localStorage.removeItem('cafe_cart_state'); // Clear corrupted data
        } finally {
            setIsHydrated(true); // Mark as ready
        }
    }, []);

    // Save to localStorage ONLY after hydration
    useEffect(() => {
        if (!isHydrated) return; // Don't save during initial load
        
        try {
            localStorage.setItem('cafe_cart_state', JSON.stringify(cartState));
        } catch (error) {
            console.error("❌ Failed to save cart state:", error);
            // Handle quota exceeded or other localStorage errors
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                console.warn('⚠️ localStorage quota exceeded, clearing old data...');
                try {
                    localStorage.clear();
                    localStorage.setItem('cafe_cart_state', JSON.stringify(cartState));
                } catch (e) {
                    console.error('❌ Still failed after clearing:', e);
                }
            }
        }
    }, [cartState, isHydrated]);

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
        console.log('🧹 Clearing cart...');
        setCartState({ cart: [], locationId: null, locationName: null });
        
        // Force immediate localStorage update
        try {
            localStorage.setItem('cafe_cart_state', JSON.stringify({ cart: [], locationId: null, locationName: null }));
            console.log('✅ Cart cleared and localStorage updated');
        } catch (error) {
            console.error('❌ Failed to clear localStorage:', error);
        }
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