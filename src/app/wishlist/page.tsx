"use client";
import React from 'react';
import Link from 'next/link';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { Heart, ArrowLeft, ShoppingCart, Trash2, Plus } from 'lucide-react';

export default function WishlistPage() {
  const { items, remove, clear } = useWishlist();
  const { addToCart, setIsCartOpen } = useCart();

  const handleAddToCart = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    // Minimal fields to add to cart; CartContext enforces location rules
    addToCart({ id: item.id, name: item.name, price: item.price, isAvailable: true, imageUrl: item.imageUrl, locationId: item.locationId });
    setIsCartOpen(true);
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-orange-50">
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <Heart className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Your wishlist is empty</h1>
          <p className="text-gray-600 mb-6">Browse the menu and tap the heart to save items here.</p>
          <Link href="/menu" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold shadow-md hover:shadow-lg">
            <ArrowLeft className="w-4 h-4" /> Back to Menu
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-orange-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-600" />
            <h1 className="text-2xl font-black text-gray-900">My Wishlist</h1>
            <span className="text-sm text-gray-500">({items.length} items)</span>
          </div>
          <button onClick={clear} className="flex items-center gap-2 text-sm text-rose-700 hover:text-rose-800">
            <Trash2 className="w-4 h-4" /> Clear all
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-md border hover:shadow-lg transition overflow-hidden">
              <div className="flex gap-4 p-4">
                <img src={item.imageUrl} alt={item.name} className="w-24 h-24 object-cover rounded-lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
                  <p className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">₹{item.price}</p>
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => handleAddToCart(item.id)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 text-white text-sm font-semibold shadow hover:shadow-md">
                      <ShoppingCart className="w-4 h-4" /> Add to cart
                    </button>
                    <button onClick={() => remove(item.id)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm text-gray-700 hover:bg-gray-50">
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/menu" className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Continue browsing menu
          </Link>
        </div>
      </div>
    </main>
  );
}
