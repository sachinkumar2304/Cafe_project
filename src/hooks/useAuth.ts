'use client';

import { useState, useEffect, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface UseAuthReturn {
    user: User | null;
    isAdmin: boolean;
    isAuthReady: boolean;
    authError: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    
    // ✅ Memoize supabase client - prevent recreation
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        const fetchUserAndAdmin = async () => {
            try {
                console.log('🔍 Checking auth session...');
                // Check current session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    console.error('❌ Session error:', sessionError);
                    throw sessionError;
                }
                
                if (session?.user) {
                    console.log('✅ User logged in:', session.user.email);
                    setUser(session.user);
                    // Check admin status directly from admins table
                    const { data: adminData } = await supabase
                        .from('admins')
                        .select('id')
                        .eq('id', session.user.id)
                        .single();
                    setIsAdmin(!!adminData);
                } else {
                    console.log('👤 No active session - Guest user');
                }
            } catch (error) {
                console.error('❌ Error fetching user session:', error);
                setAuthError(error instanceof Error ? error.message : 'Authentication failed');
                // Don't block the app - set user as null and continue
                setUser(null);
                setIsAdmin(false);
            } finally {
                setIsAuthReady(true);
                console.log('✅ Auth ready');
            }
        };

        fetchUserAndAdmin();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 Auth state changed:', event, session?.user?.email);
            setUser(session?.user ?? null);
            if (session?.user) {
                // Check admin status directly from admins table
                const { data: adminData } = await supabase
                    .from('admins')
                    .select('id')
                    .eq('id', session.user.id)
                    .single();
                setIsAdmin(!!adminData);
            } else {
                setIsAdmin(false);
            }
        });

        return () => {
            console.log('🧹 Cleaning up auth subscription');
            subscription.unsubscribe();
        };
    }, []); // ✅ Empty dependency - stable supabase client

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
        } catch (error) {
            setAuthError(error instanceof Error ? error.message : 'Sign in failed');
            throw error;
        }
    };

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            setAuthError(error instanceof Error ? error.message : 'Sign out failed');
            throw error;
        }
    };

    return { user, isAdmin, isAuthReady, authError, signIn, signOut };
}