/* Registro: todas las sesiones como base de datos (buscar, filtrar, ordenar y exportar). */
import { S, getUi } from '@/lib/store';
import { TYPES } from './config';
import { csvQ } from './csv';
import { keyPace, scoreSession } from './score';
import { planKmOf, planSummary, sdate } from './stats';
import type { Session, SessionType } from './types';
import { addDays, dateLabel, DF_MY, fmt, fmtDur, fmtPace, norm, pad, pd, sum, ymd } from './util';

export const LG_PAGE = 80;

export type LgStatus = 'done' | 'plan' | 'miss';
export interface LgInfo {
  s: Session;
  d: string;
  st: LgStatus;
  km: number;
  t: number;
  /** el ritmo que muestra la tabla: el principal (el del trabajo) o, sin él, el promedio */
  p: number;
  hr: number | undefined;
  feel: number | undefined;
  sc: number | null;
  txt: string;
}
export type LgSortKey = 'date' | 'km' | 'time' | 'pace' | 'hr' | 'feel' | 'score';
/* clave: [etiqueta, valor para ordenar (null: no tiene el dato), orden por defecto (-1 = de mayor a menor)] */
export const LG_SORTS: Record<LgSortKey, [string, (q: LgInfo) => number | string | null, 1 | -1]> = {
  date: ['Fecha', (q) => q.d, -1],
  km: ['Distancia', (q) => q.km, -1],
  time: ['Tiempo', (q) => q.t || null, -1],
  pace: ['Ritmo', (q) => q.p || null, 1],
  hr: ['FC media', (q) => q.hr || null, -1],
  feel: ['Sensación', (q) => q.feel || null, -1],
  score: ['Puntaje', (q) => q.sc, -1],
};
export const LG_ST: [LgStatus | 'all', string][] = [
  ['done', 'Hechas'],
  ['plan', 'Planificadas'],
  ['miss', 'No hechas'],
  ['all', 'Todas'],
];

/** filtros del Registro (viven en `useUi('lg')`) */
export interface LgState {
  q: string;
  type: SessionType | 'all';
  st: LgStatus | 'all';
  sort: LgSortKey;
  dir: 1 | -1;
  n: number;
}
export const LG_INIT: LgState = { q: '', type: 'all', st: 'done', sort: 'date', dir: -1, n: LG_PAGE };
export const lgState = () => getUi<LgState>('lg', LG_INIT);

export const lgSt = (x: Session): LgStatus => (x.result ? 'done' : x.missed ? 'miss' : 'plan');
/** el texto de la fila: la nota del resultado, la del plan o, si falta hacerla, el resumen del plan */
export const lgTxt = (x: Session) => (x.result && x.result.notes) || (x.plan && x.plan.notes) || (x.result ? '' : planSummary(x.plan));
export function lgInfo(x: Session): LgInfo {
  const r = x.result,
    sc = r ? scoreSession(x) : null;
  return {
    s: x,
    d: sdate(x),
    st: lgSt(x),
    km: r ? r.distKm || 0 : planKmOf(x),
    t: r ? r.timeSec : 0,
    p: r ? keyPace(x) : 0,
    hr: r ? r.hrAvg : 0,
    feel: r ? r.feel : 0,
    sc: sc && sc.score != null ? sc.score : null,
    txt: lgTxt(x),
  };
}
export function lgRows(L: LgState = lgState()): LgInfo[] {
  const q = norm(L.q).trim(),
    words = q ? q.split(/\s+/) : [];
  let a = S.sessions.filter((x) => (L.st === 'all' || lgSt(x) === L.st) && (L.type === 'all' || x.type === L.type));
  if (words.length)
    a = a.filter((x) => {
      const r = x.result,
        p = x.plan;
      const hay = norm(
        [
          TYPES[x.type].label,
          sdate(x),
          dateLabel(sdate(x)),
          DF_MY.format(pd(sdate(x))),
          r?.notes,
          p?.notes,
          r?.weather,
          r?.pain ? 'molestia' : '',
          x.missed ? 'no hecha' : '',
          r?.distKm ? fmt(r.distKm, 1) + ' km' : '',
          planSummary(p),
        ].join(' '),
      );
      return words.every((w) => hay.indexOf(w) >= 0);
    });
  const k = LG_SORTS[L.sort] || LG_SORTS.date,
    f = k[1];
  return a.map(lgInfo).sort((x, y) => {
    /* todos los valores de un mismo criterio son del mismo tipo (números, o fechas como texto); las que no tienen el
       dato (planificadas, sin FC…) van al final para los dos lados */
    const u = f(x) as number | null,
      v = f(y) as number | null;
    if (u == null || v == null) return u == null && v == null ? y.d.localeCompare(x.d) : u == null ? 1 : -1;
    return (u < v ? -1 : u > v ? 1 : x.d.localeCompare(y.d)) * L.dir;
  });
}
export function lgTotals(R: LgInfo[]) {
  const D = R.filter((q) => q.st === 'done'),
    km = sum(D.map((q) => q.km)),
    t = sum(D.map((q) => q.t || 0)),
    H = D.filter((q) => q.hr);
  return { n: R.length, done: D.length, km, t, p: km > 0 ? t / km : 0, hr: H.length ? sum(H.map((q) => q.hr!)) / H.length : 0 };
}
/** puntaje medio de las que tienen puntaje (null si ninguna) */
export function lgScoreAvg(R: LgInfo[]) {
  const P = R.filter((q) => q.sc != null).map((q) => q.sc!);
  return P.length ? sum(P) / P.length : null;
}
/** horas y minutos con dos puntos: «101:40» */
export const lgHm = (t: number) => {
  const m = Math.round(t / 60);
  return Math.floor(m / 60) + ':' + pad(m % 60);
};

/* período: desde cuándo se ven las sesiones. Las planificadas que vienen se ven siempre (el período no tiene fin) */
export type LgPeriod = 'todo' | '30d' | '2m' | '6m' | '12m';
export const LG_PERIODS: [LgPeriod, string][] = [
  ['todo', 'Todo'],
  ['30d', 'Últimos 30 días'],
  ['2m', 'Últimos 2 meses'],
  ['6m', 'Últimos 6 meses'],
  ['12m', 'Último año'],
];
/** primer día del período (null: desde siempre) */
export function lgFrom(p: LgPeriod, today = new Date()): string | null {
  if (p === 'todo') return null;
  if (p === '30d') return ymd(addDays(today, -29));
  const m = p === '2m' ? 2 : p === '6m' ? 6 : 12;
  return ymd(new Date(today.getFullYear(), today.getMonth() - m, today.getDate() + 1));
}

/** planilla de lo que estás viendo en el Registro (las filas con los filtros aplicados), de la más vieja a la más nueva */
export function lgCsv(rows: LgInfo[]) {
  /* ritmo: el de la tabla (el principal o el promedio); ritmo_medio: el de toda la salida */
  const H = ['fecha', 'tipo', 'estado', 'km', 'tiempo', 'ritmo_min_km', 'ritmo_medio_min_km', 'fc_media', 'fc_max', 'sensacion', 'molestia', 'clima', 'puntaje', 'notas'];
  const ST: Record<LgStatus, string> = { done: 'hecha', plan: 'planificada', miss: 'no hecha' };
  const R = rows.slice().sort((a, b) => a.d.localeCompare(b.d));
  return [H.join(',')]
    .concat(
      R.map((q) => {
        const r = q.s.result;
        return [
          q.d,
          TYPES[q.s.type].label,
          ST[q.st],
          q.km ? fmt(q.km, 2).replace(',', '.') : '',
          q.t ? fmtDur(q.t) : '',
          q.p ? fmtPace(q.p) : '',
          r?.paceSec ? fmtPace(r.paceSec) : '',
          r?.hrAvg || '',
          r?.hrMax || '',
          r?.feel || '',
          r?.date ? (r.pain ? 'sí' : 'no') : '',
          r?.weather || '',
          q.sc != null ? q.sc : '',
          q.txt || '',
        ]
          .map(csvQ)
          .join(',');
      }),
    )
    .join('\n');
}
