/* Cinta de datos de Semana (el tablero del estadio): frases cortas con números que ya salen de otras funciones.
   Sin HTML: cada frase trae aparte la parte que va en negrita. */
import { TYPES, nextRace } from './config';
import { formSeries } from './analysis';
import { MARK_DISTS, bestMarks } from './marks';
import { doneList, planKmOf, sdate, streakInfo } from './stats';
import { nextSession, pendingSessions } from './week';
import { xpState } from './xp';
import { addDays, cap, dateLabel, daysTo, fmt, mondayOf, pd, sod, sum, ymd } from './util';

export interface TickerItem {
  pre?: string;
  /** el dato, en negrita */
  b: string;
  post?: string;
}

const DF_DAY = new Intl.DateTimeFormat('es-AR', { weekday: 'long' });
const plural = (n: number, one: string, many: string) => n + ' ' + (n === 1 ? one : many);

/** las frases de la cinta, en orden; vacía sin salidas (la bienvenida ocupa su lugar) */
export function tickerItems(): TickerItem[] {
  const d = doneList();
  if (!d.length) return [];
  const today = sod(new Date()),
    tS = ymd(today),
    mon = ymd(mondayOf(today)),
    out: TickerItem[] = [];

  /* km de esta semana (la de hoy, aunque estés mirando otra) */
  out.push({ b: fmt(sum(d.filter((x) => x.result.date >= mon && x.result.date <= tS).map((x) => x.result.distKm)), 1) + ' km', post: ' esta semana' });

  /* planificadas de días que ya pasaron, sin cargar */
  const pend = pendingSessions(tS).length;
  if (pend) out.push({ pre: 'Para cargar: ', b: plural(pend, 'sesión', 'sesiones') });

  const r = nextRace();
  if (r) {
    const n = daysTo(r.date);
    out.push(n === 0 ? { pre: 'Hoy: ', b: r.name } : n === 1 ? { pre: 'Mañana: ', b: r.name } : { pre: 'Faltan ', b: n + ' días', post: ' para el ' + r.name });
  }

  const st = streakInfo();
  if (st.cur > 0) out.push({ pre: 'Racha: ', b: plural(st.cur, 'semana', 'semanas'), post: ' cumpliendo' });

  /* estado físico, contra hace 12 semanas (o contra el principio, si hay menos) */
  const F = formSeries();
  if (F) {
    const L = F[F.length - 1],
      P = F[Math.max(0, F.length - 1 - 84)],
      dv = Math.round(L.ctl - P.ctl),
      w = Math.round((L.t - P.t) / (7 * 864e5));
    out.push({ pre: 'Estado físico ', b: String(Math.round(L.ctl)), post: ', ' + (dv < 0 ? '−' : '+') + Math.abs(dv) + ' en ' + plural(w, 'semana', 'semanas') });
  }

  const X = xpState();
  out.push({ pre: 'Nivel ', b: String(X.L), post: ' · ' + X.title });

  /* lo próximo después de hoy */
  const nx = nextSession(ymd(addDays(today, 1)));
  if (nx) {
    const nd = daysTo(sdate(nx)),
      km = planKmOf(nx);
    out.push({
      pre: (nd === 1 ? 'Mañana' : nd < 7 ? cap(DF_DAY.format(pd(sdate(nx)))) : cap(dateLabel(sdate(nx)))) + ': ',
      b: TYPES[nx.type].label.toLowerCase() + (km ? ' ' + fmt(km, km % 1 ? 1 : 0) + ' km' : ''),
    });
  }

  /* la mejor marca en la distancia de la próxima carrera; si no hay, la primera que tengas */
  const dist = r ? MARK_DISTS.find((q) => Math.abs(r.km - q[0]) / q[0] < 0.02) : null,
    M = bestMarks().filter((m) => m.n.startsWith('Mejor ')),
    m = (dist && M.find((x) => x.n === 'Mejor ' + dist[1])) || M[0];
  if (m) out.push({ pre: m.n + ': ', b: m.v });
  return out;
}
