/* Datos de ejemplo: 10 semanas con series/tempo, regenerativo y fondo. Nada de esto se guarda. */
import { S } from '@/lib/store';
import type { Plan, Session, SessionType, Stage } from '@/lib/domain/types';
import { expand, stageTotals } from '@/lib/domain/stages';
import { addDays, mondayOf, sod, ymd } from '@/lib/domain/util';

export function demoSessions(): Session[] {
  /* aleatorio con semilla fija: siempre los mismos datos */
  let a = 7;
  const rnd = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: Session[] = [],
    today = sod(new Date()),
    m0 = mondayOf(today),
    tS = ymd(today);
  let n = 0;
  const hrm = S.cfg.hrMax;
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
