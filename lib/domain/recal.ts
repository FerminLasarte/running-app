/* ================= recalibrar ritmos con un test =================
   El test da tu VDOT nuevo; la referencia es la marca con la que estaban armados tus ritmos.
   Cada etapa con ritmo se mueve lo que indica la diferencia de VDOT a la intensidad de su tipo,
   así se conserva la progresión del plan (no se pisa todo con el mismo ritmo). (Líneas 3457–3569 del original.) */
import { S, getUi, setUi } from '@/lib/store';
import { blockDemo, saveCfg, saveSessions, toast, toastUndo } from '@/lib/data/actions';
import { closeSheet, openSheet } from '@/lib/sheets';
import type { PaceRef, PlanStep, Session, Step } from './types';
import { racePaceSec, refRace } from './config';
import { cleanSteps, expand } from './stages';
import { doneList } from './stats';
import { clamp, cleanObj, dateLabel, fmt, fmtPace, todayS } from './util';
import { longRace } from './blocks';
import { planTitle, vdotOf, type PlannedSession } from './daniels';
import { planFromSteps } from './week';

export type RcCat = 'int' | 'thr' | 'mp' | 'prog';
export const RC_F: Record<RcCat, number> = { int: 0.98, thr: 0.88, mp: 0.8, prog: 0.84 };
export const RC_N: Record<RcCat, string> = { int: 'Series', thr: 'Umbral y tempos', mp: 'Ritmo maratón', prog: 'Finales progresivos' };
export const vo2AtPace = (p: number) => {
  const v = 60000 / p;
  return -4.6 + 0.182258 * v + 0.000104 * v * v;
};
export const paceAtVo2 = (o: number) => 60000 / ((-0.182258 + Math.sqrt(0.182258 * 0.182258 + 4 * 0.000104 * (o + 4.6))) / (2 * 0.000104));

export function stepCat(x: PlannedSession, st: Step): RcCat | null {
  if (!(st.pf! > 0)) return null;
  const lr = longRace(),
    mp = lr && lr.targetSec > 0 ? racePaceSec(lr) : null,
    mid = (st.pf! + st.ps!) / 2;
  if (mp && (Math.abs(mid - mp) <= 6 || (/marat[oó]n|ensayo/i.test(planTitle(x)) && Math.abs(mid - mp) <= 25))) return 'mp';
  return x.type === 'series' ? 'int' : x.type === 'fondo' ? 'prog' : 'thr';
}

/** test o carrera con la que se recalibra */
export interface RcSrc {
  id: string;
  km: number;
  sec: number;
  date: string;
  label: string;
}
export function rcSources(): RcSrc[] {
  const L: RcSrc[] = doneList()
    .filter((x) => x.type === 'test' && x.result.distKm >= 3 && x.result.timeSec > 0)
    .map((x) => ({ id: x.id, km: x.result.distKm, sec: x.result.timeSec, date: x.result.date, label: 'Test de ' + fmt(x.result.distKm, 1) + ' km del ' + dateLabel(x.result.date) }));
  S.cfg.races
    .filter((r) => (r.resultSec || 0) > 0 && r.km >= 3)
    .forEach((r) => L.push({ id: 'race_' + r.id, km: r.km, sec: r.resultSec!, date: r.date, label: r.name + ' del ' + dateLabel(r.date) }));
  return L.sort((a, b) => b.date.localeCompare(a.date));
}
export function rcRefDefault(): PaceRef {
  if (S.cfg.paceRef && S.cfg.paceRef.sec > 0) return { ...S.cfg.paceRef };
  const r = refRace();
  return { km: r.km, sec: r.targetSec, label: 'tu objetivo del ' + r.name };
}

/** el formulario de la hoja (lo que era `F` con kind 'recal') */
export interface RecalForm {
  srcs: RcSrc[];
  src: RcSrc;
  ref: PaceRef;
  cats: Record<RcCat, boolean>;
  scope: 'next' | 'all';
}
/** sesiones planificadas que vienen (con etapas y sin hacer) y el próximo test, que limita el alcance «hasta el próximo test» */
export function rcTargets(F: RecalForm): { list: PlannedSession[]; nextTest: PlannedSession | null } {
  const tS = todayS(),
    from = F.src.date > tS ? F.src.date : tS;
  let L = (S.sessions.filter((x) => x.plan && !x.result && !x.missed && x.plan.steps && x.plan.date > from) as PlannedSession[]).sort((a, b) =>
    a.plan.date.localeCompare(b.plan.date),
  );
  const nextTest = L.find((x) => x.type === 'test') || null;
  if (F.scope === 'next' && nextTest) L = L.filter((x) => x.plan.date < nextTest.plan.date);
  return { list: L, nextTest };
}
export function rcDelta(F: RecalForm) {
  return clamp(vdotOf(F.src.sec, F.src.km) - vdotOf(F.ref.sec, F.ref.km), -6, 6);
}
export function rcSteps(x: PlannedSession, d: number, cats: Record<RcCat, boolean>) {
  let n = 0;
  const mv = (st: Step): Step => {
    const c = stepCat(x, st);
    if (!c || !cats[c]) return st;
    const f = (p: number) => Math.round(paceAtVo2(vo2AtPace(p) + RC_F[c] * d)),
      q = { ...st, pf: f(st.pf!), ps: f(st.ps!) };
    if (q.pf !== st.pf || q.ps !== st.ps) n++;
    return q;
  };
  const steps: PlanStep[] = x.plan.steps!.map((st) => (st.k === 'rep' ? { ...st, steps: st.steps.map(mv) } : mv(st)));
  return { steps, n };
}
export const rngTxt = (st: Step) => (st.pf === st.ps! - 10 ? fmtPace((st.pf! + st.ps!) / 2) : fmtPace(st.pf!) + '–' + fmtPace(st.ps!));
export function rcChanges(x: PlannedSession, steps: PlanStep[]) {
  const a: string[] = [],
    old = expand(x.plan.steps),
    nw = expand(steps),
    seen = new Set<string>();
  old.forEach((e, i) => {
    const o = e.st,
      q = nw[i].st;
    if (o.pf! > 0 && (o.pf !== q.pf || o.ps !== q.ps)) {
      const k = rngTxt(o) + '>' + rngTxt(q);
      if (!seen.has(k)) {
        seen.add(k);
        a.push(rngTxt(o) + ' → ' + rngTxt(q));
      }
    }
  });
  return a;
}

/** abre la hoja de recalibrar (con el test o carrera `srcId` elegido, si viene) */
export function openRecal(srcId?: string | null) {
  const src = rcSources();
  if (!src.length) {
    toast('Primero cargá un test (3 km o más) o el tiempo de una carrera en Ajustes.', 5000);
    return;
  }
  openSheet('recal', { srcId: srcId || undefined });
}
export function applyRecal(F: RecalForm) {
  if (blockDemo()) return;
  const d = rcDelta(F),
    id = 'rc_' + Date.now().toString(36),
    T = rcTargets(F).list,
    out: Session[] = [];
  T.forEach((x) => {
    const r = rcSteps(x, d, F.cats);
    if (!r.n) return;
    const p = planFromSteps(x.plan.date, x.type, r.steps, x.plan.notes);
    if (x.plan.durMin != null) p.durMin = x.plan.durMin;
    p.recal = { id, at: todayS(), src: F.src.label, prev: x.plan.steps! };
    out.push({ ...x, plan: p });
  });
  const n = out.length;
  saveSessions(out);
  const c = cleanObj(S.cfg);
  c.paceRef = { km: F.src.km, sec: F.src.sec, label: F.src.label, date: F.src.date };
  c.recals = (c.recals || []).concat([{ id, at: todayS(), src: F.src.label, d: Math.round(d * 10) / 10, n, prevRef: F.ref }]).slice(-10);
  saveCfg(c);
  closeSheet();
  toastUndo('Recalibré ' + n + (n === 1 ? ' sesión' : ' sesiones'), undoRecal);
}
export function undoRecal() {
  if (blockDemo()) return;
  const last = (S.cfg.recals || []).slice(-1)[0];
  if (!last) return;
  const out: Session[] = [];
  S.sessions
    .filter((x) => x.plan && x.plan.recal && x.plan.recal.id === last.id && !x.result)
    .forEach((x) => {
      const p = planFromSteps(x.plan!.date, x.type, cleanSteps(x.plan!.recal!.prev), x.plan!.notes);
      if (x.plan!.durMin != null) p.durMin = x.plan!.durMin;
      out.push({ ...x, plan: p });
    });
  const n = out.length;
  saveSessions(out);
  const c = cleanObj(S.cfg);
  c.recals = (c.recals || []).slice(0, -1);
  if (last.prevRef && last.prevRef.sec > 0) c.paceRef = last.prevRef;
  else delete c.paceRef;
  saveCfg(c);
  toast('Deshice la recalibración (' + n + (n === 1 ? ' sesión' : ' sesiones') + ')', 4000);
}
/** botón «Deshacer la última»: pide un segundo toque antes de deshacer (S.recalUndo del original) */
export function recalUndoTap() {
  const last = (S.cfg.recals || []).slice(-1)[0];
  if (!last) return;
  if (getUi<string | null>('recalUndo', null) !== last.id) {
    setUi('recalUndo', last.id);
    toast('Tocá de nuevo para deshacer la recalibración del ' + dateLabel(last.at) + '.', 4000);
    return;
  }
  setUi('recalUndo', null);
  undoRecal();
}
