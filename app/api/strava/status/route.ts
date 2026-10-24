/* ¿Está conectado Strava? (sin exponer los tokens) */
import { NextResponse, connection } from 'next/server';
import { getTokenRow, requireUser, stravaConfigured, svError } from '@/lib/strava/server';

export async function GET() {
  // depende de la sesión del usuario: nunca se pre-renderiza
  await connection();
  try {
    const { sb, user } = await requireUser();
    const row = await getTokenRow(sb, user.id);
    return NextResponse.json({ configured: stravaConfigured(), connected: !!row, athlete: row?.athlete_name || undefined });
  } catch (e) {
    return svError(e);
  }
}
