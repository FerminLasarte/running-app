/* Zapatillas: km acumulados de cada par (línea 3430 del original). normShoe, activeShoes, mainShoe y shoeById
   están en ./config. */
import { S } from '@/lib/store';
import type { Shoe } from './types';
import { sum } from './util';

/** km de un par: los que tenía al cargarlo más las salidas hechas con él */
export function shoeKm(z: Shoe) {
  return z.startKm + sum(S.sessions.filter((s) => s.result && s.result.shoe === z.id).map((s) => s.result!.distKm || 0));
}
