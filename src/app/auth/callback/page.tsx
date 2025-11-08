"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
    const [verified, setVerified] = useState(false);

    useEffect(() => {
        // Simulate verification check
        setTimeout(() => setVerified(true), 1000);
    }, []);

    if (!verified) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50">
                <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
                <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Email Verified!
                </h1>
                <p className="text-gray-600 mb-8">
                    Your email has been successfully verified. You can now sign in to your account.
                </p>
                <Link 
                    href="/login"
                    className="inline-block w-full py-3 px-6 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl hover:from-orange-700 hover:to-red-700 transition shadow-lg"
                >
                    Continue to Sign In
                </Link>
            </div>
        </div>
    );
}
