"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/context/CartContext';
import { Menu, X, ShoppingCart, User, LogOut, ShoppingBag, Home, UtensilsCrossed } from 'lucide-react';

interface MobileHeaderProps {
    currentPage?: string;
    onOpenCart?: () => void;
    showCart?: boolean;
}

export function MobileHeader({ currentPage = '', onOpenCart, showCart = true }: MobileHeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { user, isAuthReady, signOut } = useAuth();
    const { cartCount } = useCart();
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSignOut = async () => {
        await signOut();
        setIsMenuOpen(false);
        router.push('/');
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 shadow-lg bg-white/95 backdrop-blur-sm border-b border-gray-100">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-2">
                    <img src="/snackify-logo.jpg" alt="Snackify" className="h-10 w-10" />
                    <span className="text-2xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-700">
                        Snackify
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex space-x-6 items-center text-lg font-medium text-gray-700">
                    <Link href="/" className="hover:text-orange-600 transition">Home</Link>
                    <Link href="/menu" className="hover:text-orange-600 transition font-bold">Menu</Link>
                    {!mounted || !isAuthReady ? (
                        // Skeleton loader while auth is checking
                        <>
                            <div className="h-9 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
                            <div className="h-9 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
                        </>
                    ) : user ? (
                        <>
                            <Link href="/profile" className="flex items-center gap-1 hover:text-orange-600 transition">
                                <User className="h-5 w-5" />
                                Profile
                            </Link>
                            <Link href="/orders" className="flex items-center gap-1 hover:text-orange-600 transition">
                                <ShoppingBag className="h-5 w-5" />
                                Orders
                            </Link>
                            <button 
                                onClick={handleSignOut} 
                                className="flex items-center gap-1 px-4 py-2 text-sm bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-lg hover:from-gray-200 hover:to-gray-300 transition shadow-sm"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <Link 
                            href="/login" 
                            className="px-4 py-2 text-sm bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition font-semibold shadow-md"
                        >
                            Sign In
                        </Link>
                    )}
                    {showCart && onOpenCart && (
                        <button 
                            onClick={onOpenCart} 
                            className="relative p-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all" 
                            aria-label="View Cart"
                        >
                            <ShoppingCart className="h-6 w-6" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 bg-yellow-400 text-red-900 text-xs font-bold rounded-full">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    )}
                </nav>

                {/* Mobile Icons */}
                <div className="md:hidden flex items-center space-x-4">
                    {showCart && onOpenCart && (
                        <button 
                            onClick={onOpenCart} 
                            className="relative p-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-full shadow-lg" 
                            aria-label="View Cart"
                        >
                            <ShoppingCart className="h-6 w-6" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 bg-yellow-400 text-red-900 text-xs font-bold rounded-full">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    )}
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)} 
                        className="p-2 text-gray-800 rounded-lg"
                        aria-label="Menu"
                    >
            {/* Mobile Menu Dropdown */}
            {isMenuOpen && (
                <div className="md:hidden bg-white shadow-xl py-2 border-t border-gray-100">
                    <Link 
                        href="/" 
                        onClick={() => setIsMenuOpen(false)}
                        className={`block px-4 py-3 text-gray-900 hover:bg-orange-50 flex items-center gap-2 ${
                            currentPage === 'home' ? 'bg-orange-50 text-orange-600 font-semibold' : ''
                        }`}
                    >
                        <Home className="h-5 w-5" />
                        Home
                    </Link>
                    <Link 
                        href="/menu" 
                        onClick={() => setIsMenuOpen(false)}
                        className={`block px-4 py-3 text-gray-900 hover:bg-orange-50 flex items-center gap-2 ${
                            currentPage === 'menu' ? 'bg-orange-50 text-orange-600 font-semibold' : ''
                        }`}
                    >
                        <UtensilsCrossed className="h-5 w-5" />
                        Menu
                    </Link>
                    
                    {!mounted || !isAuthReady ? (
                        <div className="px-4 py-2">
                            <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                        </div>
                    ) : user ? (
                        <>
                            <Link 
                                href="/orders" 
                                onClick={() => setIsMenuOpen(false)}
                                className={`block px-4 py-3 text-gray-900 hover:bg-orange-50 flex items-center gap-2 ${
                                    currentPage === 'orders' ? 'bg-orange-50 text-orange-600 font-semibold' : ''
                                }`}
                            >
                                <ShoppingBag className="h-5 w-5" />
                                My Orders
                            </Link>
                            <Link 
                                href="/profile" 
                                onClick={() => setIsMenuOpen(false)}
                                className={`block px-4 py-3 text-gray-900 hover:bg-orange-50 flex items-center gap-2 ${
                                    currentPage === 'profile' ? 'bg-orange-50 text-orange-600 font-semibold' : ''
                                }`}
                            >
                                <User className="h-5 w-5" />
                                Profile
                            </Link>
                            <button 
                                onClick={handleSignOut} 
                                className="block w-full text-left px-4 py-3 text-gray-900 hover:bg-red-50 flex items-center gap-2"
                            >
                                <LogOut className="h-5 w-5" />
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <Link 
                            href="/login" 
                            onClick={() => setIsMenuOpen(false)}
                            className="block px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white mx-4 my-2 rounded-lg text-center font-semibold"
                        >
                            Sign In
                        </Link>
                    )}
                </div>
            )}          >
                            Sign In
                        </Link>
                    )}
                </div>
            )}
        </header>
    );
}
