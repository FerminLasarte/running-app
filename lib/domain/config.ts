/* Configuración: tipos de sesión, zonas de FC, carreras y zapatillas. */
import { S } from '@/lib/store';
import type { Race, SessionType } from './types';
import { dayDiff, pd, todayS } from './util';
export { PHASE_KEYS, RACE_PRESETS, defaultCfg, defaultCfgRaw, normCfg, normRace, normShoe } from './defaults';

export interface TypeDef {
  label: string;
  /** color CSS del tipo */
  t: string;
  ctl: 'hr' | 'pace';
  wVol: number;
  wInt: number;
  hint: string;
}

export const TYPES: Record<SessionType, TypeDef> = {
  fondo: { label: 'Fondo', t: 'var(--t-fondo)', ctl: 'hr', wVol: 40, wInt: 60, hint: 'Largo y fácil. Se guía por frecuencia cardíaca.' },
  series: { label: 'Series', t: 'var(--t-series)', ctl: 'pace', wVol: 40, wInt: 60, hint: 'Repeticiones rápidas con pausas. Se guía por ritmo.' },
  tempo: { label: 'Tempo', t: 'var(--t-tempo)', ctl: 'pace', wVol: 35, wInt: 65, hint: 'Tramo sostenido a ritmo exigente pero controlado.' },
  regen: { label: 'Regenerativo', t: 'var(--t-regen)', ctl: 'hr', wVol: 30, wInt: 70, hint: 'Muy suave para recuperar. Se guía por frecuencia cardíaca.' },
  test: { label: 'Test / carrera', t: 'var(--t-test)', ctl: 'pace', wVol: 40, wInt: 60, hint: 'Esfuerzo máximo para medir tu nivel.' },
};
export const TYPE_KEYS = Object.keys(TYPES) as SessionType[];
export const isType = (k: unknown): k is SessionType => typeof k === 'string' && k in TYPES;

/** [código, nombre, % mín de FC máx, % máx] */
export const ZN: [string, string, number, number][] = [
  ['Z1', 'Muy suave', 0.5, 0.6],
  ['Z2', 'Aeróbica fácil', 0.6, 0.7],
  ['Z3', 'Moderada', 0.7, 0.8],
  ['Z4', 'Umbral', 0.8, 0.9],
  ['Z5', 'Máxima', 0.9, 1],
];

/* zonas: por % de la FC máxima, o cargadas a mano (cfg.zones = 5 pares [mín, máx]) */
export const zoneRange = (i: number): [number, number] =>
  S.cfg.zones ? [S.cfg.zones[i][0], S.cfg.zones[i][1]] : [Math.round(S.cfg.hrMax * ZN[i][2]), Math.round(S.cfg.hrMax * ZN[i][3])];
export function zoneIdx(hr: number) {
  for (let i = 0; i < 5; i++) {
    const z = zoneRange(i);
    if (hr >= z[0] && hr <= z[1]) return i;
  }
  let k = -1;
  for (let i = 0; i < 5; i++) if (hr >= zoneRange(i)[0]) k = i;
  return k;
}
export function zoneOf(hr: number) {
  const k = zoneIdx(hr);
  return k < 0 ? 'bajo Z1' : 'Z' + (k + 1);
}
export const racePaceSec = (r: Pick<Race, 'targetSec' | 'km' | 'lt'>) => {
  const p = r.targetSec / r.km;
  return r.lt ? Math.floor(p) : Math.round(p);
};

/* ---- carreras: la app siempre trabaja con la próxima ---- */
export const racesSorted = () => S.cfg.races.slice().sort((a, b) => a.date.localeCompare(b.date));
export const upcomingRaces = () => {
  const t = todayS();
  return racesSorted().filter((r) => r.date >= t);
};
export const nextRace = (): Race | null => upcomingRaces()[0] || null;
export const pastRaces = () => {
  const t = todayS();
  return racesSorted()
    .filter((r) => r.date < t)
    .reverse();
};
/* ritmo de referencia para plantillas y ritmos: la próxima carrera corta, o el 10K más cercano en el tiempo */
export function refRace(): Race {
  const up = upcomingRaces(),
    short = up.find((r) => r.km <= 10 && r.targetSec > 0);
  if (short) return short;
  const tens = S.cfg.races
    .filter((r) => r.km === 10 && r.targetSec > 0)
    .sort((a, b) => Math.abs(dayDiff(pd(a.date), new Date())) - Math.abs(dayDiff(pd(b.date), new Date())));
  return tens[0] || up.find((r) => r.targetSec > 0) || { id: '_', name: '10K', km: 10, targetSec: 2700, lt: false, date: todayS(), time: '', place: '', planStart: '' };
}
export const isLong = (r: Race) => r.km > 21.2;
/* tirada larga mínima recomendable según la distancia */
export const longTarget = (km: number) => (km <= 10 ? km * 1.2 : km <= 21.2 ? 18 : 32);
export const easyActive = (d: string) => !!(S.cfg.easy && d >= S.cfg.easy.from && d <= S.cfg.easy.until);

/* ---- zapatillas ---- */
export const activeShoes = () => (S.cfg.shoes || []).filter((z) => !z.retired);
export const mainShoe = () => {
  const a = activeShoes();
  return a.find((z) => z.main) || (a.length === 1 ? a[0] : null);
};
export const shoeById = (id: string) => (S.cfg.shoes || []).find((z) => z.id === id) || null;
