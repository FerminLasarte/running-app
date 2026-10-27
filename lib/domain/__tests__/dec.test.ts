import { describe, expect, it } from 'vitest';
import { decBand, decCalc, decEligible } from '../dec';
import { sess } from './fixtures';

/** una salida de `sec` segundos, a 1 punto por segundo, a ritmo y FC que da cada función */
function streams(sec: number, v: (t: number) => number, h: (t: number) => number, moving?: (t: number) => boolean) {
  const time = Array.from({ length: sec }, (_, i) => i);
  return {
    time,
    velocity_smooth: time.map(v),
    heart_rate: time.map(h),
    ...(moving ? { moving: time.map(moving) } : {}),
  };
}
const V = 1000 / 300; // 5:00/km

describe('deriva cardíaca', () => {
  it('mismo ritmo y la FC sube de 140 a 147: 4,8%', () => {
    const d = decCalc(streams(3600, () => V, (t) => (t < 2100 ? 140 : 147)))!;
    expect(d).toEqual({ p: 4.8, p1: 300, p2: 300, a: 140, b: 147, m: 50, ok: 1 });
  });
  it('descarta los primeros 10 minutos (el calentamiento)', () => {
    const d = decCalc(streams(3600, () => V, (t) => (t < 600 ? 100 : 140)))!;
    expect(d.p).toBe(0);
    expect(d.a).toBe(140);
  });
  it('mide eficiencia, no FC sola: si el ritmo baja con la FC, no hay deriva', () => {
    const d = decCalc(streams(3600, (t) => (t < 2100 ? V : V * 0.95), (t) => (t < 2100 ? 140 : 133)))!;
    expect(d.p).toBe(0);
    expect(d.p2).toBeGreaterThan(d.p1);
  });
  it('ritmo muy cambiante (más de 6%): se mide pero no es confiable', () => {
    const d = decCalc(streams(3600, (t) => (t < 2100 ? V : V * 1.1), () => 140))!;
    expect(d.ok).toBe(0);
  });
  it('no cuenta los puntos parado ni caminando', () => {
    const d = decCalc(streams(3600, () => V, (t) => (t >= 3000 ? 190 : 140), (t) => t < 3000))!;
    expect(d.b).toBe(140);
  });
  it('sin datos suficientes no mide', () => {
    expect(decCalc(null)).toBeNull();
    expect(decCalc(streams(500, () => V, () => 140))).toBeNull();
    // 30 minutos útiles después del calentamiento hacen falta
    expect(decCalc(streams(2300, () => V, () => 140))).toBeNull();
    const sinFc = streams(3600, () => V, () => 140) as Record<string, unknown>;
    delete sinFc.heart_rate;
    expect(decCalc(sinFc)).toBeNull();
  });
  it('bandas', () => {
    expect(decBand({ p: -3 }).t).toMatch(/FC más baja/);
    expect(decBand({ p: 4.9 }).k).toBe('good');
    expect(decBand({ p: 5 }).k).toBe('warn');
    expect(decBand({ p: 10 }).k).toBe('warn');
    expect(decBand({ p: 10.1 }).k).toBe('serious');
  });
  it('solo fondos y regenerativos de 40 minutos o más', () => {
    expect(decEligible(sess('fondo', { result: { timeSec: 2400 } }))).toBe(true);
    expect(decEligible(sess('regen', { result: { timeSec: 2399 } }))).toBe(false);
    expect(decEligible(sess('series', { result: { timeSec: 3600 } }))).toBe(false);
    expect(decEligible(sess('fondo', { plan: {} }))).toBe(false);
  });
});
