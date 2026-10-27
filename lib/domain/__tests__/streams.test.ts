import { describe, expect, it } from 'vitest';
import { halfSplit, runExtra } from '../streams';

/* parciales de 1 km como los de Strava (splits_metric), con los segundos de cada uno */
const km = (...sec: number[]) => sec.map((s) => ({ distance: 1000, moving_time: s }));

describe('lo que se guarda del detalle de Strava', () => {
  it('el desnivel y cuánto más rápida fue la segunda mitad', () => {
    expect(runExtra({ elev: 84.6, splits: km(330, 330, 320, 310) })).toEqual({ up: 85, half: -4.5 });
  });
  it('sin parciales de 1 km suficientes, solo el desnivel', () => {
    expect(runExtra({ elev: 12, splits: km(300, 300, 300) })).toEqual({ up: 12 });
    expect(runExtra({ elev: 0 })).toEqual({ up: 0 });
  });
  it('si Strava no trajo el desnivel, nada (se vuelve a pedir)', () => {
    expect(runExtra({ splits: km(300, 300, 300, 300) })).toBeNull();
    expect(runExtra(null)).toBeNull();
  });
  it('la frase de las mitades sigue igual', () => {
    expect(halfSplit(km(330, 330, 320, 310).map((l) => ({ km: 1, sec: l.moving_time, hr: 0 })))).toMatch(/negative split \(4,5% más rápido al final\)/);
  });
});
