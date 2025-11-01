"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/context/CartContext';
import { User } from '@supabase/supabase-js';
import { Loader2, User as UserIcon, MapPin, Home, Landmark, Phone, Save, ShoppingBag, CheckCircle } from 'lucide-react';

interface Profile {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
    landmark: string;
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
        setPlacingOrder(true);
        setError(null);
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart, summary, locationId })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to place order.');
            
            clearCart();
            router.push(`/orders?order_id=${result.orderId}`);

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
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
            <div className="max-w-2xl mx-auto">
                <Link href="/" className="flex items-center justify-center space-x-2 mb-8">
                    <img src="/file.svg" alt="Snackify Logo" className="w-10 h-10" />
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
}

const OrderConfirmation = ({ profile, handlePlaceOrder, placingOrder, editAddress }: OrderConfirmationProps) => {
    const { cart, summary, locationName } = useCart();
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
                        <div className="flex justify-between font-black text-xl pt-2 border-t border-gray-200">
                            <span>Total</span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">₹{summary.total}</span>
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={handlePlaceOrder} 
                    disabled={placingOrder} 
                    className={`w-full py-4 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center ${
                        placingOrder 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:shadow-xl hover:scale-105'
                    }`}
                >
                    {placingOrder ? (
                        <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                    ) : (
                        <CheckCircle className='w-5 h-5 mr-2' />
                    )}
                    Place Order & Pay ₹{summary.total}
                </button>
            </div>
        </div>
    );
};

export default CheckoutPage;