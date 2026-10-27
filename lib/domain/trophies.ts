/* Logros: vitrina de trofeos, hitos y desafíos cumplidos. Todo se calcula con el historial. */
import { S, getUi, setUi } from '@/lib/store';
import { saveCfg, toast } from '@/lib/data/actions';
import { reduceMotion } from '@/lib/motion';
import { vdotOf } from './daniels';
import { BARRIO_MIN_KM, barrioCount, cellArea, routeBarrios, routeCells } from './geo';
import { shoeKm, shoeRuns } from './shoes';
import { NEG_SPLIT } from './streams';
import { chProgress } from './challenges';
import { XP_TIER, levelOf, xpFor, xpState, type XpState } from './xp';
import { scoreSession } from './score';
import { doneList, monthSeries, weekSeries, type DoneSession } from './stats';
import { clamp, cleanObj, dShort, fmt, fmtDur, fmtPace, nf, pd, sum, ymd } from './util';

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


/* las salidas de una lista, numeradas en orden: para las escaleras que cuentan salidas */
const count = (L: DoneSession[]): Ev[] => L.map((x, i) => ({ d: x.result.date, v: i + 1 }));
/** un fondo largo, para «Fondos sin deriva»: 90 minutos o más */
export const DEC_LONG = 5400;
/** una distancia que se lee igual al revés con dos decimales (10,01 km; 12,21 km) */
export function capicua(km: number) {
  if (!(km >= 1)) return false;
  const d = km.toFixed(2).replace('.', '');
  return d === [...d].reverse().join('');
}

/* las carreras con tiempo, de la primera a la última: cuentan para «Carreras» y cada medalla lleva la cinta de la suya */
const doneRaces = () => S.cfg.races.filter((r) => r.resultSec! > 0).sort((a, b) => a.date.localeCompare(b.date));
/** la carrera que ganó una medalla de «Carreras» (la tercera, para «3 carreras»); null si no es de esas o falta */
export const trophyRace = (t: Trophy) => (t.cat === 'race' && t.got ? doneRaces()[t.target - 1] || null : null);

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
  const rc = doneRaces().map((r, i) => ({ d: r.date, v: i + 1 }));
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
  // desnivel acumulado: el de cada salida traída de Strava (result.ex)
  let up = 0;
  const upE = D.filter((x) => x.result.ex).map((x) => {
    up += x.result.ex!.up;
    return { d: x.result.date, v: up };
  });
  T.push(
    ...ladder(
      'up',
      ['1000', '5000', '8849'],
      [1000, 5000, 8849],
      ['1.000 m de desnivel', '5.000 m de desnivel', 'El Everest'],
      ['Subiste 1.000 m sumando tus salidas.', '5.000 m de subida acumulada.', '8.849 m de desnivel acumulado: la altura del Everest.'],
      upE,
      up,
      'm',
    ),
  );
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
  // negative split: la segunda mitad más rápida que la primera (las series no cuentan: el ritmo va y viene)
  const nsE = count(D.filter((x) => x.type !== 'series' && x.result.ex?.half != null && x.result.ex.half < NEG_SPLIT));
  T.push(
    ...ladder(
      'ns',
      ['1', '5', '10'],
      [1, 5, 10],
      ['Negative split', '5 negative splits', '10 negative splits'],
      ['Terminaste una salida más rápido que como la empezaste.', 'Cinco salidas con la segunda mitad más rápida.', 'Diez salidas con la segunda mitad más rápida.'],
      nsE,
      nsE.length,
      'salidas',
    ),
  );
  // fondos largos sin deriva: 90 minutos o más con la deriva medida bien y por debajo del 5%
  const fE = count(D.filter((x) => x.type === 'fondo' && x.result.timeSec >= DEC_LONG && !!x.result.dec?.ok && x.result.dec.p! < 5));
  T.push(
    ...ladder(
      'dec',
      ['1', '5', '10'],
      [1, 5, 10],
      ['Fondo sin deriva', '5 fondos sin deriva', '10 fondos sin deriva'],
      ['Un fondo de 90 minutos o más con menos de 5% de deriva cardíaca.', 'Cinco fondos largos sin deriva.', 'Diez fondos largos sin deriva: el motor aeróbico está.'],
      fE,
      fE.length,
      'fondos',
    ),
  );
  // zapatillas jubiladas en su límite de km: la fecha es la de su última salida
  const shE = S.cfg.shoes
    .filter((z) => z.retired && z.limitKm > 0 && shoeKm(z) >= z.limitKm)
    .map((z) => shoeRuns(z).at(-1)?.result.date)
    .filter((d): d is string => !!d)
    .sort()
    .map((d, i) => ({ d, v: i + 1 }));
  T.push(
    ...ladder(
      'shoe',
      ['1', '3'],
      [1, 3],
      ['Zapatillas jubiladas', 'Tres pares jubilados'],
      ['Jubilaste un par después de llevarlo hasta su límite de km.', 'Tres pares jubilados en su límite.'],
      shE,
      shE.length,
      'pares',
    ),
  );
  // exploración: km² recorridos (cuadrículas de 200 m) y barrios de la Ciudad, con los recorridos de Strava en orden
  if (S.routes.length) {
    const R = S.routes.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const seen = new Set<string>(),
      eE: Ev[] = [];
    R.forEach((r) => {
      routeCells(r).forEach((k) => seen.add(k));
      eE.push({ d: r.date, v: cellArea(seen.size) });
    });
    const area = cellArea(seen.size);
    T.push(...ladder('area', ['5', '10', '25'], [5, 10, 25], ['Explorador: 5 km²', 'Explorador: 10 km²', 'Explorador: 25 km²'], ['Corriste por 5 km² distintos.', 'Corriste por 10 km² distintos.', 'Corriste por 25 km² distintos.'], eE, area, 'km²', (v) => fmt(v, 1)));
    /* un barrio cuenta cuando sumaste en él lo mismo que pide el ranking del Mapa; la fecha, la del recorrido que lo sumó */
    const kmB = new Map<string, number>(),
      bE: Ev[] = [];
    let nb = 0;
    R.forEach((r) => {
      routeBarrios(r).km.forEach((km, B) => {
        const was = kmB.get(B.n) || 0;
        kmB.set(B.n, was + km);
        if (was < BARRIO_MIN_KM && was + km >= BARRIO_MIN_KM) nb++;
      });
      bE.push({ d: r.date, v: nb });
    });
    const NB = barrioCount();
    T.push(
      ...ladder(
        'barrio',
        ['10', '25', 'todos'],
        [10, 25, NB],
        ['10 barrios', '25 barrios', 'Los ' + NB + ' barrios'],
        ['Corriste por 10 barrios de la Ciudad.', 'Corriste por 25 barrios de la Ciudad.', 'Corriste por los ' + NB + ' barrios de la Ciudad: la conocés de punta a punta.'],
        bE,
        nb,
        'barrios',
      ),
    );
  }
  // secretos: no se ven hasta ganarlos (cada uno va también en EGG_IDS)
  const egg = (id: string, name: string, desc: string, date: string, xp: number) =>
    T.push({ id: 'egg_' + id, cat: 'egg', name, desc: desc + ' Trofeo secreto.', tier: 2, got: true, date, cur: null, target: 1, unit: '', xp });
  /* la vuelta olímpica: la primera vez que bajás el objetivo de una carrera */
  const vo = S.cfg.races
    .filter((r) => r.resultSec! > 0 && r.targetSec > 0 && (r.lt ? r.resultSec! < r.targetSec : r.resultSec! <= r.targetSec))
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (vo) egg('vuelta', 'Vuelta olímpica', 'Bajaste tu objetivo en ' + vo.name + ': ' + fmtDur(vo.resultSec!) + ' contra ' + fmtDur(vo.targetSec) + '.', vo.date, 600);
  /* el clima es uno de WEATHER (util.ts) */
  const rain = D.find((x) => x.result.weather === 'Lluvia');
  if (rain) egg('lluvia', 'Bajo la lluvia', 'Saliste a correr con lluvia el ' + dShort(pd(rain.result.date)) + '.', rain.result.date, 200);
  const cap = D.find((x) => capicua(x.result.distKm));
  if (cap) egg('capicua', 'Capicúa', fmt(cap.result.distKm, 2) + ' km el ' + dShort(pd(cap.result.date)) + ': se lee igual al derecho y al revés.', cap.result.date, 200);
  const sun = D.find((x) => x.result.weather === 'Mucho calor' && x.result.paceSec > 0 && x.result.paceSec < 300);
  if (sun) egg('sol', 'A pleno sol', fmtPace(sun.result.paceSec) + ' /km con mucho calor, el ' + dShort(pd(sun.result.date)) + '.', sun.result.date, 400);
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
  up: 'Desnivel',
  streak: 'Constancia',
  runs: 'Salidas',
  hours: 'Horas',
  plan: 'Plan cumplido',
  score: 'Puntaje',
  ns: 'Negative split',
  dec: 'Fondos sin deriva',
  shoe: 'Zapatillas jubiladas',
  area: 'Exploración',
  barrio: 'Barrios',
  ch: 'Desafíos',
  egg: 'Secretos',
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

/** el metal del escudo según la rareza: 0 bronce, 1 plata, 2 oro, 3 platino */
export const trophyTier = (t: Trophy) => RARITY.indexOf(rarOf(t));
const COUNT_UNITS = ['km', 'km²', 'h', 'm'];
/** un número de una escalera: con punto de miles desde 1.000 («2.340 de 5.000 m») */
const countFmt = (t: Trophy) => {
  const f0 = t.fmtV || ((v: number) => fmt(v, 0));
  return (v: number) => (v >= 1000 ? nf(v) : f0(v));
};
/** lo que muestra la vitrina debajo del nombre: la fecha si lo ganaste; si no, cuánto llevás («46:12 → 45:00», «83 de 100») */
export function trophyNote(t: Trophy): string {
  if (t.got) return t.date ? dShort(pd(t.date)) : '';
  if (t.cur == null || t.target >= 1e6) return '';
  const f0 = t.fmtV || ((v: number) => fmt(v, 0)),
    fv = countFmt(t);
  if (t.unit === 'time') return t.cur ? f0(t.cur) + ' → ' + f0(t.target) : '';
  return fv(t.cur) + ' de ' + fv(t.target) + (COUNT_UNITS.includes(t.unit) ? ' ' + t.unit : '');
}
/** cuánto te falta, en una frase (el panel del trofeo) */
export function trophyLeft(t: Trophy): string {
  if (t.got || t.cur == null) return '';
  const fv = countFmt(t);
  /* la descripción ya dice tu mejor marca */
  if (t.unit === 'time') return t.cur ? 'Te faltan ' + fmtDur(t.cur - t.target) + '.' : '';
  return t.target < 1e6 ? 'Llevás ' + fv(t.cur) + ' ' + t.unit + ' de ' + fv(t.target) + '.' : '';
}

/* ---- la vitrina: por categoría, con el filtro de arriba ---- */
/* los secretos que existen: no aparecen hasta ganarlos, pero la vitrina sabe cuántos faltan (una caja cerrada por cada
   uno, sin decir cuál). Al sumar uno en calcTrophies, va acá */
export const EGG_IDS = ['egg_vuelta', 'egg_lluvia', 'egg_capicua', 'egg_sol'];
export type VitFilter = 'todos' | 'ganados' | 'faltan';
export interface VitGroup {
  cat: string;
  name: string;
  got: number;
  all: number;
  items: Trophy[];
  /** secretos sin descubrir: van como cajas cerradas */
  locked: number;
}
/** cuántas piezas tiene la vitrina y cuántas ganaste: los trofeos más los secretos que faltan */
export function vitCount(T: Trophy[]) {
  const eggs = T.filter((t) => t.cat === 'egg').length;
  return { got: T.filter((t) => t.got).length, all: T.length - eggs + EGG_IDS.length };
}
/** los trofeos por categoría, en el orden de siempre, y los secretos al final. «Ganados» van del más nuevo al más viejo
    y «Por ganar», del más cerca al más lejos; las categorías que quedan vacías no van. Los secretos se ven siempre:
    los que faltan son las cajas, que van en «Todos» y en «Por ganar» */
export function vitGroups(T: Trophy[], f: VitFilter): VitGroup[] {
  const cats = [...new Set(T.map((t) => t.cat).filter((c) => c !== 'egg')), 'egg'];
  return cats
    .map((cat) => {
      const L = T.filter((t) => t.cat === cat),
        egg = cat === 'egg';
      let items = f === 'todos' ? L : L.filter((t) => t.got === (f === 'ganados'));
      if (f === 'ganados') items = items.slice().sort((a, b) => b.date!.localeCompare(a.date!));
      else if (f === 'faltan') items = items.slice().sort((a, b) => (trophyProg(b) ?? -1) - (trophyProg(a) ?? -1));
      const locked = egg && f !== 'ganados' ? Math.max(0, EGG_IDS.length - L.length) : 0;
      return { cat, name: CAT_N[cat] || cat, got: L.filter((t) => t.got).length, all: egg ? Math.max(EGG_IDS.length, L.length) : L.length, items, locked };
    })
    .filter((g) => g.items.length || g.locked);
}
/** la vidriera de Logros: los últimos que ganaste (del más nuevo al más viejo) y los que están más cerca de caer */
export function vitShowcase(T: Trophy[], n = 4) {
  const last = T.filter((t) => t.got && t.date)
      .sort((a, b) => b.date!.localeCompare(a.date!))
      .slice(0, n),
    near = T.filter((t) => trophyProg(t) != null)
      .sort((a, b) => trophyProg(b)! - trophyProg(a)!)
      .slice(0, n);
  return { last, near };
}

/* ---- celebración al ganar trofeos o subir de nivel: la dibuja <Celebration/> ----
   Se festeja una sola vez: lo festejado queda anotado en la configuración (`cel`: trofeos y el nivel más alto). */
export interface CelRec {
  ids: string[];
  lv: number;
  /** qué trofeos existían cuando se anotó (CEL_V); sin esto, los de la primera versión */
  v?: number;
}
/* cada vez que se suman trofeos nuevos, la versión sube: los que ya tenías ganados se anotan como festejados, sin
   celebración (y sin festejar el nivel que suben con su XP) */
export const CEL_V = 2;
const CEL_NEW: Record<number, (t: Trophy) => boolean> = {
  2: (t) => ['up', 'ns', 'dec', 'shoe', 'barrio'].includes(t.cat) || ['egg_lluvia', 'egg_capicua', 'egg_sol'].includes(t.id),
};
/** el registro puesto al día con los trofeos que se sumaron desde que se anotó: los que ya tenías ganados quedan como
    festejados y el nivel, en el de ahora */
export function celebCatchUp(rec: CelRec, T: Trophy[], L: number): CelRec {
  const v = rec.v || 1;
  if (v >= CEL_V) return rec;
  const seen = new Set(rec.ids),
    isNew = (t: Trophy) => Object.entries(CEL_NEW).some(([k, f]) => +k > v && f(t)),
    add = T.filter((t) => t.got && !seen.has(t.id) && isNew(t)).map((t) => t.id);
  return { ids: [...rec.ids, ...add], lv: add.length ? Math.max(rec.lv, L) : rec.lv, v: CEL_V };
}
/** lo que hay para festejar: los trofeos ganados que nunca se festejaron y si pasaste el nivel más alto festejado.
    Sin registro (la primera vez), nada: se arranca desde lo que ya tenés */
export function celebNews(got: string[], L: number, rec: CelRec | undefined): { ids: string[]; up: boolean; rec: CelRec } {
  if (!rec) return { ids: [], up: false, rec: { ids: got, lv: L, v: CEL_V } };
  const seen = new Set(rec.ids),
    ids = got.filter((i) => !seen.has(i)),
    up = L > rec.lv;
  return { ids, up, rec: { ...rec, ids: ids.length ? [...rec.ids, ...ids] : rec.ids, lv: Math.max(rec.lv, L) } };
}
export interface Confetto {
  left: string;
  c: string;
  d: string;
  dl: string;
  dx: string;
  r: string;
}
export interface CelebrateState {
  key: number;
  /** los trofeos nuevos, el más valioso primero */
  T: Trophy[];
  /** dónde estabas antes: nivel y fracción del nivel */
  l0: number;
  f0: number;
  x1: XpState;
  /** XP que sumaste */
  g: number;
  conf: Confetto[];
}
const CONF_C = ['var(--acc)', '#F2F1ED', '#C3962A', '#E3BC5A', 'var(--t-fondo)'];
/** `lv0`: el nivel de antes (si no se sabe la XP de antes, el último festejado) */
function celebrate(T: Trophy[], x1: XpState, g: number, lv0: number) {
  const r = Math.random;
  /* con «reducir movimiento», sin confeti */
  const conf = reduceMotion()
    ? []
    : Array.from({ length: 64 }, () => ({
        left: (r() * 100).toFixed(1) + '%',
        c: CONF_C[Math.floor(r() * CONF_C.length)],
        d: (2.6 + r() * 1.8).toFixed(2) + 's',
        dl: (r() * 0.9).toFixed(2) + 's',
        dx: ((r() - 0.5) * 260).toFixed(0) + 'px',
        r: ((r() - 0.5) * 1100).toFixed(0) + 'deg',
      }));
  const from = Math.max(0, x1.total - g),
    l0 = Math.min(levelOf(from), lv0),
    a = xpFor(l0);
  /* si la XP de antes no es de ese nivel, la barra arranca vacía */
  const f0 = levelOf(from) === l0 ? (from - a) / (xpFor(l0 + 1) - a || 1) : 0;
  setUi<CelebrateState | null>('celebrate', { key: Date.now() + r(), T: T.slice().sort((p, q) => trophyXp(q) - trophyXp(p)), l0, f0, x1, g, conf });
}
export const closeCelebrate = () => setUi<CelebrateState | null>('celebrate', null);

/* al guardar un resultado a mano se sabe qué tenías antes: así el festejo cuenta la XP de esa salida */
let hint: { had: Set<string>; x0: XpState } | null = null;
export const expectProgress = (had: Set<string>, x0: XpState) => void (hint = { had, x0 });
/** festeja lo nuevo, si hay, y lo anota. Lo llama el shell cada vez que cambian tus datos (al abrir la app, lo que
    trae la nube o Strava) y el panel de carga al guardar. Devuelve si festejó */
export function celebratePending(): boolean {
  /* antes de leer la nube no: guardar lo festejado con la configuración del caché pisaría la de otro dispositivo */
  if (S.demo || S.mode === 'boot' || !S.loaded || !S.fresh) return false;
  const h = hint;
  hint = null;
  const T = trophies(),
    x1 = xpState(),
    got = T.filter((t) => t.got).map((t) => t.id),
    /* sin registro y recién guardado, se parte de lo que tenías antes de guardar; con uno de antes de los trofeos
       nuevos, se lo pone al día */
    rec0 = S.cfg.cel ? celebCatchUp(S.cfg.cel, T, x1.L) : h ? { ids: [...h.had], lv: h.x0.L, v: CEL_V } : undefined,
    n = celebNews(got, x1.L, rec0);
  if (!S.cfg.cel || n.ids.length || n.rec.lv !== S.cfg.cel.lv || n.rec.v !== S.cfg.cel.v) {
    const c = cleanObj(S.cfg);
    c.cel = n.rec;
    saveCfg(c);
  }
  if (!n.ids.length && !n.up) return false;
  const nw = T.filter((t) => n.ids.includes(t.id));
  celebrate(nw, x1, h ? x1.total - h.x0.total : sum(nw.map(trophyXp)), h ? h.x0.L : rec0 ? rec0.lv : x1.L);
  return true;
}
/** después de guardar un resultado: el festejo si ganaste algo; si no, la XP que sumaste en un aviso */
export function announceProgress(x0: XpState) {
  setTimeout(() => {
    if (celebratePending() || getUi('celebrate', null)) return;
    const g = xpState().total - x0.total;
    if (g > 0) toast('+' + g + ' XP');
  }, 500);
}
