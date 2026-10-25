/* Análisis por repetición de series y tempos. */
import type { Session } from './types';
import { expand } from './stages';
import { fmt, num, sum } from './util';

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

/** cómo se repartió el ritmo de las repeticiones: mejor, peor, promedio, variación (%), caída del principio al final
 *  (%, + = más lento al final), FC de la primera y la última (si hay 3 o más con FC) y qué quiere decir */
export function repRead(R: Rep[]) {
  const P = R.map((x) => x.pace),
    best = Math.min(...P),
    worst = Math.max(...P),
    avg = sum(P) / P.length;
  const k = Math.max(1, Math.floor(P.length / 3)),
    f = sum(P.slice(0, k)) / k,
    l = sum(P.slice(-k)) / k,
    fade = (l / f - 1) * 100;
  const sd = Math.sqrt(sum(P.map((x) => (x - avg) * (x - avg))) / P.length),
    cv = (sd / avg) * 100;
  const msg =
    fade < -1.5
      ? 'Fuiste de menos a más: las últimas repeticiones fueron más rápidas. Muy buen manejo del esfuerzo.'
      : fade <= 1.5
        ? 'Ritmo muy parejo de principio a fin. Eso es controlar la sesión.'
        : fade <= 4
          ? 'Caíste un poco hacia el final (' + fmt(fade, 1) + '% más lento). Es normal; si pasa siempre, salí 2 o 3 segundos más tranquilo.'
          : 'Te caíste ' + fmt(fade, 1) + '% hacia el final: probablemente saliste muy fuerte o llegaste cansado.';
  const hrs = R.filter((x) => x.hr! > 0);
  return { best, worst, avg, cv, fade, msg, hr: hrs.length >= 3 ? ([Math.round(hrs[0].hr!), Math.round(hrs[hrs.length - 1].hr!)] as [number, number]) : null };
}
