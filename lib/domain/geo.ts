/* Mapa de recorridos (Strava): proyección, polilíneas, zonas pintadas, barrios y el mapa de fondo
   (líneas 4433–4600 del original). Nada de esto dibuja: el lienzo está en components/map/draw.ts. */
import { S, setUi } from '@/lib/store';
import type { Route, Session } from './types';
import { addDays, clamp, sod, sum, ymd } from './util';
import { medOf } from './analysis';

/** punto proyectado (Mercator normalizado: 0–1 en x e y) o [lat, lng] recién decodificado */
export type Pt = [number, number];
export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}
export interface Barrio extends Box {
  n: string;
  rings: Pt[][];
}
/** calle, parque, agua… ya proyectado; `n` es el índice del nombre en `nm` (-1 sin nombre) */
export interface OsmFeat extends Box {
  P: Pt[];
  n: number;
}
export interface OsmLayers {
  maj: OsmFeat[];
  med: OsmFeat[];
  min: OsmFeat[];
  water: OsmFeat[];
  park: OsmFeat[];
  rail: OsmFeat[];
  sea: OsmFeat;
  isl: OsmFeat[];
  nm: string[];
}
/** encuadre: centro (x, y) en coordenadas proyectadas y escala en píxeles por unidad */
export interface MapVp {
  x: number;
  y: number;
  s: number;
}

/* ---- estado de la vista que no va en la URL (el período, las capas, el barrio y la salida elegida sí van) ---- */
export interface MapUi {
  view: MapVp | null;
  fs: boolean;
  syncing: boolean;
  msg: string;
  baseErr: boolean;
}
const MAP_INIT: MapUi = { view: null, fs: false, syncing: false, msg: '', baseErr: false };
export const mapUiInit = (): MapUi => MAP_INIT;
export const getMapUi = (): MapUi => {
  const v = S.ui.map as MapUi | undefined;
  return v === undefined ? mapUiInit() : v;
};
export const setMapUi = (patch: Partial<MapUi>) => setUi<MapUi>('map', (p) => ({ ...(p === undefined ? mapUiInit() : p), ...patch }));

/* ---- mapa de fondo (OpenStreetMap) ----
   pesa ~530 KB: vive en public/map/ba.json y se baja recién al abrir la pestaña Mapa */
interface RawBarrio {
  n: string;
  r: string[];
}
type RawOsm = Record<string, unknown>;
let BA_BARRIOS: RawBarrio[] | null = null,
  BA_OSM: RawOsm | null = null,
  BA_LOAD: Promise<boolean> | null = null,
  BA_P: Barrio[] | null = null,
  OSM_P: OsmLayers | null = null;
const baseSubs = new Set<() => void>();

export function loadBaseMap(): Promise<boolean> {
  if (BA_OSM) return Promise.resolve(true);
  if (BA_LOAD) return BA_LOAD;
  BA_LOAD = fetch('/map/ba.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
    .then(
      (d: { b?: RawBarrio[]; o?: RawOsm } | null) => {
        if (d && d.b && d.o) {
          BA_BARRIOS = d.b;
          BA_OSM = d.o;
          baseSubs.forEach((f) => f());
        }
        return !!BA_OSM;
      },
      () => {
        BA_LOAD = null;
        return false;
      },
    );
  return BA_LOAD;
}
export const baseMapReady = () => !!BA_OSM;
/** avisa cuando termina de bajar el mapa de fondo (para useSyncExternalStore) */
export function onBaseMap(fn: () => void) {
  baseSubs.add(fn);
  return () => {
    baseSubs.delete(fn);
  };
}
/** cantidad de barrios de la Ciudad (48 mientras no bajó el mapa) */
export const barrioCount = () => (BA_BARRIOS ? BA_BARRIOS.length : 48);

const boxOf = (pts: Pt[]): Box => {
  let x0 = 1,
    x1 = 0,
    y0 = 1,
    y1 = 0;
  pts.forEach((q) => {
    if (q[0] < x0) x0 = q[0];
    if (q[0] > x1) x1 = q[0];
    if (q[1] < y0) y0 = q[1];
    if (q[1] > y1) y1 = q[1];
  });
  return { x0, x1, y0, y1 };
};
export function baRings(): Barrio[] {
  if (!BA_BARRIOS) return [];
  if (!BA_P)
    BA_P = BA_BARRIOS.map((b) => {
      const rings = b.r.map((r) => decodePoly(r).map((q) => mproj(q[0], q[1])));
      return { n: b.n, rings, ...boxOf(rings.flat()) };
    });
  return BA_P;
}
/** capas del mapa de fondo ya proyectadas (null mientras no bajó) */
export function osmLayers(): OsmLayers | null {
  if (OSM_P) return OSM_P;
  const O = BA_OSM;
  if (!O) return null;
  const prj = (str: string, n = -1): OsmFeat => {
    const P = decodePoly(str).map((q) => mproj(q[0], q[1]));
    return { P, n, ...boxOf(P) };
  };
  const strs = (k: string) => (Array.isArray(O[k]) ? (O[k] as string[]) : []);
  const lay = (k: string) => {
    const I = Array.isArray(O[k + 'i']) ? (O[k + 'i'] as number[]) : null;
    return strs(k).map((s, i) => prj(s, I ? I[i] : -1));
  };
  OSM_P = {
    maj: lay('maj'),
    med: lay('med'),
    min: lay('min'),
    water: lay('water'),
    park: lay('park'),
    rail: lay('rail'),
    sea: prj(String(O.sea || '')),
    isl: strs('isl').map((s) => prj(s)),
    nm: strs('nm'),
  };
  return OSM_P;
}

/* ---- geometría ---- */
/** períodos del mapa: id (el de la URL), nombre y días hacia atrás (0 = todo) */
export const MAP_PERIODS = [
  ['todo', 'Todo', 0],
  ['3m', '3 meses', 90],
  ['4s', '4 semanas', 28],
] as const;
export type MapPeriod = (typeof MAP_PERIODS)[number][0];
/** metros por unidad proyectada a la latitud de Buenos Aires */
export const MPU = 40075016.686 * Math.cos((34.58 * Math.PI) / 180);
/** lado de la cuadrícula de zonas pintadas: 200 m */
export const CELL = 200 / MPU;
/** cuadrícula de 200 m de un punto (el área recorrida se cuenta en estas celdas; también la usan trofeos y XP) */
export const cellKey = (q: ArrayLike<number>) => Math.floor(q[0] / CELL) + ',' + Math.floor(q[1] / CELL);

export function decodePoly(s: string): Pt[] {
  let i = 0,
    lat = 0,
    lng = 0,
    b: number,
    sh: number,
    r: number;
  const out: Pt[] = [];
  while (i < s.length) {
    sh = 0;
    r = 0;
    do {
      b = s.charCodeAt(i++) - 63;
      r |= (b & 31) << sh;
      sh += 5;
    } while (b >= 32 && i < s.length);
    lat += r & 1 ? ~(r >> 1) : r >> 1;
    sh = 0;
    r = 0;
    do {
      b = s.charCodeAt(i++) - 63;
      r |= (b & 31) << sh;
      sh += 5;
    } while (b >= 32 && i < s.length);
    lng += r & 1 ? ~(r >> 1) : r >> 1;
    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}
export function mproj(lat: number, lng: number): Pt {
  const sn = Math.sin((lat * Math.PI) / 180);
  return [(lng + 180) / 360, 0.5 - Math.log((1 + sn) / (1 - sn)) / (4 * Math.PI)];
}
/* los puntos proyectados se guardan aparte: los recorridos del estado no se tocan */
const RT_P = new WeakMap<Route, Pt[]>();
export function routePts(r: Route): Pt[] {
  let p = RT_P.get(r);
  if (!p) {
    p = decodePoly(r.poly).map((q) => mproj(q[0], q[1]));
    RT_P.set(r, p);
  }
  return p;
}
/** el rectángulo que ocupa un recorrido (para descartar rápido los que no están cerca del puntero) */
const RT_BOX = new WeakMap<Route, Box>();
export function routeBox(r: Route): Box {
  let b = RT_BOX.get(r);
  if (!b) {
    b = boxOf(routePts(r));
    RT_BOX.set(r, b);
  }
  return b;
}
export function mapRoutes(period: MapPeriod): Route[] {
  let L = S.routes.filter((r) => r.poly && r.date);
  const days = MAP_PERIODS.find((p) => p[0] === period)?.[2] || 0;
  if (days) {
    const lim = ymd(addDays(sod(new Date()), -days));
    L = L.filter((r) => r.date >= lim);
  }
  return L.slice().sort((a, b) => a.date.localeCompare(b.date));
}

/** inverso de decodePoly: puntos [lat, lng] al formato de las polilíneas de Strava (para los recorridos de ejemplo) */
export function encodePoly(pts: Pt[]): string {
  const one = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1,
      s = '';
    while (n >= 0x20) {
      s += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    return s + String.fromCharCode(n + 63);
  };
  let la = 0,
    ln = 0,
    out = '';
  pts.forEach((q) => {
    const a = Math.round(q[0] * 1e5),
      b = Math.round(q[1] * 1e5);
    out += one(a - la) + one(b - ln);
    la = a;
    ln = b;
  });
  return out;
}

/* cuadrículas de 200 m por las que pasa un recorrido: las de cada punto y, entre dos puntos alejados (las polilíneas de
   Strava vienen simplificadas), las del medio. Es lo que cuentan las zonas pintadas, los km² explorados, los trofeos
   de exploración y la XP */
const RT_C = new WeakMap<Route, Set<string>>();
export function routeCells(r: Route): Set<string> {
  const had = RT_C.get(r);
  if (had) return had;
  const P = routePts(r),
    s = new Set<string>();
  for (let i = 0; i < P.length; i++) {
    const a = P[i];
    s.add(cellKey(a));
    if (i) {
      const b = P[i - 1],
        d = Math.hypot(a[0] - b[0], a[1] - b[1]),
        n = Math.ceil(d / (CELL / 2));
      for (let k = 1; k < n; k++) s.add(cellKey([b[0] + ((a[0] - b[0]) * k) / n, b[1] + ((a[1] - b[1]) * k) / n]));
    }
  }
  RT_C.set(r, s);
  return s;
}
/** km² distintos: cada cuadrícula de 200 m es 0,04 km² */
export const cellArea = (n: number) => n * 0.04;

/** marcas cada `every` km sobre un recorrido ya proyectado. El largo de la polilínea se lleva a los km de la salida, así
    la última marca cae donde dice el reloj */
export function kmMarks(P: Pt[], km: number, every = 2): { k: number; p: Pt }[] {
  if (P.length < 2 || !(km > 0)) return [];
  let tot = 0;
  for (let i = 1; i < P.length; i++) tot += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  if (!tot) return [];
  const out: { k: number; p: Pt }[] = [];
  let acc = 0,
    i = 1,
    k = every;
  while (k < km && i < P.length) {
    const want = (k / km) * tot,
      a = P[i - 1],
      b = P[i],
      seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + seg >= want) {
      const f = seg ? (want - acc) / seg : 0;
      out.push({ k, p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f] });
      k += every;
    } else {
      acc += seg;
      i++;
    }
  }
  return out;
}

/* las cachés se invalidan si cambia el período, la lista o el arreglo de recorridos (al sincronizar o recargar) */
const cacheKey = (L: Route[], period: string) => period + '|' + L.length + '|' + (L.length ? L[L.length - 1].id : '');
export interface MapCells {
  key: string;
  m: Map<string, number>;
  max: number;
}
let CC: (MapCells & { src: Route[] }) | null = null;
/** zonas pintadas: por cuántas salidas distintas pasaste por cada cuadrícula de 200 m */
export function mapCells(L: Route[], period: string): MapCells {
  const key = cacheKey(L, period);
  if (CC && CC.key === key && CC.src === S.routes) return CC;
  const m = new Map<string, number>();
  L.forEach((r) => routeCells(r).forEach((k) => m.set(k, (m.get(k) || 0) + 1)));
  let mx = 1;
  m.forEach((v) => {
    if (v > mx) mx = v;
  });
  CC = { key, m, max: mx, src: S.routes };
  return CC;
}

export function mapFit(L: Route[], W: number, H: number, all?: boolean): MapVp {
  let x0 = 1,
    x1 = 0,
    y0 = 1,
    y1 = 0;
  /* si hay un recorrido suelto lejos (un viaje), el encuadre se queda donde corrés siempre */
  if (L.length >= 4) {
    const C = L.map((r) => {
      const P = routePts(r);
      return P.length ? ([sum(P.map((p) => p[0])) / P.length, sum(P.map((p) => p[1])) / P.length] as Pt) : null;
    });
    const ok = C.filter((c): c is Pt => !!c);
    const cx = medOf(ok.map((c) => c[0])) ?? NaN,
      cy = medOf(ok.map((c) => c[1])) ?? NaN;
    const near = L.filter((r, i) => {
      const c = C[i];
      return c && Math.hypot(c[0] - cx, c[1] - cy) < CELL * 100;
    });
    if (near.length >= L.length * 0.8) L = near;
  }
  if (all)
    L.forEach((r) =>
      routePts(r).forEach((p) => {
        if (p[0] < x0) x0 = p[0];
        if (p[0] > x1) x1 = p[0];
        if (p[1] < y0) y0 = p[1];
        if (p[1] > y1) y1 = p[1];
      }),
    );
  else {
    /* al abrir: el 94% central de tus puntos, para que el mapa arranque donde corrés de verdad */
    const xs: number[] = [],
      ys: number[] = [];
    L.forEach((r) =>
      routePts(r).forEach((p) => {
        xs.push(p[0]);
        ys.push(p[1]);
      }),
    );
    if (xs.length) {
      xs.sort((a, b) => a - b);
      ys.sort((a, b) => a - b);
      const q = (a: number[], f: number) => a[Math.floor((a.length - 1) * f)];
      x0 = q(xs, 0.03);
      x1 = q(xs, 0.97);
      y0 = q(ys, 0.03);
      y1 = q(ys, 0.97);
    }
  }
  if (x1 < x0) {
    baRings().forEach((b) => {
      if (b.x0 < x0) x0 = b.x0;
      if (b.x1 > x1) x1 = b.x1;
      if (b.y0 < y0) y0 = b.y0;
      if (b.y1 > y1) y1 = b.y1;
    });
  }
  if (x1 < x0) {
    const a = mproj(-34.53, -58.53),
      b = mproj(-34.71, -58.33);
    x0 = a[0];
    x1 = b[0];
    y0 = a[1];
    y1 = b[1];
  }
  const bw = Math.max(x1 - x0, CELL * 8),
    bh = Math.max(y1 - y0, CELL * 8);
  const sc = Math.min(W / (bw * 1.15), (H - 150) / (bh * 1.1));
  /* la tarjeta de abajo y el período de arriba tapan un poco: corro el centro */
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 + 25 / sc, s: sc };
}
/** encuadre de un barrio (al tocarlo en «Tus barrios») */
export function barrioFit(b: Barrio, W: number, H: number): MapVp {
  const sc = Math.min(W / ((b.x1 - b.x0) * 1.5), (H - 150) / ((b.y1 - b.y0) * 1.4));
  return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 + 25 / sc, s: clamp(sc, 800, 4e7) };
}

/* ---- colores ---- */
export function hexA(c: string | null | undefined, a: number) {
  c = String(c || '').trim();
  let m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m) {
    const n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  m = /^#([0-9a-f]{3})$/i.exec(c);
  if (m) {
    const t = m[1];
    return 'rgba(' + parseInt(t[0] + t[0], 16) + ',' + parseInt(t[1] + t[1], 16) + ',' + parseInt(t[2] + t[2], 16) + ',' + a + ')';
  }
  return c || 'rgba(255,106,31,' + a + ')';
}

/* ---- sesión de cada recorrido: por id de Strava y, si no, por fecha y distancia ----
   la caché se tira cuando cambian las sesiones (el original la recalculaba en cada render) */
let RT_S = new WeakMap<Route, Session | null>(),
  RT_SRC: Session[] | null = null;
export function routeSess(r: Route): Session | null {
  if (RT_SRC !== S.sessions) {
    RT_S = new WeakMap();
    RT_SRC = S.sessions;
  }
  const c = RT_S.get(r);
  if (c !== undefined) return c;
  let s = S.sessions.find((x) => x.result && x.result.sid && String(x.result.sid) === String(r.sid)) || null;
  if (!s)
    s =
      S.sessions
        .filter((x) => x.result && x.result.date === r.date)
        .sort((a, b) => Math.abs(a.result!.distKm - r.km) - Math.abs(b.result!.distKm - r.km))[0] || null;
  RT_S.set(r, s);
  return s;
}

/* ---- barrios: en qué barrio cae cada tramo de cada recorrido ---- */
export function inRing(x: number, y: number, R: Pt[]) {
  let c = false;
  for (let i = 0, j = R.length - 1; i < R.length; j = i++) {
    const a = R[i],
      b = R[j];
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
export function barrioAt(x: number, y: number, hint: Barrio | null): Barrio | null {
  const inB = (b: Barrio) => {
    if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) return false;
    let k = false;
    b.rings.forEach((R) => {
      if (inRing(x, y, R)) k = !k;
    });
    return k;
  };
  if (hint && inB(hint)) return hint;
  return baRings().find(inB) || null;
}
export interface BarrioKm {
  b: Barrio;
  /** salidas que pasaron por el barrio */
  n: number;
  km: number;
}
export interface MapBarrios {
  key: string;
  list: BarrioKm[];
  /** lo corrido fuera de la Ciudad */
  out: { n: number; km: number };
}
/** km de un recorrido en cada barrio y fuera de la Ciudad (vacío mientras no bajó el mapa). Con esto se arma el ranking
    y se resaltan los recorridos de un barrio */
export interface RouteBarrios {
  km: Map<Barrio, number>;
  out: number;
}
const RT_B = new WeakMap<Route, RouteBarrios>();
export function routeBarrios(r: Route): RouteBarrios {
  if (!BA_BARRIOS) return { km: new Map(), out: 0 };
  const had = RT_B.get(r);
  if (had) return had;
  const P = routePts(r),
    res: RouteBarrios = { km: new Map(), out: 0 };
  let last: Barrio | null = null;
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1],
      b = P[i],
      km = (Math.hypot(b[0] - a[0], b[1] - a[1]) * MPU) / 1000,
      B = barrioAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, last);
    if (B) {
      last = B;
      res.km.set(B, (res.km.get(B) || 0) + km);
    } else res.out += km;
  }
  RT_B.set(r, res);
  return res;
}
let BZ: (MapBarrios & { src: Route[] }) | null = null;
export function mapBarrios(L: Route[], period: string): MapBarrios | null {
  if (!BA_BARRIOS) return null;
  const key = cacheKey(L, period);
  if (BZ && BZ.key === key && BZ.src === S.routes) return BZ;
  const m = new Map<string, BarrioKm>(),
    out = { n: 0, km: 0 };
  L.forEach((r) => {
    const rb = routeBarrios(r);
    rb.km.forEach((km, B) => {
      const e = m.get(B.n) || { b: B, n: 0, km: 0 };
      e.km += km;
      e.n++;
      m.set(B.n, e);
    });
    if (rb.out > 0) {
      out.km += rb.out;
      out.n++;
    }
  });
  const list = [...m.values()].filter((e) => e.km >= 0.05).sort((a, b) => b.km - a.km);
  BZ = { key, list, out, src: S.routes };
  return BZ;
}

/* ---- encuadre ---- */
/** zona con datos del mapa (la misma que se bajó de OpenStreetMap): el mapa no se deja llevar más allá */
export const MAP_EXT: Box = (() => {
  const a = mproj(-34.445, -58.56),
    b = mproj(-34.715, -58.32);
  return { x0: a[0], y0: a[1], x1: b[0], y1: b[1] };
})();
/** acomoda el encuadre (lo modifica: es la copia viva del lienzo) */
export function mapClamp(V: MapVp, W: number, H: number) {
  const E = MAP_EXT,
    smin = Math.max(W / (E.x1 - E.x0), H / (E.y1 - E.y0));
  if (V.s < smin) V.s = smin;
  const hx = W / 2 / V.s,
    hy = H / 2 / V.s;
  V.x = clamp(V.x, E.x0 + hx, E.x1 - hx);
  V.y = clamp(V.y, E.y0 + hy, E.y1 - hy);
}
