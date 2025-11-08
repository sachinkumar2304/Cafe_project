"use client";
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function AuthConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const success = searchParams.get('success') === 'true';

  useEffect(() => {
    if (success) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [success, router]);

  if (!success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-pink-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl border-2 border-red-200 text-center">
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-gray-900 mb-4">
            Verification Failed
          </h1>
          
          <p className="text-gray-600 mb-8">
            Something went wrong with email verification. Please try again or contact support.
          </p>
          
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold rounded-full hover:from-red-700 hover:to-pink-700 transition-all shadow-lg"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl border-2 border-green-200 text-center">
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-black text-gray-900 mb-4">
          Email Verified! 🎉
        </h1>
        
        <p className="text-lg text-gray-700 mb-2 font-semibold">
          Your account has been successfully verified.
        </p>
        
        <p className="text-gray-600 mb-6">
          Welcome to Snackify! You can now enjoy fresh South Indian delights delivered to your doorstep.
        </p>
        
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl p-4 mb-8">
          <p className="text-sm text-gray-600 mb-2">Redirecting to homepage in</p>
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 text-orange-600 animate-spin" />
            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
              {countdown}
            </span>
            <span className="text-gray-600 font-medium">seconds</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="w-full px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-full hover:from-orange-700 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
          >
            Go to Homepage
          </Link>
          
          <Link
            href="/menu"
            className="w-full px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-full hover:border-orange-300 hover:bg-orange-50 transition-all"
          >
            Explore Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
