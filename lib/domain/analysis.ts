/* Análisis profundo: carga por sesión, forma y fatiga, km de calidad y FC vs ritmo (líneas 4201–4256 del original). */
import { S } from '@/lib/store';
import type { SessionType } from './types';
import { TYPE_KEYS, zoneRange } from './config';
import { keyPace } from './score';
import { doneList, effPoints, hrRangeOf, weekSeries, type DoneSession } from './stats';
import { addDays, dayDiff, mondayOf, num, pd, sod, sum, ymd } from './util';
import { memoData } from './memo';

export const LOAD_BUMP: Record<SessionType, number> = { series: 1.25, tempo: 1.25, test: 1.3, fondo: 1, regen: 0.9 };

/** carga de `sec` segundos con FC media `hr`: duración × (FC / FC máx)², con un plus para las de calidad. Sin FC, cuenta
    el 70% de la máxima. La usan las salidas hechas y la proyección de las planificadas */
export function loadFor(type: SessionType, sec: number, hr?: number) {
  const f = hr! > 0 ? hr! / S.cfg.hrMax : 0.7;
  return (sec / 60) * f * f * 1.6 * (LOAD_BUMP[type] || 1);
}
/** carga de una salida */
export function sessLoad(x: DoneSession) {
  return loadFor(x.type, x.result.timeSec, x.result.hrAvg);
}

export interface FormPoint {
  t: number;
  d: Date;
  /** forma (carga crónica, ~42 días) */
  ctl: number;
  /** fatiga (carga aguda, ~7 días) */
  atl: number;
  /** frescura = forma − fatiga */
  tsb: number;
}
/** un día más: la forma sigue a la carga de unas 6 semanas y la fatiga a la de unos 7 días */
export function formStep(p: { ctl: number; atl: number }, l: number) {
  const ctl = p.ctl + (l - p.ctl) / 42,
    atl = p.atl + (l - p.atl) / 7;
  return { ctl, atl, tsb: ctl - atl };
}
/** forma, fatiga y frescura día por día desde la primera salida; null con menos de 5 salidas o 3 semanas */
export const formSeries = memoData(function formSeries(): FormPoint[] | null {
  const d = doneList();
  if (d.length < 5) return null;
  const first = pd(d[0].result.date),
    today = sod(new Date()),
    n = dayDiff(first, today);
  if (n < 21) return null;
  const byDay: Record<string, number> = {};
  d.forEach((x) => {
    byDay[x.result.date] = (byDay[x.result.date] || 0) + sessLoad(x);
  });
  let p = { ctl: 0, atl: 0, tsb: 0 };
  const out: FormPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const day = addDays(first, i);
    p = formStep(p, byDay[ymd(day)] || 0);
    out.push({ t: day.getTime(), d: day, ...p });
  }
  return out;
});

/** km a ritmo fuerte de una sesión de calidad: «8x600 m» en la nota, o el 40% de la sesión */
export function hardKm(x: DoneSession) {
  const r = x.result;
  if (x.type === 'test') return r.distKm;
  if (x.type === 'series') {
    const m = (r.notes || '').match(/(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(km|m)\b/i);
    if (m) {
      let d = num(m[2]) as number;
      if (m[3].toLowerCase() === 'm') d /= 1000;
      const k = +m[1] * d;
      if (k > 0 && k < r.distKm) return k;
    }
  }
  return r.distKm * 0.4;
}

/* ---- FC vs ritmo: cuánto bajó tu frecuencia cardíaca para el mismo ritmo desde que empezaste ----
   Usa rodajes y fondos con FC. Eficiencia = metros por minuto ÷ FC; con eso se calcula
   la FC que necesitás para un ritmo fijo y el ritmo que sale con una FC fija. */
export const medOf = (a: number[]): number | null => {
  const s = a.slice().sort((x, y) => x - y),
    n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null;
};

/* tendencia robusta (Theil–Sen): la mediana de las pendientes entre todos los pares de salidas */
export function efTrend(R: { t: number; ef: number }[]): (d: number) => number {
  const sl: number[] = [];
  for (let i = 0; i < R.length; i++)
    for (let j = i + 1; j < R.length; j++) {
      const dt = (R[j].t - R[i].t) / 864e5;
      if (dt > 0) sl.push((R[j].ef - R[i].ef) / dt);
    }
  const m = sl.length ? (medOf(sl) as number) : 0,
    t0 = R[0].t,
    b = medOf(R.map((q) => q.ef - (m * (q.t - t0)) / 864e5)) as number;
  return (d) => b + (m * (d - t0)) / 864e5;
}

/* ---- Análisis: período, tendencias e intensidad ---- */

/** período de los gráficos de Análisis: las últimas n semanas contando la actual, o todo */
export type AnPeriod = '12s' | '26s' | '52s' | 'todo';
export const AN_PERIODS: [AnPeriod, string][] = [
  ['12s', '12 semanas'],
  ['26s', '26 semanas'],
  ['52s', 'Un año'],
  ['todo', 'Todo'],
];
export const anWeeks = (p: AnPeriod) => (p === 'todo' ? undefined : parseInt(p, 10));
/** primer día del período: el lunes de la primera semana que se ve (nunca antes de la semana de la primera salida) */
export function anFrom(p: AnPeriod) {
  const W = weekSeries(anWeeks(p));
  return W.length ? ymd(W[0].start) : ymd(mondayOf(new Date()));
}

/** km del año `y` */
export const yearKm = (y: number) =>
  sum(
    doneList()
      .filter((s) => s.result.date.startsWith(y + '-'))
      .map((s) => s.result.distKm),
  );

export interface PaceTrend {
  k: SessionType;
  /** ritmo principal de cada sesión (s/km) */
  pts: { t: number; v: number; s: DoneSession }[];
  /** la recta (Theil–Sen) entre la primera y la última sesión; con menos de 3 sesiones no hay */
  line: { t0: number; v0: number; t1: number; v1: number } | null;
}
/** ritmo principal de cada sesión desde `from`, por tipo, con la recta que muestra hacia dónde va cada uno */
export const paceTrends = memoData(function paceTrends(from: string): PaceTrend[] {
  return TYPE_KEYS.map((k) => {
    const pts = doneList()
      .filter((s) => s.type === k && s.result.date >= from)
      .map((s) => ({ t: pd(s.result.date).getTime(), v: keyPace(s), s }))
      .filter((p) => p.v > 0);
    if (pts.length < 3) return { k, pts, line: null };
    const f = efTrend(pts.map((p) => ({ t: p.t, ef: p.v }))),
      t0 = pts[0].t,
      t1 = pts[pts.length - 1].t;
    return { k, pts, line: { t0, v0: f(t0), t1, v1: f(t1) } };
  }).filter((q) => q.pts.length);
});

/** FC de referencia: la mediana de la FC de tus fondos y regenerativos, redondeada a 5 */
export function refHr(P = effPoints()) {
  const m = medOf(P.map((e) => e.s.result.hrAvg!));
  return m == null ? null : Math.round(m / 5) * 5;
}
export interface HrPace {
  /** la FC de referencia */
  hr: number;
  /** ritmo a esa FC (s/km), semana a semana: la mediana de las salidas de cada semana */
  weeks: { mon: Date; t: number; v: number; n: number }[];
  /** la tendencia de todas tus salidas, en ritmo a esa FC */
  at: (t: number) => number;
  first: number;
  last: number;
}
/** tu corazón: el ritmo que te sale a tu FC habitual, desde la primera salida con FC (sale de effPoints: metros por
    minuto por latido). Con menos de 4 salidas, null */
export const hrPace = memoData(function hrPace(): HrPace | null {
  const P = effPoints(),
    hr = refHr(P);
  if (hr == null || P.length < 4) return null;
  const pace = (ef: number) => 60000 / (ef * hr);
  const by = new Map<string, { mon: Date; ef: number[] }>();
  P.forEach((e) => {
    const mon = mondayOf(pd(e.s.result.date)),
      k = ymd(mon);
    if (!by.has(k)) by.set(k, { mon, ef: [] });
    by.get(k)!.ef.push(e.v);
  });
  const weeks = [...by.values()].map((w) => ({ mon: w.mon, t: w.mon.getTime(), v: pace(medOf(w.ef)!), n: w.ef.length }));
  const tr = efTrend(P.map((e) => ({ t: e.t, ef: e.v })));
  return { hr, weeks, at: (t) => pace(tr(t)), first: P[0].t, last: P[P.length - 1].t };
});

const isQuality = (x: DoneSession) => x.type === 'series' || x.type === 'tempo' || x.type === 'test';
/** reparto de intensidad por km: el trabajo de series, tempos y tests (hardKm) contra el resto, en % */
export function intensitySplit(L: DoneSession[]) {
  const tot = sum(L.map((x) => x.result.distKm));
  if (tot <= 0) return null;
  const hard = Math.round((sum(L.filter(isQuality).map(hardKm)) / tot) * 100);
  return { easy: 100 - hard, hard };
}

/** los fondos con FC contra el rango que tenían planificado (o Z2 si no tenían uno) */
export function fondoHrFit(L: DoneSession[]) {
  const fo = L.filter((x) => x.type === 'fondo' && x.result.hrAvg! > 0);
  if (!fo.length) return null;
  const tops = fo.map((x) => {
    const g = hrRangeOf(x) || zoneRange(1);
    return { h: x.result.hrAvg!, top: g[1], own: !!hrRangeOf(x) };
  });
  const over = tops.filter((q) => q.h > q.top);
  return {
    n: fo.length,
    ok: tops.length - over.length,
    /** FC media de los fondos */
    avg: Math.round(sum(fo.map((x) => x.result.hrAvg!)) / fo.length),
    /** cuántos tenían su propio rango planificado */
    own: tops.filter((q) => q.own).length,
    /** cuánto se pasaron, en promedio, los que se pasaron */
    by: over.length ? Math.round(sum(over.map((q) => q.h - q.top)) / over.length) : 0,
  };
}
