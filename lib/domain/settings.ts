/* Ajustes: los borradores de los campos, qué está mal en cada uno y cómo pasan a la configuración (las mismas reglas
   que tenía readSettings en la pantalla vieja), y las zonas de FC como bordes que se mueven. Puro: no lee el estado. */
import type { Cfg, Race, Shoe } from './types';
import { readHms, hmsFromSec, type Hms } from './hms';
import { fmt, num } from './util';

const inR = (v: number | null, a: number, b: number): v is number => v != null && v >= a && v <= b;
/** el número de un campo fuera de su rango (vacío no cuenta: se deja lo que había) */
const outOf = (v: string, a: number, b: number) => {
  const x = num(v.trim());
  return x != null && !inR(x, a, b);
};

/* ---- perfil ---- */
export interface ProfileDraft {
  name: string;
  age: string;
  since: string;
}
export const profileDraft = (c: Cfg): ProfileDraft => ({ name: c.name || '', age: c.age ? String(c.age) : '', since: c.since || '' });
export const ageErr = (v: string) => (outOf(v, 14, 80) ? 'Entre 14 y 80 años.' : null);
/** pasa el perfil a `c` (lo que está mal queda como estaba) y devuelve lo que hay que revisar */
export function applyProfile(c: Cfg, d: ProfileDraft): string[] {
  const name = d.name.trim().slice(0, 40);
  if (name) c.name = name;
  else delete c.name;
  if (d.since) c.since = d.since;
  const ag = num(d.age);
  if (ageErr(d.age)) return ['la edad'];
  if (ag != null) c.age = Math.round(ag);
  return [];
}

/* ---- FC máxima: con zonas a mano, la Z5 llega hasta ella ---- */
export function hrMaxErr(v: string, zones: [number, number][] | null) {
  const hm = num(v.trim());
  if (outOf(v, 150, 230)) return 'Entre 150 y 230 lpm.';
  if (hm != null && zones && !edgesWithMax(zoneEdges(zones), hm)) return 'Tu Z5 arranca en ' + zones[4][0] + ': subila o tocá «Recalcular zonas».';
  return null;
}
export function applyHrMax(c: Cfg, v: string): string[] {
  const hm = num(v.trim());
  if (hrMaxErr(v, c.zones)) return ['la FC máxima'];
  if (hm == null) return [];
  c.hrMax = Math.round(hm);
  if (c.zones) c.zones = zonesOf(edgesWithMax(zoneEdges(c.zones), c.hrMax)!);
  return [];
}

/* ---- carreras ---- */
export interface RaceDraft {
  name: string;
  km: string;
  date: string;
  time: string;
  place: string;
  start: string;
  lt: boolean;
  tgt: Hms;
  res: Hms;
}
export const raceDraft = (r: Race): RaceDraft => ({
  name: r.name,
  km: fmt(r.km, 4),
  date: r.date,
  time: r.time || '',
  place: r.place || '',
  start: r.planStart || '',
  lt: !!r.lt,
  tgt: hmsFromSec(r.targetSec || 0),
  res: hmsFromSec(r.resultSec || 0),
});
export type RaceErr = Partial<Record<'km' | 'tgt' | 'res', string>>;
/** un tiempo escrito: vacío vale (se borra), cero o mal escrito no */
const badTime = (h: Hms) => {
  const t = readHms(h);
  return t !== null && !(t > 0);
};
/** `past`: la carrera ya fue (se carga tu tiempo en vez del objetivo y el inicio del plan) */
export function raceErrs(v: RaceDraft, past: boolean): RaceErr {
  const e: RaceErr = {};
  if (outOf(v.km, 0.4, 250)) e.km = 'Entre 0,4 y 250 km.';
  if (past ? badTime(v.res) : badTime(v.tgt)) e[past ? 'res' : 'tgt'] = 'Revisá el tiempo: los minutos y los segundos van de 0 a 59.';
  return e;
}
export function applyRace(r: Race, v: RaceDraft, past: boolean): string[] {
  const bad: string[] = [],
    err = raceErrs(v, past);
  r.name = v.name.trim() || r.name;
  const km = num(v.km.trim());
  if (err.km) bad.push(r.name + ': la distancia');
  else if (km != null) r.km = km;
  if (v.date.trim()) r.date = v.date.trim();
  const tm = v.time.trim();
  r.time = /^\d{1,2}:\d{2}$/.test(tm) ? tm : '';
  r.place = v.place.trim();
  if (!past) {
    r.planStart = v.start.trim();
    r.lt = v.lt;
    const t = readHms(v.tgt);
    if (err.tgt) bad.push(r.name + ': el tiempo objetivo');
    else r.targetSec = t === null ? 0 : Math.round(t);
  } else {
    const t = readHms(v.res);
    if (err.res) bad.push(r.name + ': tu tiempo');
    else if (t === null) delete r.resultSec;
    else r.resultSec = Math.round(t);
  }
  return bad;
}

/* ---- zapatillas ---- */
export interface ShoeDraft {
  name: string;
  start: string;
  lim: string;
}
export const shoeDraft = (z: Shoe): ShoeDraft => ({ name: z.name, start: fmt(z.startKm, 1), lim: fmt(z.limitKm, 0) });
export type ShoeErr = Partial<Record<'start' | 'lim', string>>;
export function shoeErrs(v: ShoeDraft): ShoeErr {
  const e: ShoeErr = {};
  if (outOf(v.start, 0, 5000)) e.start = 'Entre 0 y 5000 km.';
  if (outOf(v.lim, 100, 3000)) e.lim = 'Entre 100 y 3000 km.';
  return e;
}
export function applyShoe(z: Shoe, v: ShoeDraft): string[] {
  const bad: string[] = [],
    err = shoeErrs(v);
  z.name = v.name.trim() || z.name;
  const a = num(v.start.trim()),
    l = num(v.lim.trim());
  if (err.start) bad.push(z.name + ': los km que ya tenían');
  else if (a != null) z.startKm = a;
  if (err.lim) bad.push(z.name + ': el límite (100 a 3000 km)');
  else if (l != null) z.limitKm = l;
  return bad;
}

/* ---- zonas de FC: seis bordes (dónde arranca cada zona y, al final, la FC máxima), siempre en orden ---- */
/** lo mínimo que mide una zona, en lpm */
export const ZONE_GAP = 4;
/** el piso más bajo de la Z1 (el mismo que acepta normCfg) */
export const ZONE_FLOOR = 40;
/** los bordes de cinco zonas [mín, máx]: donde arranca cada una y donde termina la Z5. Si había huecos, se cierran */
export const zoneEdges = (z: [number, number][]) => [...z.map((x) => x[0]), z[4][1]];
/** cada zona arranca donde termina la anterior; la Z5 llega al último borde */
export const zonesOf = (e: number[]): [number, number][] => [0, 1, 2, 3, 4].map((i) => [e[i], i < 4 ? e[i + 1] - 1 : e[5]]);
/** hasta dónde se puede mover el borde `i` (0 el piso de la Z1, 1 a 4 los cortes) sin achicar una zona de más */
export const edgeRange = (e: number[], i: number): [number, number] => [i ? e[i - 1] + ZONE_GAP : ZONE_FLOOR, e[i + 1] - ZONE_GAP];
export function moveEdge(e: number[], i: number, v: number): number[] {
  const [a, b] = edgeRange(e, i),
    n = e.slice();
  n[i] = Math.max(a, Math.min(b, Math.round(v)));
  return n;
}
/** los mismos cortes con otra FC máxima; null si la Z5 quedaría más chica de lo que se puede */
export const edgesWithMax = (e: number[], hrMax: number): number[] | null => (hrMax - e[4] >= ZONE_GAP ? [...e.slice(0, 5), Math.round(hrMax)] : null);
