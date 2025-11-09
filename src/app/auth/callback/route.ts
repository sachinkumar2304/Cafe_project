import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

// /auth/callback handles the OAuth/email verification code exchange then redirects.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (code) {
    try {
      const supabase = await createClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch (err) {
      // Intentionally swallow errors to avoid leaking details; optionally could log with gated logger.
      // console.error('Auth callback error', err); // Keep silent in production.
    }
  }

  // Always redirect user to login with a flag so UI can show a success toast.
  return NextResponse.redirect(`${url.origin}/login?verified=1`);
}
// Removed: this route conflicts with the page at /auth/callback
// Please use /api/auth/callback for the route handler.
