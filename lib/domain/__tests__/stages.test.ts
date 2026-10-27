import { describe, expect, it } from 'vitest';
import { cleanStage, cleanStep, cleanSteps, expand, legacySteps, normSession, planTotals, stageTotals, stepsBrief } from '../stages';
import type { PlanStep } from '../types';

/** 2 km de calentamiento, 3 × (1 km a 4:00–4:10 + 2 min de trote) y 1 km de enfriamiento */
const SERIES: PlanStep[] = [
  { k: 'warm', dist: 2 },
  {
    k: 'rep',
    n: 3,
    steps: [
      { k: 'run', dist: 1, pf: 240, ps: 250 },
      { k: 'rec', dur: 120 },
    ],
  },
  { k: 'cool', dist: 1 },
];

describe('expand', () => {
  it('despliega las repeticiones en orden, con bloque, paso y vuelta', () => {
    const ex = expand(SERIES);
    expect(ex.map((e) => e.k)).toEqual(['warm', 'run', 'rec', 'run', 'rec', 'run', 'rec', 'cool']);
    expect(ex.map((e) => e.idx)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(ex[3]).toMatchObject({ gi: 1, j: 0, r: 1 });
    expect(ex[7]).toMatchObject({ gi: 2, j: -1, r: -1 });
  });
  it('sin pasos, nada', () => {
    expect(expand(undefined)).toEqual([]);
  });
});

describe('totales del plan', () => {
  it('suma la distancia y aparte el tiempo de los pasos por duración', () => {
    expect(planTotals(SERIES)).toEqual({ dist: 6, timeOnly: 360, nTimeSteps: 3 });
  });
  it('resumen de una línea', () => {
    expect(stepsBrief(SERIES)).toBe('Calent. 2 km · 3×1 km @4:05 (rec 2:00) · Enfr. 1 km');
  });
});

describe('limpieza de pasos (lo que llega de la IA, un respaldo o un CSV)', () => {
  it('descarta tipos desconocidos y pasos sin distancia ni duración', () => {
    expect(cleanStep({ k: 'sprint', dist: 1 })).toBeNull();
    expect(cleanStep({ k: 'run' })).toBeNull();
    expect(cleanStep({ k: 'run', dur: 40000 })).toBeNull();
  });
  it('se queda con la distancia si vienen las dos, redondeada a metros', () => {
    expect(cleanStep({ k: 'run', dist: 1.23456, dur: 300 })).toEqual({ k: 'run', dist: 1.235 });
  });
  it('ignora rangos de ritmo o FC al revés o fuera de lo posible', () => {
    expect(cleanStep({ k: 'run', dist: 1, pf: 260, ps: 240 })).toEqual({ k: 'run', dist: 1 });
    expect(cleanStep({ k: 'run', dist: 1, hl: 150, hh: 140 })).toEqual({ k: 'run', dist: 1 });
    expect(cleanStep({ k: 'run', dist: 1, pf: 240, ps: 250, hl: 140, hh: 150 })).toEqual({ k: 'run', dist: 1, pf: 240, ps: 250, hl: 140, hh: 150 });
  });
  it('descarta repeticiones vacías o con n fuera de 1–50, y corta en 30 bloques', () => {
    expect(cleanSteps([{ k: 'rep', n: 0, steps: [{ k: 'run', dist: 1 }] }])).toEqual([]);
    expect(cleanSteps([{ k: 'rep', n: 4, steps: [{ k: 'nada' }] }])).toEqual([]);
    expect(cleanSteps(Array.from({ length: 40 }, () => ({ k: 'run', dist: 1 })))).toHaveLength(30);
    expect(cleanSteps('basura')).toEqual([]);
  });
  it('una etapa sin distancia o sin tiempo cuenta como salteada', () => {
    expect(cleanStage({ distKm: 1 })).toEqual({ skipped: true });
    expect(cleanStage(null)).toEqual({ skipped: true });
    expect(cleanStage({ distKm: 1, timeSec: 245, hrAvg: -3, laps: [{ distKm: 0.5, timeSec: 120 }, { distKm: 0 }] })).toEqual({
      distKm: 1,
      timeSec: 245,
      laps: [{ distKm: 0.5, timeSec: 120 }],
    });
  });
  it('un plan viejo (sin etapas) pasa a una etapa con ±5 s de ritmo', () => {
    expect(legacySteps({ date: '2026-10-01', distKm: 8, paceSec: 300 })).toEqual([{ k: 'run', dist: 8, pf: 295, ps: 305 }]);
    expect(legacySteps({ date: '2026-10-01' })).toEqual([]);
  });
});

describe('totales de lo hecho por etapas', () => {
  it('FC promedio pesada por tiempo y ritmo principal solo de las etapas de carrera', () => {
    const ex = expand(SERIES);
    const stages = [
      { distKm: 2, timeSec: 660, hrAvg: 130 },
      { distKm: 1, timeSec: 240, hrAvg: 170, hrMax: 178 },
      { distKm: 0.3, timeSec: 120 },
      { distKm: 1, timeSec: 246, hrAvg: 172 },
      { skipped: true },
      { distKm: 1, timeSec: 252, hrAvg: 175, hrMax: 181 },
      { distKm: 0.3, timeSec: 120 },
      { distKm: 1, timeSec: 330, hrAvg: 150 },
    ];
    const t = stageTotals(stages, ex);
    expect(t.distKm).toBe(6.6);
    expect(t.timeSec).toBe(1968);
    expect(t.paceSec).toBe(Math.round(1968 / 6.6));
    expect(t.mainPaceSec).toBe(246);
    expect(t.hrMax).toBe(181);
    expect(t.hrAvg).toBe(Math.round((130 * 660 + 170 * 240 + 172 * 246 + 175 * 252 + 150 * 330) / (660 + 240 + 246 + 252 + 330)));
  });
});

describe('normSession', () => {
  it('tipo desconocido pasa a fondo y las etapas que no coinciden con el plan se descartan', () => {
    const s = normSession({
      id: 'x',
      type: 'trote',
      plan: { date: '2026-10-01', steps: SERIES },
      result: { date: '2026-10-01', distKm: 7, timeSec: 2000, paceSec: 286, stages: [{ distKm: 1, timeSec: 240 }] },
    });
    expect(s.type).toBe('fondo');
    expect(s.result!.stages).toBeUndefined();
    expect(s.missed).toBe(false);
  });
  it('si las etapas coinciden, las limpia', () => {
    const stages = expand(SERIES).map(() => ({ distKm: 1, timeSec: 250, basura: 1 }));
    const s = normSession({ id: 'x', type: 'series', plan: { date: '2026-10-01', steps: SERIES }, result: { date: '2026-10-01', distKm: 8, timeSec: 2000, paceSec: 250, stages } });
    expect(s.result!.stages).toHaveLength(8);
    expect(s.result!.stages![0]).toEqual({ distKm: 1, timeSec: 250 });
  });
});
