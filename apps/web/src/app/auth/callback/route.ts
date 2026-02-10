import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getURL } from '@/utils/getURL';

/**
 * Auth Callback Route
 * 
 * Handles OAuth and email confirmation callbacks.
 * Exchanges the auth code for a session and redirects.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Successfully authenticated, redirect to dashboard
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // Auth code error, redirect to auth page with error
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
}
