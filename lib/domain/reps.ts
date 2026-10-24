/* Análisis por repetición de series y tempos. */
import type { Session } from './types';
import { expand } from './stages';
import { num } from './util';

export interface Rep {
  /** s/km */
  pace: number;
  hr: number | null;
  km: number | null;
}

/** Repeticiones de la parte principal (de las etapas cargadas o, en series viejas, de las notas «6×1 km: 4:10 4:08 …»). */
export function repData(s: Session): Rep[] | null {
  const r = s.result,
    p = s.plan;
  if (!r || (s.type !== 'series' && s.type !== 'tempo')) return null;
  let reps: Rep[] = [];
  if (r.stages && p && p.steps) {
    const st = r.stages;
    expand(p.steps).forEach((e) => {
      const a = st[e.idx];
      if (e.j >= 0 && e.k === 'run' && a && !a.skipped && a.distKm! > 0 && a.timeSec! > 0) reps.push({ pace: a.timeSec! / a.distKm!, hr: a.hrAvg || null, km: a.distKm! });
    });
  }
  if (reps.length < 3 && s.type === 'series' && r.notes) {
    const seg = String(r.notes).split('·')[0],
      i = seg.indexOf(':'),
      m = i >= 0 ? seg.slice(i + 1).match(/\b\d:[0-5]\d\b/g) : null;
    if (m && m.length >= 3 && m.length <= 24) {
      const d = seg.match(/(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(km|m)\b/i);
      let km = d ? num(d[2]) : null;
      if (d && d[3].toLowerCase() === 'm' && km != null) km = km / 1000;
      reps = m.map((t) => {
        const q = t.split(':');
        return { pace: +q[0] * 60 + +q[1], hr: null, km };
      });
    }
  }
  return reps.length >= 3 ? reps : null;
}
