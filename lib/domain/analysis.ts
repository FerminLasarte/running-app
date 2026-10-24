/* Análisis profundo: carga por sesión, forma y fatiga, km de calidad y FC vs ritmo (líneas 4201–4256 del original). */
import { S } from '@/lib/store';
import type { SessionType } from './types';
import { doneList, type DoneSession } from './stats';
import { addDays, dayDiff, num, pd, sod, ymd } from './util';

export const LOAD_BUMP: Record<SessionType, number> = { series: 1.25, tempo: 1.25, test: 1.3, fondo: 1, regen: 0.9 };

/** carga de una salida: duración × (FC / FC máx)², con un plus para las de calidad */
export function sessLoad(x: DoneSession) {
  const r = x.result,
    f = r.hrAvg! > 0 ? r.hrAvg! / S.cfg.hrMax : 0.7;
  return (r.timeSec / 60) * f * f * 1.6 * (LOAD_BUMP[x.type] || 1);
}

export interface FormPoint {
  t: number;
  d: Date;
  /** forma (carga crónica, ~42 días) */
  ctl: number;
  /** fatiga (carga aguda, ~7 días) */
  atl: number;
  /** frescura = forma − fatiga */
  tsb: number;
}
/** forma, fatiga y frescura día por día desde la primera salida; null con menos de 5 salidas o 3 semanas */
export function formSeries(): FormPoint[] | null {
  const d = doneList();
  if (d.length < 5) return null;
  const first = pd(d[0].result.date),
    today = sod(new Date()),
    n = dayDiff(first, today);
  if (n < 21) return null;
  const byDay: Record<string, number> = {};
  d.forEach((x) => {
    byDay[x.result.date] = (byDay[x.result.date] || 0) + sessLoad(x);
  });
  let ctl = 0,
    atl = 0;
  const out: FormPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const day = addDays(first, i),
      l = byDay[ymd(day)] || 0;
    ctl += (l - ctl) / 42;
    atl += (l - atl) / 7;
    out.push({ t: day.getTime(), d: day, ctl, atl, tsb: ctl - atl });
  }
  return out;
}

/** km a ritmo fuerte de una sesión de calidad: «8x600 m» en la nota, o el 40% de la sesión */
export function hardKm(x: DoneSession) {
  const r = x.result;
  if (x.type === 'test') return r.distKm;
  if (x.type === 'series') {
    const m = (r.notes || '').match(/(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(km|m)\b/i);
    if (m) {
      let d = num(m[2]) as number;
      if (m[3].toLowerCase() === 'm') d /= 1000;
      const k = +m[1] * d;
      if (k > 0 && k < r.distKm) return k;
    }
  }
  return r.distKm * 0.4;
}

/* ---- FC vs ritmo: cuánto bajó tu frecuencia cardíaca para el mismo ritmo desde que empezaste ----
   Usa rodajes y fondos con FC. Eficiencia = metros por minuto ÷ FC; con eso se calcula
   la FC que necesitás para un ritmo fijo y el ritmo que sale con una FC fija. */
export const medOf = (a: number[]): number | null => {
  const s = a.slice().sort((x, y) => x - y),
    n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null;
};

export interface EasyRun {
  x: DoneSession;
  /** fecha 'AAAA-MM-DD' */
  d: string;
  t: number;
  /** ritmo, s/km */
  p: number;
  /** FC media */
  h: number;
  /** eficiencia: metros por minuto ÷ FC */
  ef: number;
}
export function easyHrRuns(): EasyRun[] {
  /* sin salidas con caminatas en el medio (bajan la FC y ensucian la comparación) */
  const R = doneList()
    .filter((x) => (x.type === 'fondo' || x.type === 'regen') && x.result.hrAvg! >= 110 && x.result.distKm >= 3 && x.result.timeSec > 0 && !/camin/i.test(x.result.notes || ''))
    .map((x) => {
      const r = x.result,
        p = r.timeSec / r.distKm;
      return { x, d: r.date, t: pd(r.date).getTime(), p, h: r.hrAvg!, ef: 60000 / p / r.hrAvg! };
    })
    .filter((q) => q.p >= 240 && q.p <= 570);
  /* fuera los valores muy raros (por ejemplo un sensor que marcó mal) */
  if (R.length < 6) return R;
  const s = R.map((q) => q.ef).sort((a, b) => a - b),
    q1 = s[Math.floor(s.length * 0.25)],
    q3 = s[Math.floor(s.length * 0.75)],
    iq = q3 - q1;
  return R.filter((q) => q.ef >= q1 - 1.5 * iq && q.ef <= q3 + 1.5 * iq);
}

/* tendencia robusta (Theil–Sen): la mediana de las pendientes entre todos los pares de salidas */
export function efTrend(R: { t: number; ef: number }[]): (d: number) => number {
  const sl: number[] = [];
  for (let i = 0; i < R.length; i++)
    for (let j = i + 1; j < R.length; j++) {
      const dt = (R[j].t - R[i].t) / 864e5;
      if (dt > 0) sl.push((R[j].ef - R[i].ef) / dt);
    }
  const m = sl.length ? (medOf(sl) as number) : 0,
    t0 = R[0].t,
    b = medOf(R.map((q) => q.ef - (m * (q.t - t0)) / 864e5)) as number;
  return (d) => b + (m * (d - t0)) / 864e5;
}
