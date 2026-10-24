/* Acciones que cambian datos o navegan. Las vistas y hojas usan esto en vez de tocar el estado a mano. */
import { S, setS, setUi, TAB_ORDER, type Tab } from '@/lib/store';
import { closeSheet } from '@/lib/sheets';
import { reduceMotion } from '@/lib/motion';
import type { Cfg, Route, Session } from '@/lib/domain/types';
import { demoSessions } from './demo';
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
export { retryFailed, reduceMotion };

/* ---- modo ejemplo ---- */
export function demoOn() {
  setS({ realSessions: S.sessions, realCfg: S.cfg, demo: true, sessions: demoSessions(), tab: 'week', weekOff: 0, paceType: null });
  jumpTo(0);
}
export function demoOff() {
  setS({ demo: false, sessions: S.realSessions || [], cfg: S.realCfg || S.cfg, realSessions: null, realCfg: null, paceType: null });
}

/* ---- navegación ---- */
export const jumpTo = (y: number) => {
  try {
    window.scrollTo({ top: y, left: 0, behavior: 'instant' as ScrollBehavior });
  } catch {
    window.scrollTo(0, y);
  }
};
/** después de que React dibuje la vista nueva */
export const afterPaint = (fn: () => void) => requestAnimationFrame(() => requestAnimationFrame(fn));
const scr: Partial<Record<Tab, number>> = {};

/* cada pestaña recuerda hasta dónde bajaste; tocar la pestaña en la que estás te sube arriba */
export function goTab(nv: Tab) {
  if (nv === S.tab) {
    window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
    return;
  }
  scr[S.tab] = window.scrollY;
  const dir = Math.sign(TAB_ORDER.indexOf(nv) - TAB_ORDER.indexOf(S.tab)) || 1;
  document.documentElement.style.setProperty('--vtd', String(dir));
  setS({ tab: nv, weekOff: 0 });
  afterPaint(() => jumpTo(scr[nv] || 0));
}
/** ir a otra pestaña dejando la posición actual guardada y arrancando arriba (o donde diga `then`) */
function goTo(tab: Tab, patch: Partial<Parameters<typeof setS>[0]> = {}, then?: () => void) {
  scr[S.tab] = window.scrollY;
  setS({ tab, ...patch });
  afterPaint(() => (then ? then() : jumpTo(0)));
}
export function weekGo(d: number) {
  const dir = d === 0 ? (S.weekOff > 0 ? -1 : 1) : d;
  setS({ weekOff: d === 0 ? 0 : S.weekOff + d });
  if (reduceMotion()) return;
  afterPaint(() => {
    document.querySelectorAll<HTMLElement>('#wk-card .weekhead>div,#wk-card .wstrip,.cal').forEach((el) => {
      el.style.setProperty('--d', String(dir));
      el.classList.remove('wkslide');
      void el.offsetWidth;
      el.classList.add('wkslide');
    });
  });
}
/** Carrera → sub-pestaña (`race`, `plan` o `lv`). Desde la medalla o una hoja, baja hasta el plan del día. */
export function goRace(v = 'race', scrollToPlan = false) {
  const fromSheet = !!S.sheet;
  if (fromSheet) closeSheet();
  setUi('cSub', v);
  goTo('lv', {}, () => {
    const c = document.querySelector('.rc-sec');
    jumpTo(c && v === 'race' && (scrollToPlan || fromSheet) ? c.getBoundingClientRect().top + window.scrollY - 90 : 0);
  });
}
export function goForm() {
  setS({ sumSub: 'forma' });
  goTo('sum');
}
export function goChar() {
  setUi('logSub', 'pj');
  goTo('top');
}
export function goRaces() {
  closeSheet();
  goTo('set', {}, () => document.getElementById('st-races')?.scrollIntoView({ block: 'start' }));
}
export function goShoes() {
  goTo('set', {}, () => document.getElementById('st-shoes')?.scrollIntoView({ block: 'start' }));
}
