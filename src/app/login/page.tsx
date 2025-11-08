"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
// Prevent Next from attempting to prerender this client-only page which uses
// client-side navigation hooks (useSearchParams) and auth flows.
export const dynamic = 'force-dynamic';
import { AuthError } from '@supabase/supabase-js';
import { Loader2, LogIn, Mail, Key, UserPlus, AlertCircle, CheckCircle, Gift } from 'lucide-react';
import { useRouter } from 'next/navigation';

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.618-3.229-11.303-7.524l-6.571 4.819C9.656 39.663 16.318 44 24 44z"></path>
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 36.49 44 30.861 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
    </svg>
);

const LoginPage = () => {
    const supabase = createClient();
    const router = useRouter();
    const [redirectTo, setRedirectTo] = useState('/');

    // Read redirect param from the client URL (avoid useSearchParams to prevent SSR/prerender issues)
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            setRedirectTo(params.get('redirect_to') || '/');
        } catch (e) {
            setRedirectTo('/');
        }
    }, []);

    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [loading, setLoading] = useState(true); // Start loading to check session
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.push(redirectTo);
            } else {
                setLoading(false);
            }
        };
        checkUser();
    }, [router, supabase.auth, redirectTo]);

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                
                // If referral code provided, validate and update profile
                if (referralCode && data.user) {
                    try {
                        const response = await fetch('/api/referral/apply', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                userId: data.user.id, 
                                referralCode: referralCode.trim().toUpperCase() 
                            }),
                        });
                        
                        if (!response.ok) {
                            console.error('Referral code application failed');
                        }
                    } catch (refErr) {
                        console.error('Referral error:', refErr);
                    }
                }
                
                setMessage('Success! Please check your email to confirm your account.');
                // Switch to sign in mode after 10 seconds
                setTimeout(() => {
                    setIsSignUp(false);
                    setMessage(null);
                }, 10000); // 10 seconds
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                router.push(redirectTo);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg || 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}${redirectTo}` }
        });
    };

    const handlePasswordReset = async () => {
        if (!email) {
            setError('Please enter your email address to reset your password.');
            return;
        }
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/login?view=reset-password`,
            });
            if (error) throw error;
            setMessage('Password reset link has been sent to your email.');
    } catch (err: unknown) { const msg = err instanceof Error ? err.message : String(err); setError(msg); }
        finally { setLoading(false); }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-red-700" /></div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex flex-col justify-center items-center p-4 relative overflow-hidden">
            {/* Floating background blobs */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute top-40 right-10 w-72 h-72 bg-red-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            
            <Link href="/" className="flex items-center space-x-2 mb-8 relative z-10">
                <img src="/snackify-logo.jpg" alt="Snackify Logo" className="w-10 h-10" />
                <span className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">Snackify</span>
            </Link>
            
            <div className="w-full max-w-md bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border-2 border-gray-100 relative z-10">
                <h2 className="text-4xl font-black text-center mb-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                        {isSignUp ? 'Join Us' : 'Welcome Back'}
                    </span>
                </h2>
                <p className="text-center text-gray-600 mb-8 font-medium">
                    {isSignUp ? 'Get started with the best flavors in town' : 'Sign in to continue to your orders'}
                </p>
                
                {error && (
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-xl flex items-center shadow-sm">
                        <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}
                
                {message && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-xl flex items-center shadow-sm">
                        <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                        <span className="font-medium">{message}</span>
                    </div>
                )}
                
                <form onSubmit={handleAuthAction} className="space-y-5">
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-orange-600 transition" />
                        <input 
                            type="email" 
                            placeholder="Email Address" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition" 
                        />
                    </div>
                    
                    <div className="relative group">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-orange-600 transition" />
                        <input 
                            type="password" 
                            placeholder="Password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition" 
                        />
                    </div>
                    
                    {isSignUp && (
                        <div className="relative group">
                            <Gift className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-purple-600 transition" />
                            <input 
                                type="text" 
                                placeholder="Referral Code (Optional)" 
                                value={referralCode} 
                                onChange={(e) => setReferralCode(e.target.value.toUpperCase())} 
                                maxLength={12}
                                className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition uppercase" 
                            />
                            <p className="text-xs text-purple-600 mt-1 ml-1 font-medium">🎁 Enter a friend's code to get 25 bonus points!</p>
                        </div>
                    )}
                    
                    {!isSignUp && (
                        <div className="text-right">
                            <button 
                                type="button" 
                                onClick={handlePasswordReset} 
                                className="text-sm font-semibold text-orange-600 hover:text-red-600 transition"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className={`w-full py-4 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center ${
                            loading 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 hover:shadow-xl hover:scale-105'
                        }`}
                    >
                        {loading ? (
                            <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                        ) : isSignUp ? (
                            <UserPlus className='w-5 h-5 mr-2' />
                        ) : (
                            <LogIn className='w-5 h-5 mr-2' />
                        )}
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>
                
                <div className="text-center mt-8">
                    <p className="text-sm text-gray-600 font-medium">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                        {' '}
                        <button 
                            onClick={() => { 
                                setIsSignUp(!isSignUp); 
                                setError(null); 
                                setMessage(null); 
                            }} 
                            className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 transition"
                        >
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
