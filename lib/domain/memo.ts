/* Cálculos que dependen solo de las sesiones, la configuración y la fecha de hoy: se hacen una vez por cambio de
   datos aunque los pidan varias tarjetas de la misma pantalla (o el XP, los trofeos y los desafíos a la vez).
   Las sesiones y la configuración son inmutables (docs/PORTING.md, regla 3): alcanza con compararlas por identidad.
   Lo que devuelven es compartido: quien lo usa no lo modifica (filter/map/slice, nunca sort ni push sobre el resultado). */
import { S } from '@/lib/store';
import { todayS } from './util';

export function memoData<A extends unknown[], R>(fn: (...a: A) => R, keyOf: (...a: A) => string = (...a) => a.join('|')): (...a: A) => R {
  let src: unknown[] = [];
  const cache = new Map<string, R>();
  return (...a: A) => {
    const cur = [S.sessions, S.cfg, todayS()];
    if (cur.some((v, i) => v !== src[i])) {
      src = cur;
      cache.clear();
    }
    const k = keyOf(...a);
    if (!cache.has(k)) cache.set(k, fn(...a));
    return cache.get(k)!;
  };
}
