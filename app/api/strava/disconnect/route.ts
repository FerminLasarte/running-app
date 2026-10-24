/* Desconecta Strava: revoca el permiso en Strava y borra los tokens. Los recorridos ya traídos quedan. */
import { NextResponse } from 'next/server';
import { getTokenRow, requireUser, svError } from '@/lib/strava/server';

export async function POST() {
  try {
    const { sb, user } = await requireUser();
    const row = await getTokenRow(sb, user.id);
    if (row)
      await fetch('https://www.strava.com/oauth/deauthorize', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + row.access_token },
        cache: 'no-store',
      }).catch(() => null);
    const { error } = await sb.from('strava_tokens').delete().eq('user_id', user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return svError(e);
  }
}
