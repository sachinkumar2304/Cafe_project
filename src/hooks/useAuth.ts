'use client';

import { useState, useEffect } from 'react';
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
    const supabase = createClient();

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

        const initAuth = async () => {
            try {
                // Get initial session
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!mounted) return;
                
                console.log('🔐 Initial auth check - Session:', session ? 'Found' : 'None', 'User:', session?.user?.email || 'Guest');
                
                setUser(session?.user ?? null);
                if (session?.user) {
                    await checkAdmin(session.user.id);
                }
                setIsAuthReady(true);
            } catch (error) {
                console.error('❌ Auth initialization error:', error);
                if (mounted) {
                    setUser(null);
                    setIsAdmin(false);
                    setIsAuthReady(true);
                }
            }
        };

        // Initialize auth
        initAuth();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
            if (!mounted) return;
            
            console.log('🔐 Auth state changed:', event, 'User:', session?.user?.email || 'None');
            
            setUser(session?.user ?? null);
            
            if (session?.user) {
                await checkAdmin(session.user.id);
            } else {
                setIsAdmin(false);
            }
            
            // Ensure UI is ready after any auth event
            setIsAuthReady(true);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            console.log('🔑 Signing in:', email);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            console.log('✅ Sign in successful:', data.user?.email);
        } catch (error) {
            console.error('❌ Sign in failed:', error);
            setAuthError(error instanceof Error ? error.message : 'Sign in failed');
            throw error;
        }
    };

    const signOut = async () => {
        try {
            console.log('🚪 Signing out...');
            
            // Clear local state immediately
            setUser(null);
            setIsAdmin(false);
            
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            console.log('✅ Sign out successful');
            
            // Force page reload to clear all state
            window.location.href = '/';
        } catch (error) {
            console.error('❌ Sign out failed:', error);
            setAuthError(error instanceof Error ? error.message : 'Sign out failed');
            throw error;
        }
    };

    return { user, isAdmin, isAuthReady, authError, signIn, signOut };
}