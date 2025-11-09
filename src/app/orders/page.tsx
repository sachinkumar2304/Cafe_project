"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MobileHeader } from '@/components/MobileHeader';
import { createClient } from '@/lib/supabase/client';
import logger from '@/lib/logger';
import { User } from '@supabase/supabase-js';
import { Loader2, ShoppingBag, CheckCircle, Truck, PackageCheck, XCircle, ArrowRight, RefreshCw, Filter, X, Calendar, AlertTriangle, Clock, Award } from 'lucide-react';

// --- TYPES ---
interface OrderItem {
    quantity: number;
    price: number;
    menu_items: {
        name: string;
        image_url: string;
    };
}

interface Order {
    id: number;
    order_number: number;
    created_at: string;
    status: 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';
    total_amount: number;
    otp: string;
    order_items: OrderItem[];
    is_cancelled?: boolean;
    payment_method?: string;
}

// --- HELPER COMPONENTS ---
const StatusIndicator = ({ status }: { status: Order['status'] }) => {
    const statusConfig = {
        pending: { icon: Loader2, color: 'text-gray-500', label: 'Pending', spinning: true },
        confirmed: { icon: CheckCircle, color: 'text-blue-500', label: 'Confirmed', spinning: false },
        out_for_delivery: { icon: Truck, color: 'text-orange-500', label: 'Out for Delivery', spinning: false },
        delivered: { icon: PackageCheck, color: 'text-green-500', label: 'Delivered', spinning: false },
        cancelled: { icon: XCircle, color: 'text-red-500', label: 'Cancelled', spinning: false },
    };

    const { icon: Icon, color, label, spinning } = statusConfig[status] || statusConfig.pending;

    return (
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-opacity-10 ${color.replace('text', 'bg').replace('-500', '-100')} ${color}`}>
            <Icon className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} />
            <span>{label}</span>
        </div>
    );
};

import { useCart } from '@/context/CartContext';

const OrderCard = ({ order, onCancelSuccess }: { order: Order; onCancelSuccess: () => void }) => {
    const [cancelling, setCancelling] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [localStatus, setLocalStatus] = useState<Order['status']>(order.status);
    const [isCancelled, setIsCancelled] = useState(order.is_cancelled || order.status === 'cancelled');
    const { addToCart } = useCart();
    
    // Update local state when order prop changes
    useEffect(() => {
        setLocalStatus(order.status);
        setIsCancelled(order.is_cancelled || order.status === 'cancelled');
    }, [order.status, order.is_cancelled]);
    
    // Calculate if cancel button should be shown (5 min window, COD only, confirmed status)
    useEffect(() => {
        if (localStatus === 'confirmed' && order.payment_method === 'cod' && !isCancelled) {
            const orderTime = new Date(order.created_at).getTime();
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;
            const elapsed = now - orderTime;
            
            if (elapsed < fiveMinutes) {
                const remaining = Math.floor((fiveMinutes - elapsed) / 1000);
                setTimeRemaining(remaining);
                
                const interval = setInterval(() => {
                    const newElapsed = Date.now() - orderTime;
                    if (newElapsed >= fiveMinutes) {
                        setTimeRemaining(null);
                        clearInterval(interval);
                    } else {
                        setTimeRemaining(Math.floor((fiveMinutes - newElapsed) / 1000));
                    }
                }, 1000);
                
                return () => clearInterval(interval);
            }
        }
    }, [order, isCancelled, localStatus]);
    
    const handleCancelOrder = async () => {
        if (!confirm('Are you sure you want to cancel this order?')) return;

        logger.info('🚫 Cancelling order:', order.id, 'Order#', order.order_number);
        setCancelling(true);
        
        try {
            logger.info('📡 Sending cancel request to API...');
            const response = await fetch('/api/orders/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id })
            });
            
            logger.info('📬 API Response status:', response.status);
            
            if (!response.ok) {
                const data = await response.json();
                logger.error('❌ Cancel failed:', data);
                throw new Error(data.error || 'Failed to cancel order');
            }
            
            const result = await response.json();
            logger.info('✅ Cancel success:', result);
            
            alert('Order cancelled successfully!');
            setIsCancelled(true); // Update local state
            setLocalStatus('cancelled'); // Update local status
            setTimeRemaining(null); // Stop timer
            onCancelSuccess(); // Trigger parent refresh
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to cancel order';
            logger.error('💥 Cancel error:', error);
            alert(msg);
        } finally {
            setCancelling(false);
        }
    };
    
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-orange-200 overflow-hidden transition-all duration-300 hover:shadow-xl">
        <div className="p-5 bg-gradient-to-r from-orange-50 to-red-50 border-b-2 border-orange-100 flex justify-between items-center">
            <div>
                <h3 className="font-bold text-xl text-gray-900 mb-1">Order #{order.order_number}</h3>
                <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</p>
            </div>
            <StatusIndicator status={localStatus} />
        </div>
        <div className="p-5 space-y-3 bg-white">
            {order.order_items.map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <img 
                        src={item.menu_items.image_url} 
                        alt={item.menu_items.name} 
                        className="w-16 h-16 rounded-lg object-cover shadow-sm"
                    />
                    <div className="flex-grow">
                        <p className="font-semibold text-gray-900">{item.menu_items.name}</p>
                        <p className="text-sm text-gray-600">{item.quantity} × ₹{item.price}</p>
                    </div>
                    <div className="font-bold text-orange-600">₹{item.price * item.quantity}</div>
                </div>
            ))}
        </div>
        <div className="p-5 bg-gradient-to-r from-gray-50 to-orange-50 border-t-2 border-gray-100">
            <div className="flex justify-between items-center mb-3">
                <div>
                    {!isCancelled && (localStatus === 'confirmed' || localStatus === 'out_for_delivery') && order.otp && (
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300 px-4 py-2 rounded-lg">
                            <span className="text-sm font-semibold text-orange-900">Delivery OTP:</span>
                            <span className="font-mono font-black text-lg text-orange-700">{order.otp}</span>
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                    <p className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">₹{order.total_amount}</p>
                </div>
            </div>
            
            {/* Cancel Button with Countdown */}
            {!isCancelled && timeRemaining !== null && timeRemaining > 0 && (
                <div className="mt-4 space-y-2">
                    <div className="bg-yellow-50 border-2 border-yellow-200 p-3 rounded-lg flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-700" />
                        <span className="text-sm text-yellow-800 font-medium">
                            Cancel window closes in <span className="font-bold">{formatTime(timeRemaining)}</span>
                        </span>
                    </div>
                    <button
                        onClick={handleCancelOrder}
                        disabled={cancelling}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {cancelling ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Cancelling...
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="h-5 w-5" />
                                Cancel Order
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Reorder Button for Delivered Orders (Adds items to cart and redirects to menu) */}
            {localStatus === 'delivered' && !isCancelled && (
                <div className="mt-4">
                    <button
                        onClick={() => {
                            try {
                                // Store minimal seed of item names & quantities
                                const seed = order.order_items.map(oi => ({ name: oi.menu_items.name, qty: oi.quantity }));
                                localStorage.setItem('reorder_seed', JSON.stringify(seed));
                                // Optimistic cart add using available data (price unknown until matched, user will confirm on menu page)
                                alert('Reorder seed saved. Redirecting to Menu to rebuild cart...');
                                window.location.href = '/menu?reorder=1';
                            } catch (e) {
                                logger.error('Failed to set reorder seed', e);
                            }
                        }}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow"
                    >
                        <RefreshCw className="h-5 w-5" />
                        Reorder This
                    </button>
                    <p className="text-xs text-gray-600 mt-2 text-center">We recreate your cart on the Menu page without extra server requests.</p>
                </div>
            )}
        </div>
    </div>
    );
};

// --- MAIN PAGE COMPONENT ---
const OrdersPage = () => {
    const supabase = useMemo(() => createClient(), []); // Memoize to prevent recreation
    const router = useRouter();
    const [showSuccess, setShowSuccess] = useState(false);

    const [user, setUser] = useState<User | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [loadingTimeout, setLoadingTimeout] = useState(false);
    const [pointsToast, setPointsToast] = useState<{ points: number; orderNumber: number } | null>(null);

    // Track which orders we've already notified for points
    const notifiedRef = useMemo(() => {
        if (typeof window === 'undefined') return new Set<number>();
        try {
            const raw = localStorage.getItem('points_notified_orders');
            const arr: number[] = raw ? JSON.parse(raw) : [];
            return new Set<number>(arr);
        } catch {
            return new Set<number>();
        }
    }, []);

    // Filter states
    const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Filter orders
    const filteredOrders = useMemo(() => {
        let filtered = orders;

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(order => order.status === statusFilter);
        }

        // Date filter
        if (dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            filtered = filtered.filter(order => {
                const orderDate = new Date(order.created_at);
                
                if (dateFilter === 'today') {
                    return orderDate >= today;
                } else if (dateFilter === 'week') {
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return orderDate >= weekAgo;
                } else if (dateFilter === 'month') {
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return orderDate >= monthAgo;
                }
                return true;
            });
        }

        return filtered;
    }, [orders, statusFilter, dateFilter]);

    const clearFilters = () => {
        setStatusFilter('all');
        setDateFilter('all');
    };

    const handleManualRefresh = async () => {
        setRefreshing(true);
        await fetchOrders();
        setTimeout(() => setRefreshing(false), 500); // Visual feedback
    };

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.get('order_id')) {
                setShowSuccess(true);
                const timer = setTimeout(() => setShowSuccess(false), 5000);
                return () => clearTimeout(timer);
            }
        } catch (e) {
            // ignore
        }
    }, []);

    const fetchOrders = useCallback(async () => {
        logger.info('📦 Fetching user orders...');
        setError(null); // Clear any previous errors
        try {
            const startTime = performance.now();
            const response = await fetch('/api/orders', {
                cache: 'no-store', // Prevent caching issues
                headers: {
                    'Cache-Control': 'no-cache',
                }
            });
            
            if (!response.ok) {
                // If no orders found or unauthorized, just set empty array
                if (response.status === 404 || response.status === 401) {
                    logger.info('ℹ️ No orders found or unauthorized');
                    setOrders([]);
                    setError(null); // Don't show error for empty state
                    return;
                }
                throw new Error('Failed to fetch orders.');
            }
            
            const data = await response.json();
            const endTime = performance.now();
            logger.info(`✅ Fetched ${data?.length || 0} orders in ${(endTime - startTime).toFixed(0)}ms`);
            
            setOrders(Array.isArray(data) ? data : []);
            setLastUpdated(new Date());
            setError(null); // Clear error on success
        } catch (err: unknown) {
            // Don't show error for empty orders, just log it
            logger.error('❌ Error fetching orders:', err);
            setOrders([]);
            setError(null); // Don't show error to user
        }
    }, []); // Empty dependency - stable function

    // When orders update, detect newly delivered orders and show points earned toast
    useEffect(() => {
        if (!orders || orders.length === 0) return;
        if (typeof window === 'undefined') return;

        // Find first delivered order that hasn't been notified yet
        const newlyDelivered = orders.find(o => o.status === 'delivered' && !notifiedRef.has(o.id));
        if (newlyDelivered) {
            // Backend awards 10 points on delivery (see supabase/loyalty-schema.sql)
            setPointsToast({ points: 10, orderNumber: newlyDelivered.order_number });

            // Persist so we don't double-notify
            try {
                const raw = localStorage.getItem('points_notified_orders');
                const arr: number[] = raw ? JSON.parse(raw) : [];
                if (!arr.includes(newlyDelivered.id)) {
                    arr.push(newlyDelivered.id);
                    localStorage.setItem('points_notified_orders', JSON.stringify(arr));
                }
                notifiedRef.add(newlyDelivered.id);
            } catch {
                // ignore storage errors
            }

            // Auto-hide after 5s
            const t = setTimeout(() => setPointsToast(null), 5000);
            return () => clearTimeout(t);
        }
    }, [orders, notifiedRef]);

    useEffect(() => {
        const initialize = async () => {
            logger.info('🚀 Initializing orders page...');
            setLoading(true);
            
            try {
                // Add timeout to prevent infinite hang
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Session check timeout')), 5000)
                );
                
                const sessionPromise = supabase.auth.getSession();

                const _race = await Promise.race([
                    sessionPromise,
                    timeoutPromise
                ]) as any;

                const session = _race?.data?.session;
                const sessionError = _race?.error;
                
                if (sessionError) {
                    logger.error('❌ Session error:', sessionError);
                    router.push('/login?redirect_to=/orders');
                    return;
                }
                
                if (!session) {
                    logger.info('👤 No session, redirecting to login...');
                    router.push('/login?redirect_to=/orders');
                    return;
                }
                
                logger.info('✅ User authenticated:', session.user.email);
                setUser(session.user);

                // Fetch orders with timeout (no .catch chaining to avoid parser issues)
                const ordersTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Orders fetch timeout')), 8000));
                try {
                    await Promise.race([fetchOrders(), ordersTimeout]);
                } catch (err) {
                    logger.warn('⚠️ Initial fetch timeout, will retry on manual refresh');
                }
                
            } catch (err) {
                logger.error('❌ Initialization error:', err);
                // Don't redirect on timeout - try to recover
                if (err instanceof Error && err.message.includes('timeout')) {
                    logger.warn('⚠️ Timeout occurred, but staying on page');
                    setLoading(false);
                } else {
                    router.push('/login?redirect_to=/orders');
                }
            } finally {
                setLoading(false);
                logger.info('✅ Orders page initialized');
            }
        };

        initialize();
    }, [router]); // Remove supabase.auth and fetchOrders from dependencies

    // Removed auto-polling to respect Supabase free plan limits.
    // Users can refresh manually with the button; also refresh when tab regains focus.
    useEffect(() => {
        if (!user) return;
        const onFocus = () => {
            // refresh once when coming back to the tab
            fetchOrders();
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [user, fetchOrders]);

    if (loading) {
        // Failsafe: Auto-exit loading after 10 seconds
        if (!loadingTimeout) {
            setTimeout(() => {
                logger.warn('⚠️ Loading timeout - force exiting loading state');
                setLoading(false);
                setLoadingTimeout(true);
                setError('Page took too long to load. Please refresh or try again.');
            }, 10000);
        }
        
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-10 w-10 animate-spin text-red-700" /></div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
            <MobileHeader currentPage="orders" showCart={false} />
            
            <div className="pt-20">
                <header className="bg-white shadow-md sticky top-20 z-10 border-b border-gray-100">
                    <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                         <Link href="/" className="hidden md:flex items-center space-x-2">
                            <img src="/snackify-logo.jpg" alt="Snackify Logo" className="w-8 h-8" />
                            <span className="text-xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">Snackify</span>
                        </Link>
                        <Link href="/menu" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition font-semibold shadow-md hover:shadow-lg hover:scale-105">
                            <ArrowRight className="h-4 w-4 rotate-180" />
                            Back to Menu
                        </Link>
                    </div>
                </header>
            </div>

            <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {pointsToast && (
                    <div className="mb-6 rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Award className="h-6 w-6 text-green-600" />
                            <div>
                                <h3 className="font-bold text-green-900">🎉 Congratulations!</h3>
                                <p className="text-green-800 text-sm">
                                    Order #{pointsToast.orderNumber} delivered. You earned <span className="font-bold">{pointsToast.points} points</span>.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-5xl font-black text-gray-900 mb-2">
                            My <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">Orders</span>
                        </h1>
                        <p className="text-lg text-gray-600">Track your delicious deliveries</p>
                        <p className="text-sm text-gray-500 mt-1">Tip: Tap Refresh to update. We conserve requests on the free plan.</p>
                    </div>
                    <button 
                        onClick={handleManualRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 transition shadow-sm hover:shadow-md disabled:opacity-50"
                    >
                        <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                        <span className="font-semibold">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                    {lastUpdated && (
                        <p className="text-xs text-gray-500 mt-2">Last updated: {lastUpdated.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: 'numeric', month: 'short' })}</p>
                    )}
                </div>

                {showSuccess && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-5 mb-8 rounded-xl shadow-md">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                            <div>
                                <h3 className="font-bold text-green-900 text-lg">Order Placed Successfully!</h3>
                                <p className="text-green-700">Track your order status below in real-time.</p>
                            </div>
                        </div>
                    </div>
                )}

                {error && <p className="text-red-500 bg-red-100 p-3 rounded-md text-center">Error: {error}</p>}

                {/* Filters Section */}
                {orders.length > 0 && (
                    <div className="mb-6">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-orange-300 transition-all mb-4"
                        >
                            <Filter className="h-5 w-5 text-orange-600" />
                            <span className="font-semibold text-gray-700">
                                {showFilters ? 'Hide Filters' : 'Show Filters'}
                            </span>
                            {(statusFilter !== 'all' || dateFilter !== 'all') && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-bold rounded-full">
                                    Active
                                </span>
                            )}
                        </button>

                        {showFilters && (
                            <div className="bg-white p-5 rounded-xl border-2 border-gray-200 shadow-sm space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Status Filter */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Filter by Status
                                        </label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value as any)}
                                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition"
                                        >
                                            <option value="all" className="text-gray-900">All Orders</option>
                                            <option value="pending" className="text-gray-900">Pending</option>
                                            <option value="confirmed" className="text-gray-900">Confirmed</option>
                                            <option value="out_for_delivery" className="text-gray-900">Out for Delivery</option>
                                            <option value="delivered" className="text-gray-900">Delivered</option>
                                            <option value="cancelled" className="text-gray-900">Cancelled</option>
                                        </select>
                                    </div>

                                    {/* Date Filter */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Filter by Date
                                        </label>
                                        <select
                                            value={dateFilter}
                                            onChange={(e) => setDateFilter(e.target.value as any)}
                                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition"
                                        >
                                            <option value="all" className="text-gray-900">All Time</option>
                                            <option value="today" className="text-gray-900">Today</option>
                                            <option value="week" className="text-gray-900">Last 7 Days</option>
                                            <option value="month" className="text-gray-900">Last 30 Days</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Active Filters & Clear Button */}
                                {(statusFilter !== 'all' || dateFilter !== 'all') && (
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                        <div className="flex flex-wrap gap-2">
                                            {statusFilter !== 'all' && (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                                                    Status: {statusFilter.replace('_', ' ')}
                                                    <button onClick={() => setStatusFilter('all')} className="hover:bg-orange-200 rounded-full p-0.5">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            )}
                                            {dateFilter !== 'all' && (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                                    <Calendar className="h-3 w-3" />
                                                    {dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'Last 7 days' : 'Last 30 days'}
                                                    <button onClick={() => setDateFilter('all')} className="hover:bg-blue-200 rounded-full p-0.5">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={clearFilters}
                                            className="text-sm font-semibold text-red-600 hover:text-red-700 hover:underline transition"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                )}

                                <p className="text-sm text-gray-500">
                                    Showing <span className="font-bold text-orange-600">{filteredOrders.length}</span> of <span className="font-bold">{orders.length}</span> orders
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {filteredOrders.length === 0 && orders.length > 0 && (
                    <div className="text-center py-12 bg-white rounded-2xl shadow-md border-2 border-gray-100">
                        <Filter className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <h3 className="text-xl font-bold text-gray-700 mb-2">No orders match your filters</h3>
                        <p className="text-gray-500 mb-4">Try adjusting your filter criteria</p>
                        <button
                            onClick={clearFilters}
                            className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-lg hover:shadow-lg transition"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}

                {orders.length === 0 && !loading && (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-lg border-2 border-dashed border-gray-200">
                        <ShoppingBag className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-2xl font-bold text-gray-700 mb-2">No orders yet</h3>
                        <p className="text-gray-500 mb-6">You haven&apos;t placed any orders with us. Let&apos;s change that!</p>
                        <Link href="/menu" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all font-semibold">
                            Start Ordering
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                    </div>
                )}

                <div className="space-y-6">
                    {filteredOrders.map(order => <OrderCard key={order.id} order={order} onCancelSuccess={handleManualRefresh} />)}
                </div>
            </main>
        </div>
    );
};

export default OrdersPage;