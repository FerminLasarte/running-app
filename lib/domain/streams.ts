/* Las series de Strava de una salida, resumidas para el detalle de sesión: ritmo, FC, altura y recorrido a lo largo de
   la distancia, y las vueltas del reloj. `Series` es lo que se guarda en la tabla `streams` (lib/data/streams.ts la
   llena). */
import type { PerformancePayload, StreamsPayload } from '@/lib/strava/client';
import type { RunExtra, Session, Step, StepKind } from './types';
import { zoneIdx } from './config';
import { expand } from './stages';
import { stepKm } from './stats';
import { fmt, fmtPace, sum } from './util';

export interface Series {
  /** metros desde la largada, al final de cada tramito */
  d: number[];
  /** segundos desde la largada */
  t: number[];
  /** ritmo del tramito en s/km; 0 = parado */
  p: number[];
  /** FC media del tramito (0 si en ese tramito no midió); null si el reloj no trajo FC */
  h: number[] | null;
  /** recorrido: [lat, lng] al final de cada tramito */
  ll: [number, number][] | null;
  /** desnivel positivo y negativo, en metros */
  up: number | null;
  down: number | null;
  /** las vueltas del reloj (get_activity_performance); [] si no trajo, sin el campo si todavía no se pidieron */
  laps?: Split[];
}

/* unos 600 puntos alcanzan para el ancho del gráfico; nunca tramitos de menos de 10 m */
const PTS = 600,
  MIN_STEP = 10;
/* el GPS sube y baja unos metros sin que cambie nada: el desnivel se cuenta de a 3 m o más */
const CLIMB_MIN = 3;

const same = <T>(a: T[] | undefined, n: number): a is T[] => Array.isArray(a) && a.length === n;
const r5 = (x: number) => Math.round(x * 1e5) / 1e5;

function climb(a: number[]): [number, number] {
  let up = 0,
    down = 0,
    ref = a[0];
  for (const x of a) {
    if (x - ref >= CLIMB_MIN) {
      up += x - ref;
      ref = x;
    } else if (ref - x >= CLIMB_MIN) {
      down += ref - x;
      ref = x;
    }
  }
  return [Math.round(up), Math.round(down)];
}

/** de las series segundo a segundo de Strava a tramitos parejos de distancia; null si no trae distancia y tiempo */
export function compactStreams(st: StreamsPayload): Series | null {
  const d = st.distance,
    t = st.time;
  if (!Array.isArray(d) || !same(t, d.length) || d.length < 10) return null;
  const n = d.length,
    total = d[n - 1];
  if (!(total > 100)) return null;
  const v = same(st.velocity_smooth, n) ? st.velocity_smooth : null,
    h = same(st.heart_rate, n) ? st.heart_rate : null,
    mv = same(st.moving, n) ? st.moving : null,
    ll = same(st.latlng, n) ? st.latlng : null,
    alt = same(st.altitude, n) ? st.altitude : null;
  const step = Math.max(MIN_STEP, total / PTS);
  const se: Series = { d: [], t: [], p: [], h: h ? [] : null, ll: ll ? [] : null, up: null, down: null };
  let i0 = 0,
    prev = 0,
    edge = step;
  for (let i = 0; i < n; i++) {
    if (d[i] < edge && i < n - 1) continue;
    let vs = 0,
      vn = 0,
      hs = 0,
      hn = 0;
    for (let k = i0; k <= i; k++) {
      if (v && (!mv || mv[k] !== false)) {
        vs += v[k];
        vn++;
      }
      if (h && h[k] > 0) {
        hs += h[k];
        hn++;
      }
    }
    /* sin velocidad, el ritmo sale de lo que avanzó en el tramito (con las paradas adentro) */
    const vel = v ? (vn ? vs / vn : 0) : (d[i] - d[prev]) / Math.max(1, t[i] - t[prev]);
    se.d.push(Math.round(d[i]));
    se.t.push(Math.round(t[i]));
    se.p.push(vel > 0.5 ? Math.round(1000 / vel) : 0);
    if (se.h) se.h.push(hn ? Math.round(hs / hn) : 0);
    if (se.ll && ll) se.ll.push([r5(ll[i][0]), r5(ll[i][1])]);
    prev = i;
    i0 = i + 1;
    edge = d[i] + step;
  }
  if (se.h && !se.h.some((x) => x > 0)) se.h = null;
  if (alt) [se.up, se.down] = climb(alt);
  return se;
}

/* ---- lo que se lee de las series ---- */
export const seriesKm = (se: Series) => (se.d.length ? se.d[se.d.length - 1] / 1000 : 0);

/** el tiempo en el metro `m` (interpolado entre los dos puntos de alrededor) */
function timeAt(se: Series, m: number) {
  const i = se.d.findIndex((x) => x >= m);
  if (i < 0) return se.t[se.t.length - 1];
  if (i === 0) return (se.t[0] * m) / (se.d[0] || 1);
  return se.t[i - 1] + ((se.t[i] - se.t[i - 1]) * (m - se.d[i - 1])) / (se.d[i] - se.d[i - 1] || 1);
}

/** un parcial: km recorridos, segundos y FC media (0 si no hay) */
export interface Split {
  km: number;
  sec: number;
  hr: number;
}
/** kilómetro a kilómetro; el último, si quedan más de 100 m */
export function kmSplits(se: Series): Split[] {
  const total = se.d[se.d.length - 1] || 0,
    out: Split[] = [];
  for (let a = 0; a < total - 100; a += 1000) {
    const b = Math.min(total, a + 1000),
      hs = se.h ? se.h.filter((x, i) => x > 0 && se.d[i] > a && se.d[i] <= b) : [];
    out.push({ km: (b - a) / 1000, sec: Math.round(timeAt(se, b) - timeAt(se, a)), hr: hs.length ? Math.round(sum(hs) / hs.length) : 0 });
  }
  return out;
}

/** las vueltas del reloj; se dejan afuera las de menos de 50 m (las pausas paradas) */
export const watchLaps = (pf: PerformancePayload | null): Split[] =>
  ((pf && pf.laps) || [])
    .map((l) => ({ km: (l.distance || 0) / 1000, sec: Math.round(l.moving_time || l.elapsed_time || 0), hr: l.avg_hr! > 0 ? Math.round(l.avg_hr!) : 0 }))
    .filter((l) => l.km > 0.05 && l.sec > 0);

/** lo que se guarda del detalle de la actividad para los trofeos (null si Strava no trajo el desnivel: una respuesta
    vieja, que no se guarda para volver a pedirla) */
export function runExtra(pf: Partial<PerformancePayload> | null): RunExtra | null {
  if (!pf || pf.elev == null) return null;
  const h = halves((pf.splits || []).map((l) => ({ km: (l.distance || 0) / 1000, sec: Math.round(l.moving_time || 0), hr: 0 })).filter((l) => l.km > 0.05 && l.sec > 0));
  return h ? { up: Math.round(pf.elev), half: Math.round(h.d * 10) / 10 } : { up: Math.round(pf.elev) };
}

/** las vueltas que marcó el corredor; null si el reloj no marcó (una sola, o todas iguales: las automáticas de 1 km o
    de 1 milla), y entonces van los parciales por km */
export function markedLaps(se: Series): Split[] | null {
  const L = se.laps;
  if (!L || L.length < 2) return null;
  const k = L[0].km;
  return L.slice(0, -1).every((l) => Math.abs(l.km - k) <= k * 0.03) && L[L.length - 1].km <= k * 1.03 ? null : L;
}

/** el ritmo de la primera mitad y de la segunda, y cuánto más lenta fue la segunda (%; negativo: más rápida). Solo si
    casi todos los parciales son de 1 km y son 4 o más */
export function halves(L: Split[]): { a: number; b: number; d: number } | null {
  const U = L.filter((l) => l.km >= 0.9 && l.km <= 1.1);
  if (U.length < 4 || U.length < L.length * 0.8) return null;
  const pc = (l: Split) => l.sec / l.km,
    m = Math.floor(U.length / 2),
    a = sum(U.slice(0, m).map(pc)) / m,
    b = sum(U.slice(-m).map(pc)) / m;
  return { a, b, d: (b / a - 1) * 100 };
}
/** cuánto más rápida tiene que ser la segunda mitad para que sea negative split (%) */
export const NEG_SPLIT = -1;
/** primera mitad contra segunda, en una frase (lo que era «Vuelta por vuelta») */
export function halfSplit(L: Split[]): string | null {
  const h = halves(L);
  if (!h) return null;
  const { a, b, d } = h;
  return 'Primera mitad a ' + fmtPace(a) + ' y segunda a ' + fmtPace(b) + ' /km: ' + (d < NEG_SPLIT ? 'negative split (' + fmt(-d, 1) + '% más rápido al final).' : d <= 1.5 ? 'ritmo parejo.' : 'segunda mitad ' + fmt(d, 1) + '% más lenta.');
}

/** segundos en cada zona de FC (Z1 a Z5), en movimiento; null sin FC. Debajo de Z1 cuenta como Z1 */
export function zoneTimes(se: Series): number[] | null {
  if (!se.h) return null;
  const z = [0, 0, 0, 0, 0];
  for (let i = 1; i < se.t.length; i++) {
    const hr = se.h[i];
    if (!hr || !se.p[i]) continue;
    z[Math.max(0, zoneIdx(hr))] += se.t[i] - se.t[i - 1];
  }
  return sum(z) > 0 ? z : null;
}

/* ---- el plan sobre la distancia ---- */
/** un tramo del plan ubicado en la salida, de `a` a `b` km. `n`: número de tramo de trabajo (0 si no es o es uno solo) */
export interface Span {
  a: number;
  b: number;
  k: StepKind;
  st: Step;
  n: number;
}
/**
 * dónde cayó cada tramo del plan: con lo que mediste en cada etapa (o lo planificado, si no lo cargaste), estirado
 * para que llegue a `km`. Sin tramos, el ritmo o la FC del plan, de punta a punta.
 */
export function planSpans(s: Session, km: number): Span[] {
  const p = s.plan;
  if (!p || !(km > 0)) return [];
  const ex = expand(p.steps);
  if (!ex.length) {
    if (!(p.paceSec! > 0) && !(p.hrMin! > 0 && p.hrMax! > 0)) return [];
    return [{ a: 0, b: km, k: 'run', st: { k: 'run', pf: p.paceSec, ps: p.paceSec, hl: p.hrMin, hh: p.hrMax }, n: 0 }];
  }
  const stages = s.result?.stages || [],
    len = ex.map((e) => {
      const a = stages[e.idx];
      if (a && a.skipped) return 0;
      return a && a.distKm! > 0 ? a.distKm! : stepKm(e.st);
    }),
    f = km / (sum(len) || 1),
    runs = ex.filter((e) => e.k === 'run').length;
  let at = 0,
    n = 0;
  return ex.map((e, i) => {
    const a = at;
    at += len[i] * f;
    if (e.k === 'run') n++;
    return { a, b: at, k: e.k, st: e.st, n: e.k === 'run' && runs > 1 ? n : 0 };
  });
}
