/* ¿Está disponible la lectura de capturas con Claude? */
import { NextResponse, connection } from 'next/server';
import { AI_LIMITS, aiConfigured } from '@/lib/ai/server';
import { requireUser, svError } from '@/lib/strava/server';

export async function GET() {
  // depende de la sesión del usuario: nunca se pre-renderiza
  await connection();
  try {
    await requireUser();
    return NextResponse.json(aiConfigured() ? { enabled: true, limits: AI_LIMITS } : { enabled: false });
  } catch (e) {
    return svError(e);
  }
}
