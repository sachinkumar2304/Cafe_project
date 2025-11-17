"use client";

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface UseAuthReturn {
  user: User | null;
  isAdmin: boolean;
  isAuthReady: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Global singleton auth snapshot and subscription list
type AuthSnapshot = { user: User | null; isAdmin: boolean; isAuthReady: boolean };
let snapshot: AuthSnapshot = { user: null, isAdmin: false, isAuthReady: false };
let bootstrapped = false;
const subscribers = new Set<(s: AuthSnapshot) => void>();

const publish = () => subscribers.forEach(cb => cb({ ...snapshot }));

async function bootstrapAuth() {
  if (bootstrapped) return;
  bootstrapped = true;
  const supabase = createClient();

  const checkAdmin = async (uid: string) => {
    try {
      const { data } = await supabase.from('admins').select('id').eq('id', uid).single();
      snapshot.isAdmin = !!data;
    } catch {
      snapshot.isAdmin = false;
    }
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    snapshot.user = session?.user ?? null;
    if (snapshot.user) await checkAdmin(snapshot.user.id);
    snapshot.isAuthReady = true;
    publish();
  } catch {
    snapshot.user = null;
    snapshot.isAdmin = false;
    snapshot.isAuthReady = true;
    publish();
  }

  supabase.auth.onAuthStateChange(async (event: string, session: any) => {
    snapshot.user = session?.user ?? null;
    if (snapshot.user) await checkAdmin(snapshot.user.id); else snapshot.isAdmin = false;
    snapshot.isAuthReady = true;
    publish();
  });
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthSnapshot>(snapshot);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    bootstrapAuth();
    setState({ ...snapshot });
    const sub = (s: AuthSnapshot) => { if (active) setState(s); };
    subscribers.add(sub);
    return () => { active = false; subscribers.delete(sub); };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign in failed');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign out failed');
      throw err;
    }
  };

  return { user: state.user, isAdmin: state.isAdmin, isAuthReady: state.isAuthReady, authError, signIn, signOut };
}