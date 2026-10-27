/* Test de nivel: cómo estás frente a corredores de tu edad y de tus mismos meses corriendo (líneas 2840–2933). */
import { S } from '@/lib/store';
import { nextRace } from './config';
import { riegel } from './score';
import { vdotOf, vdotTime } from './daniels';
import { doneList, effPoints, weekSeries } from './stats';
import { addDays, dateLabel, dayDiff, daysTo, fmt, fmtDur, fmtPace, num, pd, sod, sum, ymd } from './util';

type Pl = [number, number][];
export const LV_AGE: Pl = [[22, 51], [27, 53], [32, 55], [37, 57], [42, 58.5], [47, 60.5], [52, 63], [57, 66], [62, 70]];
export const LV_EXP: Pl = [[0, 75], [1, 70], [3, 63], [6, 58], [9, 55], [12, 53], [18, 50.5], [24, 49], [36, 47], [60, 45]];
export const LV_SIG = 0.182;
export const LV_VOL: Pl = [[0, 1], [10, 2], [20, 4], [30, 5.8], [40, 7.3], [50, 8.6], [65, 10]];
export const LV_FRQ: Pl = [[0, 1], [1, 2], [2, 3.5], [3, 5.5], [4, 7.5], [5, 9], [6, 10]];
export const LV_LNG: Pl = [[0, 1], [5, 2.5], [8, 4.5], [10, 6], [12, 7.8], [14, 9], [16, 10]];
export const LV_QUA: Pl = [[0, 2], [0.5, 5], [1, 7.5], [1.75, 9], [2.25, 9.5], [3, 7], [4, 5]];
export const LV_EF: Pl = [[-8, 3.5], [-3, 5], [3, 5.5], [6, 7.5], [10, 9.5]];
export const LV_DEC: Pl = [[0, 10], [3, 9], [5, 8], [8, 6], [10, 5], [15, 3], [20, 1.5]];

/** interpolación lineal por tramos */
export function lvPl(x: number, P: Pl) {
  if (x <= P[0][0]) return P[0][1];
  for (let i = 1; i < P.length; i++) {
    if (x <= P[i][0]) {
      const a = P[i - 1],
        b = P[i];
      return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
    }
  }
  return P[P.length - 1][1];
}
export function lvInv(y: number, P: Pl) {
  for (let i = 1; i < P.length; i++) {
    if (y <= P[i][1]) {
      const a = P[i - 1],
        b = P[i];
      return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
    }
  }
  return P[P.length - 1][0];
}
/** función de distribución normal acumulada (aproximación) */
export function lvCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z)),
    d = 0.3989423 * Math.exp((-z * z) / 2);
  const q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - q : q;
}
export const lvClamp = (x: number) => Math.max(1, Math.min(10, x));
export function lvTag(v: number): { t: string; c: string } {
  return v >= 9
    ? { t: 'Sobresaliente', c: 'var(--pos)' }
    : v >= 7.5
      ? { t: 'Muy bueno', c: 'var(--pos)' }
      : v >= 6
        ? { t: 'Bueno', c: 'var(--t-fondo)' }
        : v >= 4.5
          ? { t: 'En desarrollo', c: 'var(--t-tempo)' }
          : { t: 'Arrancando', c: 'var(--z4)' };
}
export function lvMonths() {
  const today = sod(new Date());
  let st = S.cfg.since ? pd(S.cfg.since) : null;
  if (!st || isNaN(+st)) {
    const d = doneList();
    st = d.length ? pd(d[0].result.date) : today;
  }
  const days = Math.max(0, dayDiff(st, today));
  return { days, weeks: Math.floor(days / 7), months: days / 30.44 };
}

/** una señal de tu 10K: `sec` es el tiempo de 10K equivalente; `ex` = sale de un test (no estimado) */
export interface LvCand {
  sec: number;
  ex: boolean;
  k: 'test' | 'series' | 'tempo';
  date: string;
  txt: string;
}
/** candidatos a 10K equivalente; con `win`, solo los recientes (12 semanas los tests, 6 las series y tempos) */
export function lvCandAll(win: boolean): LvCand[] {
  const today = sod(new Date()),
    c: LvCand[] = [];
  doneList().forEach((x) => {
    const r = x.result,
      age = dayDiff(pd(r.date), today);
    if (x.type === 'test' && r.distKm >= 3 && r.distKm <= 21.1 && r.timeSec > 0 && (!win || age <= 84))
      c.push({ sec: riegel(r.timeSec, r.distKm, 10), ex: true, k: 'test', date: r.date, txt: 'tu test de ' + fmt(r.distKm, 1) + ' km del ' + dateLabel(r.date) });
    const mp = r.mainPaceSec || 0;
    if (x.type === 'series' && mp > 0 && (!win || age <= 42)) {
      let d: number | null = null;
      const m = (r.notes || '').match(/(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(km|m)\b/i);
      if (m) {
        d = num(m[2]);
        if (d != null && m[3].toLowerCase() === 'm') d = d / 1000;
      }
      if (!(d != null && d > 0) && x.plan && x.plan.steps) {
        const rp = x.plan.steps.find((q) => q.k === 'rep');
        const st = rp && rp.k === 'rep' && rp.steps && rp.steps.find((q) => q.k === 'run' && (q.dist || 0) > 0);
        if (st) d = st.dist!;
      }
      if (d != null && d >= 0.4 && d <= 2) {
        const f = d < 0.6 ? 1.1 : d < 1 ? 1.06 : 1.07;
        c.push({ sec: mp * f * 10, ex: false, k: 'series', date: r.date, txt: 'tus series del ' + dateLabel(r.date) + ' (' + fmtPace(mp) + '/km en los repetidos)' });
      }
    }
    if (x.type === 'tempo' && mp > 0 && (!win || age <= 42))
      c.push({ sec: mp * 0.99 * 10, ex: false, k: 'tempo', date: r.date, txt: 'tu tempo del ' + dateLabel(r.date) + ' (' + fmtPace(mp) + '/km)' });
  });
  return c;
}
/** tu 10K estimado sesión a sesión: el mejor de cada día, desde cada test o serie (los tempos no), de la más vieja a la
    más nueva */
export function lvHistory(): LvCand[] {
  const by: Record<string, LvCand> = {};
  lvCandAll(false)
    .filter((c) => c.k !== 'tempo')
    .forEach((c) => {
      if (!by[c.date] || c.sec < by[c.date].sec) by[c.date] = c;
    });
  return Object.keys(by)
    .sort()
    .map((k) => by[k]);
}
/* el test manda si es posterior a tus últimas series o tempos; si no, la mejor señal */
export function lvPace(): LvCand | null {
  const c = lvCandAll(true);
  if (!c.length) return null;
  const lastTr = c.filter((q) => !q.ex).reduce((m, q) => (q.date > m ? q.date : m), '');
  const ex = c.filter((q) => q.ex && q.date >= lastTr).sort((a, b) => a.sec - b.sec);
  return ex.length ? ex[0] : c.sort((a, b) => a.sec - b.sec)[0];
}
/** lo que harías hoy en `km` (segundos), desde tu 10K de hoy con las equivalencias de Daniels: Análisis → «Si corrieras
    hoy» y el «Hoy darías» de Carreras */
export const lvTimeAt = (lv: LvCand, km: number) => Math.round(km === 10 ? lv.sec : vdotTime(vdotOf(lv.sec, 10), km));
export function lvStats() {
  const d = doneList(),
    today = sod(new Date());
  if (d.length < 6) return null;
  const last = pd(d[d.length - 1].result.date),
    end = dayDiff(last, today) <= 7 ? last : today,
    first = pd(d[0].result.date);
  const span = Math.max(7, Math.min(28, dayDiff(first, end) + 1)),
    wk = span / 7,
    b = ymd(end);
  const w = d.filter((q) => q.result.date >= ymd(addDays(end, -(span - 1))) && q.result.date <= b);
  const w6 = d.filter((q) => q.result.date >= ymd(addDays(end, -41)) && q.result.date <= b);
  if (w.length < 4) return null;
  return {
    wk,
    km: sum(w.map((q) => q.result.distKm)) / wk,
    runs: w.length / wk,
    long: Math.max(...w6.map((q) => q.result.distKm)),
    q: w.filter((q) => q.type === 'series' || q.type === 'tempo' || q.type === 'test').length / wk,
    end,
    stale: dayDiff(last, today) > 7,
  };
}
export function lvCons() {
  const W = weekSeries(10).slice(0, -1).slice(-8);
  if (W.length < 3) return null;
  const ok = W.filter((w) => w.count >= S.cfg.weeklyGoal).length;
  return { ok, n: W.length, frac: ok / W.length };
}
export function lvAero() {
  const today = sod(new Date()),
    P = effPoints().sort((a, b) => a.t - b.t);
  let ef: number | null = null,
    dc: number | null = null;
  if (P.length >= 6 && P[P.length - 1].t - P[0].t >= 21 * 864e5) {
    const k = Math.max(2, Math.floor(P.length / 3)),
      m = (L: { v: number }[]) => sum(L.map((x) => x.v)) / L.length;
    ef = (m(P.slice(-k)) / m(P.slice(0, k)) - 1) * 100;
  }
  const D = doneList()
    .filter((x) => x.result.dec && x.result.dec.p != null && x.result.dec.ok && dayDiff(pd(x.result.date), today) <= 60)
    .map((x) => x.result.dec!.p!)
    .sort((a, b) => a - b);
  if (D.length) dc = D[Math.floor(D.length / 2)];
  if (ef == null && dc == null) return null;
  const sc: number[] = [];
  if (ef != null) sc.push(lvPl(ef, LV_EF));
  if (dc != null) sc.push(lvPl(dc, LV_DEC));
  return { ef, dc, n: D.length, score: sum(sc) / sc.length };
}

export interface LvDim {
  k: 'pace' | 'vol' | 'frq' | 'lng' | 'qua' | 'aer' | 'con';
  n: string;
  /** peso en el total (%) */
  w: number;
  /** puntaje contra todos los de tu edad */
  a: number;
  /** puntaje contra los de tus mismos meses */
  b: number;
  v: string;
  y: string;
  pct?: number;
}
export function lvBuild() {
  const age = S.cfg.age > 0 ? S.cfg.age : 27,
    M = lvMonths(),
    k = Math.max(0.55, Math.min(1, 0.55 + (0.45 * Math.min(M.months, 24)) / 24));
  const med = lvPl(age, LV_AGE) * 60,
    typ = lvPl(M.months, LV_EXP) * 60;
  const dims: LvDim[] = [],
    st = lvStats(),
    pace = lvPace(),
    cons = lvCons(),
    aero = lvAero();
  const race = nextRace();
  if (pace) {
    const pct = lvCdf(-Math.log(pace.sec / med) / LV_SIG),
      a = lvClamp(pct * 10),
      b = lvClamp(5 + (1 - pace.sec / typ) / 0.03);
    dims.push({
      k: 'pace',
      n: 'Velocidad (10K)',
      w: 35,
      a,
      b,
      v: fmtDur(pace.sec) + (pace.ex ? ' · proyectado desde un test' : ' · estimado'),
      y:
        'Típico a los ' + fmt(M.months, 0) + ' meses: ' + fmtDur(typ) + ' · mediana de hombres de ' + age + ' años: ' + fmtDur(med) +
        '. Más rápido que ~' + Math.round(pct * 100) + '% de los corredores de tu edad. Base: ' + pace.txt + '.',
      pct,
    });
  }
  if (st) {
    dims.push({ k: 'vol', n: 'Volumen semanal', w: 15, a: lvPl(st.km, LV_VOL), b: lvPl(st.km / k, LV_VOL), v: fmt(st.km, 0) + ' km por semana (últimas 4)', y: 'Para un 5 (normal) a tus meses: ≈ ' + fmt(lvInv(5, LV_VOL) * k, 0) + ' km por semana.' });
    dims.push({ k: 'frq', n: 'Frecuencia', w: 10, a: lvPl(st.runs, LV_FRQ), b: lvPl(st.runs / k, LV_FRQ), v: fmt(st.runs, 1) + ' salidas por semana', y: 'Para un 5: ≈ ' + fmt(lvInv(5, LV_FRQ) * k, 1) + ' salidas por semana a tus meses. 3 por semana es lo estándar en un plan de 10K con gimnasio.' });
    dims.push({ k: 'lng', n: 'Tirada larga', w: 10, a: lvPl(st.long, LV_LNG), b: lvPl(st.long / k, LV_LNG), v: fmt(st.long, 1) + ' km (la más larga en 6 semanas)', y: 'Para un 10K conviene una tirada de 12 km o más (1,2 veces la carrera).' });
    dims.push({ k: 'qua', n: 'Calidad (series y tempo)', w: 10, a: lvPl(st.q, LV_QUA), b: lvPl(st.q, LV_QUA), v: fmt(st.q, 1) + ' sesiones fuertes por semana', y: 'Lo ideal para un 10K son 1 o 2 por semana, con el resto fácil.' });
  }
  if (aero)
    dims.push({
      k: 'aer',
      n: 'Resistencia aeróbica',
      w: 10,
      a: aero.score,
      b: aero.score,
      v:
        (aero.ef != null ? (Math.abs(aero.ef) < 3 ? 'Eficiencia estable' : 'Eficiencia ' + (aero.ef > 0 ? '+' : '') + fmt(aero.ef, 1) + '%') + ' (inicio vs ahora)' : '') +
        (aero.ef != null && aero.dc != null ? ' · ' : '') +
        (aero.dc != null ? 'deriva cardíaca ' + fmt(aero.dc, 1) + '% (mediana de ' + aero.n + ')' : ''),
      y: 'Eficiencia: velocidad por latido en tus fondos y regenerativos. Deriva menor a 5% es buena.',
    });
  if (cons)
    dims.push({ k: 'con', n: 'Constancia', w: 10, a: lvClamp(1 + 9 * cons.frac), b: lvClamp(1 + 9 * cons.frac), v: cons.ok + ' de ' + cons.n + ' semanas con ' + S.cfg.weeklyGoal + ' o más salidas', y: 'La frecuencia sostenida es lo que más se asocia con mejorar.' });
  const tot = (key: 'a' | 'b') => {
    const W = sum(dims.map((d) => d.w));
    return W ? sum(dims.map((d) => d[key] * d.w)) / W : null;
  };
  let goal: { days: number; hi: number; lo: number; t: number; name: string; date: string } | null = null;
  if (pace && race && race.km === 10 && race.targetSec > 0) {
    const dl = daysTo(race.date);
    if (dl > 0) {
      const mo = dl / 30.44;
      goal = { days: dl, hi: pace.sec * (1 - 0.015 * mo), lo: pace.sec * (1 - 0.025 * mo), t: race.targetSec, name: race.name, date: race.date };
    }
  }
  return { dims, A: tot('a'), B: tot('b'), M, age, k, med, typ, pace, st, goal };
}
