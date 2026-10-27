import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { doneList, hrRangeOf, kmBetween, loadInfo, planKmOf, sdate, stepKm, streakInfo, weekStats } from '../stats';
import { formState, formStep, loadFor, medOf } from '../analysis';
import { pd } from '../util';
import { load, sess, today } from './fixtures';

beforeEach(() => today('2026-10-28')); // miércoles
afterEach(() => vi.useRealTimers());

const run = (date: string, km: number, o: object = {}) => sess('fondo', { result: { date, distKm: km, timeSec: km * 360, paceSec: 360, ...o } });

describe('lista de salidas', () => {
  it('ordenada por fecha y sin las de 0 km', () => {
    load([run('2026-10-20', 8), run('2026-10-10', 5), run('2026-10-15', 0), sess('fondo', { plan: { date: '2026-10-30' } })]);
    expect(doneList().map((s) => s.result.date)).toEqual(['2026-10-10', '2026-10-20']);
  });
  it('la fecha de una sesión: la del resultado, si no la del plan', () => {
    expect(sdate(sess('fondo', { plan: { date: '2026-10-01' }, result: { date: '2026-10-02' } }))).toBe('2026-10-02');
    expect(sdate(sess('fondo', { plan: { date: '2026-10-01' } }))).toBe('2026-10-01');
  });
  it('km entre dos fechas, con los extremos incluidos', () => {
    load([run('2026-10-19', 8), run('2026-10-25', 12), run('2026-10-26', 6)]);
    expect(kmBetween(pd('2026-10-19'), pd('2026-10-25'))).toBe(20);
  });
});

describe('km de una sesión planificada', () => {
  it('por distancia, o por duración al medio del rango de ritmo (o 7:20 / 7:30 sin rango)', () => {
    expect(stepKm({ k: 'run', dist: 5 })).toBe(5);
    expect(stepKm({ k: 'run', dur: 1800, pf: 295, ps: 305 })).toBe(6);
    expect(stepKm({ k: 'run', dur: 4400 })).toBe(10);
    expect(stepKm({ k: 'rec', dur: 450 })).toBe(1);
  });
  it('suma las etapas desplegadas, redondeado a 100 m', () => {
    const s = sess('series', {
      plan: { steps: [{ k: 'warm', dist: 2 }, { k: 'rep', n: 5, steps: [{ k: 'run', dist: 1 }, { k: 'rec', dur: 90 }] }, { k: 'cool', dist: 1 }] },
    });
    expect(planKmOf(s)).toBe(9);
    expect(planKmOf(sess('fondo', { plan: { distKm: 14 } }))).toBe(14);
  });
  it('rango de FC: el del plan simple o el de la primera etapa de carrera', () => {
    expect(hrRangeOf(sess('fondo', { plan: { hrMin: 140, hrMax: 150 } }))).toEqual([140, 150]);
    expect(hrRangeOf(sess('fondo', { plan: { steps: [{ k: 'warm', dist: 1 }, { k: 'run', dist: 10, hl: 145, hh: 155 }] } }))).toEqual([145, 155]);
    expect(hrRangeOf(sess('fondo', { plan: { distKm: 10 } }))).toBeNull();
  });
});

describe('la semana', () => {
  it('cuenta hechas, planificadas, no hechas y pendientes', () => {
    load([
      sess('fondo', { plan: { date: '2026-10-26', distKm: 10, hrMin: 140, hrMax: 150 }, result: { date: '2026-10-26', distKm: 10, timeSec: 3600, paceSec: 360, hrAvg: 146 } }),
      sess('series', { plan: { date: '2026-10-27', distKm: 8 }, missed: true }),
      sess('tempo', { plan: { date: '2026-10-27', distKm: 8 } }),
      sess('fondo', { plan: { date: '2026-10-30', distKm: 12 } }),
      run('2026-10-28', 5),
      run('2026-10-25', 20), // domingo: es de la semana anterior
    ]);
    const w = weekStats(pd('2026-10-26'));
    expect(w).toMatchObject({ n: 5, done: 2, planned: 4, doneOfPlanned: 1, missed: 1, pend: 1, km: 15, planKm: 38, frOk: 1, frN: 1 });
    expect(w.score).toBe(100);
  });
  it('racha: semanas seguidas llegando al objetivo de salidas', () => {
    load(
      [
        run('2026-10-26', 5),
        run('2026-10-27', 5), // esta semana: 2
        run('2026-10-20', 5),
        run('2026-10-22', 5), // la anterior: 2
        run('2026-10-14', 5), // la otra: 1, corta la racha
        run('2026-09-28', 5),
        run('2026-09-29', 5),
        run('2026-10-01', 5), // semana del 28/9: 3
        run('2026-10-06', 5),
        run('2026-10-07', 5), // semana del 5/10: 2
      ],
      { weeklyGoal: 2 },
    );
    expect(streakInfo()).toEqual({ cur: 2, best: 2, thisWeek: 2, goal: 2 });
  });
});

describe('carga', () => {
  it('carga aguda (7 días) contra crónica (28 días / 4)', () => {
    load([run('2026-09-30', 10), run('2026-10-07', 10), run('2026-10-14', 10), run('2026-10-27', 20)]);
    expect(loadInfo()).toEqual({ acute: 20, chronic: 10, ratio: 2 });
  });
  it('con menos de 20 días de historia no opina', () => {
    load([run('2026-10-20', 10), run('2026-10-27', 10)]);
    expect(loadInfo()).toBeNull();
  });
  it('carga de una sesión: minutos × (FC / FC máx)² × 1,6, con un plus para la calidad', () => {
    load([], { hrMax: 200 });
    expect(loadFor('fondo', 3600, 140)).toBeCloseTo(47.04);
    expect(loadFor('fondo', 3600)).toBeCloseTo(47.04); // sin FC: 70% de la máxima
    expect(loadFor('series', 3600, 140)).toBeCloseTo(58.8);
  });
  it('forma (42 días) y fatiga (7 días)', () => {
    expect(formStep({ ctl: 0, atl: 0 }, 42)).toEqual({ ctl: 1, atl: 6, tsb: -5 });
    expect(formState(-25).t).toBe('Muy cargado');
    expect(formState(0).t).toBe('Equilibrado');
    expect(formState(10).t).toBe('Fresco');
  });
  it('mediana', () => {
    expect(medOf([])).toBeNull();
    expect(medOf([3, 1, 2])).toBe(2);
    expect(medOf([4, 1, 3, 2])).toBe(2.5);
  });
});
