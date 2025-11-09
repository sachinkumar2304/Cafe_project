"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MobileHeader } from '@/components/MobileHeader';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/context/CartContext';
import { User } from '@supabase/supabase-js';
import { Loader2, User as UserIcon, MapPin, Home, Landmark, Phone, Save, ShoppingBag, CheckCircle, CreditCard, Gift, Sparkles } from 'lucide-react';

// Razorpay TypeScript declaration
declare global {
    interface Window {
        Razorpay: any;
    }
}

interface Profile {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
    landmark: string;
    loyalty_points?: number;
    referral_code?: string;
}

const CheckoutPage = () => {
    const supabase = createClient();
    const router = useRouter();
    const { cart, summary, locationId, locationName, clearCart, cartCount } = useCart();

    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Partial<Profile>>({});
    const [cities, setCities] = useState<string[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [placingOrder, setPlacingOrder] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isAddressSaved, setIsAddressSaved] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
    const [pointsToUse, setPointsToUse] = useState(0);
    const [pointsDiscount, setPointsDiscount] = useState(0);
    const [showPointsInput, setShowPointsInput] = useState(false);

    // Load Razorpay script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login?redirect_to=/checkout');
                return;
            }
            setUser(session.user);

            try {
                        const [citiesRes, profileRes] = await Promise.all([ fetch('/api/cities'), fetch('/api/profile') ]);
                        if (!citiesRes.ok) throw new Error('Failed to load delivery locations.');
                        setCities(await citiesRes.json());

                        if (profileRes.ok) {
                            const profileData = await profileRes.json();
                            setProfile(profileData);

                            // If user has a complete profile already, skip to confirmation
                            if (profileData && profileData.name && profileData.address && profileData.city && profileData.pincode) {
                                setIsAddressSaved(true);
                            }
                        } else {
                            // Profile doesn't exist yet, initialize with email
                            setProfile({ email: session.user.email || '' });
                        }

                    } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : String(err);
                        setError(msg);
                    } finally {
                        setLoading(false);
                    }
        };
        fetchData();
    }, [router, supabase.auth, cartCount]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save profile.');
            
            // If in profile mode (no cart), show success message
            if (cartCount === 0) {
                setSuccessMessage('Profile saved successfully!');
                setTimeout(() => setSuccessMessage(null), 5000);
            } else {
                // If in checkout mode, proceed to order confirmation
                setIsAddressSaved(true);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handlePlaceOrder = async () => {
        console.log('📦 Placing order with payment method:', paymentMethod);
        setPlacingOrder(true);
        setError(null);
        
        try {
            if (paymentMethod === 'online') {
                // Show coming soon message for online payment
                setError('Online Payment Coming Soon! Please use Cash on Delivery for now.');
                setPlacingOrder(false);
                return;
            }

            // Cash on Delivery flow
            const orderResponse = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    cart, 
                    summary, 
                    locationId,
                    pointsUsed: pointsToUse,
                    discountFromPoints: pointsDiscount,
                    paymentMethod: 'cod',
                })
            });

            const orderResult = await orderResponse.json();
            if (!orderResponse.ok) {
                throw new Error(orderResult.error || 'Failed to place order');
            }

            console.log('✅ Order placed successfully (Cash on Delivery)');
            
            // Extract order ID from response - handle both old and new response formats
            const orderId = orderResult.orderId || orderResult.data?.orderId;
            
            if (!orderId) {
                console.error('No order ID in response:', orderResult);
                throw new Error('Order placed but no order ID returned');
            }
            
            console.log('Order ID:', orderId);
            
            // Clear cart and navigate
            clearCart();
            await new Promise(resolve => setTimeout(resolve, 100));
            router.push(`/orders?order_id=${orderId}`);

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('❌ Order placement failed:', msg);
            setError(msg);
        } finally {
            setPlacingOrder(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-10 w-10 animate-spin text-red-700" /></div>;
    }

    // Profile-only mode when cart is empty
    const isProfileMode = cartCount === 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 py-12 px-4 sm:px-6 lg:px-8">
            <MobileHeader currentPage="checkout" showCart={!isProfileMode} />
            
            <div className="max-w-2xl mx-auto pt-20">
                <Link href="/" className="hidden md:flex items-center justify-center space-x-2 mb-8">
                    <img src="/snackify-logo.jpg" alt="Snackify Logo" className="w-10 h-10" />
                    <span className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                        {isProfileMode ? 'MY PROFILE' : 'Snackify Checkout'}
                    </span>
                </Link>
                <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border-2 border-gray-100">
                    {error && (
                        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-xl shadow-sm">
                            <p className="font-medium">Error: {error}</p>
                        </div>
                    )}
                    {successMessage && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-xl shadow-sm">
                            <p className="font-medium">{successMessage}</p>
                        </div>
                    )}

                    {!isAddressSaved || isProfileMode ? (
                        <AddressForm 
                            profile={profile} 
                            cities={cities} 
                            handleInputChange={handleInputChange} 
                            handleSubmit={handleSaveAddress} 
                            saving={saving}
                            isProfileMode={isProfileMode}
                        />
                    ) : (
                        <OrderConfirmation 
                            profile={profile as Profile}
                            handlePlaceOrder={handlePlaceOrder}
                            placingOrder={placingOrder}
                            editAddress={() => setIsAddressSaved(false)}
                            paymentMethod={paymentMethod}
                            setPaymentMethod={setPaymentMethod}
                            pointsToUse={pointsToUse}
                            setPointsToUse={setPointsToUse}
                            pointsDiscount={pointsDiscount}
                            setPointsDiscount={setPointsDiscount}
                            showPointsInput={showPointsInput}
                            setShowPointsInput={setShowPointsInput}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

interface AddressFormProps {
    profile: Partial<Profile>;
    cities: string[];
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleSubmit: (e: React.FormEvent) => void;
    saving: boolean;
    isProfileMode?: boolean;
}

const AddressForm = ({ profile, cities, handleInputChange, handleSubmit, saving, isProfileMode = false }: AddressFormProps) => (
    <>
        <h2 className="text-4xl font-black text-center mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                {isProfileMode ? 'Your Profile' : 'Delivery Details'}
            </span>
        </h2>
        <p className="text-center text-gray-600 mb-8 font-medium">
            {isProfileMode ? 'Update your personal information and delivery address' : 'Please provide your address to proceed'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                        Full Name <span className="text-red-600">*</span>
                    </label>
                    <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-orange-600 transition" />
                        <input 
                            type="text" 
                            name="name" 
                            id="name" 
                            value={profile.name || ''} 
                            onChange={handleInputChange} 
                            required 
                            className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition" 
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number <span className="text-red-600">*</span>
                    </label>
                    <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-orange-600 transition" />
                        <input 
                            type="tel" 
                            name="phone" 
                            id="phone" 
                            value={profile.phone || ''} 
                            onChange={handleInputChange} 
                            pattern="[0-9]{10}" 
                            maxLength={10}
                            placeholder="10-digit mobile number"
                            required 
                            className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition" 
                        />
                    </div>
                </div>
            </div>
            <div>
                <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Address <span className="text-red-600">*</span>
                </label>
                <div className="relative group">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-orange-600 transition" />
                    <input 
                        type="text" 
                        name="address" 
                        id="address" 
                        value={profile.address || ''} 
                        onChange={handleInputChange} 
                        placeholder="House No, Building, Street" 
                        required 
                        className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition" 
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                        City <span className="text-red-600">*</span>
                    </label>
                    <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-orange-600 transition z-10" />
                        <select 
                            name="city" 
                            id="city" 
                            value={profile.city || ''} 
                            onChange={handleInputChange} 
                            required 
                            className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl appearance-none bg-white text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition"
                        >
                            <option value="" disabled>Select your city</option>
                            {cities.map((c:string) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label htmlFor="pincode" className="block text-sm font-semibold text-gray-700 mb-2">
                        Pincode <span className="text-red-600">*</span>
                    </label>
                    <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-orange-600 transition" />
                        <input 
                            type="text" 
                            name="pincode" 
                            id="pincode" 
                            value={profile.pincode || ''} 
                            onChange={handleInputChange} 
                            pattern="[0-9]{6}" 
                            maxLength={6}
                            placeholder="6-digit pincode"
                            required 
                            className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition" 
                        />
                    </div>
                </div>
            </div>
            <div>
                <label htmlFor="landmark" className="block text-sm font-semibold text-gray-700 mb-2">Landmark (Optional)</label>
                <div className="relative group">
                    <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-orange-600 transition" />
                    <input 
                        type="text" 
                        name="landmark" 
                        id="landmark" 
                        value={profile.landmark || ''} 
                        onChange={handleInputChange} 
                        placeholder="Near City Hall" 
                        className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition" 
                    />
                </div>
            </div>
            <button 
                type="submit" 
                disabled={saving} 
                className={`w-full py-4 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center ${
                    saving 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 hover:shadow-xl hover:scale-105'
                }`}
            >
                {saving ? <Loader2 className='w-5 h-5 mr-2 animate-spin' /> : <Save className='w-5 h-5 mr-2' />}
                {isProfileMode ? 'Save Profile' : 'Save and Continue'}
            </button>
        </form>
    </>
);

interface OrderConfirmationProps {
    profile: Profile;
    handlePlaceOrder: () => void;
    placingOrder: boolean;
    editAddress: () => void;
    paymentMethod: 'cod' | 'online';
    setPaymentMethod: (method: 'cod' | 'online') => void;
    pointsToUse: number;
    setPointsToUse: (points: number) => void;
    pointsDiscount: number;
    setPointsDiscount: (discount: number) => void;
    showPointsInput: boolean;
    setShowPointsInput: (show: boolean) => void;
}

const OrderConfirmation = ({ 
    profile, 
    handlePlaceOrder, 
    placingOrder, 
    editAddress, 
    paymentMethod, 
    setPaymentMethod,
    pointsToUse,
    setPointsToUse,
    pointsDiscount,
    setPointsDiscount,
    showPointsInput,
    setShowPointsInput
}: OrderConfirmationProps) => {
    const { cart, summary, locationName } = useCart();
    
    const loyaltyPoints = profile.loyalty_points || 0;
    const maxPointsCanUse = Math.min(loyaltyPoints, Math.floor(summary.subtotal)); // Can't use more points than subtotal
    const maxDiscountFromPoints = Math.floor(maxPointsCanUse / 2); // 2 points = ₹1
    
    const handlePointsChange = (value: number) => {
        const validPoints = Math.max(0, Math.min(value, maxPointsCanUse));
        setPointsToUse(validPoints);
        setPointsDiscount(Math.floor(validPoints / 2));
    };
    
    const finalTotal = Math.max(0, summary.total - pointsDiscount);
    
    return (
        <div>
            <h2 className="text-4xl font-black text-center mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                    Confirm Your Order
                </span>
            </h2>
            <div className="space-y-5">
                <div className="bg-gradient-to-r from-orange-50 to-red-50 p-5 rounded-2xl border-2 border-orange-100">
                    <h3 className="font-bold text-lg mb-3 text-gray-900 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-orange-600" />
                        Delivery Address
                    </h3>
                    <div className="space-y-1 text-gray-800 font-medium">
                        <p>{profile.name}</p>
                        <p>{profile.address}, {profile.landmark}</p>
                        <p>{profile.city}, {profile.pincode}</p>
                        <p>Phone: {profile.phone}</p>
                    </div>
                    <button 
                        onClick={editAddress} 
                        className="text-sm font-semibold text-orange-600 hover:text-red-600 mt-3 transition"
                    >
                        Edit Address
                    </button>
                </div>
                
                <div className="bg-gradient-to-r from-gray-50 to-orange-50 p-5 rounded-2xl border-2 border-gray-200">
                    <h3 className="font-bold text-lg mb-3 text-gray-900 flex items-center gap-2">
                        <Home className="h-5 w-5 text-orange-600" />
                        Order From
                    </h3>
                    <p className="text-gray-800 font-medium">{locationName}</p>
                </div>
                
                <div className="bg-white p-5 rounded-2xl border-2 border-gray-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 text-gray-900 flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-orange-600" />
                        Order Summary
                    </h3>
                    <div className="space-y-2 mb-4">
                        {cart.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-sm py-2 px-3 bg-gray-50 rounded-lg">
                                <span className="font-medium text-gray-800">{item.name} × {item.quantity}</span>
                                <span className="font-bold text-orange-600">₹{item.price * item.quantity}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t-2 border-gray-200 pt-4 space-y-2 font-medium text-gray-900">
                        <div className="flex justify-between text-base">
                            <span>Subtotal</span>
                            <span>₹{summary.subtotal}</span>
                        </div>
                        <div className="flex justify-between text-base">
                            <span>Delivery</span>
                            <span>₹{summary.deliveryCharge}</span>
                        </div>
                        {pointsDiscount > 0 && (
                            <div className="flex justify-between text-base text-green-600">
                                <span className="flex items-center gap-1">
                                    <Sparkles className="h-4 w-4" />
                                    Points Discount ({pointsToUse} points)
                                </span>
                                <span>-₹{pointsDiscount}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-black text-xl pt-2 border-t border-gray-200">
                            <span>Total</span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">₹{finalTotal}</span>
                        </div>
                    </div>
                </div>
                
                {/* Loyalty Points Card */}
                {loyaltyPoints > 0 && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-2xl border-2 border-purple-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                <Gift className="h-5 w-5 text-purple-600" />
                                Loyalty Points
                            </h3>
                            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full font-black text-lg">
                                {loyaltyPoints} Points
                            </div>
                        </div>
                        
                        <div className="bg-white/70 p-4 rounded-xl mb-4">
                            <p className="text-sm text-gray-700 mb-2">
                                💰 You have <span className="font-bold text-purple-600">{loyaltyPoints} points</span> worth ₹{Math.floor(loyaltyPoints / 2)}
                            </p>
                            <p className="text-xs text-gray-600">
                                🎁 2 points = ₹1 discount | Max usable: {maxPointsCanUse} points (₹{maxDiscountFromPoints})
                            </p>
                        </div>
                        
                        {!showPointsInput ? (
                            <button
                                onClick={() => setShowPointsInput(true)}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2"
                            >
                                <Sparkles className="h-5 w-5" />
                                Use Points for Discount
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-semibold text-gray-700">Points to Use:</label>
                                        <span className="text-sm font-bold text-purple-600">
                                            {pointsToUse} points = ₹{pointsDiscount} off
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max={maxPointsCanUse}
                                        step="2"
                                        value={pointsToUse}
                                        onChange={(e) => handlePointsChange(parseInt(e.target.value))}
                                        className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                    />
                                    <div className="flex justify-between mt-2">
                                        <button
                                            onClick={() => handlePointsChange(0)}
                                            className="text-xs text-purple-600 hover:text-purple-800 font-semibold"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            onClick={() => handlePointsChange(maxPointsCanUse)}
                                            className="text-xs text-purple-600 hover:text-purple-800 font-semibold"
                                        >
                                            Use Max
                                        </button>
                                    </div>
                                </div>
                                
                                {pointsDiscount > 0 && (
                                    <div className="bg-green-50 border-2 border-green-200 p-3 rounded-xl">
                                        <p className="text-sm font-bold text-green-700 text-center">
                                            🎉 You'll save ₹{pointsDiscount} on this order!
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                {/* Payment Method Selection */}
                <div className="bg-white p-5 rounded-2xl border-2 border-gray-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 text-gray-900 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-orange-600" />
                        Payment Method
                    </h3>
                    
                    <div className="space-y-3">
                        {/* Cash on Delivery Option */}
                        <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            paymentMethod === 'cod' 
                                ? 'border-green-500 bg-green-50' 
                                : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                        }`}>
                            <input
                                type="radio"
                                name="payment"
                                value="cod"
                                checked={paymentMethod === 'cod'}
                                onChange={() => setPaymentMethod('cod')}
                                className="w-5 h-5 text-green-600 focus:ring-green-500"
                            />
                            <div className="flex-grow">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900">Cash on Delivery</span>
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                        Available
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">Pay with cash when your order arrives</p>
                            </div>
                            <span className="text-2xl">💵</span>
                        </label>

                        {/* Online Payment Option (Coming Soon) */}
                        <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            paymentMethod === 'online' 
                                ? 'border-orange-500 bg-orange-50' 
                                : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                        }`}>
                            <input
                                type="radio"
                                name="payment"
                                value="online"
                                checked={paymentMethod === 'online'}
                                onChange={() => setPaymentMethod('online')}
                                className="w-5 h-5 text-orange-600 focus:ring-orange-500"
                            />
                            <div className="flex-grow">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900">Online Payment</span>
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                                        Coming Soon
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">Pay online via UPI, Cards, Net Banking</p>
                            </div>
                            <span className="text-2xl">💳</span>
                        </label>
                    </div>
                </div>
                
                <button 
                    onClick={handlePlaceOrder} 
                    disabled={placingOrder} 
                    className={`w-full py-4 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center ${
                        placingOrder 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : paymentMethod === 'cod'
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:shadow-xl hover:scale-105'
                                : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 hover:shadow-xl hover:scale-105'
                    }`}
                >
                    {placingOrder ? (
                        <>
                            <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                            Placing Order...
                        </>
                    ) : (
                        <>
                            {paymentMethod === 'cod' ? (
                                <>
                                    <CheckCircle className='w-5 h-5 mr-2' />
                                    Place Order - Pay ₹{finalTotal} on Delivery
                                </>
                            ) : (
                                <>
                                    <CreditCard className='w-5 h-5 mr-2' />
                                    Pay ₹{finalTotal} Online
                                </>
                            )}
                        </>
                    )}
                </button>
                {paymentMethod === 'cod' && (
                    <p className="text-xs text-center text-gray-600 mt-2">
                        💵 Pay with cash when your order is delivered
                    </p>
                )}
                {paymentMethod === 'online' && (
                    <p className="text-xs text-center text-orange-600 mt-2 font-semibold">
                        ⚠️ Online payment feature will be available soon!
                    </p>
                )}
            </div>
        </div>
    );
};

export default CheckoutPage;