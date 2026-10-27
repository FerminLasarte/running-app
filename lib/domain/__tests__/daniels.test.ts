/* Contra las tablas publicadas de Jack Daniels (Daniels' Running Formula), VDOT 50. */
import { describe, expect, it } from 'vitest';
import { paceAtV, vdotOf, vdotTime } from '../daniels';
import { riegel } from '../score';

describe('VDOT', () => {
  it('5K en 19:57 y 10K en 41:21 son VDOT 50', () => {
    expect(vdotOf(19 * 60 + 57, 5)).toBeCloseTo(50, 0);
    expect(vdotOf(41 * 60 + 21, 10)).toBeCloseTo(50, 0);
  });
  it('vdotTime es la inversa de vdotOf', () => {
    for (const [sec, km] of [
      [1200, 5],
      [2700, 10],
      [6000, 21.0975],
    ]) {
      expect(vdotTime(vdotOf(sec, km), km)).toBeCloseTo(sec, 0);
    }
  });
  it('VDOT 50 da media maratón en ~1:31:35 y maratón en ~3:10:49 (±30 s)', () => {
    expect(Math.abs(vdotTime(50, 21.0975) - 5495)).toBeLessThan(30);
    expect(Math.abs(vdotTime(50, 42.195) - 11449)).toBeLessThan(30);
  });
  it('más rápido es más VDOT', () => {
    expect(vdotOf(2400, 10)).toBeGreaterThan(vdotOf(2700, 10));
  });
});

describe('ritmos de entrenamiento', () => {
  it('VDOT 50: umbral a 4:15/km e intervalos a 3:54/km', () => {
    expect(Math.round(paceAtV(50, 0.88))).toBe(255);
    expect(Math.round(paceAtV(50, 0.98))).toBe(234);
  });
  it('a más fracción del VDOT, ritmo más rápido', () => {
    expect(paceAtV(50, 0.6)).toBeGreaterThan(paceAtV(50, 0.68));
    expect(paceAtV(50, 0.68)).toBeGreaterThan(paceAtV(50, 0.8));
  });
});

describe('Riegel', () => {
  it('la misma distancia da el mismo tiempo', () => {
    expect(riegel(2700, 10, 10)).toBe(2700);
  });
  it('10K en 40:00 proyecta media maratón en ~1:28:16', () => {
    expect(riegel(2400, 10, 21.0975)).toBeCloseTo(5296, -1);
  });
});
