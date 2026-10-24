/* Logros: vitrina de trofeos, hitos y desafíos cumplidos. Todo se calcula con el historial. */
import { S, setUi } from '@/lib/store';
import { saveCfg, toast } from '@/lib/data/actions';
import { vdotOf } from './daniels';
import { cellKey, routePts } from './geo';
import { chProgress } from './challenges';
import { XP_TIER, xpState, type XpState } from './xp';
import { scoreSession } from './score';
import { doneList, monthSeries, weekSeries } from './stats';
import { clamp, cleanObj, fmt, fmtDur, ymd } from './util';

export const tierOf = (i: number, n: number) => (n <= 1 ? 2 : i < Math.ceil(n / 3) ? 0 : i < Math.ceil((2 * n) / 3) ? 1 : 2);

export interface Trophy {
  id: string;
  cat: string;
  name: string;
  desc: string;
  tier: number;
  got: boolean;
  date: string | null;
  cur: number | null;
  target: number;
  unit: string;
  fmtV?: (v: number) => string;
  xp?: number;
}
interface Ev {
  d: string;
  v: number;
}

/* devuelve una escalera: fecha en que se alcanzó cada umbral (o null) y el valor actual */
export function ladder(cat: string, ids: string[], thr: number[], names: string[], descs: string[], events: Ev[], cur: number, unit: string, fmtV?: (v: number) => string): Trophy[] {
  return thr.map((t, i) => {
    const e = events.find((q) => q.v >= t);
    return { id: cat + '_' + ids[i], cat, name: names[i], desc: descs[i], tier: tierOf(i, thr.length), got: !!e, date: e ? e.d : null, cur, target: t, unit, fmtV: fmtV || ((v) => fmt(v, 0)) };
  });
}
export function bestTimeEvents(km: number, tol: number) {
  /* marcas a una distancia: carreras cargadas en Mis carreras y tests llevados a la distancia exacta */
  const E: { d: string; sec: number }[] = [];
  S.cfg.races.forEach((r) => {
    if (r.resultSec! > 0 && Math.abs(r.km - km) / km < 0.02) E.push({ d: r.date, sec: r.resultSec! });
  });
  doneList().forEach((x) => {
    const r = x.result;
    if (x.type === 'test' && r.timeSec > 0 && r.distKm >= km * 0.98 && r.distKm <= km * (1 + tol)) E.push({ d: r.date, sec: (r.timeSec / r.distKm) * km });
  });
  return E.sort((a, b) => a.d.localeCompare(b.d));
}
/* escaleras de marcas: segundos de cada «bajar de» y multiplicador por distancia */
export const PR_LADDERS = [
  { km: 5, k: '5', n: '5K', m: 1, t: [2100, 1800, 1650, 1500, 1350, 1200, 1080] },
  { km: 10, k: '10', n: '10K', m: 1.1, t: [4200, 3600, 3300, 3000, 2700, 2400, 2220] },
  { km: 15, k: '15', n: '15K', m: 1.2, t: [6300, 5400, 4950, 4500, 4050, 3600] },
  { km: 21.0975, k: '21', n: 'media maratón', m: 1.35, t: [9900, 9000, 8100, 7200, 6600, 6000, 5400] },
  { km: 42.195, k: '42', n: 'maratón', m: 1.7, t: [18000, 16200, 15300, 14400, 13500, 12600, 11700, 10800] },
];
/* terminar una distancia vale más cuanto más larga es: la primera media o maratón son hitos enormes */
export const FIN_XP: Record<string, number> = { '5': 100, '10': 200, '15': 300, '21': 600, '42': 1200 };
export const FIN_TXT: Record<string, string> = { '21': '21,1 km de una: uno de los grandes hitos del running.', '42': '42,195 km: sos maratonista.' };
/* cuanto más rápido (más VDOT) más XP; las distancias largas pesan más */
export const prXp = (sec: number, km: number, m: number) => Math.round(((100 + 4 * Math.pow(Math.max(0, vdotOf(sec, km) - 28), 1.7)) * m) / 25) * 25;
export const trophyXp = (t: Trophy) => (t.xp != null ? t.xp : t.cat === 'ch' ? 200 : XP_TIER[t.tier]);


/* se recalcula muchas veces por render: lo guardo mientras no cambien sesiones, ajustes, recorridos ni el día */
let TC: { s: unknown; c: unknown; r: unknown; d: string; v: Trophy[] } | null = null;
export function trophies(): Trophy[] {
  const day = ymd(new Date());
  if (TC && TC.s === S.sessions && TC.c === S.cfg && TC.r === S.routes && TC.d === day) return TC.v;
  const v = calcTrophies();
  TC = { s: S.sessions, c: S.cfg, r: S.routes, d: day, v };
  return v;
}
function calcTrophies(): Trophy[] {
  const D = doneList(),
    T: Trophy[] = [];
  if (!D.length) return T;
  // distancia acumulada
  let acc = 0;
  const accE = D.map((x) => {
    acc += x.result.distKm;
    return { d: x.result.date, v: acc };
  });
  T.push(
    ...ladder(
      'tot',
      ['100', '250', '500', '1000', '2000', '4220'],
      [100, 250, 500, 1000, 2000, 4220],
      ['100 km', '250 km', '500 km', '1.000 km', '2.000 km', '100 maratones'],
      ['Tus primeros 100 km corriendo.', '250 km acumulados.', 'Medio millar de kilómetros.', 'Mil kilómetros: una vuelta seria.', 'Dos mil kilómetros.', '4.220 km: la distancia de 100 maratones.'],
      accE,
      acc,
      'km',
    ),
  );
  // salida más larga
  const longE: Ev[] = [];
  let mx = 0;
  D.forEach((x) => {
    if (x.result.distKm > mx) {
      mx = x.result.distKm;
      longE.push({ d: x.result.date, v: mx });
    }
  });
  T.push(
    ...ladder(
      'long',
      ['5', '10', '15', '21', '30', '42'],
      [4.95, 9.9, 14.85, 21.0, 29.7, 42.0],
      ['Primeros 5 km', 'Primeros 10 km', '15 km de una', 'Distancia de media', '30 km', 'Distancia de maratón'],
      ['Una salida de 5 km.', 'Una salida de 10 km.', 'Una salida de 15 km.', '21,1 km en una salida.', '30 km en una salida: territorio maratón.', '42,2 km en una salida.'],
      longE,
      mx,
      'km',
      (v) => fmt(v, 1),
    ),
  );
  // marcas por distancia: terminar la distancia y bajar de cada tiempo (la XP depende de lo difícil que es)
  PR_LADDERS.forEach((q) => {
    const E = bestTimeEvents(q.km, 0.05);
    let best: number | null = null;
    const ev: { d: string; sec: number }[] = [];
    for (const e of E)
      if (best == null || e.sec < best) {
        best = e.sec;
        ev.push({ d: e.d, sec: best });
      }
    const desc = best != null ? 'Tu mejor ' + q.n + ': ' + fmtDur(best) + '.' : 'Todavía no tenés un ' + q.n + ' cargado (carrera o test).';
    const f = ev[0];
    T.push({
      id: 'pr_' + q.k + '_fin',
      cat: 'pr' + q.k,
      name: 'Terminar ' + (q.k === '21' ? 'una ' : 'un ') + q.n,
      desc: (FIN_TXT[q.k] ? FIN_TXT[q.k] + ' ' : '') + desc,
      tier: 0,
      got: !!f,
      date: f ? f.d : null,
      cur: best,
      target: 1e6,
      unit: 'time',
      fmtV: (v) => fmtDur(v),
      xp: FIN_XP[q.k],
    });
    q.t.forEach((t) => {
      const sec = t,
        e = ev.find((z) => z.sec < sec),
        v = vdotOf(sec, q.km);
      T.push({
        id: 'pr_' + q.k + '_' + t,
        cat: 'pr' + q.k,
        name: 'Bajar de ' + fmtDur(sec) + ' en ' + q.n,
        desc,
        tier: v < 35 ? 0 : v < 45 ? 1 : 2,
        got: !!e,
        date: e ? e.d : null,
        cur: best,
        target: sec,
        unit: 'time',
        fmtV: (v2) => fmtDur(v2),
        xp: prXp(sec, q.km, q.m),
      });
    });
  });
  // carreras terminadas
  const rc = S.cfg.races
    .filter((r) => r.resultSec! > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r, i) => ({ d: r.date, v: i + 1 }));
  T.push(
    ...ladder('race', ['1', '3', '5', '10'], [1, 3, 5, 10], ['Primera carrera', '3 carreras', '5 carreras', '10 carreras'], ['Tu primera carrera con dorsal.', 'Tres carreras terminadas.', 'Cinco carreras terminadas.', 'Diez carreras terminadas.'], rc, rc.length, 'carreras'),
  );
  // semanas y meses fuertes
  const W = weekSeries();
  const wE: Ev[] = [];
  let wm = 0;
  W.forEach((w) => {
    if (w.km > wm) {
      wm = w.km;
      wE.push({ d: ymd(w.end), v: wm });
    }
  });
  T.push(
    ...ladder(
      'week',
      ['20', '30', '40', '50', '60'],
      [20, 30, 40, 50, 60],
      ['Semana de 20 km', 'Semana de 30 km', 'Semana de 40 km', 'Semana de 50 km', 'Semana de 60 km'],
      ['20 km en una semana.', '30 km en una semana.', '40 km en una semana.', '50 km en una semana.', '60 km en una semana: volumen de maratón.'],
      wE,
      wm,
      'km',
    ),
  );
  const M = monthSeries();
  const mE: Ev[] = [];
  let mm = 0;
  M.forEach((m) => {
    if (m.km > mm) {
      mm = m.km;
      mE.push({ d: ymd(new Date(m.m.getFullYear(), m.m.getMonth() + 1, 0)), v: mm });
    }
  });
  T.push(...ladder('month', ['50', '100', '150', '200'], [50, 100, 150, 200], ['Mes de 50 km', 'Mes de 100 km', 'Mes de 150 km', 'Mes de 200 km'], ['50 km en un mes.', '100 km en un mes.', '150 km en un mes.', '200 km en un mes.'], mE, mm, 'km'));
  // constancia: semanas seguidas cumpliendo tu objetivo
  const G = S.cfg.weeklyGoal;
  let run = 0,
    best = 0;
  const sE: Ev[] = [];
  W.filter((w) => !w.cur).forEach((w) => {
    if (w.count >= G) {
      run++;
      if (run > best) {
        best = run;
        sE.push({ d: ymd(w.end), v: best });
      }
    } else run = 0;
  });
  T.push(
    ...ladder(
      'streak',
      ['4', '8', '12', '26', '52'],
      [4, 8, 12, 26, 52],
      ['4 semanas seguidas', '8 semanas seguidas', '12 semanas seguidas', 'Medio año seguido', 'Un año seguido'],
      ['Cumpliste tu objetivo semanal 4 semanas seguidas.', '8 semanas seguidas cumpliendo.', '12 semanas seguidas cumpliendo.', '26 semanas seguidas cumpliendo.', '52 semanas seguidas cumpliendo.'],
      sE,
      run,
      'semanas',
    ),
  );
  // cantidad de salidas y horas
  const nE = D.map((x, i) => ({ d: x.result.date, v: i + 1 }));
  T.push(
    ...ladder(
      'runs',
      ['25', '50', '100', '200', '365'],
      [25, 50, 100, 200, 365],
      ['25 salidas', '50 salidas', '100 salidas', '200 salidas', '365 salidas'],
      ['25 salidas registradas.', '50 salidas registradas.', '100 salidas registradas.', '200 salidas registradas.', 'Una salida por cada día del año.'],
      nE,
      D.length,
      'salidas',
    ),
  );
  let hs = 0;
  const hE = D.map((x) => {
    hs += x.result.timeSec / 3600;
    return { d: x.result.date, v: hs };
  });
  T.push(...ladder('hours', ['10', '25', '50', '100'], [10, 25, 50, 100], ['10 horas', '25 horas', '50 horas', '100 horas'], ['10 horas corriendo.', '25 horas corriendo.', '50 horas corriendo.', '100 horas corriendo.'], hE, hs, 'h'));
  // plan cumplido y puntajes
  const pl = D.filter((x) => x.plan).map((x, i) => ({ d: x.result.date, v: i + 1 }));
  T.push(
    ...ladder('plan', ['10', '50', '100'], [10, 50, 100], ['10 sesiones del plan', '50 sesiones del plan', '100 sesiones del plan'], ['Hiciste 10 sesiones planificadas.', 'Hiciste 50 sesiones planificadas.', 'Hiciste 100 sesiones planificadas.'], pl, pl.length, 'sesiones'),
  );
  const hi = D.filter((x) => {
    const c = scoreSession(x);
    return c && c.score != null && c.score >= 90;
  }).map((x, i) => ({ d: x.result.date, v: i + 1 }));
  T.push(
    ...ladder('score', ['1', '10', '25'], [1, 10, 25], ['Primera sesión excelente', '10 sesiones excelentes', '25 sesiones excelentes'], ['Un puntaje de 90 o más.', 'Diez sesiones con 90 o más.', 'Veinticinco sesiones con 90 o más.'], hi, hi.length, 'sesiones'),
  );
  // exploración: km² recorridos (cuadrículas de 200 m)
  if (S.routes.length) {
    const seen = new Set<string>(),
      eE: Ev[] = [];
    S.routes
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .forEach((r) => {
        routePts(r).forEach((q) => seen.add(cellKey(q)));
        eE.push({ d: r.date, v: seen.size * 0.04 });
      });
    const area = seen.size * 0.04;
    T.push(...ladder('area', ['5', '10', '25'], [5, 10, 25], ['Explorador: 5 km²', 'Explorador: 10 km²', 'Explorador: 25 km²'], ['Corriste por 5 km² distintos.', 'Corriste por 10 km² distintos.', 'Corriste por 25 km² distintos.'], eE, area, 'km²', (v) => fmt(v, 1)));
  }
  // desafíos cumplidos
  (S.cfg.challenges || []).forEach((c) => {
    const p = chProgress(c);
    if (p.done) T.push({ id: 'ch_' + c.id, cat: 'ch', name: c.name, desc: 'Desafío cumplido.', tier: 2, got: true, date: p.doneDate, cur: p.cur, target: c.target, unit: '' });
  });
  return T;
}

export const CAT_N: Record<string, string> = {
  tot: 'Distancia total',
  long: 'Salida más larga',
  pr5: 'Marcas en 5K',
  pr10: 'Marcas en 10K',
  pr15: 'Marcas en 15K',
  pr21: 'Marcas en media maratón',
  pr42: 'Marcas en maratón',
  race: 'Carreras',
  week: 'Semanas fuertes',
  month: 'Meses fuertes',
  streak: 'Constancia',
  runs: 'Salidas',
  hours: 'Horas',
  plan: 'Plan cumplido',
  score: 'Puntaje',
  area: 'Exploración',
  ch: 'Desafíos',
};

/* ---- medallas: el metal sale de la rareza (según la XP), la cinta y el emblema de la categoría ---- */
export type RarKey = 'com' | 'rar' | 'epi' | 'leg';
export interface Rarity {
  k: RarKey;
  n: string;
  p: string;
  min: number;
  g: string;
  ink: string;
  c: string;
}
export const RARITY: Rarity[] = [
  { k: 'com', n: 'Común', p: 'Comunes', min: 0, g: 'mg-bro', ink: '#5A2E0E', c: '#C8834A' },
  { k: 'rar', n: 'Rara', p: 'Raras', min: 150, g: 'mg-sil', ink: '#2F3A48', c: '#AFC0D2' },
  { k: 'epi', n: 'Épica', p: 'Épicas', min: 400, g: 'mg-gol', ink: '#5C3D00', c: '#F0BE36' },
  { k: 'leg', n: 'Legendaria', p: 'Legendarias', min: 900, g: 'mg-pla', ink: '#3A2F78', c: '#B79CFF' },
];
export const rarOf = (t: Trophy) => RARITY.filter((r) => trophyXp(t) >= r.min).pop()!;
export const catBase = (c: string) => (/^pr\d/.test(c) ? 'pr' : c);

/** cuánto falta para un trofeo, de 0 a 0,99 (null si no se puede medir) */
export function trophyProg(t: Trophy): number | null {
  if (t.got || t.cur == null || t.target >= 1e6) return null;
  return clamp(t.unit === 'time' ? (t.cur ? t.target / t.cur : 0) : t.cur / t.target, 0, 0.99);
}

/* marcar los trofeos como vistos al salir de la vitrina, y avisar los nuevos al cargar un resultado */
export function markTrophiesSeen() {
  if (S.demo || S.mode === 'boot') return;
  const ids = trophies()
      .filter((t) => t.got)
      .map((t) => t.id),
    old = S.cfg.seenTrophies || [];
  if (ids.length === old.length && ids.every((i) => old.includes(i))) return;
  const c = cleanObj(S.cfg);
  c.seenTrophies = ids;
  saveCfg(c);
}
export const gotIds = () => new Set(trophies().filter((t) => t.got).map((t) => t.id));
/* ---- celebración al ganar trofeos o subir de nivel: la dibuja <CelebrateHost/> ---- */
export interface Confetto {
  left: string;
  bg: string;
  delay: string;
  dur: string;
  dx: string;
  rot: string;
}
export interface CelebrateState {
  key: number;
  T: Trophy[];
  x0: XpState;
  x1: XpState;
  g: number;
  conf: Confetto[];
}
export function celebrate(T: Trophy[], x0: XpState, x1: XpState, g: number) {
  const cols = ['var(--accent)', 'var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)', 'var(--t5)', '#fff'];
  const conf = Array.from({ length: 42 }, (_, i) => ({
    left: (Math.random() * 100).toFixed(1) + '%',
    bg: cols[i % cols.length],
    delay: (Math.random() * 0.6).toFixed(2) + 's',
    dur: (1.8 + Math.random() * 1.4).toFixed(2) + 's',
    dx: ((Math.random() - 0.5) * 160).toFixed(0) + 'px',
    rot: (Math.random() * 720).toFixed(0) + 'deg',
  }));
  setUi<CelebrateState | null>('celebrate', { key: Date.now() + Math.random(), T, x0, x1, g, conf });
}
export const closeCelebrate = () => setUi<CelebrateState | null>('celebrate', null);
export function announceProgress(had: Set<string>, x0: XpState) {
  const T = trophies().filter((t) => t.got && !had.has(t.id)),
    x1 = xpState(),
    g = x1.total - x0.total;
  if (T.length || x1.L > x0.L) setTimeout(() => celebrate(T, x0, x1, g), 500);
  else if (g > 0) setTimeout(() => toast('+' + g + ' XP'), 400);
}
