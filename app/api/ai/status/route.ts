/* ¿Está disponible la lectura de capturas con Claude? Y, si lo está, cuántas lecturas lleva el usuario este mes. */
import { NextResponse, connection } from 'next/server';
import { AI_LIMITS, aiConfigured, aiMonthlyLimit } from '@/lib/ai/server';
import { requireUser, svError } from '@/lib/strava/server';

export async function GET() {
  // depende de la sesión del usuario: nunca se pre-renderiza
  await connection();
  try {
    const { sb } = await requireUser();
    if (!aiConfigured()) return NextResponse.json({ enabled: false });
    /* si no se puede saber cuántas lleva, igual se muestra activada: el tope lo controla ai_take al leer */
    const { data: used, error } = await sb.rpc('ai_used');
    if (error) console.error(error);
    return NextResponse.json({ enabled: true, limits: AI_LIMITS, quota: error ? undefined : { used: Number(used) || 0, limit: aiMonthlyLimit() } });
  } catch (e) {
    return svError(e);
  }
}
