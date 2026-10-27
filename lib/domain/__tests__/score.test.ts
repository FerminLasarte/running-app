import { describe, expect, it } from 'vitest';
import { bandOf, driftPen, fadeOf, fadePen, scoreFlat, scoreSession, scoreStaged, volScore } from '../score';
import { expand } from '../stages';
import type { PlanStep, Stage } from '../types';
import { sess } from './fixtures';

describe('piezas del puntaje', () => {
  it('volumen: ±5% es 100; quedarse corto resta el doble que en modo suave', () => {
    expect(volScore(1, 'fondo', false)).toBe(100);
    expect(volScore(0.96, 'fondo', false)).toBe(100);
    expect(volScore(0.9, 'fondo', false)).toBeCloseTo(87.5);
    expect(volScore(0.9, 'fondo', true)).toBeCloseTo(93.75);
  });
  it('volumen: pasarse resta más en un regenerativo', () => {
    expect(volScore(1.15, 'fondo', false)).toBeCloseTo(85);
    expect(volScore(1.15, 'regen', false)).toBeCloseTo(80);
    expect(volScore(3, 'fondo', false)).toBe(0);
  });
  it('bandas', () => {
    expect(bandOf(90).t).toBe('Excelente');
    expect(bandOf(89).t).toBe('Muy bien');
    expect(bandOf(60).k).toBe('warn');
    expect(bandOf(40).k).toBe('serious');
    expect(bandOf(39).k).toBe('crit');
  });
  it('caída de ritmo: último tercio contra el primero', () => {
    expect(fadeOf([240, 240])).toBeNull();
    expect(fadeOf([240, 240, 240, 250, 250, 250])).toBeCloseTo(4.1667, 3);
    expect(fadePen(2)).toBe(0);
    expect(fadePen(4.1667)).toBe(11);
    expect(fadePen(20)).toBe(15);
  });
  it('deriva: resta solo si es confiable y pasa del 5%', () => {
    const r = (dec: object) => ({ date: '2026-10-01', distKm: 15, timeSec: 5400, paceSec: 360, dec });
    expect(driftPen(r({ p: 9, ok: 1 }))).toBe(8);
    expect(driftPen(r({ p: 9, ok: 0 }))).toBe(0);
    expect(driftPen(r({ p: 4, ok: 1 }))).toBe(0);
    expect(driftPen(r({ p: 30, ok: 1 }))).toBe(10);
  });
});

describe('puntaje de una sesión simple', () => {
  const fondo = (result: object) => sess('fondo', { plan: { distKm: 10, hrMin: 140, hrMax: 150 }, result: { distKm: 10, timeSec: 3600, paceSec: 360, hrAvg: 145, ...result } });

  it('sin plan no hay puntaje', () => {
    expect(scoreFlat(sess('fondo', { result: {} }))!.score).toBeNull();
  });
  it('lo planificado da 100', () => {
    const sc = scoreFlat(fondo({}))!;
    expect(sc.score).toBe(100);
    expect(sc.summary).toBe('Hiciste lo que planificaste.');
  });
  it('5 lpm arriba del rango: −15 sobre los 60 puntos de FC', () => {
    const sc = scoreFlat(fondo({ hrAvg: 155 }))!;
    expect(sc.score).toBe(85);
    expect(sc.summary).toBe('Lo que más puntos te sacó: frecuencia cardíaca (−15).');
  });
  it('en modo suave, ir por debajo del rango no resta', () => {
    expect(scoreFlat(fondo({ hrAvg: 130, easy: true }))!.score).toBe(100);
    expect(scoreFlat(fondo({ hrAvg: 130 }))!.score).toBeLessThan(100);
  });
  it('la deriva cardíaca alta resta en un fondo', () => {
    expect(scoreFlat(fondo({ dec: { p: 9, ok: 1 } }))!.score).toBe(95);
  });
  it('ritmo: ±5 s es 100, después 4 puntos por segundo', () => {
    const tempo = (paceSec: number) => scoreFlat(sess('tempo', { plan: { distKm: 8, paceSec: 270 }, result: { distKm: 8, timeSec: 8 * paceSec, paceSec } }))!;
    expect(tempo(274).score).toBe(100);
    // ritmo 280: 100 − 5×4 = 80 sobre 65 puntos → 52; volumen 35/35
    expect(tempo(280).score).toBe(87);
  });
  it('sin la FC cargada avisa en vez de evaluarla', () => {
    const sc = scoreFlat(fondo({ hrAvg: undefined }))!;
    expect(sc.parts.map((p) => p.k)).toEqual(['vol']);
    expect(sc.notes[0]).toMatch(/no cargaste la FC/);
  });
});

describe('puntaje por etapas', () => {
  /** 2 km de calentamiento, 4 × (1 km a 4:00–4:10 + 90 s), 1 km de enfriamiento */
  const STEPS: PlanStep[] = [
    { k: 'warm', dist: 2 },
    {
      k: 'rep',
      n: 4,
      steps: [
        { k: 'run', dist: 1, pf: 240, ps: 250 },
        { k: 'rec', dur: 90 },
      ],
    },
    { k: 'cool', dist: 1 },
  ];
  /** lo hecho, con el ritmo de cada repetición (null = salteada) */
  const series = (paces: (number | null)[]) => {
    let i = 0;
    const stages: Stage[] = expand(STEPS).map((e) => {
      if (e.k === 'warm') return { distKm: 2, timeSec: 660 };
      if (e.k === 'cool') return { distKm: 1, timeSec: 330 };
      if (e.k === 'rec') return { distKm: 0.25, timeSec: 90 };
      const p = paces[i++];
      return p == null ? { skipped: true } : { distKm: 1, timeSec: p, paceSec: p };
    });
    return sess('series', { plan: { steps: STEPS }, result: { distKm: 8, timeSec: 2500, paceSec: 312, stages } });
  };

  it('todo en el rango da 100', () => {
    const sc = scoreStaged(series([245, 245, 245, 245]));
    expect(sc.score).toBe(100);
    expect(sc.parts.map((p) => p.k)).toEqual(['warm', 'run', 'rec', 'cool']);
  });
  it('irse de ritmo y caerse al final resta en la parte principal', () => {
    // tramos: 100, 100, 80 (5 s lento), 52 (12 s lento) → 83; caída del 9,2% → −15 → 68 de 70 = 48
    const sc = scoreStaged(series([240, 245, 255, 262]));
    expect(sc.parts.find((p) => p.k === 'run')!.sc).toBeCloseTo(68, 5);
    expect(sc.score).toBe(78);
    expect(sc.summary).toBe('Lo que más puntos te sacó: parte principal (4 tramos) (−22).');
  });
  it('una repetición salteada vale 0', () => {
    const sc = scoreStaged(series([245, 245, 245, null]));
    expect(sc.parts.find((p) => p.k === 'run')!.sc).toBe(75);
    expect(sc.parts.find((p) => p.k === 'run')!.text).toMatch(/Salteaste 1 de 4/);
  });
  it('scoreSession elige por etapas y guarda el resultado por sesión', () => {
    const s = series([245, 245, 245, 245]);
    expect(scoreSession(s)).toBe(scoreSession(s));
    expect(scoreSession(s)!.score).toBe(100);
  });
});
