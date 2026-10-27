/* Importar y exportar (lo que usa la mudanza de los datos del artifact) y las polilíneas de Strava. */
import { describe, expect, it } from 'vitest';
import { parseCSV, parseImport, toCsv } from '../csv';
import { decodePoly, encodePoly, type Pt } from '../geo';
import { load, sess } from './fixtures';

describe('CSV', () => {
  it('comillas, comas y comillas dobles adentro, CRLF, BOM y renglones vacíos', () => {
    expect(parseCSV('﻿a,b\r\n"x, y","dijo ""hola"""\n\n1,\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'dijo "hola"'],
      ['1', ''],
    ]);
  });
  it('exportar e importar devuelve las mismas sesiones', () => {
    const a = sess('series', {
      plan: { date: '2026-10-20', notes: 'S3 · Mar · Series · 5×1 km', steps: [{ k: 'warm', dist: 2 }, { k: 'rep', n: 5, steps: [{ k: 'run', dist: 1, pf: 240, ps: 250 }, { k: 'rec', dur: 90 }] }] },
      result: { date: '2026-10-20', distKm: 9.5, timeSec: 2900, paceSec: 305, mainPaceSec: 246, hrAvg: 158, hrMax: 181, feel: 7, notes: 'viento, mucho' },
    });
    const b = sess('fondo', { plan: { date: '2026-10-22', distKm: 12, hrMin: 140, hrMax: 150 }, missed: true });
    load([a, b]);
    const back = parseImport(toCsv()).sessions;
    expect(back).toHaveLength(2);
    const [x, y] = back;
    expect(x).toMatchObject({ id: a.id, type: 'series', plan: { date: '2026-10-20', notes: a.plan!.notes, steps: a.plan!.steps } });
    expect(x.result).toMatchObject({ date: '2026-10-20', distKm: 9.5, timeSec: 2900, paceSec: 305, mainPaceSec: 246, hrAvg: 158, hrMax: 181, feel: 7, notes: 'viento, mucho', pain: false });
    expect(y).toMatchObject({ id: b.id, missed: true, result: null, plan: { distKm: 12, hrMin: 140, hrMax: 150 } });
  });
});

describe('respaldo JSON del artifact', () => {
  it('trae la configuración y descarta las sesiones inválidas', () => {
    const json = JSON.stringify({
      app: 'registro-running',
      v: 1,
      cfg: { hrMax: 203 },
      sessions: [
        { id: 'a', type: 'fondo', result: { date: '2026-10-01', distKm: 10, timeSec: 3600, paceSec: 360 } },
        { id: 'b', type: 'trote', result: { date: '2026-10-02', distKm: 5, timeSec: 1800, paceSec: 360 } },
        { id: 'c', type: 'fondo', result: { date: '1/10/2026', distKm: 5, timeSec: 1800, paceSec: 360 } },
        { id: 'd', type: 'fondo', result: { date: '2026-10-03', distKm: 0, timeSec: 0, paceSec: 0 } },
        { id: 'e', type: 'series' },
        'basura',
      ],
    });
    const { sessions, cfg } = parseImport(json);
    expect(cfg).toEqual({ hrMax: 203 });
    expect(sessions.map((s) => s.id)).toEqual(['a', 'b']);
    expect(sessions[1].type).toBe('fondo');
  });
  it('una lista sola de sesiones también sirve, sin configuración', () => {
    const { sessions, cfg } = parseImport(JSON.stringify([{ id: 'a', type: 'tempo', plan: { date: '2026-11-02', distKm: 8 } }]));
    expect(cfg).toBeNull();
    expect(sessions).toHaveLength(1);
  });
  it('errores entendibles', () => {
    expect(() => parseImport('  ')).toThrow('No hay nada para importar.');
    expect(() => parseImport('{"hola":1}')).toThrow('El archivo no parece un respaldo de esta app.');
    expect(() => parseImport('a,b\n1,2')).toThrow(/no tiene las columnas/);
    expect(() => parseImport('[]')).toThrow('No encontré sesiones válidas en ese texto.');
  });
});

describe('polilíneas', () => {
  it('el ejemplo de la documentación de Google', () => {
    const pts: Pt[] = [
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ];
    expect(encodePoly(pts)).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(decodePoly('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual(pts);
  });
  it('ida y vuelta con un recorrido por Buenos Aires', () => {
    const pts: Pt[] = [
      [-34.58123, -58.42011],
      [-34.58201, -58.41876],
      [-34.58377, -58.4169],
    ];
    expect(decodePoly(encodePoly(pts))).toEqual(pts);
  });
});
