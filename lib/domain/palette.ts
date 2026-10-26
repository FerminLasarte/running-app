/* Índice de la paleta ⌘K: las sesiones y las carreras como filas para buscar, y la búsqueda sin tildes que agrupa los
   resultados y marca lo que coincide. Las acciones y las secciones las suma la paleta (necesitan la interfaz). */
import { S } from '@/lib/store';
import type { Race, Session, SessionType } from './types';
import { TYPES, pastRaces, upcomingRaces } from './config';
import { sdate } from './stats';
import { DF_MY, cap, dateLabel, daysTo, fmt, fmtDur, norm, pd } from './util';

export interface PalItem {
  /** grupo: Acciones, Ir a, Sesiones, Carreras… */
  g: string;
  key: string;
  t: string;
  sub?: string;
  /** texto que también se busca pero no se muestra (el mes, las notas) */
  more?: string;
}
export type PalSession = PalItem & { s: Session; type: SessionType };
export type PalRace = PalItem & { r: Race; past: boolean };

/** sesiones (la más nueva primero) con `brief` como descripción corta, y carreras (las que vienen y las pasadas) */
export function palIndex(brief: (s: Session) => string): { sessions: PalSession[]; races: PalRace[] } {
  const sessions = S.sessions
    .slice()
    .sort((a, b) => sdate(b).localeCompare(sdate(a)))
    .map((s): PalSession => {
      const d = sdate(s),
        r = s.result,
        b = brief(s);
      return {
        g: 'Sesiones',
        key: 's:' + s.id,
        s,
        type: s.type,
        t: TYPES[s.type].label + (b ? ' · ' + b : ''),
        sub: cap(dateLabel(d)) + (r ? ' · ' + fmt(r.distKm, 2) + ' km' : s.missed ? ' · no hecha' : ' · planificada'),
        more: DF_MY.format(pd(d)) + ' ' + ((r && r.notes) || '') + ' ' + ((s.plan && s.plan.notes) || ''),
      };
    });
  const race = (r: Race, past: boolean): PalRace => {
    const n = daysTo(r.date);
    return {
      g: 'Carreras',
      key: 'r:' + r.id,
      r,
      past,
      t: r.name,
      sub: cap(dateLabel(r.date)) + (past ? (r.resultSec ? ' · ' + fmtDur(r.resultSec) : '') : n === 0 ? ' · es hoy' : ' · faltan ' + n + (n === 1 ? ' día' : ' días')),
      more: r.place + ' ' + fmt(r.km, 1) + ' km',
    };
  };
  return { sessions, races: [...upcomingRaces().map((r) => race(r, false)), ...pastRaces().map((r) => race(r, true))] };
}

const words = (q: string) => norm(q).split(/\s+/).filter(Boolean);

/** las filas donde aparecen todas las palabras (sin importar tildes ni mayúsculas), agrupadas en el orden de los
    grupos y con `per` por grupo como mucho */
export function palSearch<T extends PalItem>(items: T[], q: string, per = 6): T[] {
  const ws = words(q);
  if (!ws.length) return [];
  const by = new Map<string, T[]>();
  for (const x of items) {
    const l = by.get(x.g) || [];
    if (l.length >= per) continue;
    const hay = norm(x.t + ' ' + (x.sub || '') + ' ' + x.g + ' ' + (x.more || ''));
    if (!ws.every((w) => hay.includes(w))) continue;
    l.push(x);
    by.set(x.g, l);
  }
  return [...by.values()].flat();
}

/** el texto partido en pedazos, con `m` en los que coinciden con alguna palabra de la búsqueda */
export function palMark(t: string, q: string): { t: string; m: boolean }[] {
  const ws = words(q),
    n = norm(t),
    on = new Array<boolean>(t.length).fill(false);
  /* norm saca las tildes sin cambiar el largo (las letras con tilde vienen compuestas), así que los índices sirven */
  if (n.length === t.length)
    ws.forEach((w) => {
      for (let i = n.indexOf(w); i >= 0; i = n.indexOf(w, i + w.length)) on.fill(true, i, i + w.length);
    });
  const out: { t: string; m: boolean }[] = [];
  for (let i = 0; i < t.length; i++) {
    const last = out[out.length - 1];
    if (last && last.m === on[i]) last.t += t[i];
    else out.push({ t: t[i], m: on[i] });
  }
  return out;
}
