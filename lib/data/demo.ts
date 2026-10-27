/* Datos de ejemplo: 10 semanas con series/tempo, regenerativo y fondo, el recorrido de cada salida (por Palermo y
   alrededores) y una configuración de muestra (carreras, FC máxima y edad). Nada de esto se guarda. */
import type { Cfg, Plan, Route, Session, SessionType, Stage } from '@/lib/domain/types';
import { normCfg } from '@/lib/domain/defaults';
import { encodePoly, type Pt } from '@/lib/domain/geo';
import { expand, stageTotals } from '@/lib/domain/stages';
import { addDays, mondayOf, sod, ymd } from '@/lib/domain/util';

/** aleatorio con semilla fija: siempre los mismos datos */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** la configuración de muestra: un 10K dentro de un mes, con su plan desde que arrancan los datos, y una media maratón
    más adelante. Las zonas salen de la FC máxima */
export function demoCfg(): Cfg {
  const m0 = mondayOf(sod(new Date())),
    at = (d: number) => ymd(addDays(m0, d));
  return normCfg({
    hrMax: 190,
    weeklyGoal: 3,
    age: 30,
    since: at(-270),
    planStart: '',
    races: [
      { id: 'demo_r10', name: '10K de Palermo', km: 10, date: at(34), time: '08:00', place: 'Palermo', targetSec: 2880, lt: true, planStart: at(-63) },
      { id: 'demo_r21', name: 'Media maratón', km: 21.0975, date: at(160), time: '07:30', targetSec: 6300, lt: false },
    ],
    easy: null,
  });
}

/** `hrm`: la FC máxima de la configuración de muestra */
export function demoSessions(hrm: number): Session[] {
  const rnd = seeded(7);
  const out: Session[] = [],
    today = sod(new Date()),
    m0 = mondayOf(today),
    tS = ymd(today);
  let n = 0;
  for (let w = -9; w <= 0; w++) {
    const p = (w + 9) / 9,
      mon = addDays(m0, w * 7),
      deload = w === -5;
    const defs: { i: number; type: SessionType; dist: number; pace: number | null }[] = [
      { i: 1, type: w % 2 === 0 ? 'tempo' : 'series', dist: 6 + Math.round(p * 20) / 10, pace: w % 2 === 0 ? 310 - Math.round(p * 12) : 292 - Math.round(p * 8) },
      { i: 3, type: w === -4 ? 'test' : 'regen', dist: w === -4 ? 5 : 5 + Math.round(p * 10) / 10, pace: w === -4 ? 286 : null },
      { i: 6, type: 'fondo', dist: Math.round((8 + p * 6) * (deload ? 0.75 : 1) * 2) / 2, pace: null },
    ];
    defs.forEach((df) => {
      const date = addDays(mon, df.i),
        ds = ymd(date);
      n++;
      const plan: Plan = { type: df.type, date: ds, distKm: df.dist };
      if (df.type === 'fondo' || df.type === 'regen') {
        plan.hrMin = Math.round(hrm * 0.6);
        plan.hrMax = Math.round(hrm * 0.7);
      } else plan.paceSec = df.pace!;
      if (df.type === 'series') {
        plan.steps = [
          { k: 'warm', dist: 2 },
          { k: 'rep', n: 5, steps: [{ k: 'run', dist: 1.2, pf: df.pace! - 5, ps: df.pace! + 5 }, { k: 'rec', dur: 120 }] },
          { k: 'cool', dist: 1.5 },
        ];
        plan.distKm = 9.5;
      } else if (df.type === 'tempo') {
        plan.steps = [{ k: 'warm', dist: 2 }, { k: 'run', dist: df.dist, pf: df.pace! - 5, ps: df.pace! + 5 }, { k: 'cool', dist: 1.5 }];
        plan.distKm = Math.round((df.dist + 3.5) * 10) / 10;
      }
      const s: Session = { id: 'demo_' + n, type: df.type, plan, result: null, missed: false, created: 0, updated: 0 };
      if (ds < tS) {
        const dist = Math.round(df.dist * (0.93 + rnd() * 0.14) * 100) / 100;
        let pace: number;
        if (df.type === 'fondo') pace = Math.round(372 - p * 18 + rnd() * 14);
        else if (df.type === 'regen') pace = Math.round(392 - p * 14 + rnd() * 14);
        else pace = Math.round(df.pace! + (rnd() * 22 - 8));
        const hrAvg = df.type === 'fondo' || df.type === 'regen' ? Math.round(hrm * 0.6 + rnd() * hrm * 0.12) : Math.round(hrm * 0.78 + rnd() * hrm * 0.08);
        s.result = {
          date: ds,
          distKm: dist,
          timeSec: Math.round(dist * pace),
          paceSec: pace,
          hrAvg,
          hrMax: hrAvg + Math.round(12 + rnd() * 18),
          feel: Math.round(5 + rnd() * 4),
          pain: false,
          weather: '',
          notes: '',
          easy: false,
        };
        if (plan.steps) {
          const ex = expand(plan.steps),
            stages: Stage[] = ex.map((e) => {
              const st = e.st;
              if (e.k === 'rec') {
                const t = st.dur!;
                return { distKm: 0.28, timeSec: t, paceSec: Math.round(t / 0.28), hrAvg: Math.round(hrm * 0.76 + rnd() * 6), hrMax: Math.round(hrm * 0.84) };
              }
              const pc = e.k === 'run' ? Math.round((st.pf! + st.ps!) / 2 + rnd() * 20 - 6) : Math.round(375 + rnd() * 20);
              const d = st.dist!,
                t = Math.round(d * pc);
              const hr = e.k === 'run' ? Math.round(hrm * 0.82 + rnd() * hrm * 0.06) : Math.round(hrm * 0.62 + rnd() * 8);
              return { distKm: d, timeSec: t, paceSec: pc, hrAvg: hr, hrMax: hr + Math.round(6 + rnd() * 10) };
            });
          const tot = stageTotals(stages, ex);
          s.result = Object.assign({ date: ds, stages, feel: Math.round(5 + rnd() * 4), pain: false, weather: '', notes: '', easy: false }, tot);
        }
        if (df.type === 'test') {
          const r = s.result!;
          r.distKm = 5;
          r.paceSec = 287;
          r.timeSec = 1435;
          r.hrAvg = Math.round(hrm * 0.9);
          r.hrMax = hrm - 3;
          r.feel = 9;
        }
      }
      out.push(s);
    });
  }
  return out;
}

/* ---- recorridos de ejemplo: salen de cerca de Plaza Italia y dan vueltas a los lagos de Palermo, van hasta Núñez o
   Recoleta por Figueroa Alcorta o recorren el barrio por la cuadrícula. Coordenadas [lat, lng] */
const HOME: Pt = [-34.581, -58.4208];
const TO_LAKES: Pt[] = [HOME, [-34.579, -58.4178], [-34.5752, -58.415], [-34.5728, -58.4178]];
const LAKES: Pt[] = [[-34.5728, -58.4178], [-34.57, -58.4205], [-34.5672, -58.418], [-34.566, -58.414], [-34.5675, -58.4105], [-34.5705, -58.41], [-34.573, -58.413], [-34.5728, -58.4178]];
const NUNEZ: Pt[] = [[-34.5672, -58.418], [-34.5615, -58.4255], [-34.556, -58.433], [-34.55, -58.441], [-34.545, -58.448], [-34.547, -58.4505], [-34.5525, -58.4435], [-34.5585, -58.4355], [-34.564, -58.428], [-34.569, -58.422], [-34.5728, -58.4178]];
const RECOLETA: Pt[] = [[-34.5728, -58.4178], [-34.573, -58.413], [-34.5785, -58.404], [-34.583, -58.397], [-34.5865, -58.392], [-34.588, -58.394], [-34.584, -58.4], [-34.5795, -58.407], [-34.5752, -58.415], [-34.5728, -58.4178]];
/* metros a grados a la latitud de Buenos Aires; las calles de Palermo van a 125° (hacia el centro) y a 215° (tierra adentro) */
const M_LAT = 1 / 111320,
  M_LNG = 1 / 91660;
const walk = (p: Pt, deg: number, m: number): Pt => [p[0] + Math.cos((deg * Math.PI) / 180) * m * M_LAT, p[1] + Math.sin((deg * Math.PI) / 180) * m * M_LNG];
const lenM = (P: Pt[]) => P.reduce((a, q, i) => (i ? a + Math.hypot((q[0] - P[i - 1][0]) / M_LAT, (q[1] - P[i - 1][1]) / M_LNG) : 0), 0);

function demoPath(s: Session, i: number): { name: string; P: Pt[] } {
  const target = s.result!.distKm * 1000,
    back = TO_LAKES.slice().reverse(),
    lap = lenM(LAKES),
    laps = (base: number) => Array.from({ length: Math.max(0, Math.round((target - base) / lap)) }, () => LAKES.slice(1)).flat();
  if (s.type === 'regen' && i % 2) {
    /* una vuelta a la manzana grande: tierra adentro, de costado y de vuelta */
    const a = target * 0.3,
      b = target * 0.2,
      side = i % 4 === 1 ? 125 : 305,
      p1 = walk(HOME, 215, a),
      p2 = walk(p1, side, b),
      p3 = walk(p2, 35, a);
    return { name: 'Por el barrio', P: [HOME, p1, p2, p3, HOME] };
  }
  const base = 2 * lenM(TO_LAKES);
  if (s.type === 'fondo') {
    const ext = i % 3 ? NUNEZ : RECOLETA;
    return { name: ext === NUNEZ ? 'Lagos → Núñez → lagos' : 'Lagos → Recoleta', P: [...TO_LAKES, ...ext.slice(1), ...laps(base + lenM(ext)), ...back.slice(1)] };
  }
  if (s.type === 'tempo' && i % 2) return { name: 'Hasta Recoleta', P: [...TO_LAKES, ...RECOLETA.slice(1), ...laps(base + lenM(RECOLETA)), ...back.slice(1)] };
  return { name: s.type === 'test' ? 'Test en los lagos' : 'Vuelta a los lagos', P: [...TO_LAKES, ...LAKES.slice(1), ...laps(base + lap), ...back.slice(1)] };
}

/** un recorrido por cada salida hecha de ejemplo, con sus km y su tiempo (así los números coinciden con el Registro) */
export function demoRoutes(sessions: Session[]): Route[] {
  const rnd = seeded(23);
  return sessions
    .filter((s) => s.result)
    .map((s, i) => {
      const { name, P } = demoPath(s, i);
      /* GPS: cada salida va un poco corrida y con ruido, cada ~25 m, así las pasadas se ven como en la vida real */
      const dx = (rnd() - 0.5) * 10 * M_LAT,
        dy = (rnd() - 0.5) * 10 * M_LNG,
        out: Pt[] = [];
      for (let k = 1; k < P.length; k++) {
        const a = P[k - 1],
          b = P[k],
          n = Math.max(1, Math.round(lenM([a, b]) / 25));
        for (let j = 0; j < n; j++) out.push([a[0] + ((b[0] - a[0]) * j) / n + dx + (rnd() - 0.5) * 6 * M_LAT, a[1] + ((b[1] - a[1]) * j) / n + dy + (rnd() - 0.5) * 6 * M_LNG]);
      }
      out.push(P[P.length - 1]);
      const r = s.result!;
      return { id: 'demo_rt_' + s.id, sid: '', date: r.date, name, km: r.distKm, tsec: r.timeSec, poly: encodePoly(out) };
    });
}
