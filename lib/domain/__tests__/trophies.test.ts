import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EGG_IDS, trophies, trophyRace, vitCount, vitGroups, vitShowcase } from '../trophies';
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

describe('la vitrina', () => {
  const won = race({ name: '10K de Palermo', resultSec: 2690 });
  it('el estante de secretos se ve siempre: sin ganar ninguno, una caja por cada secreto', () => {
    load([run]);
    const T = trophies(),
      G = vitGroups(T, 'todos');
    expect(G.at(-1)).toMatchObject({ cat: 'egg', name: 'Secretos', got: 0, all: EGG_IDS.length, items: [], locked: EGG_IDS.length });
    expect(vitGroups(T, 'faltan').at(-1)).toMatchObject({ cat: 'egg', locked: EGG_IDS.length });
    expect(vitGroups(T, 'ganados').some((g) => g.cat === 'egg')).toBe(false);
  });
  it('un secreto ganado deja de ser caja y va en «Ganados»', () => {
    load([run], { races: [won] });
    const T = trophies(),
      egg = vitGroups(T, 'todos').at(-1)!;
    expect(egg.items.map((t) => t.id)).toEqual(['egg_vuelta']);
    expect(egg.locked).toBe(EGG_IDS.length - 1);
    expect(vitGroups(T, 'ganados').at(-1)!.cat).toBe('egg');
  });
  it('los secretos van al final, después de los desafíos', () => {
    load([run], { races: [won], challenges: [{ id: 'c', name: '5 km', kind: 'km', target: 5, from: '2026-09-01', to: '2026-10-30' }] });
    const cats = vitGroups(trophies(), 'todos').map((g) => g.cat);
    expect(cats.slice(-2)).toEqual(['ch', 'egg']);
  });
  it('cuenta los secretos que faltan entre las piezas', () => {
    load([run]);
    const T = trophies();
    expect(vitCount(T)).toEqual({ got: T.filter((t) => t.got).length, all: T.length + EGG_IDS.length });
    load([run], { races: [won] });
    expect(vitCount(trophies()).all).toBe(T.length + EGG_IDS.length);
  });
  it('«Por ganar» va del más cerca al más lejos', () => {
    load([run]);
    const tot = vitGroups(trophies(), 'faltan').find((g) => g.cat === 'tot')!;
    expect(tot.items.map((t) => t.id)).toEqual(['tot_100', 'tot_250', 'tot_500', 'tot_1000', 'tot_2000', 'tot_4220']);
  });
  it('la vidriera: los últimos ganados, del más nuevo, y los más cerca de caer', () => {
    const r = (d: string, km: number) => sess('fondo', { result: { date: d, distKm: km, timeSec: km * 360, paceSec: 360 } });
    load([r('2026-08-01', 5), r('2026-09-01', 10), r('2026-10-01', 14)]);
    const { last, near } = vitShowcase(trophies(), 3);
    expect(last.map((t) => t.id)).toEqual(['long_10', 'long_5']);
    expect(near[0].id).toBe('long_15');
    expect(near.every((t) => !t.got)).toBe(true);
  });
  it('cada medalla de «Carreras» es la de su carrera: la tercera para «3 carreras»', () => {
    const rs = [race({ id: 'a', name: 'A', date: '2026-03-01', resultSec: 2800 }), race({ id: 'c', name: 'C', date: '2026-09-01', resultSec: 2800 }), race({ id: 'b', name: 'B', date: '2026-05-01', resultSec: 2800 }), race({ id: 'x', name: 'Sin tiempo', date: '2026-04-01' })];
    load([run], { races: rs });
    const T = trophies(),
      of = (id: string) => trophyRace(T.find((t) => t.id === id)!);
    expect(of('race_1')?.name).toBe('A');
    expect(of('race_3')?.name).toBe('C');
    expect(of('race_5')).toBeNull();
  });
});
