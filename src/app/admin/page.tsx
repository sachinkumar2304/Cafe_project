"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Loader2, CheckCircle, Truck, PackageCheck, XCircle, RefreshCw, ShoppingBag, UserIcon, Plus, X, Check, Utensils, Edit, Trash, Key, Eye, EyeOff } from 'lucide-react';

// --- TYPES ---
interface ShopLocation { id: string; name: string; address: string; highlights: string; }
interface MenuItem { 
    id: string; 
    name: string; 
    description: string; 
    price: number; 
    category: string; 
    is_veg: boolean; 
    is_available: boolean; 
    image_url: string; 
    location_id: string; 
}
interface Profile { name: string; email: string; phone: string; address: string; city: string; pincode: string; landmark: string; }
interface OrderItem {
    id: number;
    quantity: number;
    price: number;
    menu_item: {
        name: string;
        description: string;
        is_veg: boolean;
    };
}

type OrderStatus = 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';

// Note: we avoid typing the Supabase client with a local `Database` type here
// because custom schema typings in this repo were causing conflicts with
// the Supabase JS types. Using the client without a generic keeps things
// simple and avoids TypeScript 'never' errors while still preserving runtime behavior.

interface OrderUpdate {
    status?: OrderStatus;
    otp?: string;
}

interface Order {
    id: number;
    order_number: number;
    created_at: string;
    status: OrderStatus;
    total_amount: number;
    delivery_charge: number;
    otp: string;
    is_cancelled?: boolean;
    cancelled_at?: string;
    payment_method?: string;
    profiles: Profile | null;
    order_items: OrderItem[];
}
const DEFAULT_IMAGE_URL = 'https://placehold.co/150x150/DC2626/ffffff?text=SNACKIFY';

// --- AUTH HOOK ---
const useSupabaseAuth = () => {
    // Use typed client; avoid casting to `any` so linter/typecheck stays strict
    const supabase = useMemo(() => createClient(), []);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);

    const checkAuthAndAdmin = useCallback(async (user: User | null) => {
        console.log('🔍 Checking auth and admin status for user:', user?.id);
        
        if (user) {
            setCurrentUser(user);
            try {
                const { data: adminData, error: adminError } = await supabase
                    .from('admins')
                    .select('id, role')
                    .eq('id', user.id)
                    .maybeSingle();
                
                console.log('👮 Admin check result:', { adminData, adminError });
                
                if (adminError && adminError.code !== 'PGRST116') {
                    console.error('❌ Error checking admin status:', adminError);
                    setIsAdmin(false);
                    setIsAuthReady(true);
                    return;
                }

                setIsAdmin(!!adminData);
                console.log('✅ Admin status set:', !!adminData);

                // Update user metadata if needed
                if (adminData && !user.user_metadata?.isAdmin) {
                    await supabase.auth.updateUser({
                        data: { isAdmin: true }
                    });
                }
            } catch (e) {
                console.error('💥 Error in admin check:', e);
                setIsAdmin(false);
            } finally {
                // ALWAYS set auth ready, even on error
                setIsAuthReady(true);
            }
        } else {
            console.log('❌ No user found');
            setCurrentUser(null);
            setIsAdmin(false);
            setIsAuthReady(true);
        }
    }, [supabase]);

    useEffect(() => {
        console.log('🚀 Initializing admin auth...');
        // Initial session check and auth listener
        let subscriptionHandle: { unsubscribe?: () => void } | undefined;
        let isMounted = true;

        (async () => {
            try {
                const sessionRes = await supabase.auth.getSession();
                console.log('📦 Session result:', sessionRes.data.session?.user?.id || 'No session');
                
                if (isMounted) {
                    await checkAuthAndAdmin(sessionRes.data.session?.user ?? null);
                }

                const sub = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
                    console.log('🔄 Auth state changed:', _event, session?.user?.id || 'No user');
                    if (isMounted) {
                        await checkAuthAndAdmin(session?.user ?? null);
                    }
                });

                subscriptionHandle = sub?.data?.subscription;
            } catch (err) {
                console.error('💥 Auth init error:', err);
                if (isMounted) {
                    // Even on error, set auth as ready to prevent infinite loading
                    setIsAuthReady(true);
                    setCurrentUser(null);
                    setIsAdmin(false);
                }
            }
        })();

        return () => {
            console.log('🧹 Cleaning up auth subscription');
            isMounted = false;
            subscriptionHandle?.unsubscribe?.();
        };
    }, [supabase, checkAuthAndAdmin]);

    const loginAdmin = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const logoutAdmin = async () => {
        await supabase.auth.signOut();
        window.location.href = '/admin';
    };

    return { currentUser, isAdmin, isAuthReady, loginAdmin, logoutAdmin };
};

// --- DATA FETCHERS ---
const useMenuData = (isAuthReady: boolean) => {
    const [locations, setLocations] = useState<ShopLocation[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    useEffect(() => {
        if (!isAuthReady) return;
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [locationsRes, menuRes] = await Promise.all([fetch('/api/locations'), fetch('/api/menu')]);
                if (locationsRes.ok) setLocations(await locationsRes.json());
                if (menuRes.ok) {
                    const menuJson = await menuRes.json() as MenuItem[];
                    setMenuItems(menuJson.sort((a: MenuItem, b: MenuItem) => a.name.localeCompare(b.name)));
                }
            } catch (error) { console.error('Error fetching menu data:', error); } 
            finally { setIsLoading(false); }
        };
        fetchData();
    }, [isAuthReady, refreshTrigger]);
    const refreshData = () => setRefreshTrigger(p => p + 1);
    return { locations, menuItems, isLoading, refreshData };
};

// --- ORDER MANAGER ---
const StatusIndicator = ({ status }: { status: Order['status'] }) => {
    const config = {
        pending: { icon: Loader2, color: 'text-gray-500', label: 'Pending' },
        confirmed: { icon: CheckCircle, color: 'text-blue-500', label: 'Confirmed' },
        out_for_delivery: { icon: Truck, color: 'text-orange-500', label: 'Out for Delivery' },
        delivered: { icon: PackageCheck, color: 'text-green-500', label: 'Delivered' },
        cancelled: { icon: XCircle, color: 'text-red-500', label: 'Cancelled' },
    };
    const { icon: Icon, color, label } = config[status] || config.pending;
    return (
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${color.replace('text', 'bg').replace('-500', '-100')} ${color}`}>
            <Icon className={`h-4 w-4 ${status === 'pending' ? 'animate-spin' : ''}`} />
            <span>{label}</span>
        </div>
    );
};

const OrderManager = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [otpValues, setOtpValues] = useState<Record<number, string>>({});
    const [updatingOrders, setUpdatingOrders] = useState<Set<number>>(new Set()); // Track updating orders
    const supabase = useMemo(() => createClient(), []);

    const fetchOrders = useCallback(async () => {
        console.log('📦 Fetching orders...');
        setIsLoading(true);
        setError(null);
        try {
            const startTime = performance.now();
            
            // Fetch from API instead of direct Supabase call
            const response = await fetch('/api/admin/orders', {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }
            
            const ordersData = await response.json();

            const endTime = performance.now();
            console.log(`✅ Fetched ${ordersData?.length || 0} orders in ${(endTime - startTime).toFixed(0)}ms`);
            
            // Debug: Log cancelled orders
            const cancelledOrders = ordersData.filter((o: Order) => o.status === 'cancelled' || o.is_cancelled);
            if (cancelledOrders.length > 0) {
                console.log('🚫 Cancelled orders:', cancelledOrders.map((o: Order) => `#${o.order_number}`).join(', '));
            }

            setOrders(ordersData || []);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('❌ Error in fetchOrders:', msg);
            setError('Could not load orders. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        
        // Auto-refresh removed - admin will manually refresh
        // const interval = setInterval(() => {
        //     console.log('🔄 Auto-refreshing orders...');
        //     fetchOrders();
        // }, 15000);
        
        // return () => clearInterval(interval);
    }, [fetchOrders]);

    const handleUpdate = async (orderId: number, update: OrderUpdate) => {
        console.log(`🔄 Updating order #${orderId} to status: ${update.status}`);
        
        // Prevent duplicate updates
        if (updatingOrders.has(orderId)) {
            console.warn('⚠️ Order already being updated, please wait...');
            return;
        }
        
        setUpdatingOrders(prev => new Set(prev).add(orderId));
        
        try {
            // 🚀 OPTIMISTIC UPDATE - Update UI immediately for better UX
            setOrders(prevOrders => 
                prevOrders.map(order => 
                    order.id === orderId 
                        ? { ...order, status: update.status || order.status } 
                        : order
                )
            );
            console.log('⚡ UI updated optimistically');

            // Delegate verification and update to the server-side admin API
            const payload = {
                orderId: orderId.toString(),
                status: update.status,
                ...(update.otp ? { otp: update.otp } : {})
            };

            const startTime = performance.now();
            const resp = await fetch('/api/admin/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const respJson = await resp.json();
            const endTime = performance.now();
            console.log(`📡 API response in ${(endTime - startTime).toFixed(0)}ms`);
            
            if (!resp.ok) {
                // ❌ Revert optimistic update on error
                console.warn('⚠️ Update failed, reverting UI...');
                await fetchOrders();
                throw new Error(respJson?.error || 'Failed to update order');
            }

            console.log('✅ Order updated successfully');
            
            // ✅ Success - Show feedback
            if (update.status === 'delivered') {
                alert('Order delivered successfully!');
            }
            
            // Manual refresh only - user can click refresh button
            
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('❌ Error updating order:', msg);
            alert('Failed to update order. Please try again.');
        } finally {
            // Remove from updating set
            setUpdatingOrders(prev => {
                const next = new Set(prev);
                next.delete(orderId);
                return next;
            });
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg mt-6">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-800 to-red-900">Order Management</h2>
                <button onClick={fetchOrders} className="p-2 hover:bg-gray-100 rounded-full"><RefreshCw className="h-5 w-5" /></button>
            </div>
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-red-600" />
                    <span className="ml-3 text-gray-600">Loading orders...</span>
                </div>
            ) : error ? (
                <div className="text-center py-12 bg-red-50 rounded-lg">
                    <XCircle className="mx-auto h-12 w-12 text-red-500" />
                    <p className="mt-2 text-red-600 font-medium">{error}</p>
                    <button 
                        onClick={fetchOrders}
                        className="mt-4 px-4 py-2 bg-gradient-to-r from-amber-700 to-red-800 text-white rounded-lg hover:from-amber-800 hover:to-red-900 hover:scale-105 transition-all font-semibold shadow-md"
                    >
                        Try Again
                    </button>
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-xl font-medium text-gray-900">No Orders Yet</h3>
                    <p className="mt-1 text-gray-500">New orders will appear here as they come in.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => (
                        <div 
                            key={order.id} 
                            className={`border rounded-lg p-4 space-y-4 shadow-sm hover:shadow-md transition-shadow ${
                                order.status === 'cancelled' 
                                    ? 'bg-red-50 border-red-200 opacity-75' 
                                    : 'bg-white'
                            }`}
                        >
                            {/* Header Section */}
                            <div className="flex justify-between items-start border-b pb-3">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-amber-800 to-red-900">Order #{order.order_number}</h3>
                                        <StatusIndicator status={order.status} />
                                        {order.status === 'cancelled' && (
                                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-semibold">
                                                CANCELLED BY CUSTOMER
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-700">{new Date(order.created_at).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-gray-900">₹{order.total_amount}</p>
                                    <p className="text-sm text-gray-700">Delivery: ₹{order.delivery_charge}</p>
                                </div>
                            </div>

                            {/* Customer Details */}
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <UserIcon className="w-5 h-5 text-gray-400 mt-1" />
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{order.profiles?.name || 'N/A'}</h4>
                                        <p className="text-sm text-gray-800">{order.profiles?.phone}</p>
                                        <p className="text-sm text-gray-800">{order.profiles?.email}</p>
                                        <p className="text-sm text-gray-800 mt-1">
                                            {order.profiles?.address}
                                            {order.profiles?.landmark && `, Near ${order.profiles.landmark}`}
                                            <br />
                                            {order.profiles?.city} - {order.profiles?.pincode}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-2">
                                <h4 className="font-semibold text-gray-900">Order Items</h4>
                                <div className="bg-gray-50 rounded-lg divide-y">
                                    {order.order_items?.map(item => (
                                        <div key={item.id} className="p-3 flex justify-between items-center">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-2 h-2 mt-2 rounded-full ${item.menu_item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <div>
                                                    <p className="font-medium text-gray-900">{item.menu_item.name}</p>
                                                    <p className="text-sm text-gray-700">{item.menu_item.description}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-gray-900">₹{item.price * item.quantity}</p>
                                                <p className="text-sm text-gray-700">Qty: {item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-4 pt-3 border-t">
                                {order.status === 'cancelled' ? (
                                    <div className="flex items-center gap-2 text-red-700 bg-red-100 px-4 py-2 rounded-lg">
                                        <XCircle className="h-5 w-5" />
                                        <span className="font-semibold">Order Cannot Be Modified - Cancelled by Customer</span>
                                    </div>
                                ) : order.status === 'delivered' ? (
                                    <div className="flex items-center gap-2 text-green-700 bg-green-100 px-4 py-2 rounded-lg">
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="font-semibold">Order Completed</span>
                                    </div>
                                ) : (
                                    <>
                                        <select 
                                            value={order.status}
                                            onChange={(e) => {
                                                const newStatus = e.target.value as OrderStatus;
                                                handleUpdate(order.id, { status: newStatus });
                                            }}
                                            className="p-2 border rounded-md bg-white text-gray-900 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={updatingOrders.has(order.id)}
                                        >
                                            <option value="confirmed">Confirmed</option>
                                            <option value="out_for_delivery">Out for Delivery</option>
                                            <option value="delivered">Delivered</option>
                                        </select>
                                        {updatingOrders.has(order.id) && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Updating...</span>
                                            </div>
                                        )}
                                        {order.status === 'out_for_delivery' && (
                                            <form onSubmit={(e) => { 
                                                e.preventDefault();
                                                const enteredOtp = otpValues[order.id] || '';
                                                const correctOtp = order.otp;
                                                
                                                // Validate OTP format
                                                if (!enteredOtp || enteredOtp.length !== 6 || !/^\d+$/.test(enteredOtp)) {
                                                    alert('❌ Please enter a valid 6-digit OTP');
                                                    return;
                                                }
                                                
                                                // Validate OTP match
                                                if (enteredOtp !== correctOtp) {
                                                    alert(`❌ Invalid OTP!\n\nEntered: ${enteredOtp}\nCorrect OTP: ${correctOtp}\n\nPlease check with customer and try again.`);
                                                    return;
                                                }
                                                
                                                // OTP verified - proceed with delivery
                                                handleUpdate(order.id, { 
                                                    status: 'delivered',
                                                    otp: enteredOtp 
                                                }); 
                                                // Clear OTP value after submission
                                                setOtpValues(prev => ({ ...prev, [order.id]: '' }));
                                            }} 
                                            className="flex items-center gap-2"
                                            >
                                                <input 
                                                    type="text" 
                                                    placeholder="Enter 6-digit OTP" 
                                                    value={otpValues[order.id] || ''} 
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                                        if (value.length <= 6) {
                                                            setOtpValues(prev => ({ ...prev, [order.id]: value }));
                                                        }
                                                    }}
                                                    className="p-2 border rounded-md w-32 text-sm text-gray-900"
                                                    maxLength={6}
                                                    required
                                                    disabled={updatingOrders.has(order.id)}
                                                />
                                                <button 
                                                    type="submit" 
                                                    className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                    disabled={updatingOrders.has(order.id)}
                                                >
                                                    {updatingOrders.has(order.id) ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Verifying...
                                                        </>
                                                    ) : (
                                                        'Verify & Deliver'
                                                    )}
                                                </button>
                                            </form>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- MENU MANAGER (RESTORED) ---
const MenuManager = ({ locations, menuItems, isLoading, refreshData }: { locations: ShopLocation[], menuItems: MenuItem[], isLoading: boolean, refreshData: () => void }) => {
    const [activeLocation, setActiveLocation] = useState<ShopLocation | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | '' }>({ text: '', type: '' });
    useEffect(() => { if (locations.length > 0 && !activeLocation) { setActiveLocation(locations[0]); } }, [locations, activeLocation]);
    const filteredMenu = useMemo(() => { 
        if (!activeLocation) return []; 
        return menuItems.filter(item => item.location_id === activeLocation.id); 
    }, [menuItems, activeLocation]);
    const handleSaveItem = async (itemData: Omit<MenuItem, 'id'>) => {
        if (!activeLocation) return;
        const itemPayload = { 
            name: itemData.name, 
            description: itemData.description, 
            price: Number(itemData.price), 
            category: itemData.category, 
            is_veg: itemData.is_veg, 
            is_available: itemData.is_available, 
            image_url: itemData.image_url || DEFAULT_IMAGE_URL, 
            location_id: activeLocation.id 
        };
        try {
            const method = editingItem ? 'PUT' : 'POST';
            const body = editingItem ? JSON.stringify({ id: editingItem.id, ...itemPayload }) : JSON.stringify(itemPayload);
            const response = await fetch('/api/menu', { method, headers: { 'Content-Type': 'application/json' }, body });
            if (response.ok) {
                setMessage({ text: `${itemData.name} ${editingItem ? 'updated' : 'added'} successfully!`, type: 'success' });
                refreshData();
                setIsModalOpen(false);
            } else {
                const error = await response.json();
                setMessage({ text: `Error: ${error.error}`, type: 'error' });
            }
        } catch (error) { setMessage({ text: `An unexpected error occurred.`, type: 'error' }); }
    };
    const handleDelete = async (itemId: string, itemName: string) => {
        if (!itemId || !confirm(`Are you sure you want to delete ${itemName}?`)) return;
        try {
            const response = await fetch('/api/menu', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: itemId }) });
            if (response.ok) {
                const result = await response.json();
                // Check if it was a soft delete
                if (result.softDelete) {
                    setMessage({ text: result.message, type: 'success' });
                } else {
                    setMessage({ text: `${itemName} deleted successfully!`, type: 'success' });
                }
                refreshData();
            } else {
                const error = await response.json();
                setMessage({ text: `Error deleting item: ${error.error}`, type: 'error' });
            }
        } catch (error) { setMessage({ text: `An unexpected error occurred.`, type: 'error' }); }
    };
    const handleToggleAvailability = async (itemId: string, itemName: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        const action = newStatus ? 'mark as available' : 'mark as unavailable';
        if (!confirm(`Do you want to ${action} "${itemName}"?`)) return;
        try {
            const response = await fetch('/api/menu', { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ id: itemId, is_available: newStatus }) 
            });
            if (response.ok) {
                setMessage({ text: `${itemName} ${newStatus ? 'is now available' : 'marked as unavailable'}!`, type: 'success' });
                refreshData();
            } else {
                const error = await response.json();
                setMessage({ text: `Error updating item: ${error.error}`, type: 'error' });
            }
        } catch (error) { setMessage({ text: `An unexpected error occurred.`, type: 'error' }); }
    };
    const ItemFormModal = ({ itemToEdit }: { itemToEdit: MenuItem | null }) => {
    const [formData, setFormData] = useState<Omit<MenuItem, 'id'>>({ 
        name: itemToEdit?.name || '', 
        description: itemToEdit?.description || '', 
        price: itemToEdit?.price || 0, 
        category: itemToEdit?.category || '', 
        is_veg: itemToEdit?.is_veg ?? true, 
        is_available: itemToEdit?.is_available ?? true, 
        image_url: itemToEdit?.image_url || '', 
        location_id: activeLocation?.id || '' 
    });
    const [uploading, setUploading] = useState(false);
        const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            const { name, value, type } = e.target;
            const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? Number(value) : value);
            setFormData(prev => ({ ...prev, [name]: finalValue }));
        }, []);
        const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); handleSaveItem(formData); };
        const allCategories = useMemo(() => [...new Set(['Signature Dosas', 'Traditional Dosas', 'Traditional Sweets', 'Savory Snacks', 'Quick Bites', 'Beverages', 'Desserts', 'Main Course', 'Appetizers', 'Other', ...menuItems.map(item => item.category)])].sort(), [menuItems]);
        const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
                const fd = new FormData();
                fd.append('file', file);
                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                const json = await res.json();
                if (res.ok && json.publicUrl) {
                    setFormData(prev => ({ ...prev, image_url: json.publicUrl }));
                } else {
                    console.error('Upload failed', json);
                    alert('Image upload failed. Please try again or provide an image URL.');
                }
            } catch (err) {
                console.error('Upload error', err);
                alert('Image upload failed.');
            } finally {
                setUploading(false);
            }
        };

        return (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center border-b pb-3 mb-4"><h3 className="text-2xl font-bold text-red-700">{itemToEdit ? 'Edit Menu Item' : 'Add New Item'}</h3><button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100"><X className="h-6 w-6 text-gray-500 hover:text-red-500" /></button></div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm text-gray-600">For location: <span className="font-semibold text-red-700">{activeLocation?.name}</span></p>
                        <label className="block"><span className="text-gray-700 font-medium">Item Name:</span><input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 p-2 text-gray-900" /></label>
                        <label className="block"><span className="text-gray-700 font-medium">Description:</span><textarea name="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={4} className="mt-1 block w-full rounded-md border-gray-300 p-2 text-gray-900" placeholder="Short description for the menu item"></textarea></label>
                        <label className="block"><span className="text-gray-700 font-medium">Price (₹):</span><input type="number" name="price" value={formData.price} onChange={handleChange} required min="1" className="mt-1 block w-full rounded-md border-gray-300 p-2 text-gray-900" /></label>
                        <label className="block"><span className="text-gray-700 font-medium">Category:</span><select name="category" value={formData.category} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 p-2 bg-white text-gray-900"><option value="" disabled>Select category</option>{allCategories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select></label>
                        <label className="block"><span className="text-gray-700 font-medium">Image:</span>
                            <div className="mt-1 flex items-center gap-3">
                                <input type="file" accept="image/*" onChange={handleFileChange} className="block" />
                                <input type="text" name="image_url" value={formData.image_url} onChange={handleChange} placeholder="Or paste an image URL" className="mt-1 block w-full rounded-md border-gray-300 p-2 text-gray-900" />
                            </div>
                            {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
                        </label>
                        <div className="flex items-center space-x-6"><label className="flex items-center"><input type="checkbox" name="is_veg" checked={formData.is_veg} onChange={handleChange} className="rounded" /><span className="ml-2">Vegetarian</span></label><label className="flex items-center"><input type="checkbox" name="is_available" checked={formData.is_available} onChange={handleChange} className="rounded" /><span className="ml-2">Available</span></label></div>
                        <button type="submit" className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700"><Check className="w-5 h-5 inline mr-2" />{itemToEdit ? 'Save Changes' : 'Add Item'}</button>
                    </form>
                </div>
            </div>
        );
    };
    return (
        <div className="p-6 bg-white rounded-xl shadow-lg mt-6">
            <div className="flex justify-between items-center border-b pb-4 mb-4"><h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-800 to-red-900">Menu Management</h2><button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="flex items-center bg-gradient-to-r from-amber-700 to-red-800 text-white px-4 py-2 rounded-lg hover:from-amber-800 hover:to-red-900 hover:scale-105 transition-all shadow-md font-semibold"><Plus className="w-5 h-5 mr-1" /> Add New Item</button></div>
            <div className="flex overflow-x-auto space-x-4 mb-6 p-1 border-b">{locations.map(loc => (<button key={loc.id} onClick={() => setActiveLocation(loc)} className={`px-4 py-2 text-sm font-semibold rounded-t-lg ${activeLocation?.id === loc.id ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>{loc.name}</button>))}</div>
            {message.text && (<div className={`p-3 mb-4 rounded-lg font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</div>)}
            <h3 className="text-xl font-semibold mb-6">Items in {activeLocation?.name || '...'} ({filteredMenu.length})</h3>
            {isLoading ? <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-red-700" /></div> : filteredMenu.length === 0 ? <div className="text-center py-20 bg-gray-50 rounded-xl"><Utensils className="h-16 w-16 mx-auto text-gray-400 mb-4" /><h4 className="text-2xl font-bold text-gray-600">No Items Yet</h4><p className="text-gray-500">Start by adding an item to this location.</p></div> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredMenu.map((item) => (<div key={item.id} className={`bg-white rounded-xl shadow-lg border overflow-hidden ${!item.is_available ? 'opacity-60' : ''}`}>{!item.is_available && <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 text-center">OUT OF STOCK</div>}<img src={item.image_url || DEFAULT_IMAGE_URL} alt={item.name} className="w-full h-48 object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/400x300/DC2626/ffffff?text=${encodeURIComponent(item.name)}`; }} /><div className="p-4"><h4 className="text-xl font-bold text-gray-900">{item.name}</h4><p className="text-sm text-gray-500">{item.description}</p><div className="flex justify-between items-center mt-2"><span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-red-800">₹{item.price}</span><div className="flex space-x-2"><button onClick={() => handleToggleAvailability(item.id, item.name, item.is_available)} className={`p-2 rounded-full ${item.is_available ? 'text-green-600 bg-green-100 hover:bg-green-200' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`} title={item.is_available ? 'Mark as unavailable' : 'Mark as available'}>{item.is_available ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}</button><button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200"><Edit className="w-5 h-5" /></button><button onClick={() => handleDelete(item.id, item.name)} className="p-2 text-red-600 bg-red-100 rounded-full hover:bg-red-200"><Trash className="w-5 h-5" /></button></div></div></div></div>))}</div>}
            {isModalOpen && <ItemFormModal itemToEdit={editingItem} />}
        </div>
    );
};

// --- MAIN ADMIN APP ---
const AdminApp = () => {
    const { currentUser, isAdmin, isAuthReady, loginAdmin, logoutAdmin } = useSupabaseAuth();
    const { locations, menuItems, isLoading: isMenuLoading, refreshData } = useMenuData(isAuthReady);
    const [activeTab, setActiveTab] = useState('orders');

    const ensureAdminSetup = async (token: string) => {
        try {
            const response = await fetch('/api/admin/setup', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                console.error('Admin setup failed:', error);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error in admin setup:', error);
            return false;
        }
    };

    const AdminLoginForm = () => {
        const [formData, setFormData] = useState({
            email: '',
            password: ''
        });
        const [error, setError] = useState('');
        const [loading, setLoading] = useState(false);

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        };

        const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            setError('');
            setLoading(true);

            try {
                const supabase = createClient();
                console.log('Attempting admin login...');

                // Try to sign in
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password
                });

                if (signInError) {
                    console.error('Sign in error:', signInError);
                    throw new Error(signInError.message);
                }

                if (!signInData.user) {
                    console.error('No user data after sign in');
                    throw new Error('Authentication failed');
                }

                console.log('Signed in successfully, verifying admin role...');

                // Check admin status
                const { data: adminData, error: adminError } = await supabase
                    .from('admins')
                    .select()
                    .eq('id', signInData.user.id)
                    .single();

                if (adminError) {
                    console.error('Admin setup error:', adminError);
                    await supabase.auth.signOut();
                    throw new Error('Error setting up admin privileges');
                }

                if (!adminData) {
                    console.error('Failed to create admin record');
                    await supabase.auth.signOut();
                    throw new Error('Failed to set up admin privileges');
                }

                console.log('Setting up admin privileges...');

                // Ensure admin is set up in the database
                const setupSuccess = await ensureAdminSetup(signInData.session?.access_token || '');
                
                if (!setupSuccess) {
                    throw new Error('Failed to set up admin privileges');
                }

                console.log('Admin setup complete');

                // Update user metadata with admin status
                const { error: updateError } = await supabase.auth.updateUser({
                    data: { 
                        isAdmin: true,
                        roleName: 'admin'
                    }
                });

                if (updateError) {
                    console.warn('Warning: Failed to update user metadata:', updateError);
                }

                // Small delay to ensure all updates are processed
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Redirect to admin dashboard with cache busting
                window.location.href = '/admin?t=' + Date.now();

            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error('Login process error:', msg);

                setError(msg || 'An error occurred during login');
            } finally {
                setLoading(false);
            }
        };

        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
                        <div className="text-center">
                            <Key className="w-12 h-12 text-red-600 mx-auto" />
                            <h2 className="mt-4 text-3xl font-bold text-gray-900">Admin Login</h2>
                            <p className="mt-2 text-sm text-gray-600">Enter your credentials to access the admin panel</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm text-gray-900 
                                             focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
                                             transition duration-150 ease-in-out"
                                    placeholder="admin@example.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm text-gray-900 
                                             focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
                                             transition duration-150 ease-in-out"
                                    placeholder="••••••••"
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <XCircle className="h-5 w-5 text-red-500" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-red-800">{error}</p>
                                            <p className="text-sm text-red-700 mt-1">
                                                Please make sure you are using the correct admin credentials and that your account has admin privileges.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center items-center px-4 py-3 rounded-lg text-white font-medium
                                          transition duration-150 ease-in-out
                                          ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-amber-700 to-red-800 hover:from-amber-800 hover:to-red-900 hover:scale-105'}`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign in to Dashboard'
                                )}
                            </button>
                        </form>

                        <div className="mt-4 text-center text-sm">
                            <Link href="/" className="text-red-600 hover:text-red-800 font-medium">
                                Return to Homepage
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (!isAuthReady) {
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-10 w-10 animate-spin text-red-700" /></div>;
    }
    
    if (!isAdmin) {
        return <AdminLoginForm />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 font-sans">
            <header className="bg-gradient-to-r from-amber-800 via-red-900 to-red-800 text-white p-4 shadow-xl sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="/snackify-logo.jpg" alt="Snackify" className="h-10 w-10" />
                        <h1 className="text-2xl font-black">Snackify - Admin Panel</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                         <span className="text-sm font-medium">{currentUser?.email || 'Admin'}</span>
                        <Link href="/" className="text-sm font-semibold hover:text-amber-200 transition">Live Site</Link>
                        <button onClick={logoutAdmin} className="text-sm bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-white/30 transition font-semibold">Logout</button>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto p-6">
                <div className="border-b-2 border-amber-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button 
                            onClick={() => setActiveTab('orders')} 
                            className={`whitespace-nowrap py-4 px-1 border-b-4 font-bold text-base transition ${
                                activeTab === 'orders' 
                                    ? 'border-amber-700 text-amber-800' 
                                    : 'border-transparent text-gray-500 hover:text-amber-700 hover:border-amber-400'
                            }`}
                        >
                            Order Management
                        </button>
                        <button 
                            onClick={() => setActiveTab('menu')} 
                            className={`whitespace-nowrap py-4 px-1 border-b-4 font-bold text-base transition ${
                                activeTab === 'menu' 
                                    ? 'border-amber-700 text-amber-800' 
                                    : 'border-transparent text-gray-500 hover:text-amber-700 hover:border-amber-400'
                            }`}
                        >
                            Menu Management
                        </button>
                    </nav>
                </div>
                <div style={{ display: activeTab === 'orders' ? 'block' : 'none' }}><OrderManager /></div>
                <div style={{ display: activeTab === 'menu' ? 'block' : 'none' }}><MenuManager locations={locations} menuItems={menuItems} isLoading={isMenuLoading} refreshData={refreshData} /></div>
            </main>
        </div>
    );
};

export default AdminApp;
