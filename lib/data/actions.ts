/* Acciones que cambian datos o navegan. Las vistas y hojas usan esto en vez de tocar el estado a mano. */
import { S, setS, setUi } from '@/lib/store';
import { closeSheet } from '@/lib/sheets';
import { reduceMotion } from '@/lib/motion';
import { afterPaint, navigate } from '@/lib/nav';
import type { Cfg, Route, Session } from '@/lib/domain/types';
import { normCfg, normRace } from '@/lib/domain/defaults';
import { addDays, cleanObj, ymd } from '@/lib/domain/util';
import { demoRoutes, demoSessions } from './demo';
import { persistLocal, retryFailed, writeCfg, writeDelete, writeRoutes, writeSession, writeSessions } from './sync';

/* ---- avisos ---- */
export function toast(msg: string, ms = 3000, action?: { label: string; run: () => void }) {
  setS({ toast: { msg, ms, key: Date.now() + Math.random(), action } });
}
/** aviso con «Deshacer» (7 segundos) */
export function toastUndo(msg: string, run: () => void) {
  toast(msg, 7000, { label: 'Deshacer', run });
}
export const buzz = (ms?: number) => {
  try {
    if (navigator.vibrate) navigator.vibrate(ms || 8);
  } catch {
    /* sin vibración */
  }
};

/* ---- datos ---- */
export function blockDemo() {
  if (S.demo) {
    toast('Estás viendo datos de ejemplo. Salí del modo ejemplo para guardar.');
    return true;
  }
  return false;
}
const upsert = (list: Session[], s: Session) => {
  const i = list.findIndex((x) => x.id === s.id);
  if (i < 0) return list.concat([s]);
  const n = list.slice();
  n[i] = s;
  return n;
};
/** Guarda (crea o reemplaza) una sesión. Devuelve false si estás en modo ejemplo. */
export function saveSession(s: Session): Promise<boolean> {
  if (blockDemo()) return Promise.resolve(false);
  const n: Session = { ...s, updated: Date.now() };
  setS({ sessions: upsert(S.sessions, n) });
  persistLocal();
  return writeSession(n).then(() => true);
}
/** Varias sesiones de una vez (por ejemplo, al calcular la deriva de muchos fondos). No avisa del modo ejemplo. */
export function saveSessions(list: Session[]): Promise<void> {
  if (S.demo || !list.length) return Promise.resolve();
  let all = S.sessions;
  const now = Date.now();
  const ns = list.map((s) => ({ ...s, updated: now }));
  ns.forEach((s) => {
    all = upsert(all, s);
  });
  setS({ sessions: all });
  persistLocal();
  return writeSessions(ns);
}
export function deleteSession(id: string) {
  if (blockDemo()) return;
  setS({ sessions: S.sessions.filter((x) => x.id !== id) });
  persistLocal();
  writeDelete(id);
}
/** Guarda la configuración nueva (pasala ya normalizada con normCfg si cambiaste carreras, zonas o zapatillas). */
export function saveCfg(cfg: Cfg) {
  if (blockDemo()) return;
  setS({ cfg });
  persistLocal();
  writeCfg();
}
/** Suma recorridos nuevos de Strava (los que ya están, por id, se reemplazan). */
export function saveRoutes(fresh: Route[]) {
  if (S.demo || !fresh.length) return;
  const ids = new Set(fresh.map((r) => r.id));
  const all = S.routes
    .filter((r) => !ids.has(r.id))
    .concat(fresh)
    .sort((a, b) => a.date.localeCompare(b.date));
  setS({ routes: all });
  persistLocal();
  writeRoutes(fresh);
}
export { retryFailed, reduceMotion, afterPaint };

/* ---- modo ejemplo ---- */
export function demoOn() {
  const sessions = demoSessions();
  setS({ realSessions: S.sessions, realCfg: S.cfg, realRoutes: S.routes, demo: true, sessions, routes: demoRoutes(sessions), weekOff: 0, paceType: null });
  navigate('/semana', () => jumpTo(0));
}
export function demoOff() {
  setS({ demo: false, sessions: S.realSessions || [], cfg: S.realCfg || S.cfg, routes: S.realRoutes || [], realSessions: null, realCfg: null, realRoutes: null, paceType: null });
}

/* ---- navegación ---- */
export const jumpTo = (y: number) => {
  try {
    window.scrollTo({ top: y, left: 0, behavior: 'instant' as ScrollBehavior });
  } catch {
    window.scrollTo(0, y);
  }
};
export function weekGo(d: number) {
  const dir = d === 0 ? (S.weekOff > 0 ? -1 : 1) : d;
  setS({ weekOff: d === 0 ? 0 : S.weekOff + d });
  if (reduceMotion()) return;
  afterPaint(() => {
    document.querySelectorAll<HTMLElement>('.sem-wsum,.sem-days').forEach((el) => {
      el.style.setProperty('--d', String(dir));
      el.classList.remove('wkslide');
      void el.offsetWidth;
      el.classList.add('wkslide');
    });
  });
}
export function goForm() {
  navigate('/analisis/forma', () => jumpTo(0));
}
export function goChar() {
  setUi('logSub', 'pj');
  navigate('/logros', () => jumpTo(0));
}
/** después de agregar algo en Ajustes: lleva a su nombre para escribirlo */
export const focusField = (id: string) =>
  afterPaint(() => {
    const e = document.getElementById(id) as HTMLInputElement | null;
    if (!e) return;
    e.scrollIntoView({ block: 'center' });
    e.focus();
    e.select();
  });
/** carrera nueva de `km` a 90 días (desde Ajustes o desde las distancias de Carreras): lleva a Ajustes con su nombre
    listo para escribir */
export function addRace(km = 10, name = 'Nueva carrera') {
  if (blockDemo()) return;
  const c = cleanObj(S.cfg),
    r = normRace({ name, km, date: ymd(addDays(new Date(), 90)) }, c);
  c.races.push(r);
  const n = normCfg(c);
  setUi('raceDel', null);
  saveCfg(n);
  const id = 'st-r' + n.races.findIndex((x) => x.id === r.id) + '-name';
  navigate('/ajustes', () => focusField(id));
}
export function goRaces() {
  closeSheet();
  navigate('/ajustes', () => document.getElementById('st-races')?.scrollIntoView({ block: 'start' }));
}
export function goShoes() {
  navigate('/ajustes', () => document.getElementById('st-shoes')?.scrollIntoView({ block: 'start' }));
}
