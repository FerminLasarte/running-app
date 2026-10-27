/* Strava del lado del servidor: OAuth, tokens guardados en Supabase (con RLS) y llamadas a la API oficial. */
import 'server-only';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { currentUser } from '@/lib/supabase/server';
import { isAllowed, supabaseConfigured } from '@/lib/supabase/env';

const API = 'https://www.strava.com/api/v3';
export const STRAVA_SCOPE = 'read,activity:read_all';

export const stravaConfigured = () => !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);

export class SvErr extends Error {
  constructor(
    public code: string,
    message = '',
    public status = 400,
  ) {
    super(message || code);
  }
}
export const svError = (e: unknown) => {
  if (e instanceof SvErr) return NextResponse.json({ code: e.code, message: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ code: 'tool_error', message: e instanceof Error ? e.message : String(e) }, { status: 500 });
};

/** Usuario de la app (o error 401). */
export async function requireUser() {
  /* sin Supabase (desarrollo local) no hay usuarios: nada del servidor está disponible */
  if (!supabaseConfigured()) throw new SvErr('unauthorized', '', 401);
  const { sb, user } = await currentUser();
  if (!user || !isAllowed(user.email)) throw new SvErr('unauthorized', '', 401);
  return { sb, user };
}

interface TokenRow {
  user_id: string;
  athlete_id: number;
  athlete_name: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string;
}
interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; lastname?: string };
}

export async function exchangeToken(params: Record<string, string>): Promise<TokenResponse> {
  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, ...params }),
    cache: 'no-store',
  });
  if (!r.ok) throw new SvErr(params.grant_type === 'refresh_token' ? 'needs_reauth' : 'tool_error', 'Strava rechazó la autorización (' + r.status + ')', r.status === 400 || r.status === 401 ? 401 : 502);
  return r.json();
}

export async function saveTokens(sb: SupabaseClient, userId: string, t: TokenResponse, scope: string, prev?: TokenRow | null) {
  const row = {
    user_id: userId,
    athlete_id: t.athlete?.id ?? prev?.athlete_id ?? 0,
    athlete_name: t.athlete ? [t.athlete.firstname, t.athlete.lastname].filter(Boolean).join(' ') : (prev?.athlete_name ?? ''),
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: new Date(t.expires_at * 1000).toISOString(),
    scope: scope || prev?.scope || '',
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from('strava_tokens').upsert(row);
  if (error) throw error;
  return row;
}

export async function getTokenRow(sb: SupabaseClient, userId: string): Promise<TokenRow | null> {
  const { data, error } = await sb.from('strava_tokens').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data as TokenRow | null;
}

/** Borra lo que vino de Strava: los recorridos, las series de cada salida y, al final, la conexión (así, si algo falla
    a mitad de camino, se puede volver a probar). Las sesiones quedan como están. */
export async function forgetStrava(sb: SupabaseClient, userId: string) {
  for (const table of ['streams', 'routes', 'strava_tokens']) {
    const { error } = await sb.from(table).delete().eq('user_id', userId);
    if (error) throw error;
  }
}

/** Desconecta Strava: revoca el permiso allá (si Strava no responde, se borra igual) y borra lo que vino de ahí. */
export async function stravaDisconnect(sb: SupabaseClient, userId: string) {
  const row = await getTokenRow(sb, userId);
  if (row)
    await fetch('https://www.strava.com/oauth/deauthorize', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + row.access_token },
      cache: 'no-store',
    }).catch(() => null);
  await forgetStrava(sb, userId);
}

/** Token vigente (lo renueva si vence en menos de un minuto). */
async function accessToken(sb: SupabaseClient, userId: string, force = false) {
  if (!stravaConfigured()) throw new SvErr('not_configured', '', 503);
  const row = await getTokenRow(sb, userId);
  if (!row) throw new SvErr('not_connected', '', 409);
  if (!force && new Date(row.expires_at).getTime() - Date.now() > 60_000) return row.access_token;
  const t = await exchangeToken({ grant_type: 'refresh_token', refresh_token: row.refresh_token });
  return (await saveTokens(sb, userId, t, row.scope, row)).access_token;
}

/** GET a la API de Strava con el token del usuario; reintenta una vez renovando el token si responde 401. */
export async function stravaGet<T>(sb: SupabaseClient, userId: string, path: string): Promise<T> {
  let tok = await accessToken(sb, userId);
  for (let i = 0; i < 2; i++) {
    const r = await fetch(API + path, { headers: { authorization: 'Bearer ' + tok }, cache: 'no-store' });
    if (r.ok) return r.json();
    if (r.status === 401 && i === 0) {
      tok = await accessToken(sb, userId, true);
      continue;
    }
    if (r.status === 401) throw new SvErr('needs_reauth', '', 401);
    if (r.status === 429) throw new SvErr('rate_limited', '', 429);
    if (r.status >= 500) throw new SvErr('server_unavailable', '', 502);
    throw new SvErr('tool_error', 'HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200), 502);
  }
  throw new SvErr('needs_reauth', '', 401);
}
