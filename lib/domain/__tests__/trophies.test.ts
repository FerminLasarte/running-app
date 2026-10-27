import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trophies } from '../trophies';
import type { Race } from '../types';
import { load, sess, today } from './fixtures';

beforeEach(() => today('2026-10-28'));
afterEach(() => vi.useRealTimers());

const race = (o: Partial<Race>): Race => ({ id: 'r', name: '10K', km: 10, date: '2026-10-01', targetSec: 2700, lt: false, time: '', place: '', planStart: '', ...o });
const vuelta = () => trophies().find((t) => t.id === 'egg_vuelta');
const run = sess('fondo', { result: { date: '2026-09-20', distKm: 10, timeSec: 3600, paceSec: 360 } });

describe('trofeo secreto: la vuelta olímpica', () => {
  it('no aparece mientras no bajaste el objetivo de una carrera', () => {
    load([run], { races: [race({ resultSec: 2760 }), race({ id: 'f', date: '2026-12-01' })] });
    expect(vuelta()).toBeUndefined();
  });
  it('se gana con la primera carrera en que bajás el objetivo', () => {
    load([run], { races: [race({ id: 'b', name: '15K', date: '2026-10-20', resultSec: 3900, targetSec: 4000 }), race({ name: '10K de Palermo', resultSec: 2690 })] });
    expect(vuelta()).toMatchObject({ got: true, cat: 'egg', date: '2026-10-01' });
    expect(vuelta()!.desc).toMatch(/10K de Palermo: 44:50 contra 45:00/);
  });
  it('con objetivo «menos de», igualarlo no alcanza', () => {
    load([run], { races: [race({ lt: true, resultSec: 2700 })] });
    expect(vuelta()).toBeUndefined();
    load([run], { races: [race({ lt: true, resultSec: 2699 })] });
    expect(vuelta()?.got).toBe(true);
  });
});
