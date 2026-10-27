'use client';
/* Los tramos de la sesión. Hecha con etapas: plan contra real, tramo por tramo (con los parciales de cada uno). Hecha
   sin etapas: las vueltas del reloj o, si no marcó, kilómetro a kilómetro con las series de Strava; si no hay
   series, el plan contra lo hecho en total. Por hacer: el plan. En series y tempos, cómo se repartió el ritmo de las
   repeticiones. */
import type { ReactNode } from 'react';
import type { Lap, Session, Stage, Step, StepKind } from '@/lib/domain/types';
import type { DoneSession } from '@/lib/domain/stats';
import { zoneOf } from '@/lib/domain/config';
import { judge, type Judge } from '@/lib/domain/score';
import { KINDS, expand, isRep, stepDesc, stepTgt } from '@/lib/domain/stages';
import { repData, repRead } from '@/lib/domain/reps';
import { halfSplit, kmSplits, markedLaps, type Series, type Split } from '@/lib/domain/streams';
import { fmt, fmtDur, fmtPace } from '@/lib/domain/util';
import { deltaTxt } from '@/components/pista/controls';
import { Panel, Table, type Col, type Group } from '@/components/pista/structure';
import { cssVars, cx, typeColor } from '@/components/pista/util';

const DASH = <span className="mut">–</span>;

/** el cuadradito de cada tramo: el trabajo en el color del tipo, calor y calma en gris, las pausas más claras */
const kindColor = (k: StepKind, s: Session) => (k === 'run' ? typeColor(s.type) : k === 'rec' ? 'var(--line-2)' : 'var(--ink-4)');
const Name = ({ c, main, children }: { c: string; main?: boolean; children: ReactNode }) => (
  <span className={cx('ses-lap', main && 'main')} style={cssVars({ '--kc': c })}>
    {children}
  </span>
);

/** contra el objetivo: el ritmo en tiempo; si solo hay FC, en latidos. Dentro del rango da cero, y afuera el puntaje
    resta para los dos lados (`judge`, `testScore`): no hay Δ «bueno». En modo suave, ir más lento o con la FC más baja
    no resta: queda en gris */
function deltaOf(j: Judge, easy: boolean) {
  const off = (d: number, ok: boolean, txt: string) => <span className={cx('p-delta', Math.round(d) === 0 || ok ? 'eq' : 'bad')}>{txt}</span>;
  if (j.pd != null) return off(j.pd, easy && j.pd > 0, deltaTxt(j.pd));
  if (j.hd != null) return off(j.hd, easy && j.hd < 0, (j.hd > 0 ? '+' : j.hd < 0 ? '−' : '±') + Math.abs(j.hd) + ' lpm');
  return DASH;
}

/* ---- plan contra real ---- */
interface StageRow {
  key: string;
  name: ReactNode;
  a: Lap;
  skipped?: boolean;
  st: Step;
  j: Judge;
  sub?: boolean;
}
function stageRows(s: DoneSession): StageRow[] {
  const steps = s.plan!.steps!,
    stages = s.result.stages!,
    ex = expand(steps),
    runs = ex.filter((e) => e.k === 'run').length,
    out: StageRow[] = [];
  let n = 0;
  ex.forEach((e) => {
    const a: Stage = stages[e.idx] || { skipped: true };
    if (e.k === 'run') n++;
    if (a.avg && e.r > 0) return;
    const g = e.gi >= 0 ? steps[e.gi] : null,
      label = e.k === 'run' ? (a.avg ? 'Tramos (prom. de ' + (g && isRep(g) ? g.n : 0) + ')' : runs > 1 ? 'Tramo ' + n : 'Principal') : KINDS[e.k].l;
    out.push({
      key: String(e.idx),
      name: (
        <Name c={kindColor(e.k, s)} main={e.k === 'run'}>
          {label}
          {a.skipped ? <span className="mut"> · no la hiciste</span> : null}
          {a.est ? <span className="mut"> · estimada</span> : null}
        </Name>
      ),
      a,
      skipped: a.skipped,
      st: e.st,
      j: judge(e.st, a, e.k),
    });
    (a.laps || []).forEach((l, i) => out.push({ key: e.idx + '.' + i, name: <span className="ses-sub">Parcial {i + 1}</span>, a: l, st: e.st, j: judge(e.st, l, e.k), sub: true }));
  });
  return out;
}
const pace = (a: Lap) => (a.paceSec! > 0 ? a.paceSec! : a.distKm! > 0 && a.timeSec! > 0 ? a.timeSec! / a.distKm! : 0);
/** dos datos en una celda: el principal y, abajo, el chico (el objetivo del tramo, la FC máxima), que en el celu no va */
const Two = ({ a, b }: { a: ReactNode; b?: ReactNode }) => (
  <span className="ses-two">
    {a}
    {b ? <small className="s">{b}</small> : null}
  </span>
);
const STAGE_COLS = (easy: boolean): Col<StageRow>[] => [
  { key: 'n', label: 'Tramo', cell: (r) => r.name },
  { key: 'd', label: 'Dist.', num: true, cell: (r) => (r.skipped || !r.a.distKm ? DASH : fmt(r.a.distKm, 2)) },
  { key: 't', label: 'Tiempo', num: true, hideS: true, cell: (r) => (r.skipped || !r.a.timeSec ? DASH : fmtDur(r.a.timeSec)) },
  { key: 'p', label: 'Ritmo', num: true, cell: (r) => (r.skipped || !pace(r.a) ? DASH : <span className={r.st.k === 'run' && !r.sub ? 'ses-strong' : undefined}>{fmtPace(pace(r.a))}</span>) },
  { key: 'o', label: 'Plan', num: true, hideS: true, className: 'mut', cell: (r) => (r.sub ? '' : <Two a={stepDesc(r.st) || DASH} b={stepTgt(r.st)} />) },
  { key: 'x', label: 'Δ', num: true, cell: (r) => (r.skipped ? DASH : deltaOf(r.j, easy)) },
  { key: 'h', label: 'FC', num: true, cell: (r) => (r.skipped || !r.a.hrAvg ? DASH : <Two a={r.a.hrAvg} b={r.a.hrMax ? 'máx ' + r.a.hrMax : null} />) },
];

/* ---- las vueltas del reloj o kilómetro a kilómetro ---- */
interface SplitRow extends Split {
  i: number;
  best: boolean;
}
/** la más rápida entre las de `min` km o más, resaltada */
function ranked(L: Split[], min: number): SplitRow[] {
  const best = Math.min(...L.filter((l) => l.km >= min).map((l) => l.sec / l.km));
  return L.map((l, i) => ({ ...l, i, best: l.km >= min && l.sec / l.km === best }));
}
/* hasta 40 vueltas, como el original; en las vueltas, las de menos de 500 m (pausas, trotes cortos) van en gris */
const MAX_LAPS = 40,
  SHORT_LAP = 0.5;
const SPLIT_COLS = (laps: boolean): Col<SplitRow>[] => [
  laps
    ? { key: 'k', label: 'Vuelta', cell: (r) => <Name c="var(--ink-4)">{'Vuelta ' + (r.i + 1)}</Name> }
    : { key: 'k', label: 'Km', cell: (r) => <Name c="var(--ink-4)">{r.km >= 0.99 ? 'Km ' + (r.i + 1) : 'Últimos ' + Math.round(r.km * 1000) + ' m'}</Name> },
  ...(laps ? [{ key: 'd', label: 'Dist.', num: true, cell: (r: SplitRow) => fmt(r.km, 2) }] : []),
  { key: 't', label: 'Tiempo', num: true, cell: (r) => fmtDur(r.sec) },
  { key: 'p', label: 'Ritmo', num: true, cell: (r) => <span className={r.best ? 'ses-strong' : undefined}>{fmtPace(r.sec / r.km)}</span> },
  { key: 'h', label: 'FC', num: true, cell: (r) => r.hr || DASH },
];

/* ---- plan contra lo hecho en total ---- */
interface TotRow {
  k: string;
  plan: ReactNode;
  real: ReactNode;
}
const TOT_COLS: Col<TotRow>[] = [
  { key: 'k', label: 'Dato', cell: (r) => r.k },
  { key: 'p', label: 'Plan', num: true, className: 'mut', cell: (r) => r.plan },
  { key: 'r', label: 'Real', num: true, cell: (r) => r.real },
];
function totRows(s: DoneSession): TotRow[] {
  const p = s.plan!,
    r = s.result;
  return [
    { k: 'Distancia', plan: p.distKm ? fmt(p.distKm, 2) + ' km' : DASH, real: fmt(r.distKm, 2) + ' km' },
    { k: 'Duración', plan: p.durMin ? fmt(p.durMin, 0) + ' min' : DASH, real: fmtDur(r.timeSec) },
    { k: 'Ritmo', plan: p.paceSec ? fmtPace(p.paceSec) + ' /km' : DASH, real: fmtPace(r.paceSec) + ' /km' },
    { k: 'FC media', plan: p.hrMin ? p.hrMin + '–' + p.hrMax : DASH, real: r.hrAvg ? r.hrAvg + ' (' + zoneOf(r.hrAvg) + ')' : DASH },
    { k: 'FC máxima', plan: DASH, real: r.hrMax || DASH },
  ];
}

/* ---- el plan, por hacer: las repeticiones como un grupo ---- */
interface PlanRow {
  key: string;
  st: Step;
}
const PLAN_COLS = (s: Session): Col<PlanRow>[] => [
  { key: 'n', label: 'Tramo', cell: (r) => <Name c={kindColor(r.st.k, s)} main={r.st.k === 'run'}>{KINDS[r.st.k].l}</Name> },
  { key: 'd', label: 'Distancia o tiempo', num: true, cell: (r) => stepDesc(r.st) || DASH },
  { key: 'o', label: 'Objetivo', num: true, cell: (r) => stepTgt(r.st) || DASH },
];
function planRows(s: Session): (PlanRow | Group)[] {
  const out: (PlanRow | Group)[] = [];
  (s.plan?.steps || []).forEach((st, gi) => {
    if (!isRep(st)) return out.push({ key: String(gi), st });
    out.push({ key: 'g' + gi, group: <span className="ses-rep">{st.n} veces</span> });
    st.steps.forEach((x, j) => out.push({ key: gi + '.' + j, st: x }));
  });
  return out;
}

/* ---- repeticiones ---- */
function RepNote({ s }: { s: Session }) {
  const R = repData(s);
  if (!R) return null;
  const q = repRead(R);
  return (
    <div className="ses-foot">
      <span className="mono">
        Mejor {fmtPace(q.best)} y peor {fmtPace(q.worst)} /km · promedio {fmtPace(q.avg)} · variación {fmt(q.cv, 1)}% · del principio al final {(q.fade > 0 ? '+' : q.fade < 0 ? '−' : '') + fmt(Math.abs(q.fade), 1)}%
        {q.hr ? ' · FC ' + q.hr[0] + ' → ' + q.hr[1] + ' lpm' : ''}
      </span>
      <p>{q.msg}</p>
    </div>
  );
}

export function LapsPanel({ s, se }: { s: Session; se: Series | null }) {
  const r = s.result,
    p = s.plan;
  if (!r) {
    if (!p?.steps?.length) return null;
    return (
      <Panel title="Tramos" sub="El plan" flush className="tw">
        <Table cols={PLAN_COLS(s)} rows={planRows(s)} rowKey={(x) => x.key} label="Los tramos del plan" />
      </Panel>
    );
  }
  const d = s as DoneSession;
  if (r.stages && p?.steps)
    return (
      <Panel title="Tramos" sub="Plan contra real" flush className="tw">
        <Table cols={STAGE_COLS(!!r.easy)} rows={stageRows(d)} rowKey={(x) => x.key} dim={(x) => !!x.sub || !!x.skipped} label="Tramos, plan contra real" />
        <RepNote s={s} />
      </Panel>
    );
  const W = se ? markedLaps(se) : null,
    L = W ? W.slice(0, MAX_LAPS) : se ? kmSplits(se) : [];
  if (L.length >= 2) {
    const half = halfSplit(L);
    return (
      <Panel title={W ? 'Vueltas' : 'Parciales'} sub={W ? 'Las que marcó tu reloj' : 'Kilómetro a kilómetro'} flush className="tw">
        <Table
          cols={SPLIT_COLS(!!W)}
          rows={ranked(L, W ? SHORT_LAP : 0.99)}
          rowKey={(x) => String(x.i)}
          dim={(x) => !!W && x.km < SHORT_LAP}
          label={W ? 'Las vueltas del reloj' : 'Parciales por kilómetro'}
        />
        {half ? (
          <div className="ses-foot">
            <p>{half}</p>
          </div>
        ) : null}
        <RepNote s={s} />
      </Panel>
    );
  }
  if (!p)
    return repData(s) ? (
      <Panel title="Repeticiones" sub="Los tiempos de tus notas" flush className="tw">
        <RepNote s={s} />
      </Panel>
    ) : null;
  return (
    <Panel title="Plan contra real" flush className="tw">
      <Table cols={TOT_COLS} rows={totRows(d)} rowKey={(x) => x.k} label="Plan contra real" />
      <RepNote s={s} />
    </Panel>
  );
}
