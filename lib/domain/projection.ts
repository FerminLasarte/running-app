/* Proyección de estado físico, fatiga y forma hasta la carrera: sigue la serie de formSeries día por día con la carga
   estimada de las sesiones planificadas que faltan. Los días sin plan cuentan como descanso. La duración de cada
   sesión sale de su estructura (planEstSec) y la FC, del medio de su rango planificado; las que se planifican por ritmo
   (series, tempos) no tienen rango, así que llevan la FC típica de tus sesiones de ese tipo de las últimas 8 semanas.
   El último punto es la mañana de la carrera: la carga de ese día no entra. */
import { S } from '@/lib/store';
import type { Race, Session, SessionType } from './types';
import { formSeries, formStep, loadFor, medOf, type FormPoint } from './analysis';
import { planEstSec } from './planForm';
import { legacySteps } from './stages';
import { doneList, hrRangeOf, sdate } from './stats';
import { addDays, dayDiff, pd, sod, ymd } from './util';
import { memoData } from './memo';

/** duración estimada de una sesión planificada, en segundos */
export function planSec(s: Session) {
  const p = s.plan;
  if (!p) return 0;
  return planEstSec(p.steps && p.steps.length ? p.steps : legacySteps(p));
}

/** FC típica (mediana) de tus sesiones de un tipo en las últimas 8 semanas; undefined si no hay */
function typeHr(type: SessionType, since: string) {
  return (
    medOf(
      doneList()
        .filter((s) => s.type === type && s.result.date >= since && s.result.hrAvg! > 0)
        .map((s) => s.result.hrAvg!),
    ) ?? undefined
  );
}

export interface FormProj {
  /** un punto por día, de mañana a la mañana de la carrera */
  pts: FormPoint[];
  /** cuántas sesiones planificadas usa */
  n: number;
}
/** null sin forma (pocas salidas), si la carrera ya pasó o si no hay nada planificado de acá a la carrera */
export const formProjection = memoData(
  function formProjection(race: Race | null): FormProj | null {
    const F = formSeries();
    if (!F || !race) return null;
    const today = sod(new Date()),
      tS = ymd(today),
      n = dayDiff(today, pd(race.date));
    if (n <= 0) return null;
    const P = S.sessions.filter((s) => s.plan && !s.result && !s.missed && sdate(s) > tS && sdate(s) < race.date);
    if (!P.length) return null;
    const byDay: Record<string, number> = {},
      since = ymd(addDays(today, -55));
    P.forEach((s) => {
      const g = hrRangeOf(s),
        d = sdate(s);
      byDay[d] = (byDay[d] || 0) + loadFor(s.type, planSec(s), g ? (g[0] + g[1]) / 2 : typeHr(s.type, since));
    });
    let p: { ctl: number; atl: number } = F[F.length - 1];
    const pts: FormPoint[] = [];
    for (let i = 1; i <= n; i++) {
      const day = addDays(today, i);
      /* la mañana de la carrera: lo que quedó del día anterior */
      p = i < n ? formStep(p, byDay[ymd(day)] || 0) : p;
      pts.push({ t: day.getTime(), d: day, ctl: p.ctl, atl: p.atl, tsb: p.ctl - p.atl });
    }
    return { pts, n: P.length };
  },
  (race) => (race ? race.id + '|' + race.date : ''),
);
