/* Semana: carreras de la franja, sesiones pendientes, mover sesiones de día, planificar la semana entera y las
   corridas nuevas de Strava. Sin HTML: los componentes viven en components/semana/*. */
import { S, getUi, setUi } from '@/lib/store';
import { buzz, saveSession, toast, toastUndo } from '@/lib/data/actions';
import { openSheet } from '@/lib/sheets';
import { runActs, svCall, stravaErrMsg, type ListActivitiesPayload } from '@/lib/strava/client';
import type { Plan, PlanStep, Race, Session, SessionType } from './types';
import { TYPES, nextRace, racePaceSec } from './config';
import { expand, planTotals } from './stages';
import { planKmOf, sdate, weekStats } from './stats';
import { WD, addDays, cap, dateLabel, dayDiff, fmt, fmtDur, fmtPace, pd, sum, todayS, ymd } from './util';

/* ---- carreras ---- */
export function raceGoalTxt(r: Race) {
  if (!(r.targetSec > 0)) return fmt(r.km, r.km % 1 ? 1 : 0) + ' km · sin objetivo de tiempo';
  return 'Objetivo ' + (r.lt ? 'menos de ' : '') + fmtDur(r.targetSec) + ' · ' + fmtPace(racePaceSec(r)) + '/km' + (r.lt ? ' o más rápido' : '');
}
export function raceDateLabel(r: Pick<Race, 'date'>) {
  const d = pd(r.date);
  return cap(dateLabel(r.date)) + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
}

/* ---- sesiones de la semana ---- */
export const weekSessions = (mon: Date) => {
  const x = ymd(mon),
    y = ymd(addDays(mon, 6));
  return S.sessions.filter((s) => {
    const d = sdate(s);
    return d >= x && d <= y;
  });
};
/** km de la semana contando lo que falta: lo hecho más las planificadas sin hacer ni marcar como no hechas (la pista de
    Semana y la barra en curso de Análisis) */
export const weekTotalKm = (mon: Date) =>
  weekStats(mon).km +
  sum(
    weekSessions(mon)
      .filter((s) => s.plan && !s.result && !s.missed)
      .map(planKmOf),
  );
/** planificadas sin resultado ni marcadas como no hechas, de días anteriores a `tS` (las «para cargar») */
export const pendingSessions = (tS: string) =>
  S.sessions.filter((s) => s.plan && !s.result && !s.missed && sdate(s) < tS).sort((a, b) => sdate(a).localeCompare(sdate(b)));
/** la próxima sesión planificada desde `tS` (incluido) */
export const nextSession = (tS: string): Session | undefined =>
  S.sessions.filter((s) => s.plan && !s.result && !s.missed && sdate(s) >= tS).sort((a, b) => sdate(a).localeCompare(sdate(b)))[0];

/* ---- planificar la semana entera ---- */
export function planFromSteps(date: string, type: SessionType, steps: PlanStep[], notes?: string): Plan {
  const p: Plan = { date, type, steps },
    tot = planTotals(steps),
    runs = expand(steps).filter((e) => e.k === 'run');
  if (tot.dist > 0) p.distKm = Math.round(tot.dist * 100) / 100;
  const pr = runs.filter((e) => e.st.pf! > 0);
  if (pr.length) p.paceSec = Math.round(sum(pr.map((e) => (e.st.pf! + e.st.ps!) / 2)) / pr.length);
  const hr = runs.find((e) => e.st.hl! > 0);
  if (hr) {
    p.hrMin = hr.st.hl;
    p.hrMax = hr.st.hh;
  }
  if (notes) p.notes = String(notes).slice(0, 500);
  return p;
}

/* ---- mover una sesión de día ---- */
export const MV_REASONS = ['Lluvia o clima', 'Trabajo o estudio', 'Cansancio', 'Molestia', 'Otro'];
export const isHard = (x: Session) => x.type === 'series' || x.type === 'tempo' || x.type === 'test' || (x.type === 'fondo' && planKmOf(x) >= 15);
export const canMove = (s: Session | null | undefined): s is Session & { plan: Plan } => !!(s && s.plan && !s.result);
export function mvShort(d: string) {
  const x = pd(d);
  return WD[(x.getDay() + 6) % 7] + ' ' + x.getDate();
}
export function moveAdvice(s: Session, date: string, swapped?: string[]) {
  /* qué queda alrededor del día nuevo (sin contar la sesión que se mueve ni las que se intercambian) */
  const skip = new Set([s.id].concat(swapped || [])),
    out: string[] = [];
  const around = S.sessions.filter((x) => x.plan && !x.missed && !skip.has(x.id) && Math.abs(dayDiff(pd(date), pd(sdate(x)))) === 1 && isHard(x));
  if (isHard(s) && around.length)
    out.push(
      'Quedan dos sesiones fuertes en días seguidos (' +
        around.map((x) => TYPES[x.type].label.toLowerCase() + ' el ' + dateLabel(sdate(x))).join(', ') +
        '). Si podés, dejá un día suave en el medio, o hacé esta un poco más tranquila.',
    );
  if (date < todayS()) out.push('Es un día que ya pasó: sirve si la hiciste ese día y la querés cargar ahí.');
  const race = nextRace();
  if (race && isHard(s) && dayDiff(pd(date), pd(race.date)) >= 0 && dayDiff(pd(date), pd(race.date)) <= 2)
    out.push('Queda muy cerca de tu ' + race.name + ': mejor algo suave esos días.');
  return out;
}
/** sesiones planificadas sin resultado que ya ocupan ese día (sin contar `id`) */
export const occupiedOn = (date: string, id: string) => S.sessions.filter((x) => x.id !== id && sdate(x) === date && x.plan && !x.result);

export interface MoveUndo {
  id: string;
  date: string;
  moved: Plan['moved'] | null;
  missed: boolean;
}
/** list: [{id, date}]. Devuelve lo anterior para poder deshacer. */
export function applyMove(list: { id: string; date: string; reason?: string }[]): MoveUndo[] {
  const undo: MoveUndo[] = [];
  list.forEach((m) => {
    const s = S.sessions.find((x) => x.id === m.id);
    if (!canMove(s)) return;
    undo.push({ id: s.id, date: s.plan.date, moved: s.plan.moved || null, missed: !!s.missed });
    const p: Plan = { ...s.plan, date: m.date };
    p.moved = { from: (s.plan.moved && s.plan.moved.from) || s.plan.date, at: todayS(), reason: m.reason || '' };
    if (p.moved.from === m.date) delete p.moved;
    saveSession({ ...s, plan: p, missed: false });
  });
  return undo;
}
export function undoMove(U: MoveUndo[]) {
  if (!U.length) return;
  U.forEach((u) => {
    const s = S.sessions.find((x) => x.id === u.id);
    if (!s) return;
    const p: Plan = { ...s.plan!, date: u.date };
    if (u.moved) p.moved = u.moved;
    else delete p.moved;
    saveSession({ ...s, plan: p, missed: u.missed });
  });
  toast('Listo, volvió a su día');
}
/** aviso con «Deshacer» después de mover (una sola vez) */
export function toastMoveUndo(msg: string, U: MoveUndo[]) {
  let used = false;
  toastUndo(msg, () => {
    if (used) return;
    used = true;
    undoMove(U);
    buzz(8);
  });
}

/* ---- Strava desde la Semana ---- */
export const SV_DAYS = 21;
export function svType(n: unknown): SessionType | null {
  const t = String(n || '');
  return /serie|interval|\d\s*x\s*\d|×/i.test(t)
    ? 'series'
    : /tempo|umbral/i.test(t)
      ? 'tempo'
      : /fondo|larg|long/i.test(t)
        ? 'fondo'
        : /regen|suave|recup|transic|easy/i.test(t)
          ? 'regen'
          : null;
}
/** ids de Strava ya cargados (menos el de la sesión `exceptId`, la que se está editando) */
export function svLinked(exceptId?: string | null) {
  const ids = new Set<string>();
  S.sessions.forEach((x) => {
    if (x.result && x.result.sid && x.id !== exceptId) ids.add(String(x.result.sid));
  });
  return ids;
}
/** corridas de los últimos SV_DAYS días que todavía no están cargadas en otra sesión */
export function svActs(pl: ListActivitiesPayload | null, sid: string | null): SvItem[] {
  const lim = ymd(addDays(new Date(), -SV_DAYS)),
    linked = svLinked(sid);
  return runActs(pl).filter((a) => !linked.has(a.id) && a.date >= lim);
}
export interface SvItem {
  id: string;
  date: string;
  name: string;
  km: number;
  tsec: number;
}
export interface SvwState {
  list: SvItem[] | null;
  busy: boolean;
  msg: string;
}
export const SVW0: SvwState = { list: null, busy: false, msg: '' };

export async function svwLoad() {
  if (getUi('svw', SVW0).busy) return;
  const set = (p: Partial<SvwState>) => setUi<SvwState>('svw', (v) => ({ ...(v || SVW0), ...p }));
  set({ busy: true, msg: '' });
  try {
    const pl = await svCall('list_activities', { first: 30, ordering: 'StartDateLocalDesc' });
    const have = S.sessions.filter((x) => x.result);
    /* además de las ya vinculadas, se esconden las que parecen cargadas a mano (mismo día y casi la misma distancia) */
    const list = svActs(pl, null).filter((a) => a.km >= 0.5 && !have.some((x) => x.result!.date === a.date && Math.abs(x.result!.distKm - a.km) < 0.3));
    set({ list, msg: list.length ? '' : 'No hay corridas nuevas en los últimos ' + SV_DAYS + ' días.', busy: false });
  } catch (e) {
    set({ msg: stravaErrMsg(e), busy: false });
  }
}
/* abre el registro con la corrida elegida y la sesión planificada que mejor le corresponde (misma fecha, o el
   mismo tipo a 3 días como mucho); si no hay ninguna, como sesión libre con el tipo que sugiere el nombre */
export function svGo(id: string) {
  const a = (getUi('svw', SVW0).list || []).find((x) => x.id === id);
  if (!a) return;
  const g = svType(a.name),
    tS = todayS(),
    pend = S.sessions.filter((x) => x.plan && !x.result && !x.missed && sdate(x) <= tS);
  const dd = (x: Session) => Math.abs(dayDiff(pd(sdate(x)), pd(a.date)));
  let m: Session | null =
    pend.find((x) => sdate(x) === a.date) ||
    pend
      .filter((x) => !g || x.type === g)
      .sort((x, y) => dd(x) - dd(y))[0] ||
    null;
  if (m && dd(m) > 3) m = null;
  openSheet('result', { id: m ? m.id : null, free: !m, type: !m && g ? g : undefined, sv: { list: [a], pick: a.id } });
}
