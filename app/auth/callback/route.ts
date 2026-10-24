/* Vuelta del link del mail (link mágico o recuperación): crea la sesión y entra a la app. */
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const next = url.searchParams.get('next');
  const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const sb = await supabaseServer();

  let error: unknown = null;
  if (code) error = (await sb.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) error = (await sb.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  else error = new Error('sin código');

  if (error) return NextResponse.redirect(new URL('/login?e=link', url.origin));
  return NextResponse.redirect(new URL(dest, url.origin));
}
