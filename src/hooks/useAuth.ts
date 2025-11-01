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
        const fetchUserAndAdmin = async () => {
            try {
                // Check current session
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUser(session.user);
                    // Check admin status directly from admins table
                    const { data: adminData } = await supabase
                        .from('admins')
                        .select('id')
                        .eq('id', session.user.id)
                        .single();
                    setIsAdmin(!!adminData);
                }
            } catch (error) {
                console.error('Error fetching user session:', error);
                setAuthError(error instanceof Error ? error.message : 'Authentication failed');
            } finally {
                setIsAuthReady(true);
            }
        };

        fetchUserAndAdmin();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
            subscription.unsubscribe();
        };
    }, []);

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