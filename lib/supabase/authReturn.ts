/* La vuelta a la app desde Supabase (Google o un link por mail): crea la sesión y entra. Si estaba probando sin cuenta,
   deja de estarlo. */
import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabaseServer } from './server';
import { GUEST_COOKIE } from '@/lib/guest';

/** `dest`: a dónde va si salió bien */
export async function authReturn(request: NextRequest, dest: string) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const sb = await supabaseServer();

  let error: unknown = null;
  if (code) error = (await sb.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) error = (await sb.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  else error = new Error('sin código');

  if (error) return NextResponse.redirect(new URL('/login?e=link', url.origin));
  const res = NextResponse.redirect(new URL(dest, url.origin));
  res.cookies.delete(GUEST_COOKIE);
  return res;
}
