/* Las series de Strava de una sesión hecha, para el gráfico del detalle, con las vueltas del reloj: se leen de la tabla
   `streams` y, la primera vez, se piden a Strava (get_activity_streams y get_activity_performance) y se guardan ahí.
   Mientras la app está abierta quedan en memoria.
   Sin cuenta en la nube (modo local) o con los datos de ejemplo no hay a quién pedírselas. */
import { S, getUi, setUi, type AppState } from '@/lib/store';
import { supabaseBrowser } from '@/lib/supabase/client';
import { runActs, svCall, stravaErrMsg, type ListActivitiesPayload, type RunAct } from '@/lib/strava/client';
import { compactStreams, watchLaps, type Series, type Split } from '@/lib/domain/streams';
import type { Session } from '@/lib/domain/types';

export type StreamsState =
  | { k: 'busy' }
  | { k: 'ok'; se: Series }
  /** no hay series para mostrar: sin cuenta, datos de ejemplo, o Strava no tiene esta salida */
  | { k: 'off'; why: 'local' | 'demo' | 'missing' | 'empty' }
  | { k: 'err'; code: string; msg: string };

const UI_KEY = 'streams';
const KEYS = ['time', 'distance', 'heart_rate', 'velocity_smooth', 'moving', 'altitude', 'latlng'] as const;
/* hasta cuántas páginas de 100 actividades se busca hacia atrás una salida que no sabe su id de Strava */
const PAGES = 5;
/* pedidos en curso: React puede montar dos veces la misma página */
const inflight = new Set<string>();

/** la clave en memoria: la sesión y la actividad de la que salen (si cambia el resultado, se vuelven a buscar) */
const keyOf = (s: Session) => s.id + '|' + (s.result?.sid || '');
const streamsOf = (s: Session) => getUi<Record<string, StreamsState>>(UI_KEY, {})[keyOf(s)];
/** para suscribirse: `useApp(streamsSel(s))` */
export const streamsSel = (s: Session) => (st: AppState) => (st.ui[UI_KEY] as Record<string, StreamsState> | undefined)?.[keyOf(s)];
const put = (key: string, v: StreamsState) => setUi<Record<string, StreamsState>>(UI_KEY, (m) => ({ ...m, [key]: v }));

/** la corrida de Strava de un resultado sin id: la misma fecha y una distancia parecida */
async function findRun(date: string, km: number): Promise<RunAct | null> {
  let after: string | null = null;
  for (let page = 0; page < PAGES; page++) {
    const pl: ListActivitiesPayload = await svCall('list_activities', { first: 100, ordering: 'StartDateLocalDesc', ...(after ? { after } : {}) });
    const runs = runActs(pl),
      hit = runs.filter((r) => r.date === date && Math.abs(r.km - km) <= Math.max(0.6, km * 0.08)).sort((a, b) => Math.abs(a.km - km) - Math.abs(b.km - km))[0];
    if (hit) return hit;
    if (!pl.has_next_page || !pl.end_cursor || !runs.length || runs[runs.length - 1].date < date) return null;
    after = pl.end_cursor;
  }
  return null;
}

/** suma las vueltas del reloj a las series y las guarda. Si Strava no las da, quedan las series solas y las vueltas se
    piden la próxima vez; `saved`: las series ya estaban en la tabla */
async function saveWithLaps(s: Session, key: string, sid: string, se: Series, saved: boolean) {
  let laps: Split[] | null = null;
  try {
    laps = watchLaps(await svCall('get_activity_performance', { activity_id: sid }));
    put(key, { k: 'ok', se: { ...se, laps } });
  } catch (e) {
    console.warn('No se trajeron las vueltas de Strava:', stravaErrMsg(e));
  }
  if (saved && !laps) return;
  /* si no se puede guardar (por ejemplo, la sesión todavía no llegó a la nube), se vuelve a pedir la próxima vez */
  const { error } = await supabaseBrowser()
    .from('streams')
    .upsert({ user_id: S.uid, session_id: s.id, strava_id: sid, data: laps ? { ...se, laps } : se });
  if (error) console.warn('No se guardaron las series de Strava:', error.message);
}

/** trae las series de una sesión hecha (de la tabla o de Strava) y deja el estado en memoria; `retry` vuelve a probar */
export async function loadStreams(s: Session, retry = false) {
  const key = keyOf(s),
    r = s.result;
  if (!r || inflight.has(key) || (!retry && streamsOf(s))) return;
  if (S.demo) return put(key, { k: 'off', why: 'demo' });
  if (S.mode !== 'cloud' || !S.uid) return put(key, { k: 'off', why: 'local' });
  inflight.add(key);
  put(key, { k: 'busy' });
  try {
    const sb = supabaseBrowser();
    const { data: row } = await sb.from('streams').select('strava_id,data').eq('session_id', s.id).maybeSingle();
    if (row && (!r.sid || String(r.sid) === row.strava_id)) {
      const se = row.data as Series;
      put(key, { k: 'ok', se });
      /* las guardadas antes de que se pidieran las vueltas se completan una vez */
      if (!se.laps) await saveWithLaps(s, key, row.strava_id, se, true);
      return;
    }
    const sid = r.sid ? String(r.sid) : (await findRun(r.date, r.distKm))?.id;
    if (!sid) return put(key, { k: 'off', why: 'missing' });
    const se = compactStreams(await svCall('get_activity_streams', { activity_id: sid, streams: [...KEYS] }));
    if (!se) return put(key, { k: 'off', why: 'empty' });
    put(key, { k: 'ok', se });
    await saveWithLaps(s, key, sid, se, false);
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : 'error';
    put(key, { k: 'err', code, msg: stravaErrMsg(e) });
  } finally {
    inflight.delete(key);
  }
}
