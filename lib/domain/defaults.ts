/* Configuración de fábrica y normalizadores (puros: no leen el estado, así el store puede usarlos al arrancar). */
import type { Cfg, PhaseKey, Race, Shoe } from './types';
import { addDays, cleanObj, ymd } from './util';

/** Configuración de fábrica, sin normalizar (las carreras completan hora, lugar e inicio de plan en `normRace`).
    Usala siempre a través de `defaultCfg()`. */
const DEF_CFG = {
  hrMax: 203,
  weeklyGoal: 3,
  planStart: '2026-08-31',
  age: 27,
  since: '2026-01-24',
  races: [
    { id: 'r10', name: '10K', km: 10, date: '2026-11-28', targetSec: 2700, lt: false },
    { id: 'rmar', name: 'Maratón', km: 42.195, date: '2027-09-19', targetSec: 15300, lt: true },
  ],
  easy: null,
};
/** Copia nueva de la configuración de fábrica, sin normalizar: mezclala con lo guardado y pasala por `normCfg`. */
export const defaultCfgRaw = (): Record<string, unknown> => cleanObj(DEF_CFG);
export const defaultCfg = (): Cfg => normCfg(defaultCfgRaw());

export const PHASE_KEYS: PhaseKey[] = ['base', 'dev', 'spec', 'taper'];
export const RACE_PRESETS: [number, string][] = [[5, '5K'], [10, '10K'], [21.0975, 'Media maratón'], [42.195, 'Maratón']];
const RX_DATE = /^\d{4}-\d{2}-\d{2}$/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normRace(r: any, c?: Partial<Cfg>): Race {
  const o: Race = {
    id: String((r && r.id) || 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)),
    name: String((r && r.name) || 'Carrera').slice(0, 40),
    km: Number(r && r.km) > 0 ? Number(r.km) : 10,
    date: RX_DATE.test((r && r.date) || '') ? r.date : ymd(addDays(new Date(), 60)),
    targetSec: Number(r && r.targetSec) > 0 ? Math.round(r.targetSec) : 0,
    lt: !!(r && r.lt),
    time: '',
    place: '',
    planStart: '',
  };
  o.time = /^\d{1,2}:\d{2}$/.test((r && r.time) || '') ? r.time : o.id === 'r10' ? '20:00' : '';
  o.place = r && r.place != null ? String(r.place).slice(0, 60) : o.id === 'r10' ? 'Puerto Madero' : '';
  o.planStart = RX_DATE.test((r && r.planStart) || '') ? r.planStart : o.id === 'r10' && c && c.planStart ? c.planStart : '';
  if (Number(r && r.resultSec) > 0) o.resultSec = Math.round(r.resultSec);
  if (Array.isArray(r && r.phases)) {
    const ph = (r.phases as { k: PhaseKey; from: string }[])
      .filter((q) => q && PHASE_KEYS.includes(q.k) && RX_DATE.test(q.from))
      .map((q) => ({ k: q.k, from: q.from }))
      .sort((a, b) => a.from.localeCompare(b.from));
    if (ph.length) o.phases = ph;
  }
  return o;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normShoe(x: any): Shoe {
  return {
    id: String((x && x.id) || 'z_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)),
    name: String((x && x.name) || 'Zapatillas').slice(0, 40),
    startKm: Number(x && x.startKm) >= 0 ? Number(x.startKm) : 0,
    limitKm: Number(x && x.limitKm) >= 100 ? Number(x.limitKm) : 700,
    retired: !!(x && x.retired),
    main: !!(x && x.main),
  };
}

/** Normaliza una configuración (también la que llega de un respaldo o de la base). Muta y devuelve `c`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normCfg(c: any): Cfg {
  c.races = (Array.isArray(c.races) ? c.races : []).map((r: unknown) => normRace(r, c)).sort((a: Race, b: Race) => a.date.localeCompare(b.date));
  c.rcs = c.rcs && typeof c.rcs === 'object' ? c.rcs : {};
  c.shoes = (Array.isArray(c.shoes) ? c.shoes : []).map(normShoe);
  const zv =
    Array.isArray(c.zones) &&
    c.zones.length === 5 &&
    c.zones.every((z: number[], i: number) => Array.isArray(z) && z[0] >= 40 && z[1] <= 240 && z[0] < z[1] && (i === 0 || z[0] >= c.zones[i - 1][0]));
  c.zones = zv ? c.zones.map((z: number[]) => [Math.round(z[0]), Math.round(z[1])]) : null;
  if (c.rc && !c.rcs.r10 && c.races.some((r: Race) => r.id === 'r10')) c.rcs.r10 = c.rc;
  if (!(typeof c.avatar === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(c.avatar) && c.avatar.length < 200000)) delete c.avatar;
  if (c.easy === undefined) c.easy = null;
  return c as Cfg;
}

