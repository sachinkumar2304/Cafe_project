"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { CartModal } from '@/components/CartModal'; // Import shared component
import { useAuth } from '@/hooks/useAuth';
import { Menu as MenuIcon, X, MapPin, ShoppingCart, Utensils, Loader2, Minus, Plus, User, LogOut, Zap, Search } from 'lucide-react';

// --- Interfaces and Types ---
interface ShopLocation { id: string; name: string; address: string; highlights: string; }
interface MenuItem { id: string; name: string; description: string; price: number; category: string; isVeg: boolean; isAvailable: boolean; imageUrl: string; locationId?: string; }

// --- Data Fetching Hook (from Supabase API) ---
const useDataFetcher = () => {
    const [locations, setLocations] = useState<ShopLocation[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                // Try to get default locations first
                const { defaultLocations } = await import('@/lib/menuStorage');
                if (isMounted) setLocations(defaultLocations);

                // Then fetch from API
                const [locationsResponse, menuResponse] = await Promise.allSettled([
                    fetch('/api/locations', { next: { revalidate: 60 } }),
                    fetch('/api/menu', { next: { revalidate: 60 } })
                ]);

                if (locationsResponse.status === 'fulfilled' && locationsResponse.value.ok) {
                    const locationData = await locationsResponse.value.json();
                    if (isMounted && Array.isArray(locationData) && locationData.length > 0) {
                        setLocations(locationData);
                    }
                } else if (locationsResponse.status === 'fulfilled') {
                    const errorData = await locationsResponse.value.json();
                    console.error('Failed to fetch locations:', errorData.error || locationsResponse.value.statusText);
                } else {
                    console.error('Failed to fetch locations:', locationsResponse.reason);
                }

                if (menuResponse.status === 'fulfilled' && menuResponse.value.ok) {
                    const rawMenuData = await menuResponse.value.json();
                    if (!Array.isArray(rawMenuData)) {
                        throw new Error('Invalid menu data format');
                    }
                    
                    // Treat incoming raw data as unknown and validate per-field to avoid `any`
                    const raw = rawMenuData as unknown;
                    const maybeArray = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
                    const menuData = maybeArray.map((item) => {
                        const id = item.id ?? Date.now().toString();
                        const name = typeof item.name === 'string' ? item.name : 'Unnamed Item';
                        const description = typeof item.description === 'string' ? item.description : '';
                        const price = typeof item.price === 'number' ? item.price : 0;
                        const category = typeof item.category === 'string' ? item.category : 'Other';
                        const isVeg = typeof item.is_veg === 'boolean' ? item.is_veg : true;
                        const isAvailable = typeof item.is_available === 'boolean' ? item.is_available : true;
                        const imageUrl = typeof item.image_url === 'string' ? item.image_url : 'https://placehold.co/100x100/A0522D/ffffff?text=Food';
                        const locationId = typeof item.location_id === 'string' ? item.location_id : (typeof item.location_id === 'number' ? String(item.location_id) : undefined);
                        return {
                            id: String(id),
                            name,
                            description,
                            price,
                            category,
                            isVeg,
                            isAvailable,
                            imageUrl,
                            locationId
                        } as MenuItem;
                    });

                    if (isMounted) {
                        setMenuItems(menuData.sort((a: MenuItem, b: MenuItem) => 
                            a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
                        ));
                    }
                } else if (menuResponse.status === 'fulfilled') {
                    const errorData = await menuResponse.value.json();
                    throw new Error(errorData.error || 'Failed to fetch menu items');
                } else {
                    throw new Error('Failed to fetch menu items: ' + menuResponse.reason);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                if (isMounted) {
                    setError(error instanceof Error ? error.message : 'Failed to load menu data');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, []);

    return { locations, menuItems, isLoading, error };
};

// --- UI Components ---
const MenuHeader = ({ locations, activeLocationId, setActiveLocationId, cartCount, onOpenCart }: { 
    locations: ShopLocation[], 
    activeLocationId: string | null, 
    setActiveLocationId: (id: string) => void,
    cartCount: number,
    onOpenCart: () => void
}) => {
    const [mounted, setMounted] = useState(false);
    const { user, isAuthReady, signOut } = useAuth();
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        console.log('🍔 Menu Header mounted - Auth ready:', isAuthReady, 'User:', user ? 'Logged in' : 'Guest');
    }, []);

    // Debug auth state changes
    useEffect(() => {
        if (mounted && isAuthReady) {
            console.log('🔐 Menu Auth state - User:', user?.email || 'Not logged in');
        }
    }, [mounted, isAuthReady, user]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    return (
        <header className="sticky top-0 z-40 bg-white shadow-md border-b border-gray-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                <Link href="/" className="flex items-center space-x-2">
                    <Utensils className="w-6 h-6 text-orange-600" />
                    <span className="text-xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-700">Snackify</span>
                </Link>
                <div className="flex items-center space-x-4">
                    <Link href="/" className="text-lg font-medium text-gray-700 hover:text-orange-600 transition hidden sm:block">Home</Link>
                    {mounted && isAuthReady && (
                        user ? (
                            <>
                                <Link href="/orders" className="hidden sm:flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-orange-600 transition">
                                    <User className="h-4 w-4" />
                                    Orders
                                </Link>
                                <Link href="/checkout" className="hidden sm:flex items-center text-sm font-medium text-gray-700 hover:text-orange-600 transition">
                                    Profile
                                </Link>
                                <button onClick={handleSignOut} className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-lg hover:from-gray-200 hover:to-gray-300 transition">
                                    <LogOut className="h-3 w-3" />
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <Link href="/login" className="hidden sm:block px-3 py-1.5 text-xs bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition font-semibold shadow-md">
                                Sign In
                            </Link>
                        )
                    )}
                    <button onClick={onOpenCart} className="relative p-2 rounded-full bg-gradient-to-r from-orange-600 to-red-600 text-white hover:shadow-lg transition-all shadow-md hover:scale-105" aria-label="View Shopping Cart">
                        <ShoppingCart className="w-5 h-5" />
                        {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-yellow-400 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{cartCount}</span>}
                    </button>
                </div>
            </div>
            <div className="bg-gradient-to-r from-orange-50 via-red-50 to-pink-50 shadow-inner py-3">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto space-x-3 scrollbar-hide">
                    {locations.map(loc => (
                        <button 
                            key={loc.id} 
                            onClick={() => setActiveLocationId(loc.id)} 
                            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full flex-shrink-0 transition-all duration-300 ${
                                activeLocationId === loc.id 
                                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg scale-105' 
                                    : 'bg-white text-gray-700 border border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                            }`}
                        >
                            <MapPin className='w-4 h-4' />
                            {loc.name}
                        </button>
                    ))}
                </div>
            </div>
        </header>
    );
};

const MenuItemCard = ({ item, locationName, onAddToCart }: { item: MenuItem, locationName: string, onAddToCart: (item: MenuItem & { locationName: string }) => void }) => {
    const isOutOfStock = !item.isAvailable;
    return (
        <div className={`group bg-white p-5 rounded-2xl shadow-md border-2 transition-all duration-300 ${isOutOfStock ? 'opacity-60 border-gray-200' : 'border-transparent hover:shadow-xl hover:border-orange-200 hover:-translate-y-1'}`}>
            <div className="flex gap-4">
                <div className="relative flex-shrink-0">
                    <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-24 h-24 object-cover rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-300" 
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/fb923c/ffffff?text=Food' }} 
                    />
                    {item.isVeg && (
                        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                            Veg
                        </span>
                    )}
                </div>
                <div className="flex-grow flex flex-col justify-between">
                    <div>
                        <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">{item.name}</h4>
                        <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">{item.description}</p>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                        <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                            ₹{item.price}
                        </span>
                        <button 
                            onClick={() => onAddToCart({ ...item, locationName })} 
                            disabled={isOutOfStock} 
                            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full transition-all duration-300 ${
                                isOutOfStock 
                                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md hover:shadow-lg hover:scale-105'
                            }`}
                        >
                            {isOutOfStock ? 'Out of Stock' : (
                                <>
                                    Add
                                    <Plus className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LocationMenuSection = ({ menuItems, isLoading, onAddToCart, activeLocationId, locations }: { 
    menuItems: MenuItem[], 
    isLoading: boolean, 
    onAddToCart: (item: MenuItem & { locationName: string }) => void,
    activeLocationId: string | null,
    locations: ShopLocation[]
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    
    const filteredByLocation = useMemo(() => {
        if (!activeLocationId) return [];
        return menuItems.filter(item => item.locationId === activeLocationId);
    }, [menuItems, activeLocationId]);

    const categories = useMemo(() => Array.from(new Set(filteredByLocation.map(item => item.category))), [filteredByLocation]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    useEffect(() => {
        if (categories.length > 0 && (!activeCategory || !categories.includes(activeCategory))) {
            setActiveCategory(categories[0]);
        }
    }, [categories, activeCategory, activeLocationId]);

    // Filter by category AND search query
    const filteredItems = useMemo(() => {
        let items = filteredByLocation;
        
        // Filter by category
        if (activeCategory) {
            items = items.filter(item => item.category === activeCategory);
        }
        
        // Filter by search query (name, description, category)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            items = items.filter(item => 
                item.name.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query)
            );
        }
        
        return items;
    }, [filteredByLocation, activeCategory, searchQuery]);
    
    const activeLocationName = locations.find(loc => loc.id === activeLocationId)?.name || 'Loading Menu...';

    return (
        <section className="py-10 bg-gradient-to-br from-orange-50 via-white to-red-50 min-h-screen">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h2 className="text-4xl font-black text-gray-900 mb-2">
                        Menu for: <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">{activeLocationName}</span>
                    </h2>
                    <p className="text-gray-600 text-lg mb-6">Browse our handcrafted menu and order your favorites</p>
                    
                    {/* Search Bar */}
                    <div className="relative max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search menu items, categories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition"
                            >
                                <X className="h-4 w-4 text-gray-500" />
                            </button>
                        )}
                    </div>
                </div>
                {isLoading ? (
                    <div className="text-center py-20">
                        <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
                        <p className="text-gray-600 text-lg">Loading delicious menu...</p>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-3 mb-10 pb-4 border-b-2 border-orange-100">
                            {categories.map(category => (
                                <button 
                                    key={category} 
                                    onClick={() => setActiveCategory(category)} 
                                    className={`px-6 py-3 text-sm font-bold rounded-full transition-all duration-300 ${
                                        activeCategory === category 
                                            ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg scale-105' 
                                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                                    }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            {filteredItems.map((item) => (
                                <MenuItemCard key={item.id} item={item} onAddToCart={onAddToCart} locationName={activeLocationName} />
                            ))}
                        </div>
                        {filteredItems.length === 0 && categories.length > 0 && (
                            <div className="text-center py-16 bg-white rounded-2xl shadow-md">
                                <Search className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                                <p className="text-2xl font-bold text-gray-400 mb-2">
                                    {searchQuery ? 'No items found' : 'No items in this category'}
                                </p>
                                <p className="text-gray-500">
                                    {searchQuery ? 'Try a different search term' : 'Try selecting a different category above'}
                                </p>
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="mt-4 px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-lg hover:shadow-lg transition"
                                    >
                                        Clear Search
                                    </button>
                                )}
                            </div>
                        )}
                        {filteredByLocation.length === 0 && categories.length === 0 && (
                            <div className="text-center py-16 bg-white rounded-2xl shadow-md">
                                <Utensils className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                                <p className="text-2xl font-bold text-gray-700 mb-2">Menu coming soon!</p>
                                <p className="text-gray-500">We're adding delicious items to this location</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

// --- Main Menu Page App ---
const MenuApp = () => {
    const { locations, menuItems, isLoading, error } = useDataFetcher();
    const { cartCount, addToCart, setIsCartOpen } = useCart();
    const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

    // Set initial active location from default locations
    useEffect(() => {
        const setInitialLocation = async () => {
            try {
                if (locations.length > 0 && !activeLocationId) {
                    // Try to get stored location ID from localStorage
                    const storedLocationId = typeof window !== 'undefined' 
                        ? localStorage.getItem('lastSelectedLocation')
                        : null;
                    
                    // Use stored location if it exists in our locations list, otherwise use first location
                    const validLocationId = storedLocationId && locations.some(loc => loc.id === storedLocationId)
                        ? storedLocationId
                        : locations[0].id;
                    
                    setActiveLocationId(validLocationId);
                }
            } catch (error) {
                console.error('Error setting initial location:', error);
                if (locations.length > 0) {
                    setActiveLocationId(locations[0].id);
                }
            }
        };

        setInitialLocation();
    }, [locations, activeLocationId]);

    // Store selected location in localStorage when it changes
    useEffect(() => {
        if (activeLocationId && typeof window !== 'undefined') {
            try {
                localStorage.setItem('lastSelectedLocation', activeLocationId);
            } catch (error) {
                console.error('Error storing location preference:', error);
            }
        }
    }, [activeLocationId]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
                <div className="text-red-600 mb-4">⚠️</div>
                <p className="text-lg text-gray-700 mb-4">Sorry, there was an error loading the menu.</p>
                <p className="text-sm text-gray-500">{error}</p>
                <button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (isLoading || !activeLocationId || locations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
                <Loader2 className="h-10 w-10 animate-spin text-red-700 mb-4" />
                <p className="text-lg text-gray-700">{locations.length === 0 ? 'Loading Locations...' : 'Loading Menu...'}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <MenuHeader 
                locations={locations} 
                activeLocationId={activeLocationId} 
                setActiveLocationId={setActiveLocationId}
                cartCount={cartCount}
                onOpenCart={() => setIsCartOpen(true)}
            />
            <main>
                <div className="text-center py-3 bg-gradient-to-r from-orange-100 via-yellow-100 to-orange-100 text-orange-800 font-semibold text-sm border-b border-orange-200">
                    <div className="flex items-center justify-center gap-2">
                        <Zap className="h-4 w-4" />
                        <span>Free delivery on orders above ₹300 • Now serving Badlapur, Ambernath, Ulhasnagar & Vangani</span>
                    </div>
                </div>
                <LocationMenuSection 
                    menuItems={menuItems} 
                    isLoading={isLoading} 
                    onAddToCart={addToCart} 
                    activeLocationId={activeLocationId}
                    locations={locations}
                />
            </main>
            <footer className="bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 text-white py-8">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500"></div>
                <div className="container mx-auto px-4 text-center relative">
                    <p className="text-sm border-t border-gray-700 pt-4">
                        &copy; {new Date().getFullYear()} <span className="text-orange-400 font-semibold">Snackify</span> Menu. All rights reserved.
                    </p>
                </div>
            </footer>
            <CartModal />
        </div>
    );
};

export default MenuApp;
