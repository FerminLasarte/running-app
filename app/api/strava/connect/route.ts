/* Manda al usuario a autorizar la app en Strava. El `state` (en una cookie) evita que otro sitio complete el flujo. */
import { NextResponse, connection, type NextRequest } from 'next/server';
import { STRAVA_SCOPE, requireUser, stravaConfigured, svError } from '@/lib/strava/server';

export async function GET(request: NextRequest) {
  await connection();
  try {
    await requireUser();
    if (!stravaConfigured()) return NextResponse.redirect(new URL('/?strava=not_configured', request.nextUrl.origin));
    const back = request.nextUrl.searchParams.get('back') || '/';
    const state = crypto.randomUUID();
    const url = new URL('https://www.strava.com/oauth/authorize');
    url.searchParams.set('client_id', process.env.STRAVA_CLIENT_ID!);
    url.searchParams.set('redirect_uri', request.nextUrl.origin + '/api/strava/callback');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('approval_prompt', 'auto');
    url.searchParams.set('scope', STRAVA_SCOPE);
    url.searchParams.set('state', state);
    const res = NextResponse.redirect(url);
    const opts = { httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'lax' as const, path: '/api/strava', maxAge: 600 };
    res.cookies.set('sv_state', state, opts);
    res.cookies.set('sv_back', back.startsWith('/') && !back.startsWith('//') ? back : '/', opts);
    return res;
  } catch (e) {
    return svError(e);
  }
}
