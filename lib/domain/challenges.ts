/* Desafíos: metas con fecha (km, salidas, horas, salida más larga o plan cumplido). */
import { S } from '@/lib/store';
import { blockDemo, saveCfg, toast } from '@/lib/data/actions';
import { longRace } from './blocks';
import { doneList, monthSeries, weekSeries } from './stats';
import type { Challenge } from './types';
import { addDays, cleanObj, dShort, DF_MY, mondayOf, pd, sod, sum, todayS, ymd } from './util';

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
  n?: number;
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
    return { cur, done: !!doneDate && cur >= c.target, doneDate, over: c.to < tS, n: P.length };
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
