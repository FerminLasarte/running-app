/* Etapas del plan (calentamiento / parte principal / recuperación / enfriamiento) y su limpieza. */
import type { Lap, Plan, PlanStep, RepStep, Session, SessionType, Stage, Step, StepKind } from './types';
import { isType } from './config';
import { fmt, fmtDur, fmtPace, sum } from './util';

export const KINDS: Record<StepKind, { l: string; s: string; c: string }> = {
  warm: { l: 'Calentamiento', s: 'Calent.', c: 'var(--kw)' },
  run: { l: 'Carrera', s: 'Carrera', c: 'var(--kr)' },
  rec: { l: 'Recuperación', s: 'Recup.', c: 'var(--kc)' },
  cool: { l: 'Enfriamiento', s: 'Enfr.', c: 'var(--kf)' },
};
/** ritmo supuesto para estimar la distancia de una recuperación si no la cargás */
export const REC_PACE = 450;

/** Un tramo del plan ya desplegado: `gi` = índice del bloque, `j` = paso dentro de la repetición (-1 si no es repetición), `r` = vuelta. */
export interface ExStep {
  k: StepKind;
  st: Step;
  gi: number;
  j: number;
  r: number;
  idx: number;
}

export const isRep = (st: PlanStep): st is RepStep => st.k === 'rep';

export function expand(steps: PlanStep[] | undefined): ExStep[] {
  const o: ExStep[] = [];
  (steps || []).forEach((st, gi) => {
    if (isRep(st)) {
      for (let r = 0; r < st.n; r++) st.steps.forEach((x, j) => o.push({ k: x.k, st: x, gi, j, r, idx: o.length }));
    } else o.push({ k: st.k, st, gi, j: -1, r: -1, idx: o.length });
  });
  return o;
}
export const stepDesc = (st: Step) => (st.dist! > 0 ? fmt(st.dist, 2) + ' km' : st.dur! > 0 ? fmtDur(st.dur!) : '');
export function stepTgt(st: Partial<Step>) {
  const a: string[] = [];
  if (st.pf! > 0) a.push(st.pf === st.ps ? fmtPace(st.pf!) + '/km' : fmtPace(st.pf!) + '–' + fmtPace(st.ps!) + '/km');
  if (st.hl! > 0) a.push('FC ' + st.hl + '–' + st.hh);
  return a.join(' · ');
}
export function stepLine(st: PlanStep): string {
  if (isRep(st)) return st.n + '× [' + st.steps.map(stepLine).join(' + ') + ']';
  return KINDS[st.k].s + ' ' + stepDesc(st) + (stepTgt(st) ? ' @ ' + stepTgt(st) : '');
}
export function stepsBrief(steps: PlanStep[]) {
  return steps
    .map((st) => {
      if (isRep(st)) {
        const main = st.steps.filter((x) => x.k !== 'rec'),
          rc = st.steps.filter((x) => x.k === 'rec'),
          m0 = main[0];
        return (
          st.n +
          '×' +
          main.map(stepDesc).join('+') +
          (m0 && m0.pf ? ' @' + fmtPace(Math.round((m0.pf + m0.ps!) / 2)) : '') +
          (rc.length ? ' (rec ' + rc.map(stepDesc).join('+') + ')' : '')
        );
      }
      return KINDS[st.k].s + ' ' + stepDesc(st) + (st.k === 'run' && stepTgt(st) ? ' @ ' + stepTgt(st) : '');
    })
    .join(' · ');
}
export function planTotals(steps: PlanStep[]) {
  const ex = expand(steps);
  return {
    dist: sum(ex.map((e) => e.st.dist || 0)),
    timeOnly: sum(ex.map((e) => (e.st.dist! > 0 ? 0 : e.st.dur || 0))),
    nTimeSteps: ex.filter((e) => !(e.st.dist! > 0)).length,
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cleanStep(x: any): Step | null {
  if (!x || !KINDS[x.k as StepKind]) return null;
  const o: Step = { k: x.k },
    d = Number(x.dist),
    t = Number(x.dur);
  if (d > 0 && d <= 100) o.dist = Math.round(d * 1000) / 1000;
  else if (t > 0 && t <= 36000) o.dur = Math.round(t);
  else return null;
  const pf = Number(x.pf),
    ps = Number(x.ps),
    hl = Number(x.hl),
    hh = Number(x.hh);
  if (pf >= 120 && ps <= 1200 && pf <= ps) {
    o.pf = Math.round(pf);
    o.ps = Math.round(ps);
  }
  if (hl >= 40 && hh <= 230 && hl < hh) {
    o.hl = Math.round(hl);
    o.hh = Math.round(hh);
  }
  return o;
}
export function cleanSteps(arr: unknown): PlanStep[] {
  const out: PlanStep[] = [];
  (Array.isArray(arr) ? arr : []).forEach((x) => {
    if (x && x.k === 'rep') {
      const n = Math.round(Number(x.n)),
        inner = (Array.isArray(x.steps) ? x.steps : []).map(cleanStep).filter(Boolean) as Step[];
      if (n >= 1 && n <= 50 && inner.length) out.push({ k: 'rep', n, steps: inner });
    } else {
      const c = cleanStep(x);
      if (c) out.push(c);
    }
  });
  return out.slice(0, 30);
}
const NUMK = ['distKm', 'timeSec', 'paceSec', 'hrAvg', 'hrMax'] as const;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cleanStage(a: any): Stage {
  if (!a || a.skipped) return { skipped: true };
  const o: Stage = {};
  NUMK.forEach((k) => {
    const v = Number(a[k]);
    if (isFinite(v) && v > 0) o[k] = v;
  });
  if (!(o.distKm! > 0 && o.timeSec! > 0)) return { skipped: true };
  if (a.est) o.est = true;
  if (a.avg) o.avg = true;
  if (Array.isArray(a.laps)) {
    const ls = a.laps
      .slice(0, 80)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((l: any) => {
        if (!l) return null;
        const q: Lap = {};
        NUMK.forEach((k) => {
          const v = Number(l[k]);
          if (isFinite(v) && v > 0) q[k] = v;
        });
        return q.distKm! > 0 && q.timeSec! > 0 ? q : null;
      })
      .filter(Boolean) as Lap[];
    if (ls.length) o.laps = ls;
  }
  return o;
}
/** Plan viejo (sin etapas) convertido a una sola etapa de carrera. */
export function legacySteps(p: Plan) {
  const st: Partial<Step> = { k: 'run' };
  if (p.distKm! > 0) st.dist = p.distKm;
  else if (p.durMin! > 0) st.dur = Math.round(p.durMin! * 60);
  else return [];
  if (p.paceSec! > 0) {
    st.pf = p.paceSec! - 5;
    st.ps = p.paceSec! + 5;
  }
  if (p.hrMin! > 0) {
    st.hl = p.hrMin;
    st.hh = p.hrMax;
  }
  return cleanSteps([st]);
}
export function stageTotals(stages: Stage[], ex: ExStep[]) {
  let d = 0,
    t = 0,
    hw = 0,
    ht = 0,
    hx = 0,
    md = 0,
    mt = 0;
  stages.forEach((a, i) => {
    if (!a || a.skipped) return;
    d += a.distKm || 0;
    t += a.timeSec || 0;
    if (a.hrAvg! > 0) {
      hw += a.hrAvg! * a.timeSec!;
      ht += a.timeSec!;
    }
    if (a.hrMax! > hx) hx = a.hrMax!;
    if (ex[i] && ex[i].k === 'run') {
      md += a.distKm!;
      mt += a.timeSec!;
    }
  });
  const o: { distKm: number; timeSec: number; paceSec: number; hrAvg?: number; hrMax?: number; mainPaceSec?: number } = {
    distKm: Math.round(d * 100) / 100,
    timeSec: Math.round(t),
    paceSec: d > 0 ? Math.round(t / d) : 0,
  };
  if (ht > 0) o.hrAvg = Math.round(hw / ht);
  if (hx > 0) o.hrMax = hx;
  if (md > 0) o.mainPaceSec = Math.round(mt / md);
  return o;
}

/** Normaliza una sesión que llega de la base, de un respaldo o del caché local. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normSession(x: any, id?: string): Session {
  let plan = x.plan || null,
    result = x.result || null;
  if (plan && plan.steps) {
    const st = cleanSteps(plan.steps);
    plan = Object.assign({}, plan);
    if (st.length) plan.steps = st;
    else delete plan.steps;
  }
  if (result && result.stages) {
    result = Object.assign({}, result);
    if (plan && plan.steps && Array.isArray(result.stages) && result.stages.length === expand(plan.steps).length) result.stages = result.stages.map(cleanStage);
    else delete result.stages;
  }
  return {
    id: id || x.id,
    type: (isType(x.type) ? x.type : 'fondo') as SessionType,
    plan,
    result,
    missed: !!x.missed,
    created: x.created || Date.now(),
    updated: x.updated || 0,
  };
}
