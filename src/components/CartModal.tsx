"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, X, Utensils, Minus, Plus } from 'lucide-react';

export const CartModal = () => {
    const router = useRouter();
    const supabase = createClient();
    const { cart, summary, isCartOpen, updateQuantity, clearCart, setIsCartOpen, locationName } = useCart();

    const handleCheckout = async () => {
        console.log('🛒 Checkout button clicked!');
        console.log('Cart items:', cart.length);
        
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            console.log('Session check:', session ? 'Logged in' : 'Not logged in', error);
            
            if (!session) {
                console.log('Redirecting to login...');
                router.push('/login?redirect_to=/checkout');
            } else {
                console.log('Redirecting to checkout...');
                router.push('/checkout');
            }
        } catch (err) {
            console.error('Checkout error:', err);
        }
    };
    
    if (!isCartOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-end animate-fadeIn" onClick={() => setIsCartOpen(false)}>
            <div className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-out" onClick={(e) => e.stopPropagation()}>
                {/* Premium Gradient Header */}
                <div className="sticky top-0 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-white p-5 flex justify-between items-center shadow-lg z-10">
                    <h2 className="text-2xl font-black flex items-center">
                        <ShoppingCart className="h-7 w-7 mr-3" />
                        Your Order
                    </h2>
                    <button 
                        onClick={() => setIsCartOpen(false)} 
                        className="p-2 hover:bg-white/20 rounded-full transition-all hover:scale-110"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Location Badge */}
                {cart.length > 0 && (
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 border-b-2 border-orange-200 p-4">
                        <p className="font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 flex items-center justify-center gap-2">
                            <span className="text-orange-600">📍</span>
                            Ordering from: {locationName}
                        </p>
                    </div>
                )}

                {/* Cart Items */}
                <div className="p-4 space-y-4 flex-grow min-h-[300px]">
                    {cart.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center">
                                <Utensils className="h-10 w-10 text-orange-600" />
                            </div>
                            <p className="text-gray-500 font-medium text-lg">Your cart is empty</p>
                            <p className="text-gray-400 text-sm mt-2">Add some delicious items!</p>
                        </div>
                    ) : cart.map(item => (
                        <div 
                            key={item.id} 
                            className="group flex items-center justify-between bg-gradient-to-r from-gray-50 to-orange-50 rounded-2xl p-4 border-2 border-gray-100 hover:border-orange-200 transition-all duration-300 hover:shadow-md"
                        >
                            <div className="flex items-center space-x-4">
                                <img 
                                    src={item.imageUrl} 
                                    alt={item.name} 
                                    className="w-16 h-16 rounded-xl object-cover shadow-md group-hover:scale-105 transition-transform" 
                                />
                                <div>
                                    <p className="font-bold text-gray-900">{item.name}</p>
                                    <p className="text-sm text-gray-600 font-medium">₹{item.price} × {item.quantity}</p>
                                    <p className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                                        ₹{item.price * item.quantity}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 bg-white rounded-full p-1 shadow-sm">
                                <button 
                                    onClick={() => updateQuantity(item.id, -1)} 
                                    className="p-2 bg-gradient-to-br from-red-100 to-orange-100 rounded-full hover:from-red-200 hover:to-orange-200 text-red-700 transition-all hover:scale-110"
                                >
                                    <Minus className="h-4 w-4" />
                                </button>
                                <span className="font-black w-8 text-center text-gray-900">{item.quantity}</span>
                                <button 
                                    onClick={() => updateQuantity(item.id, 1)} 
                                    className="p-2 bg-gradient-to-br from-orange-100 to-red-100 rounded-full hover:from-orange-200 hover:to-red-200 text-orange-700 transition-all hover:scale-110"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {cart.length > 0 && (
                        <button 
                            onClick={clearCart} 
                            className="w-full text-center text-red-600 hover:text-red-800 mt-4 text-sm font-bold transition-all hover:scale-105 py-2 px-4 rounded-lg hover:bg-red-50"
                        >
                            🗑️ Clear Cart
                        </button>
                    )}
                </div>

                {/* Premium Summary Section */}
                <div className="sticky bottom-0 bg-gradient-to-br from-gray-50 via-orange-50 to-red-50 p-5 border-t-2 border-orange-200 shadow-2xl">
                    <div className="space-y-3 mb-5">
                        <div className="flex justify-between font-semibold text-gray-700">
                            <span>Subtotal:</span>
                            <span>₹{summary.subtotal}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                            <span className="text-gray-700">Delivery:</span>
                            <span className={summary.isFreeDelivery ? "text-green-600 font-black" : "text-gray-700"}>
                                {summary.isFreeDelivery ? '🎉 FREE' : `₹${summary.deliveryCharge}`}
                            </span>
                        </div>
                        {summary.isFreeDelivery ? (
                            <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-xl p-3 text-center">
                                <p className="text-green-700 text-sm font-black">🎉 Your delivery is FREE!</p>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300 rounded-xl p-3 text-center">
                                <p className="text-orange-800 text-sm font-bold">
                                    Add ₹{(200 - summary.subtotal).toFixed(0)} more for FREE Delivery!
                                </p>
                            </div>
                        )}
                        <div className="flex justify-between font-black text-xl pt-3 border-t-2 border-orange-200">
                            <span className="text-gray-900">Total:</span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                                ₹{summary.total}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={handleCheckout} 
                        disabled={cart.length === 0} 
                        className={`w-full py-4 text-xl font-black rounded-2xl transition-all duration-300 shadow-lg ${
                            cart.length === 0 
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 hover:from-orange-700 hover:via-red-700 hover:to-pink-700 text-white hover:shadow-2xl hover:scale-105'
                        }`}
                    >
                        {cart.length === 0 ? 'Cart is Empty' : `Proceed to Checkout →`}
                    </button>
                </div>
            </div>
        </div>
    );
};
