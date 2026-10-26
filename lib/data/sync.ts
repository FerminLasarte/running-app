/* Guardado en Supabase con caché local y reintentos.
   Igual que el artifact: lo que cargás se ve al instante (estado + localStorage) y se sube en segundo plano;
   si falla, queda marcado, se avisa y se reintenta solo a los 20 s o cuando vuelve internet.
   Lectura: la primera vez se trae todo; después, los cambios de otro dispositivo llegan en vivo de a uno y, al
   volver a la app, se comparan ids y fechas de actualización y se trae solo lo que cambió. Un cambio hecho acá
   que la nube todavía no confirmó nunca lo pisa una lectura. */
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { S, setS } from '@/lib/store';
import { supabaseBrowser } from '@/lib/supabase/client';
import { supabaseConfigured } from '@/lib/supabase/env';
import { defaultCfgRaw, normCfg } from '@/lib/domain/defaults';
import { normSession } from '@/lib/domain/stages';
import { sdate } from '@/lib/domain/stats';
import type { Cfg, Route, Session } from '@/lib/domain/types';
import { cleanObj } from '@/lib/domain/util';

const LS_KEY = 'rr1';
/* claves con cambios locales que la nube todavía no confirmó (en camino o fallidos): sobreviven a cerrar la app,
   así al volver se reintentan en vez de perderse con la primera lectura */
const LS_PEND = 'rr1_pend';
let chain: Promise<unknown> = Promise.resolve();
let retryT: ReturnType<typeof setTimeout> | null = null;
let refreshT: ReturnType<typeof setTimeout> | null = null;
let booted = false;

/* el aviso lo da la capa de acciones; acá solo hace falta mostrar un mensaje */
let notify: (msg: string, ms?: number) => void = () => {};
export const setNotifier = (fn: typeof notify) => {
  notify = fn;
};

const sb = () => supabaseBrowser();
const cloud = () => S.mode === 'cloud' && !!S.uid;

/* ---- qué sabemos de la nube ---- */
/* fecha de actualización de cada sesión tal como está en la nube (la escribe este cliente al subir) */
const stamp = new Map<string, string>();
let cfgStamp = '';
/* la nube devuelve las fechas con otro formato que el que mandamos («…Z» / «…+00:00»): se comparan como instantes */
const same = (a?: string, b?: string) => !!a && !!b && Date.parse(a) === Date.parse(b);
/* ya hubo una lectura completa: las siguientes pueden ser solo de lo que cambió */
let synced = false;

/* ---- cambios locales sin confirmar ---- */
const pend = new Set<string>();
const touched = new Map<string, number>();
const savePend = () => {
  try {
    localStorage.setItem(LS_PEND, JSON.stringify([...new Set([...pend, ...Object.keys(S.failed)])]));
  } catch {
    /* sin almacenamiento */
  }
};
/** ¿hay un cambio local de `key` que una lectura empezada en `t0` no puede pisar? */
const keepLocal = (key: string, t0: number) => pend.has(key) || !!S.failed[key] || (touched.get(key) ?? 0) >= t0;

/* ---- caché local ---- */
interface LocalCache {
  uid: string | null;
  cfg: Cfg;
  sessions: Session[];
  routes: Route[];
  stamps?: Record<string, string>;
  cfgStamp?: string;
}
export function persistLocal() {
  if (S.demo) return;
  try {
    const c: LocalCache = { uid: S.uid, cfg: S.cfg, sessions: S.sessions, routes: S.routes, stamps: synced ? Object.fromEntries(stamp) : undefined, cfgStamp };
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

/* en modo ejemplo los datos reales esperan a un costado */
const curSessions = () => (S.demo ? S.realSessions || [] : S.sessions);
const curRoutes = () => (S.demo ? S.realRoutes || [] : S.routes);
function putData(p: { sessions?: Session[]; cfg?: Cfg; routes?: Route[] }) {
  if (S.demo) setS({ ...(p.sessions ? { realSessions: p.sessions } : {}), ...(p.cfg ? { realCfg: p.cfg } : {}), ...(p.routes ? { realRoutes: p.routes } : {}) });
  else {
    setS(p);
    persistLocal();
  }
}

/* ---- escrituras ---- */
const setFailed = (key: string, on: boolean) => {
  if (!!S.failed[key] === on) return;
  const f = { ...S.failed };
  if (on) f[key] = true;
  else delete f[key];
  setS({ failed: f });
};
/** Sube algo a la nube en la cola. `keys`: lo que queda sin confirmar mientras tanto (una sesión, 'cfg', 'del_<id>'…). */
function cloudWrite(keys: string[], fn: () => Promise<{ error: unknown } | void>) {
  const now = Date.now();
  keys.forEach((k) => {
    pend.add(k);
    touched.set(k, now);
  });
  savePend();
  setS({ saving: S.saving + 1 });
  chain = chain
    .then(fn)
    .then((r) => {
      if (r && r.error) throw r.error;
      keys.forEach((k) => setFailed(k, false));
      if (S.cloudLost) setS({ cloudLost: false });
    })
    .catch((e) => {
      console.error(e);
      const first = !Object.keys(S.failed).length;
      keys.forEach((k) => setFailed(k, true));
      if (typeof navigator !== 'undefined' && !navigator.onLine) setS({ cloudLost: true });
      if (first) notify('No pude guardar en la nube. Tus datos siguen en este navegador y lo reintento solo en unos segundos.', 6000);
      retrySoon();
    })
    .then(() => {
      keys.forEach((k) => pend.delete(k));
      savePend();
      setS({ saving: S.saving - 1 });
    });
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
  const ids = keys.filter((k) => k !== 'cfg' && k !== 'routes' && !k.startsWith('del_'));
  keys.forEach((k) => {
    if (k === 'cfg') writeCfg();
    else if (k.startsWith('del_')) writeDelete(k.slice(4));
    else if (k === 'routes') writeRoutes(curRoutes());
  });
  writeSessions(S.sessions.filter((s) => ids.includes(s.id)));
}

const sessionRow = (s: Session) => {
  const row = { user_id: S.uid!, id: s.id, type: s.type, date: sdate(s) === '0000-00-00' ? null : sdate(s), data: cleanObj(s), updated_at: new Date().toISOString() };
  /* lo que subimos ya lo conocemos: el aviso en vivo de esta escritura no hace falta aplicarlo */
  stamp.set(s.id, row.updated_at);
  return row;
};

export function writeSession(s: Session): Promise<void> {
  if (!cloud()) return Promise.resolve();
  return cloudWrite([s.id], async () => sb().from('sessions').upsert(sessionRow(s)));
}
/** Muchas sesiones juntas (importar un respaldo, calcular la deriva): una escritura por cada 200. */
export function writeSessions(list: Session[]): Promise<void> {
  if (!cloud() || !list.length) return Promise.resolve();
  if (list.length === 1) return writeSession(list[0]);
  return cloudWrite(
    list.map((s) => s.id),
    async () => {
      const rows = list.map(sessionRow);
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await sb().from('sessions').upsert(rows.slice(i, i + 200));
        if (error) return { error };
      }
    },
  );
}
export function writeDelete(id: string) {
  setFailed(id, false);
  if (!cloud()) return;
  cloudWrite(['del_' + id], async () => sb().from('sessions').delete().eq('id', id)).then(() => stamp.delete(id));
}
export function writeCfg() {
  if (!cloud()) return;
  const updated_at = new Date().toISOString();
  cfgStamp = updated_at;
  cloudWrite(['cfg'], async () => sb().from('settings').upsert({ user_id: S.uid!, cfg: cleanObj(S.cfg), updated_at }));
}
export function writeRoutes(list: Route[]) {
  if (!cloud() || !list.length) return;
  cloudWrite(['routes'], async () => {
    const rows = list.map((r) => ({ user_id: S.uid!, id: r.id, strava_id: r.sid, date: r.date, name: r.name, km: r.km, tsec: r.tsec, poly: r.poly }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb().from('routes').upsert(rows.slice(i, i + 200));
      if (error) return { error };
    }
  });
}

/* ---- lectura ---- */
interface SessRow {
  id: string;
  data: unknown;
  updated_at: string;
}
interface RouteRow {
  id: string;
  strava_id: string;
  date: string;
  name: string;
  km: number;
  tsec: number;
  poly: string;
}
const ROUTE_COLS = 'id,strava_id,date,name,km,tsec,poly';
const toRoute = (r: RouteRow): Route => ({ id: r.id, sid: r.strava_id, date: String(r.date), name: r.name, km: Number(r.km), tsec: r.tsec, poly: r.poly });
const byDate = (a: Route, b: Route) => a.date.localeCompare(b.date);

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
/** solo las filas con estos ids (de a 100 por pedido) */
async function fetchIn<T>(table: string, cols: string, ids: string[]): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await sb()
      .from(table)
      .select(cols)
      .in('id', ids.slice(i, i + 100));
    if (error) throw error;
    out.push(...((data || []) as T[]));
  }
  return out;
}
/* la sesión que vino de la nube; si es la misma versión que ya tenemos, reuso el objeto (así no se pierden los
   puntajes y trofeos ya calculados, que se guardan por objeto) */
function fresh(loc: Session | undefined, r: SessRow): Session {
  const u = r.data && typeof r.data === 'object' ? (r.data as { updated?: number }).updated : undefined;
  if (loc && u && loc.updated === u) return loc;
  return normSession(r.data, r.id);
}

/** Trae todo de la nube y lo mezcla con lo local que todavía no se confirmó. */
async function pull() {
  const t0 = Date.now();
  const [cfgRows, sessRows, routeRows] = await Promise.all([
    fetchAll<{ cfg: unknown; updated_at: string }>('settings', 'cfg,updated_at'),
    fetchAll<SessRow>('sessions', 'id,data,updated_at'),
    fetchAll<RouteRow>('routes', ROUTE_COLS),
  ]);
  const prev = curSessions(),
    byId = new Map(prev.map((x) => [x.id, x]));
  stamp.clear();
  const sessions: Session[] = [];
  sessRows.forEach((r) => {
    stamp.set(r.id, r.updated_at);
    if (keepLocal('del_' + r.id, t0)) return;
    const loc = byId.get(r.id);
    sessions.push(keepLocal(r.id, t0) && loc ? loc : fresh(loc, r));
    byId.delete(r.id);
  });
  /* las creadas acá que todavía no llegaron a la nube */
  byId.forEach((x) => keepLocal(x.id, t0) && sessions.push(x));
  let routes = routeRows.map(toRoute);
  if (keepLocal('routes', t0)) curRoutes().forEach((r) => !routes.some((q) => q.id === r.id) && routes.push(r));
  routes = routes.sort(byDate);
  const row = cfgRows[0];
  const cfg = keepLocal('cfg', t0) ? (S.demo ? S.realCfg || S.cfg : S.cfg) : mergeCfg(row?.cfg);
  if (row && !keepLocal('cfg', t0)) cfgStamp = row.updated_at;
  synced = true;
  putData({ sessions, cfg, routes });
  setS({ loaded: true });
}

/** Al volver a la app: compara ids y fechas con la nube y trae solo lo nuevo o cambiado. */
async function refresh() {
  if (!synced) return pull();
  const t0 = Date.now();
  const [cfgIdx, idx, rIdx] = await Promise.all([
    fetchAll<{ updated_at: string }>('settings', 'updated_at'),
    fetchAll<{ id: string; updated_at: string }>('sessions', 'id,updated_at'),
    fetchAll<{ id: string }>('routes', 'id'),
  ]);
  /* sesiones */
  const srv = new Set(idx.map((r) => r.id));
  const rows = await fetchIn<SessRow>(
    'sessions',
    'id,data,updated_at',
    idx.filter((r) => !same(stamp.get(r.id), r.updated_at)).map((r) => r.id),
  );
  const byId = new Map(curSessions().map((x) => [x.id, x]));
  let changed = false;
  rows.forEach((r) => {
    stamp.set(r.id, r.updated_at);
    if (keepLocal(r.id, t0) || keepLocal('del_' + r.id, t0)) return;
    byId.set(r.id, fresh(byId.get(r.id), r));
    changed = true;
  });
  /* borradas desde otro dispositivo (solo las que alguna vez estuvieron en la nube) */
  [...byId.keys()].forEach((id) => {
    if (srv.has(id) || !stamp.has(id) || keepLocal(id, t0)) return;
    byId.delete(id);
    stamp.delete(id);
    changed = true;
  });
  /* configuración */
  let cfg: Cfg | undefined;
  const cu = cfgIdx[0]?.updated_at;
  if (cu && !same(cu, cfgStamp) && !keepLocal('cfg', t0)) {
    const { data, error } = await sb().from('settings').select('cfg,updated_at').limit(1);
    if (error) throw error;
    if (data && data[0]) {
      cfg = mergeCfg(data[0].cfg);
      cfgStamp = data[0].updated_at;
    }
  }
  /* recorridos: los que faltan o sobran */
  let routes: Route[] | undefined;
  const have = new Set(curRoutes().map((r) => r.id)),
    there = new Set(rIdx.map((r) => r.id));
  const miss = [...there].filter((id) => !have.has(id)),
    gone = !keepLocal('routes', t0) && curRoutes().some((r) => !there.has(r.id));
  if (miss.length || gone) {
    const add = (await fetchIn<RouteRow>('routes', ROUTE_COLS, miss)).map(toRoute);
    routes = curRoutes()
      .filter((r) => there.has(r.id) || keepLocal('routes', t0))
      .concat(add)
      .sort(byDate);
  }
  if (changed || cfg || routes) putData({ ...(changed ? { sessions: [...byId.values()] } : {}), ...(cfg ? { cfg } : {}), ...(routes ? { routes } : {}) });
  else if (!S.demo) persistLocal();
}
function refreshSoon(ms = 600) {
  if (refreshT) clearTimeout(refreshT);
  refreshT = setTimeout(() => {
    refreshT = null;
    refresh().catch((e) => console.error(e));
  }, ms);
}

/* ---- en vivo: un cambio por aviso ---- */
function onSession(p: RealtimePostgresChangesPayload<SessRow>) {
  const n = p.new as Partial<SessRow>,
    o = p.old as Partial<SessRow>;
  const id = n.id || o.id;
  if (!id || pend.has(id) || S.failed[id]) return;
  const list = curSessions();
  if (p.eventType === 'DELETE') {
    if (pend.has('del_' + id) || !list.some((x) => x.id === id)) return;
    stamp.delete(id);
    putData({ sessions: list.filter((x) => x.id !== id) });
    return;
  }
  /* el eco de lo que subimos nosotros: ya está */
  if (!n.updated_at || same(stamp.get(id), n.updated_at)) return;
  stamp.set(id, n.updated_at);
  const i = list.findIndex((x) => x.id === id),
    s = fresh(list[i], n as SessRow);
  putData({ sessions: i < 0 ? list.concat([s]) : list.map((x, j) => (j === i ? s : x)) });
}
function onSettings(p: RealtimePostgresChangesPayload<{ cfg: unknown; updated_at: string }>) {
  const n = p.new as { cfg?: unknown; updated_at?: string };
  if (!n.updated_at || same(n.updated_at, cfgStamp) || pend.has('cfg') || S.failed.cfg) return;
  cfgStamp = n.updated_at;
  putData({ cfg: mergeCfg(n.cfg) });
}

/** Arranque: sesión del usuario, caché local al instante y después la nube. */
export async function boot() {
  /* una sola vez aunque el efecto que lo llama corra dos veces (modo estricto de React en desarrollo) */
  if (booted) return;
  booted = true;
  const cache = loadLocal();
  let uid: string | null = null,
    email: string | null = null;
  if (supabaseConfigured()) {
    /* getSession lee la sesión guardada en el navegador, sin ir a la red (el proxy ya la validó y renovó al pedir
       la página). Así lo que está en este navegador se ve enseguida aunque haya poca señal; los datos los protege
       igual el RLS de Supabase. */
    let netErr = false;
    try {
      const { data, error } = await sb().auth.getSession();
      uid = data.session?.user.id ?? null;
      email = data.session?.user.email ?? null;
      netErr = !!error && error.name === 'AuthRetryableFetchError';
    } catch {
      netErr = true;
    }
    if (!uid) {
      /* la página puede venir del service worker sin pasar por el login: sin señal sigo con lo de este navegador
         (se sube cuando vuelva); con señal y sin sesión, al login */
      if ((netErr || !navigator.onLine) && cache?.uid) {
        uid = cache.uid;
        setS({ cloudLost: true });
      } else {
        location.replace('/login');
        return;
      }
    }
  }
  const mine = !!cache && (!uid || cache.uid === uid);
  if (cache && mine) {
    setS({ cfg: mergeCfg(cache.cfg), sessions: (cache.sessions || []).map((x) => normSession(x)), routes: cache.routes || [] });
  }
  if (!uid) {
    /* sin Supabase configurado (desarrollo): todo queda en este navegador */
    setS({ mode: 'local', loaded: true, uid: null, email: null });
    return;
  }
  /* lo que quedó sin confirmar la última vez se reintenta; mientras tanto, ninguna lectura lo pisa */
  let unconfirmed: string[] = [];
  try {
    unconfirmed = mine ? JSON.parse(localStorage.getItem(LS_PEND) || '[]') : [];
  } catch {
    /* sin almacenamiento */
  }
  setS({ mode: 'cloud', uid, email, loaded: mine, failed: Object.fromEntries(unconfirmed.map((k) => [k, true as const])) });
  if (mine && cache!.stamps) {
    Object.entries(cache!.stamps).forEach(([k, v]) => stamp.set(k, v));
    cfgStamp = cache!.cfgStamp || '';
    synced = true;
  }
  try {
    await refresh();
  } catch (e) {
    console.error(e);
    setS({ cloudLost: true, loaded: true });
    notify('No pude conectarme con tu cuenta. Te muestro lo último que había en este navegador.', 6000);
  }
  if (Object.keys(S.failed).length) retryFailed();
  /* en vivo: si cargás algo desde otro dispositivo, aparece acá */
  sb()
    .channel('rr-' + uid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: 'user_id=eq.' + uid }, onSession)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'user_id=eq.' + uid }, onSettings)
    .subscribe();
  window.addEventListener('online', () => {
    setS({ cloudLost: false });
    if (Object.keys(S.failed).length) retryFailed();
    refreshSoon(0);
  });
  window.addEventListener('offline', () => setS({ cloudLost: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshSoon(200);
  });
}
