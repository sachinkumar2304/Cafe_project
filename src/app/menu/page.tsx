"use client";
/**
 * Menu Page Component: Shows the menu segregated by the selected location.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, Auth, User } from 'firebase/auth';
import { getFirestore, onSnapshot, collection, query, DocumentData, Firestore, addDoc, getDocs, writeBatch, doc, getDoc } from 'firebase/firestore'; 
import { Menu as MenuIcon, X, MapPin, ShoppingCart, Utensils, Zap, Loader2, RefreshCw, Star, ArrowRight, Minus, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Global Constants ---
const DELIVERY_CHARGE = 50;
const FREE_DELIVERY_THRESHOLD = 500; 

// --- Firebase Setup Configuration (Hardcoded for Guaranteed Functionality) ---
// NOTE: Keys are hardcoded here to eliminate all .env.local file reading issues in development.
const firebaseConfig = {
    apiKey: "AIzaSyDFGONbEvdW0m5HmhOYdBmiWDhkJBG6pS8", 
    authDomain: "cafe-project-2025.firebaseapp.com",
    projectId: "cafe-project-2025", 
    storageBucket: "cafe-project-2025.firebasestorage.app",
    messagingSenderId: "84755652433", 
    appId: "1:84755652433:web:b60bc30d406bc48199fd70",
};
const PROJECT_ID = firebaseConfig.projectId || 'default-project-id';

// --- Interfaces and Types (Copied from page.tsx) ---
interface ShopLocation {
    id: string;
    name: string;
    address: string;
    highlights: string;
}

interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    isVeg: boolean;
    isAvailable: boolean;
    imageUrl: string;
    locationId?: string; // Add locationId for filtering
}

interface CartItem extends MenuItem {
    quantity: number;
}

interface CartSummary {
    subtotal: number;
    deliveryCharge: number;
    total: number;
    isFreeDelivery: boolean;
}

// --- Data Fetching and Firebase Logic (Copied and modified for modularity) ---
const useFirebaseSetup = () => {
    const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
    const [db, setDb] = useState<Firestore | null>(null);
    const [auth, setAuth] = useState<Auth | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [isSeedingDone, setIsSeedingDone] = useState(false);

    // 1. Initialize Firebase App
    useEffect(() => {
        if (!getApps().length) {
            try {
                const app = initializeApp(firebaseConfig as any);
                setFirebaseApp(app);
            } catch (error: any) {
                setAuthError(`Initialization Failed: ${error.message}`);
            }
        } else {
            setFirebaseApp(getApp());
        }
    }, []);

    // 2. Setup Services and Authentication Listener
    useEffect(() => {
        if (!firebaseApp || authError) return;

        try {
            const authInstance = getAuth(firebaseApp);
            const dbInstance = getFirestore(firebaseApp);
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, (user) => {
                if (user) {
                    setCurrentUser(user);
                    setIsAuthReady(true);
                } else {
                    signInAnonymously(authInstance)
                        .then((credential) => {
                            setCurrentUser(credential.user);
                            setIsAuthReady(true);
                        })
                        .catch((error: any) => {
                            setAuthError(`Auth Failed: ${error.code}. Anonymous sign-in failed.`);
                            setIsAuthReady(true); 
                        });
                }
            });

            return () => unsubscribe();
        } catch (error: any) {
            setAuthError(`Service Setup Failed: ${error.message}`);
        }
    }, [firebaseApp, authError]);
    
    // NOTE: Seeding logic is removed from the menu page to prevent slow loading.

    return { db, auth, currentUser, isAuthReady, authError, isSeedingDone };
};

const useDataFetcher = () => {
    const [locations, setLocations] = useState<ShopLocation[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Hardcoded locations as fallback
    const fallbackLocations: ShopLocation[] = [
        {
            id: 'loc1',
            name: 'Rameshwaram Dosa Center',
            address: '123 Main Street, Downtown',
            highlights: 'Authentic South Indian Dosa & Idli'
        },
        {
            id: 'loc2', 
            name: 'Vighnaharta Sweet & Snacks Corner',
            address: '456 Food Court, Mall Road',
            highlights: 'Traditional Sweets & Savory Snacks'
        },
        {
            id: 'loc3',
            name: 'Vighnaharta Snacks Corner',
            address: '789 Market Square, Central',
            highlights: 'Fresh Snacks & Quick Bites'
        }
    ];

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Try to fetch locations from PostgreSQL via API
                const locationsResponse = await fetch('/api/locations');
                if (locationsResponse.ok) {
                    const locationsData = await locationsResponse.json();
                    if (locationsData.length > 0) {
                        setLocations(locationsData);
                        console.log('Menu Page: Locations loaded from PostgreSQL:', locationsData.length);
                    } else {
                        // Use fallback locations if database is empty
                        setLocations(fallbackLocations);
                        console.log('Menu Page: Using fallback locations');
                    }
                } else {
                    // Use fallback locations if API fails
                    setLocations(fallbackLocations);
                    console.log('Menu Page: API failed, using fallback locations');
                }

                // Try to fetch menu items from PostgreSQL via API
                const menuResponse = await fetch('/api/menu');
                if (menuResponse.ok) {
                    const menuData = await menuResponse.json();
                    
                    // Map items to ensure they have proper structure
                    const mappedItems = menuData.map((item: any) => ({
                        id: item.id,
                        name: item.name || 'Unnamed Item',
                        description: item.description || '',
                        price: item.price || 0,
                        category: item.category || 'Other',
                        isVeg: item.is_veg !== undefined ? item.is_veg : true,
                        isAvailable: item.is_available !== undefined ? item.is_available : true,
                        imageUrl: item.image_url || 'https://placehold.co/100x100/A0522D/ffffff?text=Food',
                        locationId: item.location_id || 'loc1'
                    }));
                    
                    console.log('Menu Page: Menu items loaded:', mappedItems.length, 'items');
                    console.log('Menu Page: Items by location:', mappedItems.reduce((acc: Record<string, number>, item: MenuItem) => {
                        acc[item.locationId] = (acc[item.locationId] || 0) + 1;
                        return acc;
                    }, {}));
                    
                    setMenuItems(mappedItems.sort((a: MenuItem, b: MenuItem) => a.category.localeCompare(b.category)));
                } else {
                    console.log('Menu Page: No menu items in database');
                    setMenuItems([]);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                // Use fallback locations on error
                setLocations(fallbackLocations);
                setMenuItems([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    return { locations, menuItems, isLoading };
};

const useCart = (menuItems: MenuItem[]) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const addToCart = useCallback((item: MenuItem) => {
        if (!item.isAvailable) return;
        setCart(prevCart => {
            const existingItem = prevCart.find(i => i.id === item.id);
            if (existingItem) {
                return prevCart.map(i =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            } else {
                const currentItem = menuItems.find(i => i.id === item.id);
                if (!currentItem || !currentItem.isAvailable) return prevCart; 

                return [...prevCart, { ...currentItem, quantity: 1 }];
            }
        });
        setIsCartOpen(true);
    }, [menuItems]);

    const updateQuantity = useCallback((itemId: string, change: number) => {
        setCart(prevCart => {
            const updatedCart = prevCart.map(i =>
                i.id === itemId ? { ...i, quantity: i.quantity + change } : i
            ).filter(i => i.quantity > 0);
            return updatedCart;
        });
    }, []);

    const clearCart = useCallback(() => setCart([]), []);

    const summary: CartSummary = useMemo(() => {
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const isFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;
        const deliveryCharge = isFreeDelivery ? 0 : (subtotal > 0 ? DELIVERY_CHARGE : 0);
        const total = subtotal + deliveryCharge;

        return { subtotal, deliveryCharge, total, isFreeDelivery };
    }, [cart]);

    return {
        cart,
        addToCart,
        updateQuantity,
        clearCart,
        summary,
        isCartOpen,
        setIsCartOpen
    };
};

// --- Menu Page Specific Components ---
const MenuHeader = ({ locations, activeLocationId, setActiveLocationId, cartCount, onOpenCart }: {
    locations: ShopLocation[], 
    activeLocationId: string | null, 
    setActiveLocationId: (id: string) => void,
    cartCount: number,
    onOpenCart: () => void
}) => (
    <header className="sticky top-0 z-40 bg-white shadow-md pt-4">
        {/* Main Navigation Bar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <a href="/" className="flex items-center space-x-2">
                <Utensils className="w-6 h-6 text-red-700" />
                <span className="text-xl font-extrabold tracking-wider text-red-900">
                    CAFÉ DELIGHTS
                </span>
            </a>
            <div className="flex items-center space-x-4">
                <a href="/" className="text-lg font-medium text-gray-700 hover:text-red-700 hidden sm:block">Home</a>
                <button
                    onClick={onOpenCart}
                    className="relative p-2 rounded-full bg-red-700 text-white hover:bg-red-800 transition duration-150 shadow-lg"
                    aria-label="View Shopping Cart"
                >
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-orange-400 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                            {cartCount}
                        </span>
                    )}
                </button>
            </div>
        </div>

        {/* Location Tabs (New Navigation) */}
        <div className="bg-red-900 shadow-inner py-3 mt-1">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto space-x-4">
                {locations.map(loc => (
                    <button
                        key={loc.id}
                        onClick={() => setActiveLocationId(loc.id)}
                        className={`px-5 py-2 text-sm font-semibold rounded-full flex-shrink-0 transition-colors duration-200 ${
                            activeLocationId === loc.id
                                ? 'bg-orange-500 text-white shadow-lg'
                                : 'bg-red-800 text-red-200 hover:bg-red-700'
                        }`}
                    >
                        <MapPin className='w-4 h-4 mr-2' />
                        {loc.name}
                    </button>
                ))}
            </div>
        </div>
    </header>
);

const MenuItemCard = ({ item, onAddToCart }: { item: MenuItem, onAddToCart: (item: MenuItem) => void }) => {
    const isOutOfStock = !item.isAvailable;
    const stockClass = isOutOfStock ? 'opacity-50' : 'hover:shadow-xl hover:border-red-300';

    return (
        <div className={`bg-white p-4 rounded-xl shadow-lg flex space-x-4 border-2 border-transparent transition duration-300 ${stockClass}`}>
            <img
                src={item.imageUrl}
                alt={item.name}
                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/A0522D/ffffff?text=Food' }}
            />
            <div className="flex-grow">
                <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-red-900">{item.name}</h4>
                    {item.isVeg && <span className="text-green-600 border border-green-600 px-2 py-0.5 text-xs rounded-full">Veg</span>}
                </div>
                <p className="text-gray-500 text-sm my-1 line-clamp-2">{item.description}</p>
                <div className="flex justify-between items-center mt-2">
                    <span className="text-xl font-extrabold text-orange-600">₹{item.price}</span>
                    <button
                        onClick={() => onAddToCart(item)}
                        disabled={isOutOfStock}
                        className={`px-4 py-2 text-sm font-semibold rounded-full transition duration-300 transform ${
                            isOutOfStock
                                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                : 'bg-red-700 text-white hover:bg-red-800 hover:scale-105'
                        }`}
                    >
                        {isOutOfStock ? 'Out of Stock' : 'Add +'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const LocationMenuSection = ({ menuItems, isLoading, onAddToCart, activeLocationId, locations }: { 
    menuItems: MenuItem[], 
    isLoading: boolean, 
    onAddToCart: (item: MenuItem) => void,
    activeLocationId: string | null,
    locations: ShopLocation[]
}) => {
    // FIX: Filter menu items based on the active location ID
    const filteredByLocation = useMemo(() => {
        if (!activeLocationId) return [];
        
        console.log('Menu Page: Filtering for location:', activeLocationId);
        console.log('Menu Page: Total menu items:', menuItems.length);
        
        const filtered = menuItems.filter(item => {
            console.log(`Menu Item ${item.name} (${item.id}): locationId=${item.locationId}, activeLocation=${activeLocationId}`);
            return item.locationId === activeLocationId;
        });
        
        console.log('Menu Page: Filtered items:', filtered.length);
        return filtered;
    }, [menuItems, activeLocationId]);

    const categories = useMemo(() => {
        const uniqueCategories = Array.from(new Set(filteredByLocation.map(item => item.category)));
        return uniqueCategories;
    }, [filteredByLocation]);

    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    // Set first category as active when data loads
    useEffect(() => {
        if (categories.length > 0 && !activeCategory) {
            setActiveCategory(categories[0]);
        }
        // Reset category if the active location changes and the current category isn't in the new location's menu
        else if (categories.length > 0 && activeCategory && !categories.includes(activeCategory)) {
             setActiveCategory(categories[0]);
        }
    }, [categories, activeCategory, activeLocationId]);

    const filteredItems = useMemo(() => {
        if (!activeCategory) return filteredByLocation;
        return filteredByLocation.filter(item => item.category === activeCategory);
    }, [filteredByLocation, activeCategory]);
    
    const activeLocationName = locations.find(loc => loc.id === activeLocationId)?.name || 'Loading Menu...';


    return (
        <section className="py-10 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-extrabold text-red-700 mb-2">
                    Menu for: <span className="text-red-900">{activeLocationName}</span>
                </h2>
                <p className="text-gray-600 mb-8">
                    Select your category below to explore.
                </p>

                {isLoading ? (
                    <div className="text-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-red-700 mx-auto" />
                        <p className="text-gray-600 mt-4">Fetching menu...</p>
                    </div>
                ) : (
                    <>
                        {/* Category Tabs */}
                        <div className="flex flex-wrap justify-start gap-3 mb-10 border-b pb-4">
                            {categories.map(category => (
                                <button
                                    key={category}
                                    onClick={() => setActiveCategory(category)}
                                    className={`px-5 py-2 text-sm font-semibold rounded-lg transition duration-300 ${
                                        activeCategory === category
                                            ? 'bg-orange-500 text-white shadow-md'
                                            : 'bg-white text-gray-700 border hover:bg-gray-100'
                                    }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>

                        {/* Menu Items Grid */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredItems.map((item, index) => (
                                <MenuItemCard key={`${item.id}-${index}-${activeLocationId}`} item={item} onAddToCart={onAddToCart} />
                            ))}
                        </div>

                        {/* Fallback if menu is empty after category filter */}
                        {filteredItems.length === 0 && categories.length > 0 && (
                            <div className="text-center py-12 text-gray-500">
                                <p className="text-xl font-semibold">No items found in the selected category.</p>
                                <p className="text-md mt-2">Try switching categories or checking back later!</p>
                            </div>
                        )}
                        {/* Fallback if location has no mapped menu items */}
                        {filteredByLocation.length === 0 && categories.length === 0 && (
                             <div className="text-center py-12 text-gray-500">
                                <p className="text-xl font-semibold">Menu coming soon!</p>
                                <p className="text-md mt-2">We're working on adding delicious items to this location.</p>
                                <p className="text-sm mt-1">Check back later or try other locations!</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

const CartModal = ({
    cart,
    summary,
    isOpen,
    onClose,
    updateQuantity,
    clearCart
}: {
    cart: CartItem[],
    summary: CartSummary,
    isOpen: boolean,
    onClose: () => void,
    updateQuantity: (itemId: string, change: number) => void,
    clearCart: () => void
}) => {
    const handleCheckout = () => {
        if (summary.total > 0) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
            alert('Order Placed Successfully! (Payment Gateway Integration Pending)');
            clearCart();
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex justify-end transition-opacity duration-300" onClick={onClose}>
            <div
                className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-in-out"
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Header */}
                <div className="sticky top-0 bg-red-700 text-white p-4 flex justify-between items-center shadow-md">
                    <h2 className="text-2xl font-bold flex items-center">
                        <ShoppingCart className="h-6 w-6 mr-3" />
                        Your Order ({cart.length} items)
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-red-600 rounded-full transition">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="p-4 space-y-4 flex-grow">
                    {cart.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Utensils className="h-10 w-10 mx-auto mb-4" />
                            <p className="text-lg">Your cart is empty. Start adding some delicious items!</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex items-center justify-between border-b pb-4">
                                <div className="flex items-center space-x-3">
                                    <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                                    <div>
                                        <p className="font-semibold text-gray-800">{item.name}</p>
                                        <p className="text-sm text-gray-500">₹{item.price} x {item.quantity}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => updateQuantity(item.id, -1)}
                                        className="p-1 bg-gray-100 rounded-full hover:bg-red-100 text-red-700 transition"
                                        aria-label="Decrease Quantity"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="font-bold w-4 text-center">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.id, 1)}
                                        className="p-1 bg-gray-100 rounded-full hover:bg-red-100 text-red-700 transition"
                                        aria-label="Increase Quantity"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                    {cart.length > 0 && (
                        <button
                            onClick={clearCart}
                            className="w-full text-center text-red-600 hover:text-red-800 mt-4 text-sm font-medium transition"
                        >
                            Clear Cart
                        </button>
                    )}
                </div>

                {/* Summary and Checkout Button */}
                <div className="sticky bottom-0 bg-gray-50 p-4 border-t-2 border-red-100 shadow-inner">
                    <div className="space-y-2 text-gray-700 font-medium">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>₹{summary.subtotal}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Delivery:</span>
                            <span className={summary.isFreeDelivery ? "text-green-600 font-bold" : ""}>
                                {summary.isFreeDelivery ? 'FREE' : `₹${summary.deliveryCharge}`}
                            </span>
                        </div>
                        {summary.isFreeDelivery ? (
                            <p className="text-center text-green-600 text-xs font-semibold pt-1">
                                🎉 Congratulations! Your delivery is FREE (Order over ₹500).
                            </p>
                        ) : (
                            <p className="text-center text-red-500 text-xs pt-1">
                                Order for ₹{(FREE_DELIVERY_THRESHOLD - summary.subtotal).toFixed(2)} more to get FREE Delivery!
                            </p>
                        )}
                        <div className="flex justify-between text-2xl font-extrabold text-red-900 border-t pt-3 mt-3">
                            <span>Total:</span>
                            <span>₹{summary.total}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                        className={`w-full py-4 mt-6 text-xl font-bold text-white rounded-xl transition duration-300 transform hover:scale-[1.01] ${
                            cart.length === 0
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-orange-600 hover:bg-orange-700 shadow-2xl'
                        }`}
                    >
                        Proceed to Checkout
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main Menu Page App ---

const MenuApp = () => {
    // 1. Firebase Setup and Auth (for user session only)
    const { isAuthReady, authError } = useFirebaseSetup();

    // 2. Data Fetching from PostgreSQL via API
    const { locations, menuItems, isLoading } = useDataFetcher();

    // 3. Location State: Default to the first location found
    const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

    useEffect(() => {
        if (locations.length > 0 && !activeLocationId) {
            setActiveLocationId(locations[0].id);
        }
    }, [locations, activeLocationId]);

    // 4. Cart State and Logic
    const { cart, addToCart, updateQuantity, clearCart, summary, isCartOpen, setIsCartOpen } = useCart(menuItems);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Show initial loading screen while auth and data are setting up
    if (authError) {
         return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
                <Loader2 className="h-10 w-10 animate-spin text-red-700 mb-4" />
                <p className="text-lg text-gray-700">Loading Menu Configuration...</p>
                {authError && (
                    <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 max-w-md rounded-lg shadow-md">
                        <p className="font-bold">Authentication Error!</p>
                        <p className="text-sm">Please check your Firebase keys and ensure Anonymous sign-in is enabled.</p>
                        <code className="block mt-2 p-2 bg-red-200 text-xs break-words">{authError}</code>
                    </div>
                )}
            </div>
        );
    }

    if (isLoading || !activeLocationId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
                <Loader2 className="h-10 w-10 animate-spin text-red-700 mb-4" />
                <p className="text-lg text-gray-700">Loading Menu Configuration...</p>
                {authError && (
                    <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 max-w-md rounded-lg shadow-md">
                        <p className="font-bold">Authentication Error!</p>
                        <p className="text-sm">Please check your Firebase keys and ensure Anonymous sign-in is enabled.</p>
                        <code className="block mt-2 p-2 bg-red-200 text-xs break-words">{authError}</code>
                    </div>
                )}
            </div>
        );
    }
    
    // No fallback needed - always show the menu page with empty sections


    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <MenuHeader 
                locations={locations} 
                activeLocationId={activeLocationId} 
                setActiveLocationId={setActiveLocationId}
                cartCount={cartCount}
                onOpenCart={() => setIsCartOpen(true)}
            />

            <main className="pt-32"> {/* Added pt-32 to accommodate the sticky double header */}
                <LocationMenuSection 
                    menuItems={menuItems} 
                    isLoading={isLoading} 
                    onAddToCart={addToCart} 
                    activeLocationId={activeLocationId}
                    locations={locations}
                />
            </main>

            <footer className="bg-red-900 text-white py-8">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm border-t border-red-700 pt-4">
                        &copy; {new Date().getFullYear()} CAFÉ DELIGHTS Menu.
                    </p>
                </div>
            </footer>

            <CartModal
                cart={cart}
                summary={summary}
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                updateQuantity={updateQuantity}
                clearCart={clearCart}
            />
        </div>
    );
};

export default MenuApp;