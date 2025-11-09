"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  locationId?: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  add: (item: WishlistItem) => void;
  remove: (id: string) => void;
  toggle: (item: WishlistItem) => void;
  has: (id: string) => boolean;
  clear: () => void;
  count: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const STORAGE_KEY = 'wishlist_items';

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Basic validation
          setItems(parsed.filter(p => p && typeof p.id === 'string'));
        }
      }
    } catch (e) {
      console.warn('Failed to read wishlist from storage', e);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to persist wishlist', e);
    }
  }, [items, hydrated]);

  const add = useCallback((item: WishlistItem) => {
    setItems(prev => prev.some(i => i.id === item.id) ? prev : [...prev, item]);
  }, []);

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const toggle = useCallback((item: WishlistItem) => {
    setItems(prev => prev.some(i => i.id === item.id) ? prev.filter(i => i.id !== item.id) : [...prev, item]);
  }, []);

  const has = useCallback((id: string) => items.some(i => i.id === id), [items]);

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.length, [items]);

  return (
    <WishlistContext.Provider value={{ items, add, remove, toggle, has, clear, count }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};
