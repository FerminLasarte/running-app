/* Desconecta Strava: revoca el permiso en Strava y borra los tokens, los recorridos y las series. Las sesiones quedan. */
import { NextResponse } from 'next/server';
import { requireUser, stravaDisconnect, svError } from '@/lib/strava/server';

export async function POST() {
  try {
    const { sb, user } = await requireUser();
    await stravaDisconnect(sb, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return svError(e);
  }
}
