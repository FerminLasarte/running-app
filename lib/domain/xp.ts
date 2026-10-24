/* Personaje: experiencia, niveles y atributos.
   Todo se calcula con tu historial: si editás una sesión, la experiencia se recalcula. */
import { S } from '@/lib/store';
import { TYPES } from './config';
import { vdotOf } from './daniels';
import { cellKey, routePts } from './geo';
import { scoreSession } from './score';
import { doneList, kmBetween, weekSeries, type DoneSession } from './stats';
import { bestTimeEvents, trophies, trophyXp } from './trophies';
import { addDays, clamp, dayDiff, fmt, fmtDur, pd, sod, sum, todayS, ymd } from './util';

export const XP_TITLES: [number, string][] = [
  [1, 'Novato'],
  [3, 'Trotador'],
  [6, 'Corredor urbano'],
  [10, 'Fondista'],
  [15, 'Rodador incansable'],
  [20, 'Medio maratonista'],
  [25, 'Aspirante a maratonista'],
  [30, 'Maratonista'],
  [40, 'Ultrafondista'],
  [50, 'Leyenda del asfalto'],
];
export const XP_TIER = [50, 150, 400];
export const xpFor = (L: number) => (L <= 1 ? 0 : Math.round(190 * Math.pow(L - 1, 1.6)));
export function levelOf(xp: number) {
  let L = 1;
  while (xpFor(L + 1) <= xp) L++;
  return L;
}
export const titleOf = (L: number) => XP_TITLES.filter((q) => q[0] <= L).pop()![1];

export function sessionXp(x: DoneSession) {
  const r = x.result,
    p: [string, number, string][] = [['km', Math.round(r.distKm * 10), fmt(r.distKm, 1) + ' km']];
  if (x.type === 'series' || x.type === 'tempo') p.push(['q', 20, 'calidad']);
  if (x.type === 'test') p.push(['t', 50, 'test o carrera']);
  if (x.type === 'fondo' && r.distKm >= 15) p.push(['l', 30, 'fondo largo']);
  if (x.plan) {
    p.push(['p', 25, 'del plan']);
    const c = scoreSession(x);
    if (c && c.score != null && c.score >= 90) p.push(['s', 25, 'puntaje ' + c.score]);
    else if (c && c.score != null && c.score >= 75) p.push(['s', 10, 'puntaje ' + c.score]);
  }
  return { xp: sum(p.map((q) => q[1])), parts: p };
}

export interface XpEvent {
  d: string;
  xp: number;
  t: string;
  id?: string;
}
export interface XpState {
  key: string;
  E: XpEvent[];
  total: number;
  L: number;
  title: string;
  a: number;
  b: number;
  /** fracción del nivel actual ya hecha */
  f: number;
  ups: { l: number; d: string }[];
  month: number;
}
let XP_CACHE: XpState | null = null;
let XP_SRC: unknown[] = [];
let XP_N = 0;
export function xpState(): XpState {
  /* sesiones, configuración y recorridos son inmutables: si ninguno cambió (por identidad), el XP es el mismo.
     (El original comparaba el largo del JSON de la configuración, y cambiar 3 por 4 salidas no lo invalidaba.) */
  const src = [S.sessions, S.cfg, S.routes, todayS(), S.demo];
  if (XP_CACHE && src.every((v, i) => v === XP_SRC[i])) return XP_CACHE;
  XP_SRC = src;
  const key = String(++XP_N);
  const E: XpEvent[] = [];
  doneList().forEach((x) => {
    const q = sessionXp(x);
    E.push({ d: x.result.date, xp: q.xp, t: TYPES[x.type].label + ' · ' + q.parts.map((z) => z[2]).join(' · '), id: x.id });
  });
  trophies()
    .filter((t) => t.got)
    .forEach((t) => E.push({ d: t.date!, xp: trophyXp(t), t: 'Trofeo: ' + t.name }));
  const G = S.cfg.weeklyGoal;
  weekSeries()
    .filter((w) => !w.cur && w.count >= G)
    .forEach((w) => E.push({ d: ymd(w.end), xp: 40, t: 'Semana cumplida (' + w.count + ' salidas)' }));
  S.cfg.races.filter((r) => r.resultSec! > 0).forEach((r) => E.push({ d: r.date, xp: 300, t: 'Carrera terminada: ' + r.name }));
  E.sort((a, b) => a.d.localeCompare(b.d));
  const total = sum(E.map((e) => e.xp)),
    L = levelOf(total),
    a = xpFor(L),
    b = xpFor(L + 1);
  /* fecha en que llegaste a cada nivel */
  let acc = 0;
  const ups: { l: number; d: string }[] = [];
  E.forEach((e) => {
    const l0 = levelOf(acc);
    acc += e.xp;
    const l1 = levelOf(acc);
    for (let l = l0 + 1; l <= l1; l++) ups.push({ l, d: e.d });
  });
  const m0 = ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    month = sum(E.filter((e) => e.d >= m0).map((e) => e.xp));
  XP_CACHE = { key, E, total, L, title: titleOf(L), a, b, f: (total - a) / (b - a || 1), ups, month };
  return XP_CACHE;
}

export interface CharStat {
  k: string;
  n: string;
  v: number | null;
  x: string;
  c: string;
}
/* atributos de 1 a 99 */
export function charStats(): CharStat[] {
  const D = doneList(),
    today = sod(new Date()),
    st: CharStat[] = [],
    m = (v: number, a: number, b: number) => clamp(Math.round(1 + (98 * (v - a)) / (b - a)), 1, 99);
  let vd: number | null = null,
    src = '';
  const Q: [number, string][] = [
    [5, '5K'],
    [10, '10K'],
    [21.0975, 'media'],
  ];
  for (const q of Q)
    for (const e of bestTimeEvents(q[0], 0.05)) {
      const v = vdotOf(e.sec, q[0]);
      if (vd == null || v > vd) {
        vd = v;
        src = q[1] + ' en ' + fmtDur(e.sec);
      }
    }
  st.push({ k: 'vel', n: 'Velocidad', v: vd == null ? null : m(vd, 25, 65), x: vd == null ? 'Corré un test o una carrera para medirla.' : 'Tu mejor marca: ' + src + ' (VDOT ' + fmt(vd, 1) + ').', c: 'var(--t2)' });
  const r6 = D.filter((x) => dayDiff(pd(x.result.date), today) <= 42),
    lg = r6.length ? Math.max(...r6.map((x) => x.result.distKm)) : 0,
    wk = kmBetween(addDays(today, -27), today) / 4;
  st.push({ k: 'res', n: 'Resistencia', v: D.length ? Math.round((m(lg, 0, 32) + m(wk, 0, 60)) / 2) : null, x: 'Salida más larga de las últimas 6 semanas: ' + fmt(lg, 1) + ' km · ' + fmt(wk, 0) + ' km por semana.', c: 'var(--t1)' });
  const W = weekSeries(13).filter((w) => !w.cur),
    ok = W.filter((w) => w.count >= S.cfg.weeklyGoal).length;
  st.push({ k: 'con', n: 'Constancia', v: W.length ? m(ok / W.length, 0, 1) : null, x: ok + ' de ' + W.length + ' semanas recientes con ' + S.cfg.weeklyGoal + ' o más salidas.', c: 'var(--t3)' });
  const tS = todayS(),
    from = ymd(addDays(today, -56)),
    P = S.sessions.filter((x) => x.plan && x.plan.date >= from && x.plan.date < tS),
    done = P.filter((x) => x.result).length;
  st.push({ k: 'dis', n: 'Disciplina', v: P.length ? m(done / P.length, 0, 1) : null, x: P.length ? 'Hiciste ' + done + ' de ' + P.length + ' sesiones planificadas en las últimas 8 semanas.' : 'Cargá un plan para medirla.', c: 'var(--t4)' });
  let area = 0;
  if (S.routes.length) {
    const seen = new Set<string>();
    S.routes.forEach((r) => routePts(r).forEach((q) => seen.add(cellKey(q))));
    area = seen.size * 0.04;
  }
  st.push({ k: 'exp', n: 'Exploración', v: S.routes.length ? m(Math.sqrt(area), 0, Math.sqrt(40)) : null, x: fmt(area, 1) + ' km² distintos recorridos.', c: 'var(--t5)' });
  return st;
}
