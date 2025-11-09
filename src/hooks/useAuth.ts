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
        let mounted = true;

        const checkAdmin = async (userId: string) => {
            try {
                const { data: adminData } = await supabase
                    .from('admins')
                    .select('id')
                    .eq('id', userId)
                    .single();
                if (mounted) setIsAdmin(!!adminData);
            } catch {
                if (mounted) setIsAdmin(false);
            }
        };

        // 1) Seed state with current session quickly
        supabase.auth.getSession()
            .then((result: any) => {
                const session = result?.data?.session as any;
                if (!mounted) return;
                const sUser = (session as any)?.user ?? null;
                setUser(sUser);
                if (sUser) checkAdmin((sUser as User).id);
            })
            .catch((error: unknown) => {
                if (!mounted) return;
                setAuthError(error instanceof Error ? error.message : 'Authentication failed');
                setUser(null);
                setIsAdmin(false);
            });

        // 2) Listen for auth changes including INITIAL_SESSION to mark readiness
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
            // events: INITIAL_SESSION | SIGNED_IN | SIGNED_OUT | TOKEN_REFRESHED | USER_UPDATED | PASSWORD_RECOVERY
            if (!mounted) return;
            setUser(session?.user ?? null);
            if (session?.user) {
                await checkAdmin(session.user.id);
            } else {
                setIsAdmin(false);
            }
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                setIsAuthReady(true);
            }
        });

        // 3) Failsafe: if INITIAL_SESSION never arrives (rare), unlock UI after 2s
        const readyTimeout = setTimeout(() => {
            if (mounted) setIsAuthReady(true);
        }, 2000);

        return () => {
            mounted = false;
            clearTimeout(readyTimeout);
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