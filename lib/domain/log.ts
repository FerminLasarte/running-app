/* Registro: todas las sesiones como base de datos (buscar, filtrar, ordenar y exportar). */
import { S, getUi } from '@/lib/store';
import { TYPES } from './config';
import { csvQ } from './csv';
import { scoreSession } from './score';
import { planKmOf, planSummary, sdate } from './stats';
import type { Session, SessionType } from './types';
import { dateLabel, DF_MY, fmt, fmtDur, fmtPace, norm, pad, pd, sum } from './util';

export const LG_PAGE = 80;

export type LgStatus = 'done' | 'plan' | 'miss';
export interface LgInfo {
  s: Session;
  d: string;
  st: LgStatus;
  km: number;
  t: number;
  p: number;
  hr: number | undefined;
  feel: number | undefined;
  sc: number | null;
  txt: string;
}
export type LgSortKey = 'date' | 'km' | 'time' | 'pace' | 'hr' | 'feel' | 'score';
/* clave: [etiqueta, valor para ordenar, orden por defecto (-1 = de mayor a menor)] */
export const LG_SORTS: Record<LgSortKey, [string, (q: LgInfo) => number | string, 1 | -1]> = {
  date: ['Fecha', (q) => q.d, -1],
  km: ['Distancia', (q) => q.km, -1],
  time: ['Tiempo', (q) => q.t || 0, -1],
  pace: ['Ritmo', (q) => q.p || 9999, 1],
  hr: ['FC media', (q) => q.hr || 0, -1],
  feel: ['Sensación', (q) => q.feel || 0, -1],
  score: ['Puntaje', (q) => (q.sc == null ? -1 : q.sc), -1],
};
export const LG_SORT_KEYS = Object.keys(LG_SORTS) as LgSortKey[];
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
export function lgInfo(x: Session): LgInfo {
  const r = x.result,
    sc = r ? scoreSession(x) : null;
  return {
    s: x,
    d: sdate(x),
    st: lgSt(x),
    km: r ? r.distKm || 0 : planKmOf(x),
    t: r ? r.timeSec : 0,
    p: r ? r.paceSec : 0,
    hr: r ? r.hrAvg : 0,
    feel: r ? r.feel : 0,
    sc: sc && sc.score != null ? sc.score : null,
    txt: (r && r.notes) || (x.plan && x.plan.notes) || (r ? '' : planSummary(x.plan)),
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
    /* todos los valores de un mismo criterio son del mismo tipo (números, o fechas como texto) */
    const u = f(x) as number,
      v = f(y) as number;
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
export const lgHours = (t: number) => {
  const h = Math.floor(t / 3600),
    m = Math.round((t % 3600) / 60);
  return h ? h + ' h ' + pad(m) + ' min' : m + ' min';
};

/* planilla de lo que estás viendo en el Registro (con los filtros aplicados) */
export function lgCsv(L: LgState = lgState()) {
  const H = ['fecha', 'tipo', 'estado', 'km', 'tiempo', 'ritmo_min_km', 'fc_media', 'fc_max', 'sensacion', 'molestia', 'clima', 'puntaje', 'notas'];
  const ST: Record<LgStatus, string> = { done: 'hecha', plan: 'planificada', miss: 'no hecha' };
  const R = lgRows(L)
    .slice()
    .sort((a, b) => a.d.localeCompare(b.d));
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
