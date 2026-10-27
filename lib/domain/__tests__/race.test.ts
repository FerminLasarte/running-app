import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { predictRace } from '../race';
import { readyItems, readyScore, type ReadyItem } from '../readiness';
import { longTarget, racePaceSec } from '../config';
import { riegel } from '../score';
import type { Race } from '../types';
import { load, sess, today } from './fixtures';

beforeEach(() => today('2026-10-28'));
afterEach(() => vi.useRealTimers());

const race = (o: Partial<Race> = {}): Race => ({ id: 'r', name: '10K', km: 10, date: '2026-11-28', targetSec: 2700, lt: false, time: '', place: '', planStart: '', ...o });
const test = (date: string, km: number, sec: number) => sess('test', { result: { date, distKm: km, timeSec: sec, paceSec: Math.round(sec / km) } });

describe('ritmo de carrera', () => {
  it('objetivo / distancia; «menos de» redondea para abajo', () => {
    expect(racePaceSec(race())).toBe(270);
    expect(racePaceSec(race({ km: 21.0975, targetSec: 6300 }))).toBe(299);
    expect(racePaceSec(race({ km: 21.0975, targetSec: 6300, lt: true }))).toBe(298);
  });
  it('tirada larga mínima según la distancia', () => {
    expect(longTarget(10)).toBe(12);
    expect(longTarget(21.0975)).toBe(18);
    expect(longTarget(42.195)).toBe(32);
  });
});

describe('predicción desde un test', () => {
  it('Riegel desde el mejor test de las últimas 12 semanas', () => {
    load([test('2026-10-10', 5, 1200), test('2026-10-20', 5, 1260)]);
    const p = predictRace(race())!;
    expect(p.s.result.timeSec).toBe(1200);
    expect(p.t).toBeCloseTo(riegel(1200, 5, 10));
    expect(p.lo).toBeUndefined();
  });
  it('ignora los tests de hace más de 12 semanas', () => {
    load([test('2026-07-01', 5, 1100)]);
    expect(predictRace(race())).toBeNull();
  });
  it('un maratón desde un 5K da un rango: Riegel (optimista) a exponente 1,10 (prudente)', () => {
    load([test('2026-10-10', 5, 1200)]);
    const p = predictRace(race({ km: 42.195, name: 'Maratón' }))!;
    expect(p.lo).toBeCloseTo(riegel(1200, 5, 42.195));
    expect(p.t).toBeCloseTo(1200 * Math.pow(42.195 / 5, 1.1));
    expect(p.t).toBeGreaterThan(p.lo!);
  });
});

describe('preparación para la carrera', () => {
  const it_ = (k: ReadyItem['k']): ReadyItem => ({ k, t: '', x: '' });
  it('puntaje: promedio de los chequeos con datos, desde 3', () => {
    expect(readyScore([it_('good'), it_('warn'), it_('na')])).toBeNull();
    expect(readyScore([it_('good'), it_('warn'), it_('crit'), it_('na')])).toBe(50);
    expect(readyScore([it_('good'), it_('good'), it_('good')])).toBe(100);
  });
  it('chequeos de un 10K a un mes', () => {
    const series = (date: string, p: number) => sess('series', { result: { date, distKm: 8, timeSec: 2600, paceSec: 325, mainPaceSec: p } });
    load([
      series('2026-10-06', 268),
      series('2026-10-13', 270),
      series('2026-10-20', 272),
      sess('fondo', { result: { date: '2026-10-25', distKm: 12, timeSec: 4300, paceSec: 358 } }),
      sess('fondo', { result: { date: '2026-10-22', distKm: 8, timeSec: 2900, paceSec: 362, pain: true } }),
    ]);
    const I = readyItems(race());
    const by = (t: string) => I.find((i) => i.t === t)!;
    expect(by('Ritmo de series')).toMatchObject({ k: 'good' });
    expect(by('Ritmo de series').x).toMatch(/4:30\/km/);
    expect(by('Tirada larga')).toMatchObject({ k: 'good' });
    expect(by('Molestias')).toMatchObject({ k: 'warn' });
    expect(by('Cumplimiento del plan').k).toBe('na');
  });
});
