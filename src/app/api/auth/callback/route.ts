import { NextRequest, NextResponse } from 'next/server';
// Use relative import to avoid any path alias resolution issues in certain tooling
import { createClient } from '../../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to login with a verification flag
  return NextResponse.redirect(`${requestUrl.origin}/login?verified=1`);
}
