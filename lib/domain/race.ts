/* Estimación de carrera, escenarios y reparto de ritmos, y la lista de pendientes del día de carrera
   (líneas 1932–1948 y 3062–3124 del original). */
import type { Race } from './types';
import { isLong } from './config';
import { riegel } from './score';
import { doneList, type DoneSession } from './stats';
import { addDays, dayDiff, dShort, pd, sod, sum, ymd } from './util';
import { lvCandAll, type LvCand } from './level';
import { medOf } from './analysis';

export interface Prediction {
  s: DoneSession;
  t: number;
  /** extremo optimista del rango (solo en distancias largas desde un test corto) */
  lo?: number;
}
export function predictRace(race: Race): Prediction | null {
  const today = new Date();
  const c = doneList()
    .filter((s) => s.type === 'test' && s.result.distKm >= 3 && s.result.distKm <= 21.1 && s.result.timeSec > 0 && dayDiff(pd(s.result.date), today) <= 84)
    .map((s) => ({ s, t: riegel(s.result.timeSec, s.result.distKm, race.km) }))
    .sort((a, b) => a.t - b.t);
  const b = c[0];
  if (!b) return null;
  /* en distancias largas desde un test corto doy un rango: Riegel (optimista) a exponente 1,10 (prudente) */
  if (isLong(race) && race.km / b.s.result.distKm > 2) return { s: b.s, lo: b.t, t: b.s.result.timeSec * Math.pow(race.km / b.s.result.distKm, 1.1) };
  return b;
}

/* ---- estimación de carrera con los entrenamientos desde que empezó el plan ----
   Cada serie, tempo o test se pasa a un 10K equivalente. La tendencia se mide solo entre sesiones
   del mismo tipo (las series dan tiempos más rápidos que los tempos), y el nivel de hoy combina los tipos.
   La proyección al día de la carrera sigue tu tendencia, con un tope prudente de 3% de mejora por mes. */
export interface TrainCand extends LvCand {
  /** 10K equivalente */
  s10: number;
  t: number;
}
export interface TrainEst {
  C: TrainCand[];
  from: string;
  slope: number;
  lv: { k: LvCand['k']; n: number; w: number; v: number }[];
  cur: number;
  proj: number;
  capped: boolean;
  last: number;
  /** 10K equivalente → tiempo en la distancia de la carrera */
  conv: (s: number) => number;
}
export function trainEst(race: Race): TrainEst | null {
  const today = sod(new Date()),
    tS = ymd(today),
    from = race.planStart && race.planStart <= tS ? race.planStart : ymd(addDays(today, -56));
  const C: TrainCand[] = lvCandAll(false)
    .filter((c) => c.date >= from && c.date <= tS)
    .map((c) => {
      /* el tempo se corre más lento que el ritmo de 10K: ~4,5% (antes se tomaba casi igual) */
      const s10 = c.k === 'tempo' ? (c.sec / 0.99) * 0.955 : c.sec;
      return { ...c, s10, t: pd(c.date).getTime() };
    })
    .sort((a, b) => a.t - b.t);
  if (!C.length) return null;
  const sl: number[] = [];
  C.forEach((a, i) =>
    C.forEach((b, j) => {
      if (j > i && a.k === b.k && b.t > a.t) sl.push((b.s10 - a.s10) / ((b.t - a.t) / 864e5));
    }),
  );
  const slope = sl.length >= 2 ? medOf(sl)! : 0,
    last = C[C.length - 1].t;
  const lv = [...new Set(C.map((c) => c.k))].map((k) => {
    const L = C.filter((c) => c.k === k);
    return { k, n: L.length, w: k === 'test' ? 2 : 1, v: medOf(L.map((c) => c.s10 - (slope * (c.t - last)) / 864e5))! };
  });
  const cur10 = sum(lv.map((o) => o.v * o.w)) / sum(lv.map((o) => o.w));
  const days = Math.max(0, (pd(race.date).getTime() - last) / 864e5),
    capped = cur10 * (1 - (0.03 * days) / 30.44),
    byTrend = cur10 + Math.min(0, slope) * days;
  const proj10 = Math.max(capped, byTrend);
  const conv = (s: number) => (race.km === 10 ? s : riegel(s, 10, race.km) * (race.km > 21.2 ? 1.03 : 1));
  return { C, from, slope, lv, cur: conv(cur10), proj: conv(proj10), capped: byTrend < capped, last, conv };
}

/* estimación única de carrera (la usan Predicción, Preparación y Ritmo de carrera):
   el test manda si es más nuevo que tus últimas series y tempos; si no, mandan los entrenamientos */
export type RaceEst =
  | { src: 'test'; t: number; lo?: number; pr: Prediction; te: TrainEst | null }
  | { src: 'train'; t: number; cur: number; te: TrainEst; pr: Prediction | null };
export function raceEst(race: Race): RaceEst | null {
  const te = trainEst(race),
    pr = predictRace(race);
  if (pr && (!te || pr.s.result.date >= ymd(new Date(te.last)))) return { src: 'test', t: pr.t, lo: pr.lo, pr, te };
  if (te) return { src: 'train', t: Math.round(te.proj / 5) * 5, cur: Math.round(te.cur / 5) * 5, te, pr };
  return null;
}

export interface RaceScen {
  id: 'meta' | 'real' | 'seg';
  n: string;
  sec: number;
  x: string;
  te?: TrainEst;
}
export function raceScen(race: Race): RaceScen[] {
  const sc: RaceScen[] = [],
    rnd5 = (t: number) => Math.round(t / 5) * 5;
  if (race.targetSec > 0) sc.push({ id: 'meta', n: 'Meta', sec: race.targetSec, x: 'Tu objetivo.' });
  let real: { sec: number; x: string; te?: TrainEst } | null = null;
  const e = raceEst(race);
  if (e && e.src === 'train') real = { sec: rnd5(e.t), x: 'Según tus entrenamientos desde el ' + dShort(pd(e.te.from)) + ' y cómo vienen mejorando.', te: e.te };
  else if (e) real = { sec: rnd5(e.lo ? (e.lo + e.t) / 2 : e.t), x: 'Según tu último test' + (e.lo ? ', en el medio del rango estimado' : '') + '.' };
  if (real) sc.push({ id: 'real', n: 'Realista', ...real });
  if (sc.length) sc.push({ id: 'seg', n: 'Seguro', sec: rnd5(sc[sc.length - 1].sec * 1.02), x: 'Salida más cauta: un 2% más lento.' });
  return sc;
}

/* reparto de ritmo: salida un poco más lenta, medio parejo y final más rápido; las diferencias suman cero */
export function raceSplits(tot: number, km: number) {
  const n = Math.max(1, Math.ceil(km - 1e-6)),
    P = tot / km,
    A = km > 21.2 ? 4 : km > 10.5 ? 5 : 6,
    B = km > 21.2 ? 2 : km > 10.5 ? 3 : 4,
    L: number[] = [],
    O: number[] = [];
  for (let i = 0; i < n; i++) {
    const len = i < n - 1 ? 1 : km - (n - 1),
      f = (i + len / 2) / km;
    L.push(len);
    O.push(f < 0.3 ? (A * (0.3 - f)) / 0.3 : f > 0.7 ? (-B * (f - 0.7)) / 0.3 : 0);
  }
  const mo = sum(O.map((o, i) => o * L[i])) / km;
  let c = 0;
  return O.map((o, i) => {
    const pc = P + o - mo;
    c += pc * L[i];
    return { km: i < n - 1 ? i + 1 : Math.round(km * 100) / 100, pace: pc, cum: c };
  });
}
export const racePhases = (km: number) => {
  const a = Math.max(1, Math.round(km * 0.3)),
    b = Math.max(a + 1, Math.round(km * 0.7));
  return { a, b, end: Math.round(km * 10) / 10 };
};

/** pendientes del día de carrera: [días antes, texto, id] (el id se guarda en cfg.rcs[carrera]) */
export type RcItem = [number, string, string];
export function rcItems(race: Race): RcItem[] {
  const long = isLong(race),
    I: RcItem[] = [
      [14, 'Confirmá dónde y cuándo retirás el kit (número y chip)' + (race.place ? ' y cómo llegás a ' + race.place : '') + '.', 'i0'],
      [7, 'Probá en un entrenamiento lo que vas a usar en la carrera: zapatillas, medias, ropa y lo que vayas a tomar o comer.', 'i1'],
      [7, 'Hablá con tu entrenador sobre la semana previa y seguí lo que te marque.', 'i2'],
      [5, 'Mirá el pronóstico para la hora de largada (calor, humedad, viento) y elegí la ropa más liviana.', 'i3'],
      [2, 'Nada nuevo en comidas ni zapatillas. Evitá el gimnasio pesado de piernas. Dormí bien: la noche que más cuenta es la de hoy.', 'i5'],
      [1, 'Dejá lista la mochila: número, alfileres o cinturón, reloj cargado, ropa y zapatillas.', 'i6'],
      [1, 'Cargá el reloj y dejá el modo carrera con la pausa automática desactivada.', 'i7'],
      [0, 'Última comida liviana y conocida unas 3 o 4 horas antes de la largada.', 'i8'],
      [0, 'Llegá con tiempo, hacé la entrada en calor y andá al corral 10 minutos antes.', 'i9'],
    ];
  if (long)
    I.push(
      [28, 'Probá en 2 o 3 tiradas largas los geles o la bebida que vas a usar en carrera y en qué km los tomás.', 'm0'],
      [3, 'Carga de carbohidratos: en los 2 o 3 días previos, que la mayor parte de cada comida sean carbohidratos (pasta, arroz, pan), con poca fibra y grasa. Tomá agua durante todo el día.', 'm1'],
    );
  else I.push([3, 'Comé lo de siempre pero con un poco más de carbohidratos y tomá agua durante todo el día.', 'i4']);
  return I.sort((a, b) => b[0] - a[0]);
}
