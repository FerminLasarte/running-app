/* Ranking: criterios de orden y mejores marcas. */
import { S } from '@/lib/store';
import { TYPES } from './config';
import { scoreSession, keyPace } from './score';
import { doneList, monthSeries, weekSeries, type DoneSession } from './stats';
import { raceDateLabel } from './week';
import { cap, dateLabel, DF_MY, dShort, fmt, fmtDur, fmtPace, pd } from './util';

export interface SortDef {
  l: string;
  a: string;
  b: string;
  f: (s: DoneSession) => number | null | undefined;
  inv: boolean;
}
export const SORTS: Record<string, SortDef> = {
  score: {
    l: 'Puntaje',
    a: 'Mejores primero',
    b: 'Peores primero',
    f: (s) => {
      const c = scoreSession(s);
      return c && c.score != null ? c.score : null;
    },
    inv: false,
  },
  dist: { l: 'Distancia', a: 'Más largas primero', b: 'Más cortas primero', f: (s) => s.result.distKm, inv: false },
  pace: { l: 'Ritmo', a: 'Más rápidos primero', b: 'Más lentos primero', f: (s) => keyPace(s), inv: true },
  hr: { l: 'FC prom.', a: 'FC más alta primero', b: 'FC más baja primero', f: (s) => (s.result.hrAvg! > 0 ? s.result.hrAvg : null), inv: false },
  date: { l: 'Fecha', a: 'Más recientes primero', b: 'Más antiguas primero', f: (s) => pd(s.result.date).getTime(), inv: false },
  feel: { l: 'Sensación', a: 'Se sintió mejor primero', b: 'Se sintió peor primero', f: (s) => s.result.feel, inv: false },
};

/* mejores marcas: tiempos de carreras (cargados en Ajustes) y tests llevados a la distancia exacta, más récords de volumen */
export const MARK_DISTS: [number, string][] = [
  [5, '5K'],
  [10, '10K'],
  [15, '15K'],
  [21.0975, 'Media maratón'],
  [42.195, 'Maratón'],
];
export interface Mark {
  n: string;
  v: string;
  x: string;
  id?: string;
}
/** tu mejor tiempo en una distancia: carreras con tiempo cargado y tests llevados a la distancia exacta */
export interface Best {
  sec: number;
  src: string;
  id?: string;
}
export function bestAt(km: number, d: DoneSession[] = doneList()): Best | null {
  let best: Best | null = null;
  for (const r of S.cfg.races)
    if (r.resultSec! > 0 && Math.abs(r.km - km) / km < 0.02 && (!best || r.resultSec! < best.sec)) best = { sec: r.resultSec!, src: r.name + ' · ' + raceDateLabel(r) };
  for (const x of d) {
    const r = x.result;
    if (x.type === 'test' && r.timeSec > 0 && r.distKm >= km * 0.98 && r.distKm <= km * 1.05) {
      const sec = (r.timeSec / r.distKm) * km;
      if (!best || sec < best.sec) best = { sec, src: 'Test · ' + dateLabel(r.date), id: x.id };
    }
  }
  return best;
}
export function bestMarks(): Mark[] {
  const M: Mark[] = [],
    d = doneList();
  MARK_DISTS.forEach((q) => {
    const km = q[0],
      best = bestAt(km, d);
    if (best) M.push({ n: 'Mejor ' + q[1], v: fmtDur(best.sec), x: fmtPace(best.sec / km) + '/km · ' + best.src, id: best.id });
  });
  if (d.length) {
    const lg = d.slice().sort((a, b) => b.result.distKm - a.result.distKm)[0];
    M.push({ n: 'Salida más larga', v: fmt(lg.result.distKm, 1) + ' km', x: TYPES[lg.type].label + ' · ' + dateLabel(lg.result.date), id: lg.id });
    const W = weekSeries()
      .filter((w) => w.km > 0)
      .sort((a, b) => b.km - a.km)[0];
    if (W) M.push({ n: 'Semana con más km', v: fmt(W.km, 1) + ' km', x: 'Del ' + dShort(W.start) + ' al ' + dShort(W.end) + ' · ' + W.count + (W.count === 1 ? ' salida' : ' salidas') });
    const Mo = monthSeries()
      .filter((m) => m.km > 0)
      .sort((a, b) => b.km - a.km)[0];
    if (Mo) M.push({ n: 'Mes con más km', v: fmt(Mo.km, 0) + ' km', x: cap(DF_MY.format(Mo.m)) + ' · ' + Mo.count + (Mo.count === 1 ? ' salida' : ' salidas') });
    const se = d.filter((x) => x.type === 'series' && x.result.mainPaceSec! > 0).sort((a, b) => a.result.mainPaceSec! - b.result.mainPaceSec!)[0];
    if (se) M.push({ n: 'Series más rápidas', v: fmtPace(se.result.mainPaceSec!) + '/km', x: 'Promedio de las repeticiones · ' + dateLabel(se.result.date), id: se.id });
  }
  return M;
}

/* podio de Logros: tus mejores sesiones por distancia, puntaje o ritmo */
export type PodKey = 'dist' | 'score' | 'pace';
export interface PodRow {
  s: DoneSession;
  v: number;
  /** la carrera de ese día, si la sesión es un test o carrera */
  race?: string;
}
/** las `n` mejores con el criterio (las que no tienen el dato no entran); a igual valor, la más nueva */
export function podium(k: PodKey, n = 6): PodRow[] {
  const sk = SORTS[k];
  return doneList()
    .map((s) => ({ s, v: sk.f(s) }))
    .filter((x): x is { s: DoneSession; v: number } => x.v != null)
    .sort((a, b) => (sk.inv ? a.v - b.v : b.v - a.v) || b.s.result.date.localeCompare(a.s.result.date))
    .slice(0, n)
    .map((x) => ({ ...x, race: x.s.type === 'test' ? S.cfg.races.find((r) => r.date === x.s.result.date)?.name : undefined }));
}
