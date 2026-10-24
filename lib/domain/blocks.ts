/* Plan por bloques para media maratón y maratón (líneas 3340–3394 del original). */
import { S } from '@/lib/store';
import type { PhaseKey, Race } from './types';
import { upcomingRaces } from './config';
import { doneList, kmBetween, planKmOf } from './stats';
import { addDays, dayDiff, mondayOf, pd, sum, todayS, ymd } from './util';
import { memoData } from './memo';

export const PHASES: Record<PhaseKey, { n: string; c: string; x: string }> = {
  base: { n: 'Base', c: 'var(--t1)', x: 'Kilómetros fáciles y una sesión de calidad corta por semana. Se sube el volumen de a poco.' },
  dev: { n: 'Desarrollo', c: 'var(--t3)', x: 'Crece la tirada larga y entran los tempos y el trabajo de umbral.' },
  spec: { n: 'Específico', c: 'var(--t2)', x: 'Volumen máximo y tramos a ritmo de carrera dentro de las tiradas largas.' },
  taper: { n: 'Puesta a punto', c: 'var(--t4)', x: 'Baja el volumen y se mantiene algo de ritmo para llegar fresco.' },
};

export interface BlockWeek {
  /** número de semana (desde 1) */
  n: number;
  mon: Date;
  ph: PhaseKey;
  km: number;
  long: number;
  deload: boolean;
  /** nombre de la semana sacado de las notas de las sesiones cargadas («S3 · Descarga · …») */
  label?: string;
  count?: number;
  /** la semana de la carrera */
  race: boolean;
}
interface BlockBase {
  race: Race;
  weeks: BlockWeek[];
  N: number;
  peak: number;
  /** carrera anterior que todavía no se corrió (el plan arranca después) */
  prev: Race | null;
  started: boolean;
}
/** plan armado con las sesiones que ya tenés cargadas */
export interface BlockLoaded extends BlockBase {
  loaded: true;
  peakWeek: number;
  longest: number;
  longWeek: number;
  sessions: number;
}
/** plan genérico, desde tu volumen actual */
export interface BlockGeneric extends BlockBase {
  loaded: false;
  cur: number;
}
export type BlockPlan = BlockLoaded | BlockGeneric;

/* la usan Semana, Carrera y sus tarjetas en la misma pantalla: se calcula una vez por carrera */
export const blockPlan = memoData(
  function blockPlan(race: Race | null): BlockPlan | null {
    if (!race || race.km < 20) return null;
    const long = race.km > 30,
      peak = long ? 50 : 35,
      cap = { base: long ? 20 : 14, dev: long ? 26 : 16, spec: long ? 32 : 20 };
    /* el plan queda fijo: arranca en el inicio de plan cargado, o la semana después de la carrera anterior, o 24/16 semanas antes */
    const raceMon = mondayOf(pd(race.date)),
      m0 = mondayOf(new Date());
    const before =
      S.cfg.races
        .filter((r) => r.id !== race.id && r.date < race.date)
        .sort((a, b) => a.date.localeCompare(b.date))
        .pop() || null;
    const start = race.planStart ? mondayOf(pd(race.planStart)) : before ? addDays(mondayOf(pd(before.date)), 7) : addDays(raceMon, -7 * (long ? 24 : 16));
    const prev = before && before.date >= todayS() ? before : null,
      ref = start < m0 ? start : m0;
    const N = Math.round(dayDiff(start, raceMon) / 7) + 1;
    if (N < 4) return null;
    const taper = long ? 3 : 2,
      spec = Math.min(long ? 8 : 6, N - taper),
      dev = Math.min(long ? 7 : 4, N - taper - spec),
      base = N - taper - spec - dev;
    const phAt = (i: number, mon: Date): PhaseKey => {
      const F = (race.phases || []).filter((q) => q.from <= ymd(addDays(mon, 6))).pop();
      return F ? F.k : i < base ? 'base' : i < base + dev ? 'dev' : i < base + dev + spec ? 'spec' : 'taper';
    };
    /* si ya tenés las sesiones de esta preparación cargadas, el plan sale de ellas */
    const inWin = S.sessions.filter((x) => x.plan && x.plan.date >= ymd(start) && x.plan.date <= race.date);
    const weekOf = (date: string) => Math.floor(dayDiff(start, pd(date)) / 7);
    const covered = new Set(inWin.map((x) => weekOf(x.plan!.date))).size;
    if (covered >= Math.max(4, N * 0.6)) {
      const W: BlockWeek[] = [];
      for (let i = 0; i < N; i++) {
        const mon = addDays(start, 7 * i),
          a = ymd(mon),
          b = ymd(addDays(mon, 6)),
          ss = inWin.filter((x) => x.plan!.date >= a && x.plan!.date <= b);
        const ln = ss.map((x) => /^S\d+ · ([^·]+) ·/.exec(x.plan!.notes || '')).find(Boolean),
          label = ln ? ln[1].trim() : '';
        const lg = ss.filter((x) => x.type === 'fondo' || x.type === 'test').map(planKmOf);
        W.push({
          n: i + 1,
          mon,
          ph: phAt(i, mon),
          km: Math.round(sum(ss.map(planKmOf))),
          long: lg.length ? Math.round(Math.max(...lg)) : 0,
          deload: /descarga/i.test(label),
          label,
          count: ss.length,
          race: race.date >= a && race.date <= b,
        });
      }
      const pk = W.reduce((m, w) => (w.km > m.km ? w : m), W[0]),
        lgW = W.filter((w) => !w.race).reduce((m, w) => (w.long > m.long ? w : m), W[0]);
      return { race, weeks: W, N, peak: pk.km, peakWeek: pk.n, longest: lgW.long, longWeek: lgW.n, sessions: inWin.length, loaded: true, prev, started: start <= m0 };
    }
    /* punto de partida: las 4 semanas previas al inicio (o a hoy, si todavía no arrancó) */
    let cur = 0;
    for (let i = 1; i <= 4; i++) {
      const m = addDays(ref, -7 * i);
      cur += kmBetween(m, addDays(m, 6));
    }
    cur = Math.max(15, cur / 4);
    const rec = doneList()
      .filter((x) => x.result.date >= ymd(addDays(ref, -42)) && x.result.date < ymd(ref))
      .map((x) => x.result.distKm);
    let v = cur,
      L = Math.max(8, rec.length ? Math.max(...rec) : 0),
      k = 0;
    const W: BlockWeek[] = [];
    for (let i = 0; i < N; i++) {
      const mon = addDays(start, 7 * i),
        ph = phAt(i, mon);
      let km: number,
        lg: number,
        dl = false;
      if (ph === 'taper') {
        const t = N - 1 - i,
          f = long ? [0.4, 0.6, 0.75][t] : [0.5, 0.7][t];
        km = peak * f;
        lg = t === 0 ? race.km : cap.spec * (t === 1 ? 0.6 : 0.75);
      } else {
        k++;
        dl = k % 4 === 0;
        if (dl) {
          km = v * 0.75;
          lg = L * 0.75;
        } else {
          v = Math.min(v * 1.08, peak * (ph === 'base' ? 0.8 : ph === 'dev' ? 0.9 : 1));
          L = Math.min(L + 1.5, cap[ph]);
          km = v;
          lg = L;
        }
      }
      W.push({ n: i + 1, mon, ph, km: Math.round(km), long: Math.round(lg), deload: dl, race: i === N - 1 });
    }
    return { race, weeks: W, N, peak, cur, prev, started: start <= m0, loaded: false };
  },
  (race) => (race ? race.id : ''),
);
export const longRace = () => upcomingRaces().find((r) => r.km >= 20) || null;
export function blockWeekOf(P: BlockPlan | null, mon: Date) {
  const x = ymd(mon);
  return P ? P.weeks.find((w) => ymd(w.mon) === x) || null : null;
}
