/* Avisos de Strava (webhook). El GET responde la verificación al suscribirse; el POST atiende el aviso de que un atleta
   revocó el acceso desde Strava y borra lo mismo que «Desconectar». Llega sin sesión: usa la clave de servicio.
   Sin STRAVA_WEBHOOK_VERIFY_TOKEN, SUPABASE_SERVICE_ROLE_KEY o la app de Strava, responde 501.
   La suscripción se crea una sola vez, cuando exista la app propia (ver «Abrir la app al público» en el README). */
import { NextResponse, after, type NextRequest } from 'next/server';
import { SvErr, forgetStrava, stravaConfigured, stravaGet } from '@/lib/strava/server';
import { supabaseAdmin, supabaseAdminConfigured } from '@/lib/supabase/admin';

const VERIFY = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN ?? '';
const ready = () => !!VERIFY && supabaseAdminConfigured() && stravaConfigured();
const off = () => NextResponse.json({ code: 'not_configured' }, { status: 501 });

export async function GET(request: NextRequest) {
  if (!ready()) return off();
  const q = request.nextUrl.searchParams;
  if (q.get('hub.mode') !== 'subscribe' || q.get('hub.verify_token') !== VERIFY) return NextResponse.json({ code: 'forbidden' }, { status: 403 });
  return NextResponse.json({ 'hub.challenge': q.get('hub.challenge') });
}

interface StravaEvent {
  object_type?: string;
  aspect_type?: string;
  owner_id?: number;
  updates?: Record<string, string>;
}

/* Los avisos no vienen firmados: antes de borrar se confirma con Strava que el permiso ya no sirve (si el token
   todavía anda, o Strava no responde, no se borra nada) */
async function revoked(userId: string) {
  try {
    await stravaGet(supabaseAdmin(), userId, '/athlete');
    return false;
  } catch (e) {
    return e instanceof SvErr && e.status === 401;
  }
}

async function onRevoke(athleteId: number) {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('strava_tokens').select('user_id').eq('athlete_id', athleteId);
  if (error) throw error;
  for (const { user_id } of data || []) {
    if (await revoked(user_id)) await forgetStrava(sb, user_id);
    else console.warn('Aviso de Strava sin confirmar: el permiso del atleta ' + athleteId + ' sigue andando.');
  }
}

export async function POST(request: NextRequest) {
  if (!ready()) return off();
  const ev = (await request.json().catch(() => null)) as StravaEvent | null;
  /* Strava espera la respuesta en menos de 2 segundos: el borrado va después */
  if (ev && ev.object_type === 'athlete' && ev.updates?.authorized === 'false' && Number(ev.owner_id) > 0) {
    const id = Number(ev.owner_id);
    after(() => onRevoke(id).catch((e) => console.error(e)));
  }
  return NextResponse.json({ ok: true });
}
