/* Desafíos: metas con fecha (km, salidas, horas, salida más larga o plan cumplido). */
import { S, getUi, setUi } from '@/lib/store';
import { blockDemo, saveCfg, toast } from '@/lib/data/actions';
import { longRace } from './blocks';
import { doneList, monthSeries, planKmOf, sdate, weekSeries } from './stats';
import type { Challenge, SessionType } from './types';
import { addDays, cap, cleanObj, dateLabel, daysTo, DF_MY, dShort, fmt, mondayOf, pd, sod, sum, todayS, ymd } from './util';

export type ChKind = 'km' | 'runs' | 'hours' | 'long' | 'plan';
export const CH_KINDS: Record<ChKind, { n: string; u: string }> = {
  km: { n: 'Kilómetros', u: 'km' },
  runs: { n: 'Salidas', u: 'salidas' },
  hours: { n: 'Horas', u: 'h' },
  long: { n: 'Salida más larga', u: 'km' },
  plan: { n: 'Plan cumplido', u: '%' },
};
export const CH_KIND_KEYS = Object.keys(CH_KINDS) as ChKind[];
export const chKindOf = (k: string): { n: string; u: string } => CH_KINDS[k as ChKind] || CH_KINDS.km;

/** desafío sin id (los sugeridos todavía no tienen) */
export type ChSpec = Pick<Challenge, 'kind' | 'target' | 'from' | 'to' | 'name'>;
export interface ChProg {
  cur: number;
  done: boolean;
  doneDate: string | null;
  over: boolean;
  /** plan cumplido: cuántas sesiones planificadas hay en esas fechas y cuántas hiciste */
  n?: number;
  ok?: number;
}

export function chProgress(c: ChSpec): ChProg {
  const L = doneList().filter((x) => x.result.date >= c.from && x.result.date <= c.to),
    tS = todayS();
  let cur = 0,
    doneDate: string | null = null;
  if (c.kind === 'plan') {
    const P = S.sessions.filter((x) => x.plan && x.plan.date >= c.from && x.plan.date <= c.to),
      ok = P.filter((x) => x.result);
    cur = P.length ? Math.round((ok.length / P.length) * 100) : 0;
    if (P.length && ok.length === P.length && (c.to < tS || P.every((x) => x.result)))
      doneDate =
        ok
          .map((x) => x.result!.date)
          .sort()
          .pop() || null;
    return { cur, done: !!doneDate && cur >= c.target, doneDate, over: c.to < tS, n: P.length, ok: ok.length };
  }
  let a = 0;
  L.forEach((x) => {
    const r = x.result;
    if (c.kind === 'km') a += r.distKm;
    else if (c.kind === 'runs') a += 1;
    else if (c.kind === 'hours') a += r.timeSec / 3600;
    else if (c.kind === 'long') a = Math.max(a, r.distKm);
    if (!doneDate && a >= c.target) doneDate = r.date;
  });
  return { cur: a, done: !!doneDate, doneDate, over: c.to < tS };
}

export function chPresets(): ChSpec[] {
  const t = sod(new Date()),
    m0 = new Date(t.getFullYear(), t.getMonth(), 1),
    m1 = new Date(t.getFullYear(), t.getMonth() + 1, 0),
    mon = mondayOf(t),
    sun = addDays(mon, 6);
  /* metas un poco por encima de lo mejor reciente, para que cuesten pero se puedan */
  const M = monthSeries(4).filter((m) => !m.cur),
    avgM = M.length ? Math.max(sum(M.map((m) => m.km)) / M.length, M[M.length - 1].km) : 60,
    W = weekSeries(8).filter((w) => !w.cur),
    bestW = W.length ? Math.max(...W.map((w) => w.km)) : 25;
  const mes = DF_MY.format(t).split(' ')[0],
    r10 = (v: number) => Math.max(10, Math.round(v / 10) * 10),
    r5 = (v: number) => Math.max(5, Math.round(v / 5) * 5);
  const lr = longRace(),
    out: ChSpec[] = [
      { kind: 'km', target: r10(avgM * 1.1), from: ymd(m0), to: ymd(m1), name: r10(avgM * 1.1) + ' km en ' + mes },
      { kind: 'runs', target: S.cfg.weeklyGoal * 4 + 1, from: ymd(m0), to: ymd(m1), name: S.cfg.weeklyGoal * 4 + 1 + ' salidas en ' + mes },
      { kind: 'km', target: r5(bestW * 1.05), from: ymd(mon), to: ymd(sun), name: 'Semana de ' + r5(bestW * 1.05) + ' km' },
      { kind: 'plan', target: 100, from: ymd(m0), to: ymd(m1), name: 'Todo el plan de ' + mes },
    ];
  if (lr) {
    const d = ymd(addDays(pd(lr.date), -21)),
      dd = pd(d);
    if (d > todayS())
      out.push({ kind: 'long', target: 32, from: todayS(), to: d, name: 'Fondo de 32 km antes del ' + dShort(dd) + (dd.getFullYear() !== t.getFullYear() ? ' ' + dd.getFullYear() : '') });
  }
  /* no sugerir lo que ya está cumplido */
  return out.filter((q) => {
    const p = chProgress(q);
    return !p.done && !p.over;
  });
}

export function addChallenge(c: ChSpec) {
  if (blockDemo()) return;
  const cfg = cleanObj(S.cfg);
  cfg.challenges = (cfg.challenges || []).concat([Object.assign({ id: 'c_' + Date.now().toString(36) }, c)]);
  saveCfg(cfg);
  toast('Desafío creado: ' + c.name);
}

/** borrar pide un segundo toque */
export function delChallenge(id: string) {
  if (blockDemo()) return;
  if (getUi<string | null>('chDel', null) !== id) {
    setUi('chDel', id);
    toast('Tocá «Borrar» de nuevo para confirmar.', 3500);
    return;
  }
  setUi('chDel', null);
  const c = cleanObj(S.cfg);
  c.challenges = (c.challenges || []).filter((x) => x.id !== id);
  saveCfg(c);
  toast('Desafío borrado');
}

/** los desafíos en curso o por empezar (el que vence antes, primero) y los terminados (el más nuevo primero) */
export function chLists() {
  const C = S.cfg.challenges || [],
    tS = todayS(),
    live = (c: Challenge) => c.to >= tS && !chProgress(c).done;
  return {
    act: C.filter(live).sort((a, b) => a.to.localeCompare(b.to)),
    fin: C.filter((c) => !live(c)).sort((a, b) => b.to.localeCompare(a.to)),
  };
}

/** la sesión con su artículo, para las frases: «con el regenerativo de 8 km» */
const ART: Record<SessionType, string> = { fondo: 'el fondo', series: 'las series', tempo: 'el tempo', regen: 'el regenerativo', test: 'el test' };
const dayName = (d: string) => (d === todayS() ? 'hoy' : d === ymd(addDays(sod(new Date()), 1)) ? 'mañana' : 'el ' + dateLabel(d));
/** «26 oct», con el año si no es este («29 ago 2027») */
export const chDay = (d: string) => dShort(pd(d)) + (d.slice(0, 4) !== String(new Date().getFullYear()) ? ' ' + d.slice(0, 4) : '');
/** «octubre» si las fechas son un mes entero; si no, «1 oct al 15 oct» */
function chPeriod(c: ChSpec) {
  const a = pd(c.from);
  if (a.getDate() === 1 && ymd(new Date(a.getFullYear(), a.getMonth() + 1, 0)) === c.to) return DF_MY.format(a).split(' ')[0];
  return chDay(c.from) + ' al ' + chDay(c.to);
}
export interface ChView {
  state: 'run' | 'soon' | 'done' | 'over';
  /** el tipo y cuándo vence (o empieza, o de cuándo era) */
  lbl: string;
  /** lo que llevás y la meta, con su unidad («145,8», «de 150 km») */
  cur: string;
  of: string;
  /** de 0 a 1 */
  f: number;
  /** lo que falta, al lado del tipo (en curso) */
  left: string | null;
  /** cerca de cumplirlo: la barra va en tartán */
  hot: boolean;
  /** cómo seguir: con lo que tenés planificado o cuánto por día */
  note: string;
}
/** cómo se muestra un desafío: cuánto llevás, cuánto falta y, en curso, si lo planificado alcanza para cerrarlo */
export function chView(c: Challenge): ChView {
  const p = chProgress(c),
    K = chKindOf(c.kind),
    tS = todayS(),
    dec = c.kind === 'runs' || c.kind === 'plan' ? 0 : 1,
    fv = (v: number) => fmt(v, dec);
  const plan = c.kind === 'plan';
  const cur = plan ? fv(p.ok || 0) : fv(p.cur),
    of = plan ? 'de ' + (p.n || 0) + ((p.n || 0) === 1 ? ' sesión' : ' sesiones') : 'de ' + fv(c.target) + ' ' + K.u,
    f = Math.min(1, plan ? (p.n ? (p.ok || 0) / p.n : 0) : p.cur / c.target);
  const base = { cur, of, f, left: null, hot: false };
  if (p.done) return { ...base, state: 'done', lbl: K.n + ' · ' + chPeriod(c), note: 'Cumplido el ' + dShort(pd(p.doneDate!)) + '.' };
  if (p.over) return { ...base, state: 'over', lbl: K.n + ' · ' + chPeriod(c), note: 'Terminó en ' + cur + ' ' + of + '.' };
  if (c.from > tS) return { ...base, state: 'soon', lbl: K.n + ' · empieza el ' + chDay(c.from), note: chPeriod(c).replace(/^./, (x) => x.toUpperCase()) + '.' };
  const need = plan ? (p.n || 0) - (p.ok || 0) : c.target - p.cur,
    days = daysTo(c.to) + 1,
    lbl = K.n + ' · vence ' + (c.to === tS ? 'hoy' : 'el ' + chDay(c.to));
  /* lo planificado de acá al final que todavía no hiciste */
  const P = S.sessions.filter((x) => x.plan && !x.result && !x.missed && x.plan.date >= tS && x.plan.date <= c.to).sort((a, b) => sdate(a).localeCompare(sdate(b)));
  const per = days + (days === 1 ? ' día' : ' días');
  let note = 'Faltan ' + per + '.';
  if (c.kind === 'km') {
    let acc = 0;
    const by = P.find((x) => (acc += planKmOf(x)) >= need - 0.05);
    note = by
      ? (by === P[0] ? cap(dayName(sdate(by))) + ', con ' + ART[by.type] + ' de ' + fmt(planKmOf(by), 1) + ' km, lo cerrás.' : 'Con lo que tenés planificado lo cerrás ' + dayName(sdate(by)) + '.')
      : 'Faltan ' + per + ': ' + fmt(need / days, 1) + ' km por día.';
  } else if (c.kind === 'runs') note = P.length >= need ? 'Con lo que tenés planificado lo cerrás ' + dayName(sdate(P[Math.ceil(need) - 1])) + '.' : 'Faltan ' + per + ' y ' + Math.ceil(need) + (Math.ceil(need) === 1 ? ' salida.' : ' salidas.');
  else if (c.kind === 'long') {
    const by = P.find((x) => planKmOf(x) >= c.target - 0.05);
    if (by) note = cap(dayName(sdate(by))) + ', con ' + ART[by.type] + ' de ' + fmt(planKmOf(by), 1) + ' km, lo cumplís.';
  } else if (plan) note = need > 0 ? 'Te ' + (need === 1 ? 'queda 1 sesión' : 'quedan ' + need + ' sesiones') + ' por hacer.' : note;
  return { ...base, state: 'run', lbl, left: need > 0 ? 'Faltan ' + fv(need) : null, hot: f >= 0.85, note };
}
