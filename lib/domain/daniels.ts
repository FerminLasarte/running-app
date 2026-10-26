/* Ritmos de entrenamiento (fórmula de Jack Daniels) y ritmos del plan (líneas 4311–4349 del original). */
import { S } from '@/lib/store';
import type { Plan, Session } from './types';
import { TYPES, racePaceSec } from './config';
import { expand } from './stages';
import { todayS } from './util';
import { longRace } from './blocks';

/** VDOT (capacidad aeróbica) de un tiempo en segundos para una distancia en km */
export function vdotOf(sec: number, km: number) {
  const t = sec / 60,
    v = (km * 1000) / t,
    vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v,
    pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
  return vo2 / pct;
}
/** tiempo (s) para `km` con el VDOT `vd`: la inversa de vdotOf, por bisección (vdotOf baja cuando el tiempo sube) */
export function vdotTime(vd: number, km: number) {
  let lo = km * 100,
    hi = km * 1200;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (vdotOf(m, km) > vd) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
/** ritmo (s/km) que corresponde a la fracción `f` del VDOT `vd` */
export function paceAtV(vd: number, f: number) {
  const need = f * vd + 4.6,
    v = (-0.182258 + Math.sqrt(0.182258 * 0.182258 + 4 * 0.000104 * need)) / (2 * 0.000104);
  return 60000 / v;
}

export interface PaceZone {
  k: 'e' | 'm' | 't' | 'i' | 'r';
  n: string;
  /** fracción del VDOT: [rápida, lenta] (iguales si es un ritmo único) */
  f: [number, number];
  z: string;
  c: string;
  u: string;
}
export const PZ: PaceZone[] = [
  { k: 'e', n: 'Fácil', f: [0.6, 0.68], z: 'Z2', c: 'var(--good)', u: 'Fondos y regenerativos. Mandan la FC y la charla: el ritmo es lo que sale.' },
  { k: 'm', n: 'Maratón', f: [0.8, 0.8], z: 'Z3', c: 'var(--t4)', u: 'Tiradas largas con final a ritmo y el bloque de maratón.' },
  { k: 't', n: 'Umbral', f: [0.88, 0.88], z: 'Z4', c: 'var(--serious)', u: 'Tempos: «cómodamente duro», sostenible ~20–30 min.' },
  { k: 'i', n: 'Intervalos', f: [0.98, 0.98], z: 'Z4–Z5', c: 'var(--crit)', u: 'Series de 400 m a 1.200 m con trote de recuperación.' },
  { k: 'r', n: 'Repeticiones', f: [1.08, 1.08], z: 'Z5', c: 'var(--t2)', u: 'Piques cortos (200–400 m) con recuperación completa.' },
];

/* ritmos de tu plan: salen de las sesiones planificadas que vienen */
export type PlanCatKey = 'easy' | 'mp' | 'thr' | 'int' | 'prog';
export const PLAN_CATS: { k: PlanCatKey; n: string; c: string }[] = [
  { k: 'easy', n: 'Fácil (rodajes y fondos)', c: 'var(--good)' },
  { k: 'mp', n: 'Ritmo maratón', c: 'var(--t4)' },
  { k: 'thr', n: 'Umbral y tempos', c: 'var(--serious)' },
  { k: 'int', n: 'Series', c: 'var(--crit)' },
  { k: 'prog', n: 'Finales progresivos', c: 'var(--t3)' },
];

/** sesión con plan (las que usa planPaces) */
export type PlannedSession = Session & { plan: Plan };

/** nombre de la sesión: el que puso la plantilla del plan («S3 · Mar · Fartlek · …») o el del tipo */
export function planTitle(x: PlannedSession) {
  const m = /^S\d+ · [^·]+ · ([^·]+) ·/.exec(x.plan.notes || '');
  return m ? m[1].trim() : TYPES[x.type].label;
}

/** un tramo de una sesión planificada: rango de ritmo (s/km) o de FC (en `easy`) */
export interface PlanPace {
  x: PlannedSession;
  lo: number;
  hi: number;
}
/** tramos principales de las sesiones planificadas que vienen, por categoría y en orden de fecha */
export function planPaces(): Partial<Record<PlanCatKey, PlanPace[]>> {
  const tS = todayS(),
    lr = longRace(),
    mp = lr && lr.targetSec > 0 ? racePaceSec(lr) : null,
    out: Partial<Record<PlanCatKey, PlanPace[]>> = {};
  const add = (k: PlanCatKey, x: PlannedSession, v: [number, number]) => {
    (out[k] = out[k] || []).push({ x, lo: v[0], hi: v[1] });
  };
  (S.sessions.filter((x) => x.plan && !x.result && x.plan.date >= tS && x.plan.steps) as PlannedSession[])
    .sort((a, b) => a.plan.date.localeCompare(b.plan.date))
    .forEach((x) => {
      expand(x.plan.steps).forEach((e) => {
        const st = e.st;
        if (e.k !== 'run') return;
        if (st.hl! > 0 && !(st.pf! > 0)) {
          if (x.type === 'fondo' || x.type === 'regen') add('easy', x, [st.hl!, st.hh!]);
          return;
        }
        if (!(st.pf! > 0)) return;
        const mid = (st.pf! + st.ps!) / 2;
        add(mp && Math.abs(mid - mp) <= 6 ? 'mp' : x.type === 'series' ? 'int' : x.type === 'tempo' ? 'thr' : x.type === 'fondo' ? 'prog' : 'thr', x, [st.pf!, st.ps!]);
      });
    });
  return out;
}
