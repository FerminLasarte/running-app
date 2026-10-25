/* Formulario «Registrar resultado»: filas por etapa, validaciones, parciales, Strava y armado del resultado.
   Puro como planForm: cada acción recibe el estado del formulario y devuelve uno nuevo. */
import { S } from '@/lib/store';
import type { PerformancePayload } from '@/lib/strava/client';
import { hmsFromSec, msFromSec, readHms, readMs, type Hms, type Ms } from './hms';
import type { Decoupling, Lap, Plan, Result, Session, SessionType, Stage, Step, StepKind } from './types';
import { easyActive, isType, mainShoe } from './config';
import { expand, KINDS, REC_PACE, stageTotals, stepDesc, stepTgt, type ExStep } from './stages';
import { judge, judgeTxt, lapTxt, scoreFlat, volTxt } from './score';
import { sdate } from './stats';
import { cap, fmt, fmtDur, fmtPace, newId, num, pad, sum, todayS } from './util';
import { batchNote } from './planForm';
import type { SvItem } from './week';

/* ---- estado ---- */
/** un parcial tal como se escribe */
export interface LapV {
  d: string;
  m: string;
  s: string;
  h: string;
  x: string;
}
/** una fila (etapa) tal como se escribe */
export interface RowV {
  d?: string;
  m?: string;
  s?: string;
  h?: string;
  x?: string;
  skip?: boolean;
  laps?: LapV[];
}
export interface FlatV {
  dist: string;
  t: Hms;
  pace: Ms;
  hr: string;
  hrmax: string;
}
/** por bloque que se repite: cargar el promedio o una por una */
export type GM = Record<number, 'avg' | 'each'>;
export interface SvState {
  list: SvItem[] | null;
  busy: boolean;
  msg: string;
  pick: string | null;
}
export interface ResF {
  sid: string | null;
  editing: boolean;
  editRes: Result | null;
  type: SessionType;
  feel: number | null;
  pain: 0 | 1;
  weather: string;
  shoe: string;
  paceManual: boolean;
  /** pendientes para elegir (las últimas 5) */
  pend: Session[];
  mode: 'flat' | 'stages';
  plan: Plan | null;
  gm: GM;
  vals: Record<string, RowV>;
  flat: FlatV;
  date: string;
  notes: string;
  stravaId: string | null;
  dec: Decoupling | null;
  sv: SvState;
}
/** lo que se guarda como borrador (ver lib/data/draft.ts) */
export interface ResultDraft {
  k: 'result';
  sid: string | null;
  editing: boolean;
  type: SessionType;
  feel: number | null;
  pain: 0 | 1;
  weather: string;
  shoe: string;
  paceManual: boolean;
  mode: 'flat' | 'stages';
  gm: GM;
  vals: Record<string, RowV>;
  date: string;
  notes: string;
  flat?: FlatV;
  stravaId?: string | null;
  dec?: Decoupling | null;
}
export interface ResultProps {
  id?: string | null;
  free?: boolean;
  /** tipo sugerido para una sesión libre (desde la Semana, por el nombre de la corrida de Strava) */
  type?: SessionType;
  sv?: { list: SvItem[]; pick?: string };
  draft?: ResultDraft | null;
}

export const SV0: SvState = { list: null, busy: false, msg: '', pick: null };
const FLAT0: FlatV = { dist: '', t: { h: '', m: '', s: '' }, pace: { m: '', s: '' }, hr: '', hrmax: '' };

export const paceLabel = (t: SessionType) => (t === 'series' ? 'Ritmo promedio de las series' : t === 'tempo' ? 'Ritmo promedio del tempo (parte principal)' : 'Ritmo promedio');
/* sensación: de rojo a verde, con una palabra */
export const FEEL_C = (n: number) =>
  n <= 2 ? 'var(--crit)' : n <= 4 ? 'var(--serious)' : n <= 6 ? 'var(--warn)' : n <= 8 ? 'color-mix(in srgb,var(--good) 70%,var(--warn))' : 'var(--good)';
export const FEEL_T = (n: number) => (n <= 2 ? 'Muy mal' : n <= 4 ? 'Mal' : n <= 6 ? 'Normal' : n <= 8 ? 'Bien' : 'Excelente');

/* ---- filas ---- */
export interface ResRow {
  key: string;
  k: StepKind;
  st: Step;
  gi: number;
  j: number;
  r: number;
  /** fila que carga el promedio de n repeticiones */
  avgN?: number;
}
export const rowKey = (e: Pick<ExStep, 'gi' | 'j' | 'r'>, gm: GM) => (e.j < 0 ? 's' + e.gi : gm[e.gi] === 'avg' ? 'g' + e.gi + '_' + e.j : 'g' + e.gi + '_' + e.j + '_' + e.r);
export const exOf = (f: Pick<ResF, 'plan'>) => expand(f.plan ? f.plan.steps : undefined);
export function resRows(plan: Plan | null, gm: GM): ResRow[] {
  const rows: ResRow[] = [];
  ((plan && plan.steps) || []).forEach((st, gi) => {
    if (st.k === 'rep') {
      if (gm[gi] === 'avg') st.steps.forEach((x, j) => rows.push({ key: 'g' + gi + '_' + j, k: x.k, st: x, gi, j, r: -1, avgN: st.n }));
      else for (let r = 0; r < st.n; r++) st.steps.forEach((x, j) => rows.push({ key: 'g' + gi + '_' + j + '_' + r, k: x.k, st: x, gi, j, r }));
    } else rows.push({ key: 's' + gi, k: st.k, st, gi, j: -1, r: -1 });
  });
  return rows;
}
export const rowLabel = (rw: ResRow) => KINDS[rw.k].l + (rw.r >= 0 ? ' ' + (rw.r + 1) : '') + (rw.avgN ? ' · promedio de ' + rw.avgN : '');
export const rowPlan = (st: Step) => {
  const t = stepTgt(st);
  return stepDesc(st) + (t ? ' · ' + t : '');
};
export const lapBlank = (l: LapV | null | undefined) => !l || (!l.d && !l.m && !l.s && !l.h && !l.x);
export function lapEval(l: LapV): { err: string } | { a: Lap } {
  const dd = num(l.d),
    mm = num(l.m),
    ss = num(l.s),
    h = num(l.h),
    x = num(l.x);
  if ([dd, mm, ss, h, x].some((q) => q != null && isNaN(q))) return { err: 'revisá los números' };
  if (ss != null && (ss < 0 || ss >= 60)) return { err: 'los segundos van de 0 a 59' };
  const t = (mm || 0) * 60 + (ss || 0);
  if (!(dd! > 0)) return { err: 'falta la distancia' };
  if (!(t > 0)) return { err: 'falta el tiempo' };
  const pace = t / dd!;
  if (pace < 120 || pace > 1800) return { err: 'el ritmo da ' + fmtPace(pace) + '/km, revisá distancia y tiempo' };
  if (h != null && (h < 40 || h > 230)) return { err: 'revisá la FC promedio' };
  if (x != null && (x < 40 || x > 230)) return { err: 'revisá la FC máxima' };
  if (h != null && x != null && x < h) return { err: 'la FC máx. no puede ser menor que la promedio' };
  const a: Lap = { distKm: Math.round(dd! * 100) / 100, timeSec: Math.round(t), paceSec: Math.round(pace) };
  if (h != null) a.hrAvg = Math.round(h);
  if (x != null) a.hrMax = Math.round(x);
  return { a };
}
export function rowEval(rw: ResRow, v: RowV): { err: string } | { a: Stage } {
  const st = rw.st;
  if (v.skip) return { a: { skipped: true } };
  const dd = num(v.d),
    mm = num(v.m),
    ss = num(v.s);
  let h = num(v.h),
    x = num(v.x);
  if ([dd, mm, ss, h, x].some((q) => q != null && isNaN(q))) return { err: 'Revisá los números.' };
  if (ss != null && (ss < 0 || ss >= 60)) return { err: 'Los segundos van de 0 a 59.' };
  if (mm != null && mm < 0) return { err: 'Revisá los minutos.' };
  const laps: Lap[] = [],
    lr = rw.avgN ? [] : v.laps || [];
  for (let i = 0; i < lr.length; i++) {
    if (lapBlank(lr[i])) continue;
    const e = lapEval(lr[i]);
    if ('err' in e) return { err: 'Parcial ' + (i + 1) + ': ' + e.err + '.' };
    laps.push(e.a);
  }
  const ld = sum(laps.map((l) => l.distKm!)),
    lt = sum(laps.map((l) => l.timeSec!));
  let t = mm == null && ss == null ? null : (mm || 0) * 60 + (ss || 0),
    d = dd,
    est = false;
  if (laps.length) {
    if (t == null || t <= 0) t = lt;
    if (d == null) d = ld;
    const w = laps.filter((l) => l.hrAvg! > 0);
    if (h == null && w.length) h = sum(w.map((l) => l.hrAvg! * l.timeSec!)) / sum(w.map((l) => l.timeSec!));
    if (x == null) {
      const mx = Math.max(...laps.map((l) => l.hrMax || 0));
      if (mx > 0) x = mx;
    }
  }
  if ((t == null || t <= 0) && st.dur! > 0 && (dd != null || rw.k === 'rec')) t = st.dur!;
  if (d == null && st.dist! > 0 && t != null && t > 0) d = st.dist!;
  if (t == null || t <= 0) return { err: 'Falta el tiempo.' };
  if (d == null || d <= 0) {
    if (rw.k === 'rec') {
      d = Math.round((t / REC_PACE) * 100) / 100;
      est = true;
    } else return { err: 'Falta la distancia.' };
  }
  if (d > 100) return { err: 'La distancia parece demasiado grande.' };
  if (t > 86400) return { err: 'El tiempo parece demasiado grande.' };
  const pace = t / d;
  if (rw.k !== 'rec' && (pace < 120 || pace > 1200)) return { err: 'El ritmo da ' + fmtPace(pace) + '/km: revisá distancia y tiempo.' };
  if (h != null && (h < 40 || h > 230)) return { err: 'Revisá la FC promedio.' };
  if (x != null && (x < 40 || x > 230)) return { err: 'Revisá la FC máxima.' };
  if (h != null && x != null && x < h) return { err: 'La FC máx. no puede ser menor que la promedio.' };
  if (laps.length && Math.abs(ld - d) / d > 0.25) return { err: 'Los parciales suman ' + fmt(ld, 2) + ' km pero la etapa tiene ' + fmt(d, 2) + ' km. Revisá los números.' };
  const a: Stage = { distKm: Math.round(d * 100) / 100, timeSec: Math.round(t), paceSec: Math.round(pace) };
  if (est) a.est = true;
  if (h != null) a.hrAvg = Math.round(h);
  if (x != null) a.hrMax = Math.round(x);
  if (laps.length) a.laps = laps;
  return { a };
}
function lapSumTxt(a: Stage, st: Step, k: StepKind) {
  if (!a.laps || !a.laps.length) return '';
  const line = { j: { laps: a.laps.filter((l) => l.distKm! >= 0.15).map((l) => judge(st, l, k)) }, e: { r: -1 } };
  return lapTxt([line as unknown as Parameters<typeof lapTxt>[0][number]]);
}
/** el texto debajo de cada fila: cómo te fue contra el plan, o qué falta (updRow) */
export function rowNote(rw: ResRow, v: RowV): { txt: string; bad: boolean } {
  const laps = rw.avgN ? [] : v.laps || [];
  if (!v.d && !v.m && !v.s && !laps.some((l) => !lapBlank(l))) return { txt: rw.k === 'rec' && rw.st.dur! > 0 ? 'Si la dejás vacía, cuento la recuperación completa (' + fmtDur(rw.st.dur!) + ').' : '', bad: false };
  const e = rowEval(rw, { ...v, skip: false, laps });
  if ('err' in e) return { txt: e.err, bad: true };
  const a = e.a,
    j = judge(rw.st, a, rw.k),
    jt = judgeTxt(j),
    vt = !v.d && !v.m && !v.s && a.laps ? '' : volTxt(j.q, rw.k, false);
  return { txt: cap(rw.k === 'rec' || !jt ? 'Ritmo ' + fmtPace(a.paceSec!) + '/km' : jt) + '.' + (a.est ? ' Distancia estimada.' : '') + vt + lapSumTxt(a, rw.st, rw.k), bad: false };
}
const valsFromLap = (a: Lap): LapV => ({
  d: fmt(a.distKm, 2),
  m: String(Math.floor(a.timeSec! / 60)),
  s: String(a.timeSec! % 60),
  h: a.hrAvg ? String(a.hrAvg) : '',
  x: a.hrMax ? String(a.hrMax) : '',
});
function valsFromStage(a: Stage | undefined): RowV {
  if (!a) return {};
  if (a.skipped) return { skip: true };
  const v: RowV = valsFromLap(a);
  if (a.est) v.d = '';
  v.laps = (a.laps || []).map(valsFromLap);
  return v;
}

/* ---- modo: plano (sin plan por etapas) o por etapas ---- */
function flatFromRes(f: ResF): FlatV {
  const r = f.editing && f.editRes && !f.editRes.stages ? f.editRes : null;
  if (!r) return FLAT0;
  return { dist: fmt(r.distKm, 2), t: hmsFromSec(r.timeSec), pace: msFromSec(r.paceSec), hr: r.hrAvg ? String(r.hrAvg) : '', hrmax: r.hrMax ? String(r.hrMax) : '' };
}
function setupStages(f: ResF, plan: Plan): ResF {
  const ex = expand(plan.steps),
    gm: GM = {},
    vals: Record<string, RowV> = {};
  const res = f.editRes && f.editRes.stages ? f.editRes.stages : null;
  (plan.steps || []).forEach((st, gi) => {
    if (st.k !== 'rep') return;
    const lines = ex.filter((e) => e.gi === gi);
    gm[gi] = res && lines.some((e) => !(res[e.idx] && res[e.idx].avg)) ? 'each' : 'avg';
  });
  if (res)
    ex.forEach((e) => {
      if (gm[e.gi] === 'avg' && e.r > 0) return;
      vals[rowKey(e, gm)] = valsFromStage(res[e.idx]);
    });
  return { ...f, plan, gm, vals };
}
/** setMode + buildMain: por etapas si la sesión tiene plan con etapas; si no, los campos de siempre */
export function setMode(f: ResF, s: Session | null): ResF {
  const staged = !!(s && s.plan && s.plan.steps && s.plan.steps.length);
  if (staged) return setupStages({ ...f, mode: 'stages' }, s!.plan!);
  const n: ResF = { ...f, mode: 'flat' };
  return { ...n, flat: flatFromRes(n) };
}
export function resultInit(o: ResultProps): ResF {
  const tS = todayS();
  const pend = S.sessions.filter((s) => s.plan && !s.result && !s.missed && sdate(s) <= tS).sort((a, b) => sdate(a).localeCompare(sdate(b)));
  const d = o.draft || null,
    free = o.free || !!d;
  let s = o.id ? S.sessions.find((x) => x.id === o.id) || null : null;
  const editing = !!(s && s.result);
  if (!s && pend.length && !free) s = pend[pend.length - 1];
  const r: Partial<Result> = (s && s.result) || {};
  const pd0 = s && s.plan ? s.plan.date : tS;
  let f: ResF = {
    sid: s ? s.id : null,
    editing,
    editRes: editing ? s!.result : null,
    type: s ? s.type : 'fondo',
    feel: r.feel || null,
    pain: r.pain ? 1 : 0,
    weather: r.weather || '',
    shoe: editing ? r.shoe || '' : (mainShoe() || { id: '' }).id,
    paceManual: !!r.paceManual,
    pend: pend.slice(-5),
    mode: 'flat',
    plan: null,
    gm: {},
    vals: {},
    flat: FLAT0,
    date: editing ? r.date! : pd0 <= tS ? pd0 : tS,
    notes: editing ? r.notes || '' : '',
    stravaId: null,
    dec: null,
    sv: o.sv ? { ...SV0, list: o.sv.list } : SV0,
  };
  /* desde la Semana sin sesión planificada que coincida: el tipo que sugiere el nombre de la corrida */
  if (o.free && o.type && !s) f.type = o.type;
  if (!d) return setMode(f, s);
  /* borrador: lo que estabas cargando antes de recargar la página */
  const ds = d.sid ? S.sessions.find((x) => x.id === d.sid) || null : null;
  f = { ...f, sid: ds ? ds.id : null, type: isType(d.type) ? d.type : f.type, feel: d.feel || null, pain: d.pain ? 1 : 0, weather: d.weather || '', paceManual: !!d.paceManual };
  if (d.shoe != null) f.shoe = d.shoe;
  f = setMode(f, ds);
  if (f.mode === 'stages' && d.mode === 'stages') f = { ...f, gm: d.gm || f.gm, vals: d.vals || {} };
  else if (f.mode === 'flat' && d.flat) f = { ...f, flat: d.flat };
  return { ...f, date: d.date, notes: d.notes || '', stravaId: d.stravaId || null, dec: d.dec || null };
}
export function resultDraftData(f: ResF): ResultDraft {
  const d: ResultDraft = {
    k: 'result',
    sid: f.sid,
    editing: f.editing,
    type: f.type,
    feel: f.feel,
    pain: f.pain,
    weather: f.weather,
    shoe: f.shoe || '',
    paceManual: f.paceManual,
    mode: f.mode,
    gm: f.gm,
    vals: f.vals,
    date: f.date,
    notes: f.notes,
    stravaId: f.stravaId,
    dec: f.dec,
  };
  if (f.mode === 'flat') d.flat = f.flat;
  return d;
}

/* ---- acciones (las entradas `rf-*`, `gm-toggle`, `lp-*` y `ln-skip` de la tabla de eventos) ---- */
export function rfPick(f: ResF, id: string | null): ResF {
  const s = id ? S.sessions.find((x) => x.id === id) || null : null;
  let n: ResF = { ...f, sid: id };
  if (s) n.type = s.type;
  if (s && s.plan) {
    const tS = todayS();
    n.date = s.plan.date <= tS ? s.plan.date : tS;
  }
  const was = f.mode;
  if (s && s.plan && s.plan.steps && s.plan.steps.length) n = setupStages({ ...n, mode: 'stages' }, s.plan);
  else {
    n.mode = 'flat';
    if (was !== 'flat') n.flat = flatFromRes(n);
  }
  return n;
}
export function gmToggle(f: ResF, gi: number): ResF {
  const st = f.plan && f.plan.steps && f.plan.steps[gi];
  if (!st || st.k !== 'rep') return f;
  const to = f.gm[gi] === 'avg' ? 'each' : 'avg',
    vals = { ...f.vals };
  if (to === 'each')
    st.steps.forEach((x, j) => {
      const src = { ...(vals['g' + gi + '_' + j] || {}), laps: [] };
      for (let r = 0; r < st.n; r++) vals['g' + gi + '_' + j + '_' + r] = { ...src };
    });
  else
    st.steps.forEach((x, j) => {
      vals['g' + gi + '_' + j] = { ...(vals['g' + gi + '_' + j + '_0'] || {}), laps: [] };
    });
  return { ...f, vals, gm: { ...f.gm, [gi]: to } };
}
const setV = (f: ResF, key: string, fn: (v: RowV) => RowV): ResF => ({ ...f, vals: { ...f.vals, [key]: fn(f.vals[key] || {}) } });
export const setRow = (f: ResF, key: string, p: Partial<RowV>) => setV(f, key, (v) => ({ ...v, ...p }));
export const setLap = (f: ResF, key: string, i: number, p: Partial<LapV>) => setV(f, key, (v) => ({ ...v, laps: (v.laps || []).map((l, k) => (k === i ? { ...l, ...p } : l)) }));
export function lpAdd(f: ResF, key: string): ResF {
  return setV(f, key, (v) => {
    const laps = v.laps || [],
      prev = laps[laps.length - 1];
    return { ...v, laps: laps.concat([{ d: prev && prev.d ? prev.d : '1', m: '', s: '', h: '', x: '' }]) };
  });
}
export const lpDel = (f: ResF, key: string, i: number) => (f.vals[key] && f.vals[key].laps ? setV(f, key, (v) => ({ ...v, laps: (v.laps || []).filter((_, k) => k !== i) })) : f);
export const lnSkip = (f: ResF, key: string) => setV(f, key, (v) => ({ ...v, skip: !v.skip }));

/** con distancia y tiempo, el ritmo se calcula solo mientras no lo hayas cambiado a mano */
export function autoPace(f: ResF): ResF {
  if (f.mode !== 'flat' || f.paceManual) return f;
  const d = num(f.flat.dist),
    t = readHms(f.flat.t);
  if (d != null && d > 0 && t != null && t > 0) return { ...f, flat: { ...f.flat, pace: msFromSec(t / d) } };
  return f;
}
/** cambia distancia o tiempo (recalcula el ritmo) o el ritmo (queda manual si no está vacío) */
export function setFlat(f: ResF, p: Partial<FlatV>): ResF {
  const n: ResF = { ...f, flat: { ...f.flat, ...p } };
  if (p.pace) {
    const blank = !p.pace.m && !p.pace.s;
    const m: ResF = { ...n, paceManual: !blank };
    return blank ? autoPace(m) : m;
  }
  if (p.dist != null || p.t) return autoPace(n);
  return n;
}

/* ---- vueltas leídas (Claude o Strava) ---- */
/** una etapa leída: {dist_km, time_s, hr_avg, hr_max, parciales}; datos externos, por eso sin tipos estrictos */
export type Vuelta = { dist_km?: unknown; time_s?: unknown; hr_avg?: unknown; hr_max?: unknown; parciales?: unknown } | null;
export function fillVueltas(f: ResF, laps: Vuelta[]): { f: ResF; filled: number } {
  const gm: GM = {};
  Object.keys(f.gm).forEach((k) => {
    gm[+k] = 'each';
  });
  const vals: Record<string, RowV> = {};
  let filled = 0;
  const cv = (q: unknown): LapV | null => {
    const o = q as Exclude<Vuelta, null>;
    if (!o || !(Number(o.dist_km) > 0) || !(Number(o.time_s) > 0)) return null;
    const t = Math.round(Number(o.time_s));
    return {
      d: fmt(Number(o.dist_km), 2),
      m: String(Math.floor(t / 60)),
      s: String(t % 60),
      h: Number(o.hr_avg) > 0 ? String(Math.round(Number(o.hr_avg))) : '',
      x: Number(o.hr_max) > 0 ? String(Math.round(Number(o.hr_max))) : '',
    };
  };
  exOf(f).forEach((e, i) => {
    const l = laps[i],
      key = rowKey(e, gm);
    const base: RowV = cv(l) || { d: '', m: '', s: '', h: '', x: '' };
    base.laps = (Array.isArray(l && l.parciales) ? (l!.parciales as unknown[]) : []).map(cv).filter((q): q is LapV => !!q);
    if (!cv(l) && !base.laps.length) {
      vals[key] = {};
      return;
    }
    vals[key] = base;
    filled++;
  });
  return { f: { ...f, gm, vals }, filled };
}
export function lapsPrompt0(ex: ExStep[]) {
  const lines = ex.map((e, i) => i + 1 + '. ' + KINDS[e.k].l + ' — plan: ' + stepDesc(e.st)).join('\n');
  return (
    'Estas son una o varias capturas del resultado de una actividad de running en Garmin Connect (pestañas «Intervalos», «Estadísticas» o similares). El entrenamiento planificado tiene estas etapas, en orden:\n' +
    lines +
    '\n\n' +
    'Cómo leerlas:\n' +
    '- En la tabla de intervalos, cada fila numerada en la columna «Int.» (normalmente en negrita, con tipo Calentamiento / Carrera / Recuperación / Enfriamiento) es UNA etapa. Usá los datos de esa fila (tiempo, distancia, FC media y máxima de la etapa). Las filas más chicas debajo de cada etapa, con número de vuelta (cada km, por ejemplo), son sus PARCIALES: también hay que leerlos. Ignorá solo la fila «Total».\n' +
    '- Los datos de una misma etapa pueden estar en capturas distintas (por ejemplo tiempo y distancia en una, FC en otra, o la tabla girada): unilos por el número de «Int.».\n' +
    '- Si hay filtros de tipo (Todos / Calentamiento / Carrera / Enfriamiento), cada captura puede mostrar solo un tipo: alineá por tipo y orden.\n' +
    '- Tiempos en segundos (27:30.0 = 1650), distancias en km con punto decimal (5,28 = 5.28). FC en lpm.\n\n' +
    'Devolvé un JSON con exactamente ' +
    ex.length +
    ' entradas en "vueltas", una por etapa del plan y en el mismo orden. Cada entrada es {"dist_km":número,"time_s":segundos,"hr_avg":lpm o null,"hr_max":lpm o null,"parciales":[...]} con los datos de la fila de la etapa; "parciales" es la lista, en orden, de las filas de vuelta de esa etapa, cada una con {"dist_km","time_s","hr_avg","hr_max"} (lista vacía si la etapa no muestra vueltas). Poné null en lugar de la entrada si esa etapa no se ve en las capturas. Si una etapa solo muestra vueltas y no su fila de resumen, devolvé igual sus parciales y dejá el resto de la entrada en null dentro del objeto. No inventes datos que no estén. Respondé SOLO con el JSON, por ejemplo {"vueltas":[{"dist_km":2.0,"time_s":780,"hr_avg":140,"hr_max":152,"parciales":[{"dist_km":1,"time_s":400,"hr_avg":138,"hr_max":148},{"dist_km":1,"time_s":380,"hr_avg":142,"hr_max":152}]},null]}.'
  );
}
export const lapsPrompt = (ex: ExStep[], prev: unknown, i: number, t: number) => lapsPrompt0(ex) + batchNote(prev, i, t);

/* ---- Strava dentro del formulario ---- */
type SvLap = { d: number; t: number; h: number; x: number };
/** agrupa los parciales de Strava en las etapas del plan, en orden, mientras la suma se acerque al objetivo */
export function matchLaps(ex: ExStep[], laps: SvLap[]): Vuelta[] {
  const out: Vuelta[] = [];
  let i = 0,
    ok = true;
  ex.forEach((e) => {
    if (!ok || i >= laps.length) {
      out.push(null);
      ok = false;
      return;
    }
    const st = e.st,
      byD = st.dist! > 0,
      tg = byD ? st.dist! : st.dur!,
      val = (l: SvLap) => (byD ? l.d : l.t);
    const grp = [laps[i]];
    let tot = val(laps[i]);
    i++;
    while (i < laps.length && Math.abs(tot + val(laps[i]) - tg) < Math.abs(tot - tg)) {
      tot += val(laps[i]);
      grp.push(laps[i]);
      i++;
    }
    const q = tot / tg;
    if (q < 0.75 || q > 1.3) {
      ok = false;
      out.push(null);
      return;
    }
    const d = sum(grp.map((l) => l.d)),
      t = sum(grp.map((l) => l.t)),
      hw = grp.filter((l) => l.h > 0),
      hx = Math.max(...grp.map((l) => l.x || 0));
    out.push({
      dist_km: d,
      time_s: t,
      hr_avg: hw.length ? sum(hw.map((l) => l.h * l.t)) / sum(hw.map((l) => l.t)) : null,
      hr_max: hx > 0 ? hx : null,
      parciales: grp.length > 1 ? grp.map((l) => ({ dist_km: l.d, time_s: l.t, hr_avg: l.h || null, hr_max: l.x || null })) : [],
    });
  });
  return out;
}
/** completa el formulario con la corrida de Strava elegida */
export function svFill(f0: ResF, a: SvItem, p: Partial<PerformancePayload>): ResF {
  const tS = todayS();
  let f: ResF = { ...f0, date: a.date <= tS ? a.date : tS, stravaId: a.id };
  const hrA = p.average_heartrate! > 0 ? Math.round(p.average_heartrate!) : null,
    hrM = p.max_heartrate! > 0 ? Math.round(p.max_heartrate!) : null;
  let msg: string;
  if (f.mode === 'flat') {
    f = autoPace({ ...f, paceManual: false, flat: { ...f.flat, dist: fmt(a.km, 2), t: hmsFromSec(a.tsec), pace: { m: '', s: '' } } });
    f = { ...f, flat: { ...f.flat, hr: hrA ? String(hrA) : '', hrmax: hrM ? String(hrM) : '' } };
    msg = 'Listo: ' + fmt(a.km, 2) + ' km en ' + fmtDur(a.tsec) + (hrA ? ' · FC ' + hrA + (hrM ? '/' + hrM : '') : '') + '. Revisá los números y marcá cómo te sentiste.';
  } else {
    const laps = (p.laps || [])
      .map((l) => ({ d: (l.distance || 0) / 1000, t: l.moving_time || l.elapsed_time || 0, h: l.avg_hr! > 0 ? l.avg_hr! : 0, x: l.max_hr! > 0 ? l.max_hr! : 0 }))
      .filter((l) => l.d > 0 && l.t > 0);
    const ex = exOf(f);
    let filled = 0;
    if (laps.length) {
      const r = fillVueltas(f, matchLaps(ex, laps));
      f = r.f;
      filled = r.filled;
    }
    msg = !laps.length
      ? 'Strava no trae parciales de esta corrida. Cargá las etapas a mano o con capturas.'
      : filled === 0
        ? 'No pude alinear los parciales de Strava con las etapas del plan. Cargalas a mano o con capturas.'
        : filled === ex.length
          ? 'Listo: completé las ' + filled + ' etapas. Revisá los números y marcá cómo te sentiste.'
          : 'Completé ' + filled + ' de ' + ex.length + ' etapas; las demás no coincidieron con los parciales. Revisá las que quedaron vacías.';
  }
  return { ...f, sv: { ...f.sv, msg } };
}

/* ---- en el momento (sin plan por etapas) ---- */
export type FlatKey = 'dist' | 't' | 'pace' | 'hr' | 'hrmax';
/** en el orden del formulario: el primero con error es el que se avisa (y se enfoca) al guardar */
export const FLAT_KEYS: FlatKey[] = ['dist', 't', 'pace', 'hr', 'hrmax'];
/** lee los campos y dice qué tiene cada uno de mal; el ritmo vacío es distancia sobre tiempo */
export function flatRead(f: ResF) {
  const err: Partial<Record<FlatKey, string>> = {},
    dist = num(f.flat.dist),
    t = readHms(f.flat.t),
    hrA = num(f.flat.hr),
    hrM = num(f.flat.hrmax);
  const okD = dist != null && !isNaN(dist) && dist > 0 && dist <= 100,
    okT = t != null && !isNaN(t) && t > 0 && t <= 86400;
  if (!okD) err.dist = 'Poné la distancia en km, por ejemplo 10,2.';
  if (!okT) err.t = 'Poné el tiempo total (horas, minutos y segundos).';
  let pace = readMs(f.flat.pace);
  if (pace == null) pace = okD && okT ? t! / dist! : null;
  else if (isNaN(pace) || pace < 120 || pace > 1200) err.pace = 'Revisá el ritmo: tiene que estar entre 2:00 y 20:00 por km.';
  else if (okD && okT && (f.type === 'fondo' || f.type === 'regen' || f.type === 'test') && Math.abs(pace - t! / dist!) / (t! / dist!) > 0.2)
    err.pace = 'El ritmo no coincide con la distancia y el tiempo. Revisá los números.';
  if (hrA != null && (isNaN(hrA) || hrA < 40 || hrA > 230)) err.hr = 'Revisá la FC promedio.';
  if (hrM != null && (isNaN(hrM) || hrM < 40 || hrM > 230)) err.hrmax = 'Revisá la FC máxima.';
  else if (hrA != null && hrM != null && !err.hr && hrM < hrA) err.hrmax = 'La FC máxima no puede ser menor que la promedio.';
  return { err, dist, t, pace, hrA, hrM };
}
/** contra el plan, con lo que llevás cargado (la misma cuenta que el puntaje): null si todavía no hay con qué */
export function flatPlanCheck(f: ResF): { ok: boolean; txt: string } | null {
  const s = f.mode === 'flat' && f.sid ? S.sessions.find((x) => x.id === f.sid) : null;
  if (!s || !s.plan) return null;
  const v = flatRead(f);
  if (FLAT_KEYS.some((k) => v.err[k])) return null;
  const r: Result = { date: f.date, distKm: v.dist!, timeSec: Math.round(v.t!), paceSec: Math.round(v.pace!), easy: easyActive(f.date) };
  if (v.hrA != null) r.hrAvg = Math.round(v.hrA);
  const sc = scoreFlat({ ...s, result: r });
  if (!sc || sc.score == null) return null;
  const off = sc.parts.filter((p) => p.sc < 90);
  return off.length ? { ok: false, txt: off.map((p) => p.text).join(' ') } : { ok: true, txt: sc.parts.map((p) => p.text).join(' ') };
}

/* ---- guardar ---- */
/** valida y arma la sesión con el resultado (saveResult) */
export function buildResult(f: ResF): { err: string } | { s: Session } {
  const date = f.date;
  if (!date) return { err: 'Elegí la fecha.' };
  if (date > todayS()) return { err: 'La fecha no puede ser futura.' };
  let r: Result;
  if (f.mode === 'stages') {
    const res: Record<string, Stage> = {};
    for (const rw of resRows(f.plan, f.gm)) {
      const e = rowEval(rw, f.vals[rw.key] || {});
      if ('err' in e) return { err: '«' + rowLabel(rw) + '»: ' + e.err };
      res[rw.key] = e.a;
    }
    const ex = exOf(f);
    const stages = ex.map((e) => {
      const a: Stage = { ...res[rowKey(e, f.gm)] };
      if (e.j >= 0 && f.gm[e.gi] === 'avg' && !a.skipped) a.avg = true;
      return a;
    });
    if (!ex.some((e, i) => e.k === 'run' && !stages[i].skipped)) return { err: 'Marcá al menos una etapa de carrera como hecha.' };
    r = { date, stages, ...stageTotals(stages, ex) };
  } else {
    const v = flatRead(f),
      bad = FLAT_KEYS.find((k) => v.err[k]);
    if (bad) return { err: v.err[bad]! };
    r = { date, distKm: v.dist!, timeSec: Math.round(v.t!), paceSec: Math.round(v.pace!) };
    if (f.paceManual) r.paceManual = true;
    if (v.hrA != null) r.hrAvg = Math.round(v.hrA);
    if (v.hrM != null) r.hrMax = Math.round(v.hrM);
  }
  if (!f.feel) return { err: 'Elegí cómo te sentiste, de 1 a 10.' };
  r.feel = f.feel;
  r.pain = !!f.pain;
  r.easy = easyActive(date);
  if (f.stravaId) r.sid = f.stravaId;
  else if (f.editing && f.editRes && f.editRes.sid) r.sid = f.editRes.sid;
  if (f.stravaId) {
    if (f.dec) r.dec = f.dec;
  } else if (f.editing && f.editRes && f.editRes.dec) r.dec = f.editRes.dec;
  if (f.weather) r.weather = f.weather;
  if (f.shoe) r.shoe = f.shoe;
  const notes = f.notes.trim();
  if (notes) r.notes = notes.slice(0, 500);
  const cur = f.sid ? S.sessions.find((x) => x.id === f.sid) : null;
  const s: Session = cur ? { ...cur } : { id: newId(), created: Date.now(), updated: 0, plan: null, result: null, missed: false, type: f.type };
  if (!s.plan) s.type = f.type;
  s.result = r;
  s.missed = false;
  return { s };
}
/** placeholder del campo de minutos de una fila según el plan */
export const phMin = (st: Step) => (st.dur! > 0 ? String(Math.floor(st.dur! / 60)) : '');
export const phSec = (st: Step) => (st.dur! > 0 ? pad(st.dur! % 60) : '');
