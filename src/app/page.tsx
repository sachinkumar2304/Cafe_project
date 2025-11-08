"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { CartModal } from '@/components/CartModal'; // Import shared component
import { useAuth } from '@/hooks/useAuth';
import { Menu, X, MapPin, ShoppingCart, Utensils, Zap, Loader2, Star, ArrowRight, User, LogOut, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';

// --- Interfaces and Types ---
interface ShopLocation { id: string; name: string; address: string; highlights: string; }

// --- Data Fetcher Hook ---
const useDataFetcher = () => {
    const [locations, setLocations] = useState<ShopLocation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const locationsResponse = await fetch('/api/locations');
                if (locationsResponse.ok) setLocations(await locationsResponse.json());
                else console.error('Homepage: API failed to fetch locations');
            } catch (error) {
                console.error('Error fetching data:', error);
                setLocations([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    return { locations, isLoading };
};

// --- UI Components ---
const Header = ({ onOpenCart, cartCount }: { onOpenCart: () => void, cartCount: number }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { user, isAuthReady, signOut } = useAuth();
    const router = useRouter();

    // Fix hydration issue - only render auth UI after mount
    useEffect(() => {
        setMounted(true);
        console.log('🎯 Header mounted - Auth ready:', isAuthReady, 'User:', user ? 'Logged in' : 'Guest');
    }, []);

    // Debug auth state changes
    useEffect(() => {
        if (mounted && isAuthReady) {
            console.log('🔐 Auth state updated - User:', user?.email || 'Not logged in');
        }
    }, [mounted, isAuthReady, user]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 shadow-lg bg-white/95 backdrop-blur-sm border-b border-gray-100">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <Link href="/" className="flex items-center space-x-2">
                    <img src="/snackify-logo.jpg" alt="Snackify" className="h-10 w-10" />
                    <span className={`text-2xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-700`}>Snackify</span>
                </Link>
                <nav className="hidden md:flex space-x-6 items-center text-lg font-medium text-gray-700">
                    <a href="#home" className="hover:text-orange-600 transition">Home</a>
                    <a href="#locations" className="hover:text-orange-600 transition">Locations</a>
                    <Link href="/menu" className="hover:text-orange-600 transition font-bold">Menu</Link>
                    {mounted && isAuthReady && (
                        user ? (
                            <>
                                <Link href="/profile" className="flex items-center gap-1 hover:text-orange-600 transition">
                                    <User className="h-5 w-5" />
                                    Profile
                                </Link>
                                <Link href="/orders" className="flex items-center gap-1 hover:text-orange-600 transition">
                                    <ShoppingBag className="h-5 w-5" />
                                    Orders
                                </Link>
                                <button onClick={handleSignOut} className="flex items-center gap-1 px-4 py-2 text-sm bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-lg hover:from-gray-200 hover:to-gray-300 transition shadow-sm">
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="px-4 py-2 text-sm bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition font-semibold shadow-md">
                                    Sign In
                                </Link>
                            </>
                        )
                    )}
                    <button onClick={onOpenCart} className="relative p-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all" aria-label="View Cart">
                        <ShoppingCart className="h-6 w-6" />
                        {cartCount > 0 && <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 bg-yellow-400 text-red-900 text-xs font-bold rounded-full">{cartCount}</span>}
                    </button>
                </nav>
                <div className="md:hidden flex items-center space-x-4">
                    <button onClick={onOpenCart} className="relative p-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-full shadow-lg" aria-label="View Cart">
                        <ShoppingCart className="h-6 w-6" />
                        {cartCount > 0 && <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 bg-yellow-400 text-red-900 text-xs font-bold rounded-full">{cartCount}</span>}
                    </button>
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-800 rounded-lg">{isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
                </div>
            </div>
            {isMenuOpen && (
                <div className="md:hidden bg-white shadow-xl py-2">
                    <a href="#home" className="block px-4 py-2 text-gray-900 hover:bg-gray-100">Home</a>
                    <a href="#locations" className="block px-4 py-2 text-gray-900 hover:bg-gray-100">Locations</a>
                    <Link href="/menu" className="block px-4 py-2 font-bold text-gray-900 hover:bg-gray-100">Menu</Link>
                    {mounted && isAuthReady && (
                        user ? (
                            <>
                                <Link href="/orders" className="block px-4 py-2 text-gray-900 hover:bg-gray-100">My Orders</Link>
                                <Link href="/checkout" className="block px-4 py-2 text-gray-900 hover:bg-gray-100">Profile</Link>
                                <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 text-gray-900 hover:bg-gray-100">Sign Out</button>
                            </>
                        ) : (
                            <Link href="/login" className="block px-4 py-2 bg-red-700 text-white mx-4 my-2 rounded-lg text-center">Sign In</Link>
                        )
                    )}
                </div>
            )}
        </header>
    );
};

const HeroSection = () => (
    <section id="home" className="relative pt-32 pb-24 bg-gradient-to-br from-orange-50 via-white to-red-50 overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute -left-40 -top-24 w-[420px] h-[420px] bg-gradient-to-br from-orange-300 to-orange-200 rounded-full opacity-20 blur-3xl animate-float" />
        <div className="absolute right-[-120px] top-8 w-[360px] h-[360px] bg-gradient-to-br from-red-300 to-pink-200 rounded-full opacity-20 blur-3xl animate-float animation-delay-2000" />
        <div className="absolute bottom-0 left-1/2 w-[500px] h-[500px] bg-gradient-to-t from-yellow-200 to-transparent rounded-full opacity-10 blur-2xl" />
        
        <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-orange-200 rounded-full px-5 py-2 mb-8 shadow-lg">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                    <span className="text-sm font-semibold text-gray-700">Now delivering in Badlapur, Ambernath, Ulhasnagar & Vangani</span>
                </div>
                
                {/* Main Heading */}
                <h1 className="text-6xl md:text-7xl font-black leading-tight mb-6">
                    <span className="block text-gray-900">Cravings met.</span>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-red-600 to-pink-600">
                        Delivered fresh.
                    </span>
                </h1>
                
                {/* Subheading */}
                <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
                    Hand-crafted <span className="font-semibold text-orange-600">dosas</span>, 
                    <span className="font-semibold text-red-600"> sweets</span> and 
                    <span className="font-semibold text-pink-600"> snacks</span> from our neighbourhood kitchens — 
                    made fresh daily, delivered hot to your doorstep.
                </p>
                
                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                    <Link href="/menu" className="group relative inline-flex items-center gap-3 px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-orange-600 to-red-600 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-300 overflow-hidden">
                        <span className="absolute inset-0 bg-gradient-to-r from-orange-700 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                        <span className="relative">Order Now</span>
                        <ArrowRight className="relative h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <a href="#locations" className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-full hover:border-orange-300 hover:bg-orange-50 transition-all duration-300 shadow-md">
                        <MapPin className="h-5 w-5" />
                        View Locations
                    </a>
                </div>
                
                {/* Stats/Trust Indicators */}
                <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-8 border-t border-gray-200">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600 mb-1">500+</div>
                        <div className="text-sm text-gray-600">Orders Delivered</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-red-600 mb-1">30min</div>
                        <div className="text-sm text-gray-600">Avg. Delivery</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-pink-600 mb-1">4.8★</div>
                        <div className="text-sm text-gray-600">Customer Rating</div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

const CategoryCarousel = () => {
    const [scrollPosition, setScrollPosition] = useState(0);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    const categories = [
        { name: 'Dosa', image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&q=80', popular: true },
        { name: 'Idli', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&q=80', popular: true },
        { name: 'Vada', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&q=80', popular: false },
        { name: 'Sweets', image: 'https://images.unsplash.com/photo-1601000938259-9e92002320b2?w=400&q=80', popular: true },
        { name: 'Samosa', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80', popular: true },
        { name: 'Pakora', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&q=80', popular: false },
        { name: 'Chaat', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&q=80', popular: false },
        { name: 'Uttapam', image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&q=80', popular: false },
    ];

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300;
            const newPosition = direction === 'left' 
                ? scrollPosition - scrollAmount 
                : scrollPosition + scrollAmount;
            
            scrollContainerRef.current.scrollTo({
                left: newPosition,
                behavior: 'smooth'
            });
            setScrollPosition(newPosition);
        }
    };

    return (
        <section className="py-16 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            
            <div className="container mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
                            What's on your <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">mind?</span>
                        </h2>
                        <p className="text-gray-600 font-medium">Browse our popular categories</p>
                    </div>
                    
                    {/* Navigation Arrows - Desktop */}
                    <div className="hidden md:flex gap-2">
                        <button
                            onClick={() => scroll('left')}
                            className="p-3 bg-white border-2 border-gray-200 rounded-full hover:border-orange-400 hover:bg-orange-50 transition-all shadow-md hover:shadow-lg"
                            aria-label="Scroll left"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-700" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="p-3 bg-white border-2 border-gray-200 rounded-full hover:border-orange-400 hover:bg-orange-50 transition-all shadow-md hover:shadow-lg"
                            aria-label="Scroll right"
                        >
                            <ChevronRight className="h-5 w-5 text-gray-700" />
                        </button>
                    </div>
                </div>

                {/* Category Cards */}
                <div 
                    ref={scrollContainerRef}
                    className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {categories.map((category, index) => (
                        <Link
                            key={index}
                            href="/menu"
                            className="group flex-shrink-0 relative"
                        >
                            <div className="relative w-36 h-36 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                                {/* Image */}
                                <img
                                    src={category.image}
                                    alt={category.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    loading="lazy"
                                />
                                
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                                
                                {/* Label */}
                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                    <h3 className="text-white font-bold text-lg text-center">{category.name}</h3>
                                </div>
                                
                                {/* Popular Badge */}
                                {category.popular && (
                                    <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                                        Popular
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
                
                {/* Scroll Hint - Mobile */}
                <p className="text-center text-sm text-gray-500 mt-4 md:hidden">
                    👉 Swipe to see more categories
                </p>
            </div>
        </section>
    );
};

const LocationCard = ({ location, index }: { location: ShopLocation, index: number }) => {
    const getLocationImage = (locationName: string) => {
        // High-quality food images with better fallbacks
        if (locationName.includes('Rameshwaram')) {
            return 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=800&q=80'; // Dosa image
        }
        if (locationName.includes('Vighnaharta Sweet')) {
            return 'https://images.unsplash.com/photo-1601000938259-9e92002320b2?w=800&q=80'; // Indian sweets
        }
        if (locationName.includes('Vighnaharta Snacks')) {
            return 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80'; // Indian snacks
        }
        // Default food image
        return 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80';
    };

    const getLocationDescription = (locationName: string) => {
        if (locationName.includes('Rameshwaram')) return 'Famous for slow-fermented dosas and artisanal chutneys — a local favourite for breakfast and late-night cravings.';
        if (locationName.includes('Vighnaharta Sweet')) return 'A traditional sweets counter with age-old recipes. Perfect for festivals and sweet-tooth moments.';
        if (locationName.includes('Vighnaharta Snacks')) return 'Quick bites and savoury snacks prepared fresh — ideal for office lunches and on-the-go meals.';
        return 'A neighbourhood outlet serving freshly prepared, comforting South-Indian snacks made to order.';
    };
    return (
        <div className="group bg-white rounded-3xl shadow-lg border border-gray-100 hover:shadow-2xl hover:border-orange-200 transition-all duration-500 transform hover:-translate-y-2 overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: `${index * 150}ms` }}>
            {/* Image Container */}
            <div className="relative h-64 w-full overflow-hidden bg-gradient-to-br from-orange-100 to-red-100">
                <img 
                    src={getLocationImage(location.name)} 
                    alt={location.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    loading="lazy"
                    onError={(e) => { 
                        const img = e.target as HTMLImageElement;
                        if (!img.src.includes('placeholder')) {
                            img.src = 'https://placehold.co/800x600/fb923c/ffffff?text=' + encodeURIComponent(location.name);
                        }
                    }} 
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            
            {/* Content */}
            <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                        <MapPin className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">{location.name}</h3>
                        <p className="text-gray-600 text-sm">{location.address}</p>
                    </div>
                </div>
                
                {/* Description */}
                <p className="text-gray-700 mb-4 leading-relaxed">
                    {getLocationDescription(location.name)}
                </p>
                
                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center text-orange-600 font-semibold text-sm">
                        <Star className="h-5 w-5 fill-orange-500 mr-2" />
                        {location.highlights}
                    </div>
                    <Link 
                        href="/menu" 
                        className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700 group/link"
                    >
                        View Menu
                        <ArrowRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

const LocationsSection = ({ locations, isLoading }: { locations: ShopLocation[], isLoading: boolean }) => (
    <section id="locations" className="py-24 bg-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
        
        <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
                <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-4">
                    Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">Locations</span>
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                    Choose your nearest outlet and explore our handcrafted menu — each location brings its own specialty.
                </p>
            </div>
            
            {isLoading && locations.length === 0 ? (
                <div className="text-center py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">Loading our locations...</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {locations.map((loc, index) => (<LocationCard key={loc.id} location={loc} index={index} />))}
                </div>
            )}
        </div>
    </section>
);

// --- Main App Component ---
const App = () => {
    const { locations, isLoading } = useDataFetcher();
    const { cartCount, setIsCartOpen } = useCart();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 p-6">
                <div className="text-center">
                    <img src="/snackify-logo.jpg" alt="Snackify" className="h-20 w-20 mx-auto mb-4 animate-bounce" />
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 mb-4">
                        Snackify
                    </h1>
                    <Loader2 className="h-8 w-8 animate-spin text-orange-600 mx-auto mb-3" />
                    <p className="text-lg text-gray-700 font-medium">Loading delicious food...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <Header onOpenCart={() => setIsCartOpen(true)} cartCount={cartCount} /> 
            <main className="pt-16">
                <HeroSection />
                <CategoryCarousel />
                <LocationsSection locations={locations} isLoading={isLoading && locations.length === 0} />
            </main>
            <footer className="bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 text-white py-12 relative overflow-hidden">
                {/* Decorative gradient line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500"></div>
                
                <div className="container mx-auto px-4 relative z-10">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        {/* Brand */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <img src="/snackify-logo.jpg" alt="Snackify" className="h-8 w-8" />
                                <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">Snackify</span>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Authentic South Indian flavors delivered fresh to your doorstep. Made with love, served with care.
                            </p>
                        </div>
                        
                        {/* Quick Links */}
                        <div>
                            <h4 className="text-white font-bold mb-4">Quick Links</h4>
                            <div className="flex flex-col space-y-2">
                                <a href="#home" className="text-gray-400 hover:text-orange-400 transition text-sm">Home</a>
                                <a href="#locations" className="text-gray-400 hover:text-orange-400 transition text-sm">Locations</a>
                                <Link href="/menu" className="text-gray-400 hover:text-orange-400 transition font-semibold text-sm">Menu</Link>
                                <Link href="/orders" className="text-gray-400 hover:text-orange-400 transition text-sm">My Orders</Link>
                            </div>
                        </div>
                        
                        {/* Contact Section */}
                        <div>
                            <h4 className="text-white font-bold mb-4">Contact</h4>
                            <div className="flex flex-col space-y-3">
                                <a 
                                    href="tel:+918308990205" 
                                    className="text-gray-400 hover:text-orange-400 transition text-sm flex items-center gap-2 group"
                                >
                                    <span className="bg-orange-500/10 p-2 rounded-lg group-hover:bg-orange-500/20 transition">📞</span>
                                    <span>+91 83089 90205</span>
                                </a>
                                <p className="text-gray-500 text-xs mt-2">Available 9 AM - 9 PM</p>
                            </div>
                        </div>
                        
                        {/* Delivery Info */}
                        <div>
                            <h4 className="text-white font-bold mb-4">Delivery Areas</h4>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Currently serving Badlapur, Ambernath, Ulhasnagar, and Vangani with contactless delivery.
                            </p>
                            <div className="mt-4 inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                                <Zap className="h-4 w-4 text-orange-400" />
                                <span className="text-sm text-orange-300 font-medium">30-min delivery</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Bottom Bar */}
                    <div className="border-t border-gray-700 pt-6 text-center">
                        <p className="text-sm text-gray-400">
                            &copy; {new Date().getFullYear()} <span className="text-orange-400 font-semibold">Snackify</span>. All rights reserved.
                        </p>
                        <p className="text-xs text-gray-500 mt-3">Built with Next.js & Supabase — Scalable, Fast & Secure</p>
                        
                        {/* Developer Credit */}
                        <div className="mt-4 pt-4 border-t border-gray-800">
                            <a 
                                href="https://www.linkedin.com/in/sachin-kumar-607a73345?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-gray-500 hover:text-orange-400 transition-all group"
                            >
                                <span className="text-xs">Developed by</span>
                                <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold group-hover:scale-105 transition-transform shadow-lg">
                                    Sachin Kumar
                                </span>
                                <svg className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
            <CartModal />
        </div>
    );
};

export default App;