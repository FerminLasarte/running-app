/* Formulario «Planificar sesión»: plantillas, edición del árbol de etapas y armado del plan a guardar.
   Todo es puro: cada acción recibe el estado del formulario y devuelve uno nuevo (la hoja lo guarda con useState). */
import { S } from '@/lib/store';
import { aiJson, type AiLimits } from '@/lib/ai/client';
import type { Plan, PlanStep, Session, SessionType, Step, StepKind } from './types';
import { isType, racePaceSec, refRace, TYPES, ZN, zoneRange } from './config';
import { cleanSteps, expand, legacySteps, planTotals, REC_PACE } from './stages';
import { paceAtV, vdotOf } from './daniels';
import { clamp, fmt, newId, num, sum, todayS } from './util';

/* ---- Claude (lectura de fotos y texto), compartido con el formulario de resultado ---- */
export function batchNote(prev: unknown, i: number, t: number) {
  if (t < 2) return '';
  return (
    '\n\nLas capturas se mandan en ' +
    t +
    ' lotes (hay un máximo de imágenes por vez). Este es el lote ' +
    (i + 1) +
    ' de ' +
    t +
    '.' +
    (prev
      ? ' Ya leíste los lotes anteriores y obtuviste este JSON:\n' +
        JSON.stringify(prev) +
        '\nDevolvé el JSON COMPLETO y actualizado, con el mismo formato: conservá lo ya leído, completá lo que falte con estas capturas nuevas (por ejemplo la FC o los parciales de una etapa) y no dupliques filas que aparezcan repetidas en capturas superpuestas.'
      : ' Leé solo estas; después llegan las demás.')
  );
}
/** manda las capturas en tandas (hay un máximo de imágenes por pedido); cada tanda recibe lo leído antes */
export async function sampleRun<T>(lim: AiLimits, files: File[] | null, mk: (prev: T | null, i: number, t: number) => string, prog: (i: number, t: number) => void): Promise<T | null> {
  if (!files || !files.length) return aiJson<T>(mk(null, 0, 1));
  const n = Math.max(1, lim.maxCount || 1),
    chunks: File[][] = [];
  for (let i = 0; i < files.length; i += n) chunks.push(files.slice(i, i + n));
  let prev: T | null = null;
  for (let i = 0; i < chunks.length; i++) {
    prog(i + 1, chunks.length);
    prev = await aiJson<T>(mk(prev, i, chunks.length), { images: chunks[i] });
  }
  return prev;
}
export function aiErr(e: unknown) {
  const c = e && typeof e === 'object' && 'code' in e ? (e as { code: unknown }).code : null;
  if (c === 'not_granted') return 'No diste permiso para que la página use Claude. Podés armar el entrenamiento a mano.';
  if (c === 'rate_limited') return 'Se llegó al límite de uso por ahora. Probá más tarde o armalo a mano.';
  if (c === 'image_rejected') return 'No pude abrir esa imagen. Probá con una captura de pantalla en JPG o PNG.';
  if (c === 'invalid_json' || c === 'empty_completion' || c === 'refused') return 'No pude entender el contenido. Probá con una captura más nítida o armalo a mano.';
  if (c === 'cancelled') return '';
  return 'No pude leerlo ahora. Probá de nuevo o armalo a mano.';
}
export function planPrompt0(text: string | null) {
  const z = ZN.map((q, i) => {
    const r = zoneRange(i);
    return q[0] + ' = ' + r[0] + '–' + r[1] + ' lpm';
  }).join(', ');
  return (
    'Leé este entrenamiento de running estructurado (suele ser una captura de Garmin Connect u otra app, o texto; puede haber varias capturas que son partes del mismo entrenamiento, en ese caso unilas sin repetir pasos) y convertilo a JSON.\n\n' +
    'Reglas:\n' +
    '- Cada paso tiene "k": "warm" (Calentamiento), "run" (Carrera, Ritmo, Intervalo, Tempo, parte principal), "rec" (Recuperación, Descanso) o "cool" (Enfriamiento).\n' +
    '- Un grupo que se repite ("5 veces", "5x") es {"k":"rep","n":5,"steps":[...pasos...]}. No anides grupos dentro de grupos.\n' +
    '- Si el paso termina por distancia usá "dist" en km (1200 m = 1.2). Si termina por tiempo usá "dur" en segundos (2:00 = 120). Nunca los dos.\n' +
    '- Objetivo de ritmo: "pf" = ritmo más rápido y "ps" = más lento, en segundos por km (4:30 = 270). Si la captura muestra "4:35 /km (4:40-4:30 /km)", poné pf=270 y ps=280. Si hay un solo ritmo sin rango, usá ese ritmo ±5 segundos.\n' +
    '- Objetivo de frecuencia cardíaca: "hl" y "hh" en lpm. Si dice una zona, convertila con estos valores del corredor: ' +
    z +
    '.\n' +
    '- Si un paso no muestra objetivo, no pongas pf/ps/hl/hh.\n' +
    '- Ignorá el "Tiempo total" y cualquier total que muestre la app: solo importan los pasos.\n' +
    '- "nombre": título del entrenamiento si se ve. "notas": el texto de notas si se ve (puede ser vacío). "tipo": uno de fondo, series, tempo, regen, test según lo que sea (series = repeticiones con pausa; tempo = tramo sostenido; fondo = largo y suave; regen = muy suave; test = esfuerzo máximo para medir), o null si no se sabe.\n\n' +
    'Respondé SOLO con un JSON así (ejemplo de otro entrenamiento):\n' +
    '{"nombre":"S9 - Series 5x1200m","tipo":"series","notas":"5x1200m @4:30-4:40/km, recuperación 2min","pasos":[{"k":"warm","dist":2},{"k":"rep","n":5,"steps":[{"k":"run","dist":1.2,"pf":270,"ps":280},{"k":"rec","dur":120}]},{"k":"cool","dist":1.5}]}' +
    (text ? '\n\nTexto del entrenamiento:\n' + text.slice(0, 6000) : '\n\nEl entrenamiento está en la imagen adjunta.')
  );
}
export const planPrompt = (text: string | null, prev: unknown, i: number, t: number) => planPrompt0(text) + batchNote(prev, i, t);
/** lo que devuelve Claude al leer un entrenamiento */
export interface AiPlanJson {
  nombre?: unknown;
  tipo?: unknown;
  notas?: unknown;
  pasos?: unknown;
}

/* ---- estado del formulario ---- */
/** una etapa en edición: `_em` (termina por distancia o tiempo) y `_tm` (tipo de objetivo) recuerdan lo elegido */
export type EdStep = Step & { _em?: 'dist' | 'dur'; _tm?: 'none' | 'pace' | 'hr' };
export interface EdRep {
  k: 'rep';
  n: number;
  steps: EdStep[];
}
export type EdNode = EdStep | EdRep;
/** campos del editor de la etapa abierta, tal como se escriben */
export interface EdFields {
  dist: string;
  dm: string;
  ds: string;
  pam: string;
  pas: string;
  pbm: string;
  pbs: string;
  hl: string;
  hh: string;
  err: string;
}
export interface PlanF {
  sid: string | null;
  type: SessionType;
  steps: EdNode[];
  /** etapa abierta: '2' o '1.0' (bloque 1, etapa 0) */
  edit: string | null;
  /** si tocaste las etapas, cambiar el tipo ya no las reemplaza por la plantilla */
  touched: boolean;
  date: string;
  notes: string;
  aiText: string;
  ed: EdFields;
}
/** lo que se guarda como borrador (ver lib/data/draft.ts) */
export interface PlanDraft {
  k: 'plan';
  sid: string | null;
  type: SessionType;
  steps: EdNode[];
  edit: string | null;
  touched: boolean;
  date: string;
  notes: string;
  aiText: string;
}

const ED0: EdFields = { dist: '', dm: '', ds: '', pam: '', pas: '', pbm: '', pbs: '', hl: '', hh: '', err: '' };
const clone = (steps: EdNode[]): EdNode[] => JSON.parse(JSON.stringify(steps));

export function template(type: SessionType): PlanStep[] {
  const r10 = racePaceSec(refRace()),
    z1 = zoneRange(0),
    z2 = zoneRange(1);
  const hr = (z: [number, number]) => ({ hl: z[0], hh: z[1] }),
    pc = (p: number) => ({ pf: p - 5, ps: p + 5 });
  if (type === 'fondo') return [{ k: 'run', dist: 10, ...hr(z2) }];
  if (type === 'regen') return [{ k: 'run', dist: 5, ...hr(z1) }];
  if (type === 'tempo') return [{ k: 'warm', dist: 2 }, { k: 'run', dist: 5, ...pc(r10 + 10) }, { k: 'cool', dist: 1.5 }];
  if (type === 'series')
    return [
      { k: 'warm', dist: 2 },
      { k: 'rep', n: 5, steps: [{ k: 'run', dist: 1, ...pc(r10) }, { k: 'rec', dur: 120 }] },
      { k: 'cool', dist: 1.5 },
    ];
  return [{ k: 'warm', dist: 2 }, { k: 'run', dist: 5, ...pc(r10 - 10) }, { k: 'cool', dist: 1.5 }];
}

/* ---- árbol de etapas: la ruta es 'i' o 'i.j' ---- */
export function nodeAt(steps: EdNode[], path: string): EdNode | undefined {
  const p = path.split('.').map(Number),
    n = steps[p[0]];
  if (p.length > 1) return n && n.k === 'rep' ? n.steps[p[1]] : undefined;
  return n;
}
export function listOf(steps: EdNode[], path: string): EdNode[] {
  const p = path.split('.').map(Number);
  if (p.length > 1) {
    const g = steps[p[0]];
    return g && g.k === 'rep' ? g.steps : [];
  }
  return steps;
}
export const idxOf = (path: string) => +path.split('.').pop()!;
/** la etapa abierta en el editor (nunca un bloque) */
const editStep = (steps: EdNode[], path: string | null): EdStep | null => {
  if (path == null) return null;
  const n = nodeAt(steps, path);
  return n && n.k !== 'rep' ? n : null;
};
export const emOf = (st: EdStep) => st._em || (st.dur ? 'dur' : 'dist');
export const tmOf = (st: EdStep) => st._tm || (st.pf ? 'pace' : st.hl ? 'hr' : 'none');

/** valores del editor a partir de la etapa (fillEditor) */
export function fillEditor(steps: EdNode[], path: string | null): EdFields {
  const ed = { ...ED0 },
    st = editStep(steps, path);
  if (!st) return ed;
  const em = emOf(st),
    tm = tmOf(st);
  if (em === 'dist' && st.dist) ed.dist = fmt(st.dist, 3);
  if (em === 'dur' && st.dur) {
    ed.dm = String(Math.floor(st.dur / 60));
    ed.ds = String(st.dur % 60);
  }
  if (tm === 'pace' && st.pf) {
    ed.pam = String(Math.floor(st.pf / 60));
    ed.pas = String(st.pf % 60);
    ed.pbm = String(Math.floor(st.ps! / 60));
    ed.pbs = String(st.ps! % 60);
  }
  if (tm === 'hr' && st.hl) {
    ed.hl = String(st.hl);
    ed.hh = String(st.hh);
  }
  return ed;
}
/** el formulario se vuelve a dibujar: el editor abierto se rellena con lo que quedó en la etapa (paintPlan) */
export const paint = (f: PlanF): PlanF => ({ ...f, ed: fillEditor(f.steps, f.edit) });

function pm(m0: string, s0: string) {
  const m = num(m0),
    s = num(s0);
  if (m == null && s == null) return null;
  if ((m != null && isNaN(m)) || (s != null && isNaN(s)) || (s != null && (s < 0 || s >= 60))) return NaN;
  return (m || 0) * 60 + (s || 0);
}
/** Pasa lo escrito en el editor a la etapa. Con `strict`, si algo no se entiende deja el error a la vista y
    devuelve ok=false (lo que sí se entendió ya quedó guardado, como en el original). */
export function commitEdit(f: PlanF, strict: boolean): { f: PlanF; ok: boolean } {
  if (f.edit == null) return { f, ok: true };
  const steps = clone(f.steps),
    st = editStep(steps, f.edit);
  if (!st) return { f, ok: true };
  const ed = f.ed,
    em = emOf(st),
    tm = tmOf(st);
  let msg = '';
  if (em === 'dist') {
    const v = num(ed.dist);
    if (v != null && !isNaN(v) && v > 0 && v <= 100) {
      st.dist = v;
      delete st.dur;
    } else msg = 'Poné la distancia en km, por ejemplo 1,2.';
  } else {
    const m = num(ed.dm),
      s = num(ed.ds),
      t = (m || 0) * 60 + (s || 0);
    if ((m != null || s != null) && !isNaN(t) && t > 0 && t <= 36000 && (s == null || (s >= 0 && s < 60))) {
      st.dur = Math.round(t);
      delete st.dist;
    } else msg = 'Poné la duración en minutos y segundos, por ejemplo 2:00.';
  }
  if (st.k === 'rec' || tm === 'none') {
    delete st.pf;
    delete st.ps;
    delete st.hl;
    delete st.hh;
  } else if (tm === 'pace') {
    const a = pm(ed.pam, ed.pas),
      b = pm(ed.pbm, ed.pbs);
    if (a == null && b == null) msg = msg || 'Poné el ritmo objetivo, por ejemplo 4:30, o elegí «Sin objetivo».';
    else if ((a != null && isNaN(a)) || (b != null && isNaN(b))) msg = msg || 'Revisá el ritmo: segundos de 0 a 59.';
    else {
      let lo = a == null ? b! - 5 : a,
        hi = b == null ? a! + 5 : b;
      if (lo > hi) [lo, hi] = [hi, lo];
      if (a != null && b == null) {
        lo = a - 5;
        hi = a + 5;
      }
      if (b != null && a == null) {
        lo = b - 5;
        hi = b + 5;
      }
      if (lo < 120 || hi > 1200) msg = msg || 'Revisá el ritmo: tiene que estar entre 2:00 y 20:00 por km.';
      else {
        st.pf = Math.round(lo);
        st.ps = Math.round(hi);
        delete st.hl;
        delete st.hh;
      }
    }
  } else if (tm === 'hr') {
    const a = num(ed.hl),
      b = num(ed.hh);
    if (a == null || b == null || isNaN(a) || isNaN(b) || a < 40 || b > 230 || a >= b) msg = msg || 'Poné el rango de FC (mínimo menor que máximo), o tocá una zona.';
    else {
      st.hl = Math.round(a);
      st.hh = Math.round(b);
      delete st.pf;
      delete st.ps;
    }
  }
  const n: PlanF = { ...f, steps, touched: true };
  if (msg && strict) return { f: { ...n, ed: { ...ed, err: msg } }, ok: false };
  return { f: n, ok: true };
}

/* ---- acciones del formulario (las entradas `pf-*`, `ed-*` y `rep-*` de la tabla de eventos) ---- */
export function pfType(f: PlanF, v: SessionType): PlanF {
  const c = commitEdit(f, false).f;
  return paint({ ...c, type: v, steps: c.touched ? c.steps : template(v), edit: null });
}
export function edOpen(f: PlanF, p: string): PlanF {
  const r = commitEdit(f, true);
  if (!r.ok) return r.f;
  return paint({ ...r.f, edit: r.f.edit === p ? null : p });
}
export function edDone(f: PlanF): PlanF {
  const r = commitEdit(f, true);
  if (!r.ok) return r.f;
  return paint({ ...r.f, edit: null });
}
/** cambia algo de la etapa abierta (tipo de etapa, «termina por» u objetivo) */
function edSet(f: PlanF, fn: (st: EdStep) => void, touch: boolean): PlanF {
  const c = commitEdit(f, false).f,
    steps = clone(c.steps),
    st = editStep(steps, c.edit);
  if (st) fn(st);
  return paint({ ...c, steps, touched: touch || c.touched });
}
export const edKind = (f: PlanF, v: StepKind) => edSet(f, (st) => (st.k = v), true);
export const edEm = (f: PlanF, v: 'dist' | 'dur') => edSet(f, (st) => (st._em = v), false);
export const edTm = (f: PlanF, v: 'none' | 'pace' | 'hr') => edSet(f, (st) => (st._tm = v), false);
export function edZone(f: PlanF, i: number): PlanF {
  const r = zoneRange(i);
  return { ...f, ed: { ...f.ed, hl: String(r[0]), hh: String(r[1]) } };
}
export function edDel(f: PlanF): PlanF {
  const p = f.edit;
  if (p == null) return f;
  const steps = clone(f.steps),
    l = listOf(steps, p);
  l.splice(idxOf(p), 1);
  if (p.indexOf('.') >= 0 && !l.length) steps.splice(+p.split('.')[0], 1);
  return paint({ ...f, steps, edit: null, touched: true });
}
export function edMove(f: PlanF, p: string, d: -1 | 1): PlanF {
  const r = commitEdit(f, true);
  if (!r.ok) return r.f;
  const steps = clone(r.f.steps),
    l = listOf(steps, p),
    i = idxOf(p);
  let touched = r.f.touched;
  if (d < 0 ? i > 0 : i < l.length - 1) {
    [l[i], l[i + d]] = [l[i + d], l[i]];
    touched = true;
  }
  return paint({ ...r.f, steps, edit: null, touched });
}
/** to: '' = etapa suelta, 'rep' = bloque que se repite, 'i' = etapa dentro del bloque i */
export function edAdd(f: PlanF, to: string): PlanF {
  const r = commitEdit(f, true);
  if (!r.ok) return r.f;
  const steps = clone(r.f.steps),
    hasRun = expand(steps).some((e) => e.k === 'run');
  let edit: string | null;
  if (to === 'rep') {
    steps.push({ k: 'rep', n: 5, steps: [{ k: 'run', dist: 1 }, { k: 'rec', dur: 120 }] });
    edit = null;
  } else if (to === '') {
    steps.push(!steps.length ? { k: 'warm', dist: 2 } : hasRun ? { k: 'cool', dist: 1.5 } : { k: 'run', dist: 5 });
    edit = String(steps.length - 1);
  } else {
    const g = steps[+to];
    if (!g || g.k !== 'rep') return r.f;
    g.steps.push({ k: 'run', dist: 1 });
    edit = to + '.' + (g.steps.length - 1);
  }
  return paint({ ...r.f, steps, edit, touched: true });
}
export function repN(f: PlanF, i: number, d: number): PlanF {
  const r = commitEdit(f, true);
  if (!r.ok) return r.f;
  const steps = clone(r.f.steps),
    g = steps[i];
  if (g && g.k === 'rep') g.n = clamp(g.n + d, 1, 50);
  return paint({ ...r.f, steps, touched: true });
}
export function repDel(f: PlanF, i: number): PlanF {
  const r = commitEdit(f, true);
  if (!r.ok) return r.f;
  const steps = clone(r.f.steps);
  steps.splice(i, 1);
  return paint({ ...r.f, steps, edit: null, touched: true });
}
/** reemplaza todas las etapas (una plantilla, lo que leyó Claude) */
export const setSteps = (f: PlanF, steps: EdNode[]): PlanF => paint({ ...f, steps: clone(steps), edit: null, touched: true });
/** Claude leyó el entrenamiento: reemplaza las etapas y, si no escribiste notas, usa el nombre y las notas leídas */
export function applyAiPlan(f: PlanF, steps: EdNode[], j: AiPlanJson): PlanF {
  const nm = String(j.nombre || '').trim(),
    nt = String(j.notas || '').trim(),
    cur = f.notes.trim();
  return {
    ...setSteps(f, steps),
    type: isType(j.tipo) ? j.tipo : f.type,
    notes: !cur && (nm || nt) ? [nm, nt].filter(Boolean).join(' — ').slice(0, 500) : f.notes,
  };
}

/* ---- plantillas: tus sesiones anteriores del mismo tipo ---- */
/** las últimas `n` sesiones de ese tipo con etapas, sin repetir la misma estructura (la más nueva primero) */
export function planTemplates(type: SessionType, exceptId: string | null, n = 3): (Session & { plan: Plan })[] {
  const seen = new Set<string>(),
    out: (Session & { plan: Plan })[] = [];
  const list = S.sessions.filter((s): s is Session & { plan: Plan } => s.id !== exceptId && s.type === type && !!(s.plan && s.plan.steps && s.plan.steps.length));
  list.sort((a, b) => b.plan.date.localeCompare(a.plan.date));
  for (const s of list) {
    const k = JSON.stringify(s.plan.steps);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= n) break;
  }
  return out;
}

/* ---- cuánto dura, más o menos ---- */
/** segundos estimados: lo que va por tiempo, tal cual; lo que va por ritmo, al medio del rango; lo demás (por FC o
    sin objetivo), al ritmo fácil de tu carrera de referencia (o 6:30 /km si no tiene objetivo) */
export function planEstSec(steps: PlanStep[]) {
  const r = refRace(),
    easy = r.targetSec > 0 ? paceAtV(vdotOf(r.targetSec, r.km), 0.64) : 390;
  return sum(expand(steps).map((e) => (e.st.dur! > 0 ? e.st.dur! : (e.st.dist || 0) * (e.st.pf! > 0 ? (e.st.pf! + e.st.ps!) / 2 : e.k === 'rec' ? REC_PACE : easy))));
}

/* ---- abrir, borrador y guardar ---- */
export function planInit(o: { id?: string | null; date?: string; draft?: PlanDraft | null }): PlanF {
  const s = o.id ? S.sessions.find((x) => x.id === o.id) || null : null,
    p: Partial<Plan> = (s && s.plan) || {},
    type: SessionType = (s && s.type) || 'fondo';
  let steps: EdNode[] = [];
  if (s && p.steps) steps = cleanSteps(p.steps);
  else if (s && s.plan) steps = legacySteps(s.plan);
  else steps = template(type);
  let f: PlanF = {
    sid: s ? s.id : null,
    type,
    steps,
    edit: null,
    touched: !!s,
    date: p.date || o.date || todayS(),
    notes: p.notes || '',
    aiText: '',
    ed: { ...ED0 },
  };
  const d = o.draft;
  if (d) {
    if (Array.isArray(d.steps)) f = { ...f, steps: d.steps, type: TYPES[d.type] ? d.type : f.type, touched: !!d.touched };
    f.edit = d.edit != null && editStep(f.steps, d.edit) ? d.edit : null;
    f = { ...f, date: d.date, notes: d.notes || '', aiText: d.aiText || f.aiText };
  }
  return paint(f);
}
/** lo que va al borrador: con lo que esté bien escrito en la etapa abierta ya pasado a la etapa */
export function planDraftData(f: PlanF): PlanDraft {
  const c = commitEdit(f, false).f;
  return { k: 'plan', sid: c.sid, type: c.type, steps: c.steps, edit: c.edit, touched: c.touched, date: c.date, notes: c.notes, aiText: c.aiText };
}
/** valida y arma la sesión a guardar (savePlan). Devuelve también el formulario con la etapa abierta confirmada. */
export function buildPlan(f0: PlanF): { f: PlanF; err: string } | { f: PlanF; s: Session } {
  const r = commitEdit(f0, true),
    f = r.f;
  if (!r.ok) return { f, err: 'Terminá de editar la etapa abierta (tocá «Listo»).' };
  const date = f.date;
  if (!date) return { f, err: 'Elegí una fecha.' };
  const steps = cleanSteps(f.steps),
    nExp = expand(f.steps).length;
  if (!steps.length) return { f, err: 'Sumá al menos una etapa con distancia o tiempo.' };
  if (expand(steps).length !== nExp) return { f, err: 'Alguna etapa no tiene distancia o tiempo. Tocala y completala.' };
  if (!expand(steps).some((e) => e.k === 'run')) return { f, err: 'Falta una etapa de «Carrera» (la parte principal).' };
  const p: Plan = { date, type: f.type, steps };
  const tot = planTotals(steps);
  if (tot.dist > 0) p.distKm = Math.round(tot.dist * 100) / 100;
  const runs = expand(steps).filter((e) => e.k === 'run');
  const pr = runs.filter((e) => e.st.pf! > 0);
  if (pr.length) p.paceSec = Math.round(sum(pr.map((e) => (e.st.pf! + e.st.ps!) / 2)) / pr.length);
  const hr = runs.find((e) => e.st.hl! > 0);
  if (hr) {
    p.hrMin = hr.st.hl;
    p.hrMax = hr.st.hh;
  }
  const notes = f.notes.trim();
  if (notes) p.notes = notes.slice(0, 500);
  const cur = f.sid ? S.sessions.find((x) => x.id === f.sid) : null;
  const s: Session = cur ? { ...cur } : { id: newId(), created: Date.now(), updated: 0, result: null, missed: false, type: f.type, plan: null };
  s.type = f.type;
  s.plan = p;
  s.missed = false;
  return { f, s };
}
