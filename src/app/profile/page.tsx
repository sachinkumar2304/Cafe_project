"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MobileHeader } from '@/components/MobileHeader';
import { createClient } from '@/lib/supabase/client';
import { Loader2, User as UserIcon, Gift, Share2, Copy, CheckCircle, History, LogOut, Sparkles } from 'lucide-react';

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
    total_orders?: number;
}

export default function ProfilePage() {
    const supabase = createClient();
    const router = useRouter();
    
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login?redirect_to=/profile');
                return;
            }

            const response = await fetch('/api/profile');
            if (response.ok) {
                const data = await response.json();
                setProfile(data);
            }
            setLoading(false);
        };
        fetchProfile();
    }, [router, supabase.auth]);

    const handleCopyReferralCode = () => {
        if (profile?.referral_code) {
            navigator.clipboard.writeText(profile.referral_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-10 w-10 animate-spin text-red-700" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p>Profile not found</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 py-12 px-4 sm:px-6 lg:px-8">
            <MobileHeader currentPage="profile" showCart={false} />
            
            <div className="max-w-4xl mx-auto pt-20">
                {/* Header */}
                <Link href="/" className="hidden md:flex items-center justify-center space-x-2 mb-8">
                    <img src="/snackify-logo.jpg" alt="Snackify Logo" className="w-10 h-10" />
                    <span className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                        MY PROFILE
                    </span>
                </Link>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Loyalty Points Card */}
                    <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-6 rounded-3xl shadow-2xl text-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Gift className="h-6 w-6" />
                                Loyalty Points
                            </h3>
                            <Sparkles className="h-6 w-6 text-yellow-300" />
                        </div>
                        <div className="text-center py-6">
                            <div className="text-6xl font-black mb-2">{profile.loyalty_points || 0}</div>
                            <p className="text-purple-100 text-sm">Points Available</p>
                            <p className="text-white font-bold text-xl mt-4">
                                Worth ₹{Math.floor((profile.loyalty_points || 0) / 2)}
                            </p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mt-4">
                            <p className="text-sm text-white/90">💡 <span className="font-semibold">Earn 10 points</span> on every order delivery</p>
                            <p className="text-sm text-white/90 mt-1">💰 <span className="font-semibold">2 points = ₹1</span> discount on checkout</p>
                        </div>
                    </div>

                    {/* Referral Card */}
                    <div className="bg-white p-6 rounded-3xl shadow-2xl border-2 border-orange-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Share2 className="h-6 w-6 text-orange-600" />
                                Share & Earn
                            </h3>
                            <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold">
                                +25 Points
                            </div>
                        </div>
                        
                        <p className="text-gray-700 text-sm mb-4">
                            Share your referral code with friends. When they place their first order, you both get 25 points!
                        </p>
                        
                        <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-xl border-2 border-orange-200">
                            <label className="text-xs font-semibold text-gray-600 block mb-2">YOUR REFERRAL CODE</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-white px-4 py-3 rounded-lg font-mono font-bold text-xl text-orange-600 border-2 border-orange-300">
                                    {profile.referral_code || 'Loading...'}
                                </div>
                                <button
                                    onClick={handleCopyReferralCode}
                                    className={`p-3 rounded-lg transition-all ${
                                        copied 
                                            ? 'bg-green-500 text-white' 
                                            : 'bg-orange-600 text-white hover:bg-orange-700'
                                    }`}
                                >
                                    {copied ? <CheckCircle className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
                                </button>
                            </div>
                        </div>
                        
                        <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-xl p-3">
                            <p className="text-sm text-green-700 font-medium text-center">
                                🎁 Both you and your friend get 25 points when they sign up with your code!
                            </p>
                        </div>
                    </div>

                    {/* Profile Info Card */}
                    <div className="bg-white p-6 rounded-3xl shadow-2xl border-2 border-gray-200 md:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <UserIcon className="h-6 w-6 text-orange-600" />
                                Personal Information
                            </h3>
                            <Link 
                                href="/checkout"
                                className="text-orange-600 hover:text-orange-700 font-semibold text-sm transition"
                            >
                                Edit Profile
                            </Link>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 block mb-1">NAME</label>
                                <p className="text-gray-900 font-medium text-lg">{profile.name}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 block mb-1">EMAIL</label>
                                <p className="text-gray-900 font-medium text-lg">{profile.email}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 block mb-1">PHONE</label>
                                <p className="text-gray-900 font-medium text-lg">{profile.phone}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 block mb-1">TOTAL ORDERS</label>
                                <p className="text-gray-900 font-medium text-lg">{profile.total_orders || 0}</p>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-semibold text-gray-500 block mb-1">DELIVERY ADDRESS</label>
                                <p className="text-gray-900 font-medium text-lg">
                                    {profile.address}, {profile.landmark && `${profile.landmark}, `}
                                    {profile.city}, {profile.pincode}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link
                        href="/orders"
                        className="bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-4 px-6 rounded-xl hover:from-orange-700 hover:to-red-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                        <History className="h-5 w-5" />
                        View Order History
                    </Link>
                    
                    <button
                        onClick={handleLogout}
                        className="bg-gray-800 text-white font-bold py-4 px-6 rounded-xl hover:bg-gray-900 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                        <LogOut className="h-5 w-5" />
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
