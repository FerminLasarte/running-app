/* ¿Está disponible la lectura de capturas con Claude? */
import { NextResponse, connection } from 'next/server';
import { AI_LIMITS, aiConfigured } from '@/lib/ai/server';
import { requireUser, svError } from '@/lib/strava/server';

export async function GET() {
  // depende de la sesión del usuario: nunca se pre-renderiza
  await connection();
  try {
    await requireUser();
    if (!aiConfigured()) return NextResponse.json({ enabled: false });
    return NextResponse.json({ enabled: true, limits: AI_LIMITS });
  } catch (e) {
    return svError(e);
  }
}
