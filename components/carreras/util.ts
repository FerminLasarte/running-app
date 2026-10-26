/* Ayudas de Carreras sin interfaz: la pulsera (la del estadio y la que se imprime salen de lo mismo), la diferencia
   contra el objetivo y los km escritos. */
import type { Race } from '@/lib/domain/types';
import type { RaceScen, RaceStrategy } from '@/lib/domain/race';
import { fmt, fmtDur } from '@/lib/domain/util';

/** «10», «21,1», «42,2» */
export const kmLabel = (km: number) => fmt(km, km % 1 ? 1 : 0);

/** «34 s» o «1:05» */
export const gapTxt = (s: number) => (Math.round(s) < 60 ? Math.round(s) + ' s' : fmtDur(s));

/** la pulsera de un escenario con sus filas (`rows`: de a 1 km, o de a 5 en el maratón); los tramos se alternan */
export function bandProps(race: Race, sel: RaceScen, st: RaceStrategy, rows: { km: number; sec: number }[]) {
  return {
    title: 'Pulsera ' + fmtDur(sel.sec),
    sub: race.name + ' · ' + sel.n,
    splits: rows.map((r) => r.sec),
    kms: rows.map((r) => r.km),
    breaks: st.legs.slice(1).map((l) => rows.findIndex((r) => r.km > l.from - 1 + 1e-6)).filter((i) => i > 0),
  };
}
