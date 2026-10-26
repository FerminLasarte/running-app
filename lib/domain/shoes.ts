/* Zapatillas: km acumulados de cada par (línea 3430 del original), su uso y cuándo llegan al límite. normShoe,
   activeShoes, mainShoe y shoeById están en ./config. */
import { S } from '@/lib/store';
import type { Shoe } from './types';
import { doneList } from './stats';
import { addDays, pad, pd, sod, sum, ymd } from './util';

/** km de un par: los que tenía al cargarlo más las salidas hechas con él */
export function shoeKm(z: Shoe) {
  return z.startKm + sum(S.sessions.filter((s) => s.result && s.result.shoe === z.id).map((s) => s.result!.distKm || 0));
}

/** salidas hechas con un par, de la más vieja a la más nueva */
export const shoeRuns = (z: Shoe) => doneList().filter((s) => s.result.shoe === z.id);

/** semanas que se miran para saber cuánto usás un par */
export const SHOE_WKS = 8;
export interface ShoeLife {
  km: number;
  /** km que le quedan hasta el límite (negativo si ya lo pasó) */
  left: number;
  /** km por semana con este par en las últimas 8 semanas */
  perWk: number;
  /** cuándo llega al límite a ese ritmo; null si ya lo pasó o no lo usás */
  date: string | null;
}
/** vida útil de un par: lo que le queda y, con su uso de las últimas semanas, cuándo llega al límite */
export function shoeLife(z: Shoe): ShoeLife {
  const today = sod(new Date()),
    km = shoeKm(z),
    left = z.limitKm - km,
    since = ymd(addDays(today, -(SHOE_WKS * 7 - 1))),
    perWk = sum(shoeRuns(z).filter((s) => s.result.date >= since).map((s) => s.result.distKm)) / SHOE_WKS;
  return { km, left, perWk, date: left > 0 && perWk > 0 ? ymd(addDays(today, Math.ceil((left / perWk) * 7))) : null };
}

/** km por mes con un par, desde el mes de `from` hasta el actual (los meses sin uso, en 0) */
export function shoeMonths(z: Shoe, from: string) {
  const R = shoeRuns(z),
    now = sod(new Date()),
    f = pd(from),
    n = (now.getFullYear() - f.getFullYear()) * 12 + now.getMonth() - f.getMonth() + 1;
  return Array.from({ length: Math.max(1, n) }, (_, i) => {
    const m = new Date(f.getFullYear(), f.getMonth() + i, 1),
      key = m.getFullYear() + '-' + pad(m.getMonth() + 1);
    return { m, km: sum(R.filter((s) => s.result.date.slice(0, 7) === key).map((s) => s.result.distKm)), cur: i === n - 1 };
  });
}
