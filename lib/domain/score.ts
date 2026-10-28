/* Puntaje de 0 a 100 de cada sesión contra su plan. */
import type { Result, Session, Stage, Step, StepKind } from './types';
import { TYPES } from './config';
import { expand, stepTgt, type ExStep } from './stages';
import { cap, clamp, fmt, fmtDur, fmtPace, sum } from './util';

export interface ScorePart {
  k: string;
  label: string;
  w: number;
  sc: number;
  text: string;
  max?: number;
  pts?: number;
}
export interface Score {
  score: number | null;
  parts: ScorePart[];
  notes: string[];
  summary?: string;
  /** cómo se arma el puntaje (va plegado debajo del desglose) */
  how?: string;
}
export type Band = { k: 'good' | 'warn' | 'serious' | 'crit'; t: string };

export function volScore(r: number, type: string, easy: boolean) {
  if (r >= 0.95 && r <= 1.05) return 100;
  if (r < 0.95) return clamp(100 - (0.95 - r) * (easy ? 125 : 250), 0, 100);
  return clamp(100 - (r - 1.05) * (type === 'regen' ? 200 : 150), 0, 100);
}
export function bandOf(sc: number): Band {
  if (sc >= 90) return { k: 'good', t: 'Excelente' };
  if (sc >= 75) return { k: 'good', t: 'Muy bien' };
  if (sc >= 60) return { k: 'warn', t: 'Bien, con detalles' };
  if (sc >= 40) return { k: 'serious', t: 'A mejorar' };
  return { k: 'crit', t: 'Lejos del objetivo' };
}

/* cómo terminaste: caída de ritmo del primer al último tercio (repeticiones o parciales) y deriva cardíaca en fondos */
export function fadeOf(P: number[]) {
  if (P.length < 3) return null;
  const k = Math.max(1, Math.floor(P.length / 3));
  return (sum(P.slice(-k)) / k / (sum(P.slice(0, k)) / k) - 1) * 100;
}
export const fadePen = (f: number | null) => (f != null && f > 2 ? Math.min(15, Math.round((f - 2) * 5)) : 0);
export const driftPen = (r: Result) => {
  const d = r.dec;
  return d && d.p != null && d.ok && d.p > 5 ? Math.min(10, Math.round((d.p - 5) * 2)) : 0;
};
export const driftTxt = (r: Result, n: number) => 'Deriva cardíaca de ' + fmt(r.dec!.p, 1) + '%: la FC fue subiendo en la segunda mitad (−' + n + ').';

function weigh(parts: ScorePart[]) {
  const tw = sum(parts.map((x) => x.w));
  let acc = 0;
  parts.forEach((x, i) => {
    x.max = i < parts.length - 1 ? Math.round((x.w * 100) / tw) : 100 - acc;
    acc += x.max;
    x.pts = Math.round((x.max * x.sc) / 100);
  });
  const score = sum(parts.map((x) => x.pts!));
  const worst = parts.slice().sort((a, b) => b.max! - b.pts! - (a.max! - a.pts!))[0];
  return { score, worst };
}
function feelNotes(r: Result, easy: boolean, notes: string[]) {
  if (r.pain) notes.push('Anotaste una molestia o dolor. El puntaje mide otra cosa, pero prestale atención los próximos días.');
  if (r.feel! <= 3) notes.push('Te sentiste muy mal (' + r.feel + '/10). Si se repite, probá bajar la carga o descansar un día más.');
  if (easy) notes.push('Esta sesión fue en modo «No me siento al 100%»: no penalicé ir más lento ni quedarte corto a la mitad.');
}

export function scoreFlat(s: Session): Score | null {
  const r = s.result;
  if (!r) return null;
  const p = s.plan;
  if (!p) return { score: null, parts: [], notes: ['Sesión libre: no cargaste un objetivo antes, así que no hay contra qué compararla.'] };
  const T = TYPES[s.type] || TYPES.fondo,
    easy = !!r.easy,
    parts: ScorePart[] = [],
    notes: string[] = [];
  const volLine = (q: number) => {
    let t = '';
    if (q >= 0.95 && q <= 1.05) t += 'Dentro del margen de ±5%.';
    else if (q < 0.95) t += 'Te faltó un ' + Math.round((1 - q) * 100) + '%.' + (easy ? ' En modo suave pesó la mitad.' : '');
    else t += 'Te pasaste un ' + Math.round((q - 1) * 100) + '%.' + (s.type === 'regen' ? ' En un regenerativo conviene no pasarse.' : '');
    return t;
  };
  if (p.distKm! > 0 && r.distKm > 0) {
    const q = r.distKm / p.distKm!;
    const t = 'Hiciste ' + fmt(r.distKm, 2) + ' km de ' + fmt(p.distKm, 2) + ' km planificados (' + Math.round(q * 100) + '%). ' + volLine(q);
    parts.push({ k: 'vol', label: 'Distancia', w: T.wVol, sc: volScore(q, s.type, easy), text: t });
  } else if (!(p.distKm! > 0) && p.durMin! > 0 && r.timeSec > 0) {
    const q = r.timeSec / 60 / p.durMin!;
    const t = 'Corriste ' + fmtDur(r.timeSec) + ' de ' + fmt(p.durMin, 0) + ' min planificados (' + Math.round(q * 100) + '%). ' + volLine(q);
    parts.push({ k: 'vol', label: 'Duración', w: T.wVol, sc: volScore(q, s.type, easy), text: t });
  }
  if (p.paceSec! > 0) {
    if (r.paceSec > 0) {
      const d = r.paceSec - p.paceSec!,
        a = Math.round(Math.abs(d));
      let sc: number, t: string;
      if (a <= 5) {
        sc = 100;
        t = 'Ritmo ' + fmtPace(r.paceSec) + '/km, casi igual al objetivo de ' + fmtPace(p.paceSec!) + '/km (margen de ±5 segundos).';
      } else if (easy && d > 0) {
        sc = 100;
        t = 'Ritmo ' + fmtPace(r.paceSec) + '/km contra ' + fmtPace(p.paceSec!) + '/km planificado: ' + a + ' s/km más lento, pero en modo suave eso no resta.';
      } else {
        sc = clamp(100 - (a - 5) * 4, 0, 100);
        t = 'Ritmo ' + fmtPace(r.paceSec) + '/km contra ' + fmtPace(p.paceSec!) + '/km planificado: ' + a + ' s/km ' + (d > 0 ? 'más lento' : 'más rápido') + '.';
      }
      parts.push({ k: 'pace', label: 'Ritmo', w: T.wInt, sc, text: t });
    } else notes.push('Tenías un ritmo objetivo pero no cargaste el ritmo, así que no lo pude evaluar.');
  }
  if (p.hrMin! > 0 && p.hrMax! > 0) {
    if (r.hrAvg! > 0) {
      const hrAvg = r.hrAvg!,
        below = p.hrMin! - hrAvg,
        above = hrAvg - p.hrMax!,
        out = Math.max(below, above, 0);
      let sc: number, t: string;
      if (out === 0) {
        sc = 100;
        t = 'FC promedio ' + hrAvg + ' lpm, dentro del rango planificado (' + p.hrMin + '–' + p.hrMax + ' lpm).';
      } else if (easy && below > 0) {
        sc = 100;
        t = 'FC promedio ' + hrAvg + ' lpm, ' + below + ' lpm por debajo del rango ' + p.hrMin + '–' + p.hrMax + ', pero en modo suave eso no resta.';
      } else {
        sc = clamp(100 - out * 5, 0, 100);
        t = 'FC promedio ' + hrAvg + ' lpm: ' + out + ' lpm ' + (above > 0 ? 'por encima' : 'por debajo') + ' del rango ' + p.hrMin + '–' + p.hrMax + ' lpm.';
      }
      const dp = (s.type === 'fondo' || s.type === 'regen') && !easy ? driftPen(r) : 0;
      if (dp) {
        sc = Math.max(0, sc - dp);
        t += ' ' + driftTxt(r, dp);
      }
      parts.push({ k: 'hr', label: 'Frecuencia cardíaca', w: T.wInt, sc, text: t });
      if ((s.type === 'fondo' || s.type === 'regen') && r.hrMax! > p.hrMax! + 20)
        notes.push('Tu pico de FC llegó a ' + r.hrMax + ' lpm, bastante arriba del rango. Puede haber sido una cuesta o un tramo más rápido de lo planeado.');
    } else notes.push('Tenías un rango de FC objetivo pero no cargaste la FC promedio, así que no la pude evaluar.');
  }
  if (!parts.length) return { score: null, parts: [], notes: notes.concat(['El objetivo no tiene datos que se puedan medir (distancia o duración, ritmo o FC).']) };
  const ip = parts.filter((x) => x.k !== 'vol');
  if (ip.length === 2)
    ip.forEach((x) => {
      x.w = T.wInt / 2;
    });
  const { score, worst } = weigh(parts);
  const summary = score >= 90 ? 'Hiciste lo que planificaste.' : 'Lo que más puntos te sacó: ' + worst.label.toLowerCase() + ' (−' + (worst.max! - worst.pts!) + ').';
  feelNotes(r, easy, notes);
  return { score, parts, notes, summary };
}

/* ---- puntaje por etapas ---- */
export interface Judge {
  skipped?: boolean;
  pace?: number;
  /** desvío de ritmo fuera del rango (s/km, + = más lento) */
  pd?: number;
  hr?: number;
  /** desvío de FC fuera del rango (lpm, + = arriba) */
  hd?: number;
  /** cumplimiento de volumen (hecho / planificado) */
  q?: number | null;
  laps?: Judge[];
}
export function judge(st: Step, a: Stage | undefined, kind: StepKind): Judge {
  if (!a || a.skipped) return { skipped: true };
  const j: Judge = {},
    pace = a.paceSec! > 0 ? a.paceSec! : a.distKm! > 0 ? a.timeSec! / a.distKm! : null;
  if (pace) j.pace = pace;
  if (st.pf! > 0 && pace && kind !== 'rec') j.pd = pace < st.pf! ? pace - st.pf! : pace > st.ps! ? pace - st.ps! : 0;
  if (st.hl! > 0 && a.hrAvg! > 0 && kind !== 'rec') {
    j.hr = a.hrAvg;
    j.hd = a.hrAvg! < st.hl! ? a.hrAvg! - st.hl! : a.hrAvg! > st.hh! ? a.hrAvg! - st.hh! : 0;
  }
  j.q = st.dist! > 0 && a.distKm! > 0 ? a.distKm! / st.dist! : st.dur! > 0 && a.timeSec! > 0 ? a.timeSec! / st.dur! : null;
  if (a.laps && a.laps.length && !(a.laps[0] as Stage).laps) j.laps = a.laps.filter((l) => l.distKm! >= 0.15).map((l) => judge(st, l, kind));
  return j;
}
export function testScore(j: Judge, easy: boolean) {
  const ts: number[] = [];
  if (j.pd != null) ts.push(easy && j.pd > 0 ? 100 : clamp(100 - Math.abs(j.pd) * 4, 0, 100));
  if (j.hd != null) ts.push(easy && j.hd < 0 ? 100 : clamp(100 - Math.abs(j.hd) * 5, 0, 100));
  return ts.length ? sum(ts) / ts.length : null;
}
export function lineScore(kind: StepKind, j: Judge, easy: boolean) {
  if (j.skipped) return 0;
  const ts = testScore(j, easy);
  let t = ts == null ? 100 : ts;
  if (j.laps && j.laps.length) {
    const l = j.laps.map((x) => testScore(x, easy)).filter((x): x is number => x != null);
    if (l.length) {
      const lt = sum(l) / l.length;
      t = ts == null ? lt : (t + lt) / 2;
    }
  }
  let v = 100;
  if (j.q != null && kind !== 'rec') v = kind === 'run' ? volScore(j.q, 'x', easy) : j.q >= 0.95 ? 100 : clamp(100 - (0.95 - j.q) * 100, 0, 100);
  return (t * v) / 100;
}
export function judgeTxt(j: Judge) {
  const a: string[] = [];
  if (j.pd != null)
    a.push(
      'ritmo ' +
        fmtPace(j.pace!) +
        '/km' +
        (j.pd === 0 ? ' (dentro del rango)' : ' (' + Math.abs(Math.round(j.pd)) + ' s ' + (j.pd > 0 ? 'más lento' : 'más rápido') + ' que el rango)'),
    );
  if (j.hd != null) a.push('FC ' + j.hr + ' lpm' + (j.hd === 0 ? ' (dentro del rango)' : ' (' + Math.abs(j.hd) + ' lpm ' + (j.hd > 0 ? 'por encima' : 'por debajo') + ' del rango)'));
  return a.join(', ');
}
interface Line {
  e: ExStep;
  a: Stage;
  j: Judge;
  sc: number;
}
export function partLabel(k: StepKind, ls: Line[]) {
  if (k === 'warm') return 'Calentamiento';
  if (k === 'rec') return 'Recuperaciones';
  if (k === 'cool') return 'Enfriamiento';
  return ls.length > 1 ? 'Parte principal (' + ls.length + ' tramos)' : 'Parte principal';
}
export function volTxt(q: number | null | undefined, k: StepKind, easy: boolean) {
  if (q == null) return '';
  if (q < 0.95) return ' Te faltó un ' + Math.round((1 - q) * 100) + '%.' + (easy && k === 'run' ? ' En modo suave pesó la mitad.' : '');
  if (q > 1.05 && k === 'run') return ' Te pasaste un ' + Math.round((q - 1) * 100) + '%.';
  return '';
}
export function lapTxt(ls: Line[]) {
  const all: { lj: Judge; i: number; e: ExStep }[] = [];
  ls.forEach((x) => {
    (x.j.laps || []).forEach((lj, i) => all.push({ lj, i, e: x.e }));
  });
  const wp = all.filter((a) => a.lj.pd != null),
    wh = all.filter((a) => a.lj.hd != null);
  if (!wp.length && !wh.length) return '';
  const parts: string[] = [];
  if (wp.length) {
    const inR = wp.filter((a) => a.lj.pd === 0).length;
    let s = inR + ' de ' + wp.length + ' dentro del rango de ritmo';
    if (inR < wp.length) {
      const w = wp.slice().sort((a, b) => Math.abs(b.lj.pd!) - Math.abs(a.lj.pd!))[0];
      s +=
        ' (el más desviado: parcial ' +
        (w.i + 1) +
        (ls.length > 1 && w.e.r >= 0 ? ' de la repetición ' + (w.e.r + 1) : '') +
        ', ' +
        fmtPace(w.lj.pace!) +
        '/km, ' +
        Math.abs(Math.round(w.lj.pd!)) +
        ' s ' +
        (w.lj.pd! > 0 ? 'más lento' : 'más rápido') +
        ')';
    }
    parts.push(s);
  }
  if (wh.length) {
    const inH = wh.filter((a) => a.lj.hd === 0).length;
    parts.push(inH + ' de ' + wh.length + ' dentro del rango de FC');
  }
  return ' Parciales: ' + parts.join('; ') + '.';
}
export function partText(k: StepKind, ls: Line[], easy: boolean) {
  const n = ls.length,
    done = ls.filter((x) => !x.j.skipped);
  if (!done.length) return k === 'rec' ? 'No hiciste las recuperaciones.' : 'No hiciste esta etapa.';
  if (k === 'rec') return 'Hiciste ' + done.length + ' de ' + n + ' recuperaciones. Cuentan como completas, sin objetivo de ritmo.';
  const st0 = done[0].e.st,
    rng = stepTgt({ pf: st0.pf, ps: st0.ps });
  const single = n === 1 || done.every((x) => x.a.avg);
  const skip = n - done.length;
  let t = '';
  if (single) {
    const x = done[0],
      jt = judgeTxt(x.j);
    t =
      (n > 1 ? 'Promedio de tus ' + n + ' repeticiones: ' : '') +
      fmt(x.a.distKm, 2) +
      ' km en ' +
      fmtDur(x.a.timeSec!) +
      (x.a.paceSec ? ' (' + fmtPace(x.a.paceSec) + '/km)' : '') +
      '.';
    if (jt) t += ' ' + cap(jt) + '.';
    else if (!(st0.pf! > 0 || st0.hl! > 0)) t += ' Sin objetivo de ritmo ni FC: cuenta como completo.';
    if (st0.hl! > 0 && !(x.a.hrAvg! > 0)) t += ' No cargaste la FC, así que no la pude evaluar.';
    t += volTxt(x.j.q, k, easy) + lapTxt(done);
    return t;
  }
  const wp = done.filter((x) => x.j.pd != null);
  if (wp.length) {
    const inR = wp.filter((x) => x.j.pd === 0).length,
      avg = sum(wp.map((x) => x.j.pace!)) / wp.length;
    t += inR + ' de ' + wp.length + ' tramos dentro del rango de ritmo (' + rng + '). Ritmo promedio ' + fmtPace(avg) + '/km.';
    if (inR < wp.length) {
      const w = wp.slice().sort((a, b) => Math.abs(b.j.pd!) - Math.abs(a.j.pd!))[0];
      t +=
        ' El más desviado fue el n.º ' +
        (w.e.r >= 0 ? w.e.r + 1 : wp.indexOf(w) + 1) +
        ' (' +
        fmtPace(w.j.pace!) +
        '/km, ' +
        Math.abs(Math.round(w.j.pd!)) +
        ' s ' +
        (w.j.pd! > 0 ? 'más lento' : 'más rápido') +
        ' que el rango).';
    }
  }
  const wh = done.filter((x) => x.j.hd != null);
  if (wh.length) {
    const inH = wh.filter((x) => x.j.hd === 0).length;
    t += ' FC dentro del rango (' + st0.hl + '–' + st0.hh + ') en ' + inH + ' de ' + wh.length + ' tramos.';
  }
  if (!wp.length && !wh.length) t += 'Sin objetivo de ritmo ni FC: cuentan como completos.';
  const qs = done.filter((x) => x.j.q != null).map((x) => x.j.q!);
  if (qs.length) t += volTxt(sum(qs) / qs.length, k, easy).replace('Te faltó', 'En promedio te faltó').replace('Te pasaste', 'En promedio te pasaste');
  t += lapTxt(done);
  if (skip) t += ' Salteaste ' + skip + ' de ' + n + '.';
  return t.trim();
}

export function scoreStaged(s: Session): Score {
  const p = s.plan!,
    r = s.result!,
    easy = !!r.easy,
    ex = expand(p.steps),
    notes: string[] = [];
  const L: Line[] = ex.map((e) => {
    const a = (r.stages && r.stages[e.idx]) || { skipped: true };
    const j = judge(e.st, a, e.k);
    return { e, a, j, sc: lineScore(e.k, j, easy) };
  });
  const W: Record<StepKind, number> = { warm: 10, run: 70, rec: 10, cool: 10 },
    parts: ScorePart[] = [];
  (['warm', 'run', 'rec', 'cool'] as StepKind[]).forEach((k) => {
    const ls = L.filter((x) => x.e.k === k);
    if (!ls.length) return;
    parts.push({ k, label: partLabel(k, ls), w: W[k], sc: sum(ls.map((x) => x.sc)) / ls.length, text: partText(k, ls, easy) });
  });
  if (!parts.length) return { score: null, parts: [], notes: ['El plan no tiene etapas medibles.'] };
  const rp = parts.find((x) => x.k === 'run');
  if (rp && !easy) {
    if (s.type === 'series' || s.type === 'tempo' || s.type === 'test') {
      const runs = L.filter((x) => x.e.k === 'run' && !x.j.skipped && x.j.pace! > 0);
      let P = runs.map((x) => x.j.pace!),
        what = 'las repeticiones';
      if (P.length < 3 && runs.length === 1) {
        P = (runs[0].a.laps || []).filter((l) => l.distKm! >= 0.5).map((l) => l.timeSec! / l.distKm!);
        what = 'los parciales';
      }
      const f = fadeOf(P),
        n = fadePen(f);
      if (n) {
        rp.sc = Math.max(0, rp.sc - n);
        rp.text += ' Hacia el final te caíste un ' + fmt(f, 1) + '% de ritmo entre ' + what + ' (−' + n + ').';
      }
    } else {
      const n = driftPen(r);
      if (n) {
        rp.sc = Math.max(0, rp.sc - n);
        rp.text += ' ' + driftTxt(r, n);
      }
    }
  }
  const { score, worst } = weigh(parts);
  const loss = worst.max! - worst.pts!,
    summary = loss < 3 ? 'Hiciste lo que planificaste.' : 'Lo que más puntos te sacó: ' + worst.label.toLowerCase() + ' (−' + loss + ').';
  feelNotes(r, easy, notes);
  const how =
    'La parte principal pesa 70 puntos; calentamiento, recuperaciones y enfriamiento suman el resto y se evalúan con más suavidad. Si cargaste parciales por km, cuentan tanto como el promedio de la etapa. Caerte de ritmo hacia el final de las series o una deriva cardíaca alta en un fondo también restan.';
  return { score, parts, notes, summary, how };
}

/* el puntaje se recalcula muchas veces por render: lo guardo por objeto de sesión (las sesiones son inmutables) */
const SC_CACHE = new WeakMap<Session, Score | null>();
export function scoreSession(s: Session): Score | null {
  if (SC_CACHE.has(s)) return SC_CACHE.get(s)!;
  const v = s.result && s.result.stages && s.plan && s.plan.steps ? scoreStaged(s) : scoreFlat(s);
  SC_CACHE.set(s, v);
  return v;
}
export const keyPace = (s: Session) => s.result!.mainPaceSec || s.result!.paceSec;
export function riegel(t1: number, d1: number, d2: number) {
  return t1 * Math.pow(d2 / d1, 1.06);
}
