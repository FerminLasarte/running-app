/* Las corridas de Strava de tus sesiones hechas: para completar lo que falta (la deriva de los fondos, el desnivel y
   las mitades de cada salida) con un pedido por cada una. Se listan tus actividades de a 100, hacia atrás hasta la
   sesión más vieja que falta, y cada sesión se junta con la suya por su id o, sin id, por la fecha y una distancia
   parecida. */
import { S } from '@/lib/store';
import type { DoneSession } from '@/lib/domain/stats';
import { runActs, svCall, type RunAct } from './client';

/** errores con los que no tiene sentido seguir probando con el resto de las actividades */
export const SV_FATAL = new Set(['needs_reauth', 'not_connected', 'not_configured', 'unauthorized', 'server_not_connected', 'approval_required', 'not_in_manifest', 'consent_required']);

/** cada sesión con su corrida de Strava, de la más nueva a la más vieja (las que no tienen una parecida no van) */
export async function matchRuns(todo: DoneSession[], onList?: () => void): Promise<[DoneSession, RunAct][]> {
  onList?.();
  const runs: RunAct[] = [],
    oldest = todo.map((q) => q.result.date).sort()[0];
  let after: string | null = null;
  for (let page = 0; page < 8; page++) {
    const input: { first: number; ordering: string; after?: string } = { first: 100, ordering: 'StartDateLocalDesc' };
    if (after) input.after = after;
    const pl = await svCall('list_activities', input);
    runs.push(...runActs(pl));
    const minD = runs.length ? runs[runs.length - 1].date : '9999';
    if (!pl || !pl.has_next_page || !pl.end_cursor || minD < oldest) break;
    after = pl.end_cursor;
  }
  const used = new Set(S.sessions.filter((q) => q.result && q.result.sid).map((q) => String(q.result!.sid)));
  const jobs: [DoneSession, RunAct][] = [];
  todo
    .slice()
    .sort((a, b) => b.result.date.localeCompare(a.result.date))
    .forEach((q) => {
      const c = q.result.sid
        ? runs.find((r) => r.id === String(q.result.sid))
        : runs
            .filter((r) => r.date === q.result.date && !used.has(r.id) && Math.abs(r.km - q.result.distKm) <= Math.max(0.6, q.result.distKm * 0.08))
            .sort((a, b) => Math.abs(a.km - q.result.distKm) - Math.abs(b.km - q.result.distKm))[0];
      if (c) {
        used.add(c.id);
        jobs.push([q, c]);
      }
    });
  return jobs;
}
