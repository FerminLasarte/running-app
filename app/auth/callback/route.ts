/* Vuelta de Google (o del link de un mail): crea la sesión y entra a la app. */
import type { NextRequest } from 'next/server';
import { authReturn } from '@/lib/supabase/authReturn';

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get('next');
  return authReturn(request, next && next.startsWith('/') && !next.startsWith('//') ? next : '/semana');
}
