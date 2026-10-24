/* Vuelta de Strava: cambia el código por tokens y los guarda en la cuenta del usuario. */
import { NextResponse, type NextRequest } from 'next/server';
import { exchangeToken, requireUser, saveTokens } from '@/lib/strava/server';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams,
    origin = request.nextUrl.origin;
  const back = request.cookies.get('sv_back')?.value || '/';
  const done = (status: string) => {
    const url = new URL(back, origin);
    url.searchParams.set('strava', status);
    const res = NextResponse.redirect(url);
    res.cookies.delete({ name: 'sv_state', path: '/api/strava' });
    res.cookies.delete({ name: 'sv_back', path: '/api/strava' });
    return res;
  };
  if (q.get('error')) return done('denied');
  const state = request.cookies.get('sv_state')?.value;
  if (!state || state !== q.get('state') || !q.get('code')) return done('error');
  const scope = q.get('scope') || '';
  if (!scope.includes('activity:read')) return done('scope');
  try {
    const { sb, user } = await requireUser();
    const t = await exchangeToken({ grant_type: 'authorization_code', code: q.get('code')! });
    await saveTokens(sb, user.id, t, scope);
    return done('ok');
  } catch (e) {
    console.error(e);
    return done('error');
  }
}
