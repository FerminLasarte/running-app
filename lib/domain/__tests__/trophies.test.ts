import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setS } from '@/lib/store';
import { CEL_V, EGG_IDS, capicua, celebCatchUp, celebNews, trophies, trophyRace, vitCount, vitGroups, vitShowcase } from '../trophies';
import { barrioAt, decodePoly, mproj } from '../geo';
import BARRIOS from '../barrios.json';
import type { Route } from '../types';
import type { Race } from '../types';
import { encodePoly, load, sess, today } from './fixtures';

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

const done = (d: string, o: Record<string, unknown> = {}, type: Parameters<typeof sess>[0] = 'fondo') => sess(type, { result: { date: d, distKm: 10, timeSec: 3600, paceSec: 360, ...o } });
const tro = (id: string) => trophies().find((t) => t.id === id);

describe('trofeos nuevos', () => {
  it('desnivel: suma el de cada salida traída de Strava', () => {
    load([done('2026-09-01', { ex: { up: 600 } }), done('2026-09-10'), done('2026-09-20', { ex: { up: 500 } })]);
    expect(tro('up_1000')).toMatchObject({ got: true, date: '2026-09-20', cur: 1100 });
    expect(tro('up_8849')).toMatchObject({ got: false, name: 'El Everest' });
  });
  it('negative split: la segunda mitad más rápida, sin contar las series', () => {
    load([done('2026-09-01', { ex: { up: 0, half: -0.5 } }), done('2026-09-05', { ex: { up: 0, half: -3 } }, 'series'), done('2026-09-09', { ex: { up: 0, half: -2.1 } })]);
    expect(tro('ns_1')).toMatchObject({ got: true, date: '2026-09-09', cur: 1 });
  });
  it('fondos sin deriva: 90 minutos o más, deriva medida bien y menos de 5%', () => {
    load([
      done('2026-09-01', { timeSec: 5400, dec: { p: 3, ok: 1 } }),
      done('2026-09-02', { timeSec: 5300, dec: { p: 3, ok: 1 } }),
      done('2026-09-03', { timeSec: 6000, dec: { p: 3, ok: 0 } }),
      done('2026-09-04', { timeSec: 6000, dec: { p: 5, ok: 1 } }),
      done('2026-09-05', { timeSec: 6000, dec: { p: 2, ok: 1 } }, 'tempo'),
    ]);
    expect(tro('dec_1')).toMatchObject({ got: true, date: '2026-09-01', cur: 1 });
  });
  it('zapatillas jubiladas: solo las retiradas que llegaron a su límite, con la fecha de su última salida', () => {
    const shoe = (id: string, o: Record<string, unknown>) => ({ id, name: id, startKm: 0, limitKm: 20, ...o });
    load([done('2026-08-01', { shoe: 'a' }), done('2026-08-20', { shoe: 'a' }), done('2026-09-01', { shoe: 'b' }), done('2026-09-02', { shoe: 'b' }), done('2026-09-03', { shoe: 'c' })], {
      shoes: [shoe('a', { retired: true }), shoe('b', {}), shoe('c', { retired: true })],
    });
    expect(tro('shoe_1')).toMatchObject({ got: true, date: '2026-08-20', cur: 1 });
  });
  it('capicúa: con dos decimales se lee igual al revés', () => {
    expect([10.01, 12.21, 4.44, 1.01].every(capicua)).toBe(true);
    expect([10, 10.1, 12.12, 0.5, 5.5].some(capicua)).toBe(false);
  });
  it('los secretos nuevos: con lluvia, una distancia capicúa y rápido con mucho calor', () => {
    load([done('2026-09-01', { weather: 'Lluvia' }), done('2026-09-02', { distKm: 12.21 }), done('2026-09-03', { weather: 'Mucho calor', paceSec: 300 }), done('2026-09-04', { weather: 'Mucho calor', paceSec: 295 })]);
    expect(tro('egg_lluvia')).toMatchObject({ got: true, cat: 'egg', date: '2026-09-01' });
    expect(tro('egg_capicua')!.desc).toMatch(/^12,21 km el /);
    expect(tro('egg_sol')).toMatchObject({ date: '2026-09-04' });
    expect(EGG_IDS).toEqual(expect.arrayContaining(['egg_lluvia', 'egg_capicua', 'egg_sol']));
  });
  it('barrios: cuenta los barrios distintos de tus recorridos; la fecha es la del que sumó el décimo', () => {
    /* un tramo de unos 150 m en el medio de cada barrio que tiene el promedio de su borde adentro */
    const inside = BARRIOS.map((b) => {
      const P = decodePoly(b.r[0]),
        la = P.reduce((a, q) => a + q[0], 0) / P.length,
        lg = P.reduce((a, q) => a + q[1], 0) / P.length,
        [x, y] = mproj(la, lg + 0.0008);
      return barrioAt(x, y, null)?.n === b.n ? ([la, lg] as [number, number]) : null;
    }).filter((q): q is [number, number] => !!q);
    expect(inside.length).toBeGreaterThanOrEqual(12);
    const routes: Route[] = inside.slice(0, 12).map(([la, lg], i) => ({ id: 'r' + i, sid: String(i), date: '2026-09-' + String(i + 1).padStart(2, '0'), name: '', km: 0.15, tsec: 60, poly: encodePoly([[la, lg], [la, lg + 0.0016]]) }));
    load([done('2026-09-01')]);
    setS({ routes });
    expect(tro('barrio_10')).toMatchObject({ got: true, date: '2026-09-10' });
    expect(tro('barrio_25')).toMatchObject({ got: false, cur: 12 });
    expect(tro('barrio_todos')!.name).toBe('Los ' + BARRIOS.length + ' barrios');
  });
});

describe('festejo de los trofeos nuevos', () => {
  it('los que ya tenías ganados se anotan sin festejo, y el nivel que suben también', () => {
    load([done('2026-09-01', { weather: 'Lluvia' }), done('2026-09-02', { distKm: 5 })]);
    const T = trophies(),
      old = T.filter((t) => t.got && t.cat !== 'egg').map((t) => t.id);
    const rec = celebCatchUp({ ids: old, lv: 1 }, T, 3);
    expect(rec).toMatchObject({ lv: 3, v: CEL_V });
    expect(rec.ids).toContain('egg_lluvia');
    const n = celebNews(T.filter((t) => t.got).map((t) => t.id), 3, rec);
    expect(n).toMatchObject({ ids: [], up: false });
  });
  it('con el registro al día, lo nuevo se festeja como siempre', () => {
    load([done('2026-09-01', { weather: 'Lluvia' })]);
    const T = trophies(),
      rec = { ids: [], lv: 1, v: CEL_V };
    expect(celebCatchUp(rec, T, 2)).toBe(rec);
    expect(celebNews(['egg_lluvia'], 2, rec)).toMatchObject({ ids: ['egg_lluvia'], up: true });
  });
  it('un registro viejo sin nada nuevo ganado no cambia el nivel', () => {
    load([done('2026-09-01')]);
    expect(celebCatchUp({ ids: [], lv: 1 }, trophies(), 4)).toEqual({ ids: [], lv: 1, v: CEL_V });
  });
});
