/* Strava desde el navegador: llama a nuestras rutas /api/strava/*, que hablan con la API oficial usando los tokens
   guardados en Supabase. Mantiene las mismas herramientas y formas de respuesta que el conector de claude.ai que
   usaba el artifact, así el código portado no cambia. */

import { supabaseConfigured } from '@/lib/supabase/env';

export type StravaTool = 'list_activities' | 'get_activity_performance' | 'get_activity_streams';

export interface StravaActivity {
  id: string | number;
  name: string;
  sport_type: string;
  /** 'AAAA-MM-DDTHH:MM:SS' en hora local de la actividad */
  start_local: string;
  summary: { distance: number; moving_time: number };
  reduced_polyline?: string;
}
export interface ListActivitiesPayload {
  activities: StravaActivity[];
  has_next_page: boolean;
  end_cursor: string | null;
}
/** una corrida de Strava como la usa la app: fecha AAAA-MM-DD, km y segundos en movimiento */
export interface RunAct {
  id: string;
  date: string;
  name: string;
  km: number;
  tsec: number;
  poly?: string;
}
/** las corridas de una página de actividades (sin bici ni caminatas) */
export const runActs = (pl: ListActivitiesPayload | null): RunAct[] =>
  ((pl && pl.activities) || [])
    .filter((a) => /run/i.test(a.sport_type || ''))
    .map((a) => ({
      id: String(a.id),
      date: String(a.start_local || '').slice(0, 10),
      name: a.name || 'Carrera',
      km: ((a.summary && a.summary.distance) || 0) / 1000,
      tsec: Math.round((a.summary && a.summary.moving_time) || 0),
      poly: a.reduced_polyline,
    }));
export interface PerformancePayload {
  average_heartrate?: number;
  max_heartrate?: number;
  laps: { distance: number; moving_time: number; elapsed_time: number; avg_hr?: number; max_hr?: number }[];
}
export interface StreamsPayload {
  time?: number[];
  heart_rate?: number[];
  velocity_smooth?: number[];
  moving?: boolean[];
}

export class StravaError extends Error {
  code: string;
  constructor(code: string, message = '') {
    super(message || code);
    this.code = code;
  }
}

export async function svCall(tool: 'list_activities', input: { first?: number; after?: string | null; ordering?: string; include_polyline?: boolean }): Promise<ListActivitiesPayload>;
export async function svCall(tool: 'get_activity_performance', input: { activity_id: string }): Promise<PerformancePayload>;
export async function svCall(tool: 'get_activity_streams', input: { activity_id: string; streams?: string[] }): Promise<StreamsPayload>;
export async function svCall(tool: StravaTool, input: Record<string, unknown>): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch('/api/strava/' + tool, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
  } catch {
    throw new StravaError('server_unavailable');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new StravaError((body && body.code) || 'tool_error', (body && body.message) || '');
  return body;
}

/** Estado de la conexión con Strava de este usuario. */
export async function stravaStatus(): Promise<{ configured?: boolean; connected: boolean; athlete?: string }> {
  /* sin cuenta (modo local de desarrollo) no hay a quién conectar */
  if (!supabaseConfigured()) return { connected: false };
  try {
    const r = await fetch('/api/strava/status');
    return r.ok ? r.json() : { connected: false };
  } catch {
    return { connected: false };
  }
}
/** Lleva al usuario a autorizar la app en Strava; vuelve a `back` (por defecto, la página actual). */
export function stravaConnect(back?: string) {
  const b = back || window.location.pathname;
  // es una ruta de API que redirige a Strava: navegación completa
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = '/api/strava/connect?back=' + encodeURIComponent(b);
}

export function stravaErrMsg(e: unknown) {
  const c = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
  const m = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : '';
  return c === 'not_connected'
    ? 'Todavía no conectaste Strava. Andá a Ajustes y tocá «Conectar con Strava».'
    : c === 'needs_reauth'
      ? 'Strava pide que vuelvas a conectarte: andá a Ajustes y tocá «Conectar con Strava».'
      : c === 'not_configured'
        ? 'La conexión con Strava todavía no está configurada en el servidor.'
        : c === 'unauthorized'
          ? 'Se cerró tu sesión. Volvé a entrar a la app.'
          : c === 'server_unavailable' || c === 'rate_limited'
            ? 'Strava no responde ahora. Probá de nuevo en unos minutos.'
            : c === 'tool_error'
              ? 'Strava devolvió un error: ' + m.slice(0, 140)
              : 'No pude leer Strava (' + (c || 'error') + '). Probá de nuevo.';
}
