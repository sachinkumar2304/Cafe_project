"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Loader2, ShoppingBag, CheckCircle, Truck, PackageCheck, XCircle, ArrowRight } from 'lucide-react';

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

const OrderCard = ({ order }: { order: Order }) => (
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
            <StatusIndicator status={order.status} />
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
        <div className="p-5 bg-gradient-to-r from-gray-50 to-orange-50 border-t-2 border-gray-100 flex justify-between items-center">
            <div>
                {(order.status === 'confirmed' || order.status === 'out_for_delivery') && order.otp && (
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
    </div>
);

// --- MAIN PAGE COMPONENT ---
const OrdersPage = () => {
    const supabase = createClient();
    const router = useRouter();
    const [showSuccess, setShowSuccess] = useState(false);

    const [user, setUser] = useState<User | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
        setError(null); // Clear any previous errors
        try {
            const response = await fetch('/api/orders');
            if (!response.ok) {
                // If no orders found or unauthorized, just set empty array
                if (response.status === 404 || response.status === 401) {
                    setOrders([]);
                    setError(null); // Don't show error for empty state
                    return;
                }
                throw new Error('Failed to fetch orders.');
            }
            const data = await response.json();
            setOrders(Array.isArray(data) ? data : []);
            setError(null); // Clear error on success
        } catch (err: unknown) {
            // Don't show error for empty orders, just log it
            console.error('Error fetching orders:', err);
            setOrders([]);
            setError(null); // Don't show error to user
        }
    }, []);

    useEffect(() => {
        const initialize = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login?redirect_to=/orders');
                return;
            }
            setUser(session.user);
            await fetchOrders();
            setLoading(false);
        };

        initialize();
    }, [router, supabase.auth, fetchOrders]);

    // REAL-TIME SUBSCRIPTION
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('public:orders')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log('Order change received!', payload);
                    // Refetch all orders when a change occurs
                    fetchOrders();
                }
            )
            .subscribe();

        // Cleanup subscription on component unmount
        return () => {
            supabase.removeChannel(channel);
        };

    }, [user, supabase, fetchOrders]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-10 w-10 animate-spin text-red-700" /></div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
            <header className="bg-white shadow-md sticky top-0 z-10 border-b border-gray-100">
                <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                     <Link href="/" className="flex items-center space-x-2">
                        <img src="/file.svg" alt="Snackify Logo" className="w-8 h-8" />
                        <span className="text-xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">Snackify</span>
                    </Link>
                    <Link href="/menu" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition font-semibold shadow-md hover:shadow-lg hover:scale-105">
                        <ArrowRight className="h-4 w-4 rotate-180" />
                        Back to Menu
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-5xl font-black text-gray-900 mb-2">
                        My <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">Orders</span>
                    </h1>
                    <p className="text-lg text-gray-600">Track your delicious deliveries</p>
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
                    {orders.map(order => <OrderCard key={order.id} order={order} />)}
                </div>
            </main>
        </div>
    );
};

export default OrdersPage;