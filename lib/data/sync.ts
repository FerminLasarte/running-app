/* Guardado en Supabase con caché local y reintentos.
   Igual que el artifact: lo que cargás se ve al instante (estado + localStorage) y se sube en segundo plano;
   si falla, queda marcado, se avisa y se reintenta solo a los 20 s o cuando vuelve internet. */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { S, setS } from '@/lib/store';
import { supabaseBrowser } from '@/lib/supabase/client';
import { supabaseConfigured } from '@/lib/supabase/env';
import { defaultCfgRaw, normCfg } from '@/lib/domain/defaults';
import { normSession } from '@/lib/domain/stages';
import { sdate } from '@/lib/domain/stats';
import type { Cfg, Route, Session } from '@/lib/domain/types';
import { cleanObj } from '@/lib/domain/util';

const LS_KEY = 'rr1';
let chain: Promise<unknown> = Promise.resolve();
let retryT: ReturnType<typeof setTimeout> | null = null;
let channel: RealtimeChannel | null = null;
let refetchT: ReturnType<typeof setTimeout> | null = null;

/* el aviso lo da la capa de acciones; acá solo hace falta mostrar un mensaje */
let notify: (msg: string, ms?: number) => void = () => {};
export const setNotifier = (fn: typeof notify) => {
  notify = fn;
};

const sb = () => supabaseBrowser();
const cloud = () => S.mode === 'cloud' && !!S.uid;

/* ---- caché local ---- */
interface LocalCache {
  uid: string | null;
  cfg: Cfg;
  sessions: Session[];
  routes: Route[];
}
export function persistLocal() {
  if (S.demo) return;
  try {
    const c: LocalCache = { uid: S.uid, cfg: S.cfg, sessions: S.sessions, routes: S.routes };
    localStorage.setItem(LS_KEY, JSON.stringify(c));
  } catch {
    /* lleno o bloqueado: la nube sigue siendo la fuente */
  }
}
function loadLocal(): LocalCache | null {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || 'null');
  } catch {
    return null;
  }
}
const mergeCfg = (c: unknown) => {
  const nc = defaultCfgRaw();
  if (c && typeof c === 'object') Object.assign(nc, c);
  delete nc.kind;
  return normCfg(nc);
};

/* ---- escrituras ---- */
const setFailed = (key: string, on: boolean) => {
  const f = { ...S.failed };
  if (on) f[key] = true;
  else delete f[key];
  setS({ failed: f });
};
function cloudWrite(key: string, fn: () => Promise<{ error: unknown } | void>) {
  setS({ saving: S.saving + 1 });
  chain = chain
    .then(fn)
    .then((r) => {
      if (r && r.error) throw r.error;
      setFailed(key, false);
      if (S.cloudLost) setS({ cloudLost: false });
    })
    .catch((e) => {
      console.error(e);
      const first = !Object.keys(S.failed).length;
      setFailed(key, true);
      if (typeof navigator !== 'undefined' && !navigator.onLine) setS({ cloudLost: true });
      if (first) notify('No pude guardar en la nube. Tus datos siguen en este navegador y lo reintento solo en unos segundos.', 6000);
      retrySoon();
    })
    .then(() => setS({ saving: S.saving - 1 }));
  return chain as Promise<void>;
}
function retrySoon() {
  if (retryT) return;
  retryT = setTimeout(() => {
    retryT = null;
    if (cloud() && Object.keys(S.failed).length) retryFailed();
  }, 20000);
}
export function retryFailed() {
  const keys = Object.keys(S.failed);
  setS({ failed: {} });
  keys.forEach((k) => {
    if (k === 'cfg') writeCfg();
    else if (k.startsWith('del_')) writeDelete(k.slice(4));
    else if (k === 'routes') writeRoutes(S.routes);
    else if (k.startsWith('batch_')) return;
    else {
      const s = S.sessions.find((x) => x.id === k);
      if (s) writeSession(s);
    }
  });
}

const sessionRow = (s: Session) => ({ user_id: S.uid!, id: s.id, type: s.type, date: sdate(s) === '0000-00-00' ? null : sdate(s), data: cleanObj(s), updated_at: new Date().toISOString() });

export function writeSession(s: Session): Promise<void> {
  if (!cloud()) return Promise.resolve();
  return cloudWrite(s.id, async () => sb().from('sessions').upsert(sessionRow(s)));
}
/** Muchas sesiones juntas (importar un respaldo, calcular la deriva): una escritura por cada 200. */
export function writeSessions(list: Session[]): Promise<void> {
  if (!cloud() || !list.length) return Promise.resolve();
  if (list.length === 1) return writeSession(list[0]);
  const ids = list.map((s) => s.id);
  return cloudWrite('batch_' + ids[0], async () => {
    const rows = list.map(sessionRow);
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb().from('sessions').upsert(rows.slice(i, i + 200));
      if (error) {
        /* si falla, cada sesión queda marcada para reintentarla sola */
        ids.forEach((id) => setFailed(id, true));
        return { error };
      }
    }
    ids.forEach((id) => setFailed(id, false));
  });
}
export function writeDelete(id: string) {
  setFailed(id, false);
  if (!cloud()) return;
  cloudWrite('del_' + id, async () => sb().from('sessions').delete().eq('id', id));
}
export function writeCfg() {
  if (!cloud()) return;
  cloudWrite('cfg', async () => sb().from('settings').upsert({ user_id: S.uid!, cfg: cleanObj(S.cfg), updated_at: new Date().toISOString() }));
}
export function writeRoutes(list: Route[]) {
  if (!cloud() || !list.length) return;
  cloudWrite('routes', async () => {
    const rows = list.map((r) => ({ user_id: S.uid!, id: r.id, strava_id: r.sid, date: r.date, name: r.name, km: r.km, tsec: r.tsec, poly: r.poly }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb().from('routes').upsert(rows.slice(i, i + 200));
      if (error) return { error };
    }
  });
}

/* ---- lectura ---- */
async function fetchAll<T>(table: string, cols: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb()
      .from(table)
      .select(cols)
      .order('id')
      .range(from, from + 999);
    if (error) throw error;
    out.push(...((data || []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}
/** Trae todo de la nube y lo mezcla con lo local que todavía no se pudo subir. */
async function pull() {
  const [cfgRows, sessRows, routeRows] = await Promise.all([
    fetchAll<{ cfg: unknown }>('settings', 'cfg'),
    fetchAll<{ id: string; data: unknown }>('sessions', 'id,data'),
    fetchAll<{ id: string; strava_id: string; date: string; name: string; km: number; tsec: number; poly: string }>('routes', 'id,strava_id,date,name,km,tsec,poly'),
  ]);
  const prev = S.demo ? S.realSessions || [] : S.sessions;
  const ss = sessRows.map((r) => normSession(r.data, r.id));
  Object.keys(S.failed).forEach((k) => {
    if (k.startsWith('del_') || k === 'cfg' || k === 'routes') return;
    const loc = prev.find((x) => x.id === k);
    if (!loc) return;
    const i = ss.findIndex((x) => x.id === k);
    if (i >= 0) ss[i] = loc;
    else ss.push(loc);
  });
  const dels = new Set(Object.keys(S.failed).filter((k) => k.startsWith('del_')).map((k) => k.slice(4)));
  const sessions = ss.filter((x) => !dels.has(x.id));
  let routes: Route[] = routeRows.map((r) => ({ id: r.id, sid: r.strava_id, date: String(r.date), name: r.name, km: Number(r.km), tsec: r.tsec, poly: r.poly }));
  if (S.failed.routes) S.routes.forEach((r) => !routes.some((q) => q.id === r.id) && routes.push(r));
  routes = routes.sort((a, b) => a.date.localeCompare(b.date));
  let cfg = mergeCfg(cfgRows[0]?.cfg);
  if (S.failed.cfg) cfg = S.demo ? S.realCfg || cfg : S.cfg;
  if (S.demo) setS({ realSessions: sessions, realCfg: cfg, routes, loaded: true });
  else {
    setS({ sessions, cfg, routes, loaded: true });
    persistLocal();
  }
}
function refetchSoon(ms = 600) {
  if (refetchT) clearTimeout(refetchT);
  refetchT = setTimeout(() => {
    refetchT = null;
    /* no pisar lo que se está subiendo: espero a que termine la cola */
    if (S.saving > 0) return refetchSoon(1500);
    pull().catch((e) => console.error(e));
  }, ms);
}

/** Arranque: sesión del usuario, caché local al instante y después la nube. */
export async function boot() {
  const cache = loadLocal();
  let uid: string | null = null,
    email: string | null = null;
  if (supabaseConfigured()) {
    try {
      const { data } = await sb().auth.getUser();
      uid = data.user?.id ?? null;
      email = data.user?.email ?? null;
    } catch {
      uid = null;
    }
  }
  if (cache && (!uid || cache.uid === uid)) {
    setS({ cfg: mergeCfg(cache.cfg), sessions: (cache.sessions || []).map((x) => normSession(x)), routes: cache.routes || [] });
  }
  if (!uid) {
    /* sin Supabase configurado (desarrollo): todo queda en este navegador */
    setS({ mode: 'local', loaded: true, uid: null, email: null });
    return;
  }
  setS({ mode: 'cloud', uid, email, loaded: !!(cache && cache.uid === uid) });
  try {
    await pull();
  } catch (e) {
    console.error(e);
    setS({ cloudLost: true, loaded: true });
    notify('No pude conectarme con tu cuenta. Te muestro lo último que había en este navegador.', 6000);
  }
  /* en vivo: si cargás algo desde otro dispositivo, aparece acá */
  channel = sb()
    .channel('rr-' + uid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: 'user_id=eq.' + uid }, () => refetchSoon())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'user_id=eq.' + uid }, () => refetchSoon())
    .subscribe();
  window.addEventListener('online', () => {
    setS({ cloudLost: false });
    if (Object.keys(S.failed).length) retryFailed();
    refetchSoon(0);
  });
  window.addEventListener('offline', () => setS({ cloudLost: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refetchSoon(200);
  });
}
export function stopSync() {
  if (channel) sb().removeChannel(channel);
  channel = null;
}
