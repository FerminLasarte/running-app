/* Estadísticas sobre las sesiones: km por semana y mes, racha, carga, eficiencia, semana del plan. */
import { S } from '@/lib/store';
import type { Plan, Result, Session, SessionType, Step } from './types';
import { TYPES, nextRace } from './config';
import { scoreSession, type Score } from './score';
import { REC_PACE, expand, stepsBrief } from './stages';
import { addDays, dayDiff, fmt, fmtPace, mondayOf, pad, pd, sod, sum, todayS, ymd } from './util';

/** fecha de la sesión: la del resultado si está hecha, si no la del plan */
export const sdate = (s: Session) => (s.result && s.result.date) || (s.plan && s.plan.date) || '0000-00-00';

/** sesión hecha (con resultado y distancia), con el tipo afinado para no repetir `!` */
export type DoneSession = Session & { result: Result };

/* las listas derivadas se recalculan muchas veces por render: las guardo mientras no cambien las sesiones */
let DL: { src: Session[] | null; v: DoneSession[] } = { src: null, v: [] };
export const doneList = (): DoneSession[] => {
  if (DL.src !== S.sessions)
    DL = {
      src: S.sessions,
      v: (S.sessions.filter((s) => s.result && s.result.distKm > 0) as DoneSession[]).sort((a, b) => a.result.date.localeCompare(b.result.date)),
    };
  return DL.v;
};
export function kmBetween(a: Date, b: Date) {
  const x = ymd(a),
    y = ymd(b);
  return sum(
    doneList()
      .filter((s) => s.result.date >= x && s.result.date <= y)
      .map((s) => s.result.distKm),
  );
}
export type ByType = Partial<Record<SessionType, number>>;
export function kmByType(it: DoneSession[]) {
  const o: ByType = {};
  it.forEach((s) => {
    o[s.type] = (o[s.type] || 0) + s.result.distKm;
  });
  return o;
}
export const typeParts = (bt: ByType) =>
  (Object.keys(TYPES) as SessionType[]).filter((k) => bt[k]! > 0).map((k) => ({ v: bt[k]!, c: TYPES[k].t, k }));
export const typeRead = (bt: ByType) => {
  const P = typeParts(bt);
  return P.length > 1 ? ' (' + P.map((q) => TYPES[q.k].label.toLowerCase() + ' ' + fmt(q.v, 1)).join(', ') + ')' : '';
};

export interface WeekRow {
  start: Date;
  end: Date;
  km: number;
  count: number;
  cur: boolean;
  bt: ByType;
}
export function weekSeries(maxN?: number): WeekRow[] {
  const d = doneList();
  if (!d.length) return [];
  const m0 = mondayOf(new Date()),
    first = mondayOf(pd(d[0].result.date));
  let n = Math.round(dayDiff(first, m0) / 7) + 1;
  if (maxN) n = Math.min(n, maxN);
  const out: WeekRow[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = addDays(m0, -7 * i),
      e = addDays(m, 6),
      x = ymd(m),
      y = ymd(e);
    const it = d.filter((s) => s.result.date >= x && s.result.date <= y);
    out.push({ start: m, end: e, km: sum(it.map((s) => s.result.distKm)), count: it.length, cur: i === 0, bt: kmByType(it) });
  }
  return out;
}
export interface MonthRow {
  m: Date;
  km: number;
  count: number;
  cur: boolean;
  bt: ByType;
}
export function monthSeries(maxN?: number): MonthRow[] {
  const d = doneList();
  if (!d.length) return [];
  const now = new Date(),
    f = pd(d[0].result.date);
  let n = (now.getFullYear() - f.getFullYear()) * 12 + now.getMonth() - f.getMonth() + 1;
  if (maxN) n = Math.min(n, maxN);
  const out: MonthRow[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1),
      key = m.getFullYear() + '-' + pad(m.getMonth() + 1);
    const it = d.filter((s) => s.result.date.slice(0, 7) === key);
    out.push({ m, km: sum(it.map((s) => s.result.distKm)), count: it.length, cur: i === 0, bt: kmByType(it) });
  }
  return out;
}
export function streakInfo() {
  const G = S.cfg.weeklyGoal,
    d = S.sessions.filter((s) => s.result) as DoneSession[];
  const cnt = (m: Date) => {
    const x = ymd(m),
      y = ymd(addDays(m, 6));
    return d.filter((s) => s.result.date >= x && s.result.date <= y).length;
  };
  const m0 = mondayOf(new Date());
  let cur = 0,
    w = m0;
  if (cnt(w) >= G) cur++;
  w = addDays(w, -7);
  while (cnt(w) >= G && cur < 500) {
    cur++;
    w = addDays(w, -7);
  }
  let best = 0,
    run = 0;
  if (d.length) {
    const first = mondayOf(pd(d.map((s) => s.result.date).sort()[0]));
    for (let m = first; m <= m0; m = addDays(m, 7)) {
      if (cnt(m) >= G) {
        run++;
        best = Math.max(best, run);
      } else run = 0;
    }
  }
  return { cur, best: Math.max(best, cur), thisWeek: cnt(m0), goal: G };
}
export function loadInfo() {
  const d = doneList();
  if (!d.length) return null;
  const today = sod(new Date());
  if (dayDiff(pd(d[0].result.date), today) < 20) return null;
  const acute = kmBetween(addDays(today, -6), today),
    chronic = kmBetween(addDays(today, -27), today) / 4;
  if (chronic <= 0) return null;
  return { acute, chronic, ratio: acute / chronic };
}
export function deloadInfo() {
  const W = weekSeries();
  const comp = W.slice(0, -1);
  if (comp.length < 3) return null;
  let streak = 0;
  for (let i = comp.length - 1; i >= 0; i--) {
    if (comp[i].km <= 0) break;
    if (i > 0 && comp[i].km <= 0.8 * comp[i - 1].km) break;
    streak++;
  }
  return streak;
}
export function effPoints() {
  return doneList()
    .filter((s) => (s.type === 'fondo' || s.type === 'regen') && s.result.hrAvg! > 0 && s.result.timeSec > 0)
    .map((s) => ({ s, t: pd(s.result.date).getTime(), v: (s.result.distKm * 1000) / (s.result.timeSec / 60) / s.result.hrAvg! }));
}
export function planWeek() {
  const r = nextRace();
  if (!r || !r.planStart) return null;
  const st = pd(r.planStart),
    today = sod(new Date());
  const total = Math.ceil((dayDiff(st, pd(r.date)) + 1) / 7),
    wk = Math.floor(dayDiff(st, today) / 7) + 1;
  if (wk < 1 || wk > total) return null;
  return { wk, total, name: r.name };
}

/* ---- km y FC de una sesión planificada ---- */
export function stepKm(st: Step) {
  if (st.dist! > 0) return st.dist!;
  if (!(st.dur! > 0)) return 0;
  const pace = st.pf! > 0 ? (st.pf! + st.ps!) / 2 : st.k === 'run' ? 440 : REC_PACE;
  return st.dur! / pace;
}
export function planKmOf(s: Session) {
  const p = s.plan;
  if (!p) return 0;
  if (p.steps && p.steps.length) {
    const k = sum(expand(p.steps).map((e) => stepKm(e.st)));
    if (k > 0) return Math.round(k * 10) / 10;
  }
  return p.distKm! > 0 ? p.distKm! : 0;
}
export function hrRangeOf(s: Session): [number, number] | null {
  const p = s.plan;
  if (!p) return null;
  if (p.hrMin! > 0 && p.hrMax! > 0) return [p.hrMin!, p.hrMax!];
  if (p.steps) {
    const r = expand(p.steps).find((e) => e.k === 'run' && e.st.hl! > 0);
    if (r) return [r.st.hl!, r.st.hh!];
  }
  return null;
}
export function weekStats(mon: Date) {
  const x = ymd(mon),
    y = ymd(addDays(mon, 6)),
    tS = todayS();
  const ss = S.sessions.filter((q) => {
    const d = sdate(q);
    return d >= x && d <= y;
  });
  const done = ss.filter((q) => q.result) as DoneSession[],
    planned = ss.filter((q) => q.plan);
  const sc = done.map((q) => ({ s: q, r: scoreSession(q) })).filter((o): o is { s: DoneSession; r: Score & { score: number } } => !!o.r && o.r.score != null);
  const fr = done.filter((q) => (q.type === 'fondo' || q.type === 'regen') && q.result.hrAvg! > 0 && hrRangeOf(q));
  const mp = done.filter((q) => (q.type === 'series' || q.type === 'tempo') && q.result.mainPaceSec! > 0);
  const fe = done.filter((q) => q.result.feel! > 0);
  return {
    n: ss.length,
    done: done.length,
    planned: planned.length,
    doneOfPlanned: planned.filter((q) => q.result).length,
    missed: ss.filter((q) => q.missed && !q.result).length,
    pend: ss.filter((q) => q.plan && !q.result && !q.missed && sdate(q) < tS).length,
    km: sum(done.map((q) => q.result.distKm || 0)),
    planKm: sum(planned.map(planKmOf)),
    time: sum(done.map((q) => q.result.timeSec || 0)),
    score: sc.length ? sum(sc.map((o) => o.r.score)) / sc.length : null,
    sc,
    frOk: fr.filter((q) => {
      const g = hrRangeOf(q)!,
        h = q.result.hrAvg!;
      return h >= g[0] && h <= g[1];
    }).length,
    frN: fr.length,
    mainPace: mp.length ? sum(mp.map((q) => q.result.mainPaceSec!)) / mp.length : null,
    feel: fe.length ? sum(fe.map((q) => q.result.feel!)) / fe.length : null,
    pain: done.filter((q) => q.result.pain).length,
  };
}

/* ---- resúmenes de una línea ---- */
export function planSummary(p: Plan | null) {
  if (!p) return '';
  if (p.steps && p.steps.length) return stepsBrief(p.steps);
  const a: string[] = [];
  a.push(p.distKm! > 0 ? fmt(p.distKm, 2) + ' km' : p.durMin! > 0 ? fmt(p.durMin, 0) + ' min' : '');
  if (p.hrMin! > 0) a.push('FC ' + p.hrMin + '–' + p.hrMax);
  if (p.paceSec! > 0) a.push(fmtPace(p.paceSec!) + '/km');
  return a.filter(Boolean).join(' · ');
}
export function resSummary(r: Result) {
  const a = [fmt(r.distKm, 2) + ' km', fmtPace(r.mainPaceSec || r.paceSec) + '/km'];
  if (r.hrAvg! > 0) a.push(r.hrAvg + ' lpm');
  return a.join(' · ');
}
