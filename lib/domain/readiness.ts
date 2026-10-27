/* Preparación para la carrera: chequeos en verde, amarillo y rojo (líneas 2685–2736 del original). */
import { S } from '@/lib/store';
import type { Race } from './types';
import { isLong, longTarget, racePaceSec } from './config';
import { doneList, kmBetween, loadInfo, sdate, weekStats } from './stats';
import { addDays, dateLabel, dayDiff, fmt, fmtDur, fmtPace, mondayOf, pd, sod, sum, ymd } from './util';
import { decBand } from './dec';
import { raceEst } from './race';

export type ReadyKind = 'good' | 'warn' | 'crit' | 'na';
export interface ReadyItem {
  k: ReadyKind;
  /** título del chequeo */
  t: string;
  /** explicación */
  x: string;
}

/** puntos de cada chequeo para el puntaje de preparación (decidido: todos pesan igual y los grises no cuentan) */
export const READY_PTS: Record<Exclude<ReadyKind, 'na'>, number> = { good: 100, warn: 50, crit: 0 };
export const readyPts = (i: ReadyItem) => (i.k === 'na' ? null : READY_PTS[i.k]);
/** cuántos chequeos con datos hacen falta para dar un puntaje: con uno o dos, el promedio no dice nada */
export const READY_MIN = 3;
/** preparación de 0 a 100: el promedio de los chequeos que tienen datos; null con menos de READY_MIN */
export function readyScore(I: ReadyItem[]) {
  const v = I.map(readyPts).filter((p): p is number => p != null);
  return v.length >= READY_MIN ? Math.round(sum(v) / v.length) : null;
}

export function readyItems(race: Race): ReadyItem[] {
  const today = sod(new Date()),
    tS = ymd(today),
    gp = racePaceSec(race),
    I: ReadyItem[] = [];
  const since = (n: number) => ymd(addDays(today, -n)),
    d = doneList();
  const add = (k: ReadyKind, t: string, x: string) => I.push({ k, t, x });
  const days = dayDiff(today, pd(race.date)),
    far = days > 112,
    long = isLong(race);
  // 1) ritmo de series (en un maratón importa más el volumen semanal)
  if (long) {
    let wk = 0;
    for (let i = 1; i <= 4; i++) {
      const m = addDays(mondayOf(today), -7 * i);
      wk += kmBetween(m, addDays(m, 6));
    }
    wk /= 4;
    const tg = race.km > 30 ? 45 : 30;
    if (far) add('na', 'Volumen semanal', 'Promedio de las últimas 4 semanas: ' + fmt(wk, 0) + ' km. Para el bloque específico del ' + race.name + ' conviene llegar a unos ' + tg + ' km por semana; todavía hay tiempo para construirlo.');
    else add(wk >= tg ? 'good' : wk >= tg * 0.75 ? 'warn' : 'crit', 'Volumen semanal', 'Promedio de las últimas 4 semanas: ' + fmt(wk, 0) + ' km. Para un ' + race.name + ' conviene sostener unos ' + tg + ' km por semana en el bloque específico.');
  }
  const se = long ? [] : d.filter((q) => q.type === 'series' && q.result.mainPaceSec! > 0 && q.result.date >= since(42)).slice(-3);
  if (long) {
    /* en un maratón no se mira el ritmo de series */
  } else if (se.length) {
    const av = sum(se.map((q) => q.result.mainPaceSec!)) / se.length,
      df = Math.round(av - gp);
    add(
      df <= 3 ? 'good' : df <= 10 ? 'warn' : 'crit',
      'Ritmo de series',
      'Promedio de tus últimas ' + se.length + (se.length === 1 ? ' serie' : ' series') + ': ' + fmtPace(av) + '/km, ' + (df <= 0 ? Math.abs(df) + ' s/km más rápido que' : df + ' s/km más lento que') + ' el ritmo de carrera (' + fmtPace(gp) + '/km).',
    );
  } else add('na', 'Ritmo de series', 'Todavía no hay series de las últimas 6 semanas con ritmo cargado.');
  // 2) predicción (la misma que la tarjeta de Predicción)
  const pe = raceEst(race),
    pFrom = pe && (pe.src === 'test' ? 'Tu test del ' + dateLabel(pe.pr.s.result.date) : 'Tus entrenamientos');
  if (pe && race.targetSec > 0) {
    const lo = pe.src === 'test' ? pe.lo : undefined,
      gap = pe.t - race.targetSec,
      tol = race.targetSec * 0.033;
    add(
      gap <= 0 ? 'good' : gap <= tol ? 'warn' : 'crit',
      'Predicción',
      pFrom +
        ' proyecta' +
        (pe.src === 'test' ? '' : 'n') +
        ' ' +
        (lo ? 'entre ' + fmtDur(lo) + ' y ' + fmtDur(pe.t) : fmtDur(pe.t)) +
        (gap <= 0
          ? lo
            ? ': aun en el caso prudente llegás al objetivo.'
            : ', ' + fmtDur(-gap) + ' mejor que el objetivo.'
          : lo
            ? '; en el caso prudente te faltan ' + fmtDur(gap) + '.'
            : ', te faltan ' + fmtDur(gap) + '.'),
    );
  } else if (pe) {
    add('na', 'Predicción', pFrom + ' proyecta' + (pe.src === 'test' ? '' : 'n') + ' ' + fmtDur(pe.t) + '. Cargá un objetivo de tiempo para compararlo.');
  } else {
    const nt = S.sessions.find((q) => q.type === 'test' && q.plan && !q.result && sdate(q) >= tS && sdate(q) < race.date);
    add('na', 'Predicción', nt ? 'El test del ' + dateLabel(sdate(nt)) + ' va a ser tu termómetro. Después aparece la proyección.' : 'Registrá un test de 3 a 21 km a esfuerzo máximo, o algunas series y tempos, para proyectar tu tiempo.');
  }
  // 3) tirada larga
  const lw = long ? 42 : 28,
    lg = d.filter((q) => q.type === 'fondo' && q.result.date >= since(lw)).sort((a, b) => b.result.distKm - a.result.distKm)[0];
  const tg = longTarget(race.km);
  if (lg) {
    const km = lg.result.distKm,
      txt = 'Tu fondo más largo de las últimas ' + lw / 7 + ' semanas: ' + fmt(km, 1) + ' km (' + dateLabel(lg.result.date) + '). Para un ' + race.name + ' conviene llegar al menos a ' + fmt(tg, 0) + ' km';
    if (far && km < tg) add('na', 'Tirada larga', txt + ' unas semanas antes de la carrera; se construye de a poco.');
    else add(km >= tg ? 'good' : km >= tg * 0.8 ? 'warn' : 'crit', 'Tirada larga', txt + '.');
  } else add('na', 'Tirada larga', 'No hay fondos en las últimas ' + lw / 7 + ' semanas.');
  // 4) cumplimiento
  let pl = 0,
    dn = 0;
  for (let i = 1; i <= 4; i++) {
    const w = weekStats(addDays(mondayOf(today), -7 * i));
    pl += w.planned;
    dn += w.doneOfPlanned;
  }
  if (pl >= 3) {
    const pc = Math.round((dn / pl) * 100);
    add(pc >= 85 ? 'good' : pc >= 70 ? 'warn' : 'crit', 'Cumplimiento del plan', 'Hiciste ' + dn + ' de ' + pl + ' sesiones planificadas en las últimas 4 semanas (' + pc + '%).');
  } else add('na', 'Cumplimiento del plan', 'Con más semanas de plan cargadas aparece el porcentaje.');
  // 7) molestias
  const pn = d.filter((q) => q.result.pain && q.result.date >= since(14)).length;
  add(pn === 0 ? 'good' : pn === 1 ? 'warn' : 'crit', 'Molestias', 'En los últimos 14 días anotaste ' + (pn === 0 ? 'ninguna.' : pn + (pn === 1 ? ' molestia.' : ' molestias: si se repite, consultá a un profesional.')));
  // 5) carga
  const L = loadInfo();
  if (L) {
    const r = L.ratio;
    add(
      r < 0.8 ? 'warn' : r <= 1.3 ? 'good' : r <= 1.5 ? 'warn' : 'crit',
      'Carga reciente',
      r < 0.8 ? 'Vas por debajo de tu promedio (' + fmt(r, 2) + '×). Bien si es descarga a propósito.' : r <= 1.3 ? 'Subida razonable (' + fmt(r, 2) + '×).' : 'Subida fuerte (' + fmt(r, 2) + '×): evitá sumar intensidad.',
    );
  }
  // 6) deriva
  const dc = d.filter((q) => q.result.dec && q.result.dec.p != null).slice(-3);
  if (dc.length) {
    const av = sum(dc.map((q) => q.result.dec!.p!)) / dc.length;
    add(av < 5 ? 'good' : av <= 10 ? 'warn' : 'crit', 'Deriva cardíaca', 'Promedio de tus últimos ' + dc.length + (dc.length === 1 ? ' fondo' : ' fondos') + ': ' + fmt(av, 1) + '% (' + decBand({ p: av }).t.toLowerCase() + ').');
  }
  return I;
}
