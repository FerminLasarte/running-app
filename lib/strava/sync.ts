/* Trae los recorridos de Strava para el mapa (stravaSync, líneas 4864–4900 del original). Lee de a 100 actividades,
   de la más nueva a la más vieja, y corta cuando encuentra una que ya tenía. */
import { S } from '@/lib/store';
import { blockDemo, saveRoutes } from '@/lib/data/actions';
import { getMapUi, setMapUi } from '@/lib/domain/geo';
import type { Route } from '@/lib/domain/types';
import { stravaErrMsg, svCall } from './client';

const LAST_KEY = 'rr_strava_last';

/** cuándo se sincronizó por última vez (ms), o 0 */
export function stravaLast() {
  try {
    return +(localStorage.getItem(LAST_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

const mapMsg = (t: string) => setMapUi({ msg: t });

export async function stravaSync() {
  if (getMapUi().syncing) return;
  if (blockDemo()) return;
  setMapUi({ syncing: true });
  mapMsg('Conectando con Strava…');
  let added = 0;
  try {
    const known = new Set(S.routes.map((r) => r.sid)),
      fresh: Route[] = [];
    let after: string | null = null,
      stop = false;
    for (let page = 0; page < 15 && !stop; page++) {
      const input: { first: number; include_polyline: boolean; ordering: string; after?: string } = { first: 100, include_polyline: true, ordering: 'StartDateLocalDesc' };
      if (after) input.after = after;
      const pl = await svCall('list_activities', input);
      const acts = (pl && pl.activities) || [];
      acts.forEach((a) => {
        if (!/run/i.test(a.sport_type || '') || !a.reduced_polyline) return;
        const id = String(a.id);
        if (known.has(id)) {
          stop = true;
          return;
        }
        known.add(id);
        fresh.push({
          id: 'rt_' + id,
          sid: id,
          date: String(a.start_local || '').slice(0, 10),
          name: a.name || 'Carrera',
          km: Math.round(((a.summary && a.summary.distance) || 0) / 10) / 100,
          tsec: Math.round((a.summary && a.summary.moving_time) || 0),
          poly: a.reduced_polyline,
        });
      });
      mapMsg('Leyendo tus carreras… ' + (S.routes.length + fresh.length) + ' recorridos');
      if (!pl || !pl.has_next_page || !pl.end_cursor) break;
      after = pl.end_cursor;
    }
    added = fresh.length;
    if (added) saveRoutes(fresh);
    try {
      localStorage.setItem(LAST_KEY, String(Date.now()));
    } catch {
      /* sin localStorage */
    }
    setMapUi({
      view: null,
      sel: null,
      msg: added ? 'Listo: sumé ' + added + (added === 1 ? ' recorrido nuevo.' : ' recorridos nuevos.') : 'Ya tenés todas tus carreras al día.',
    });
  } catch (e) {
    const c = e && typeof e === 'object' && 'code' in e ? (e as { code: unknown }).code : null;
    setMapUi({ msg: stravaErrMsg(e) });
    if (added === 0 && c) console.error(e);
  }
  setMapUi({ syncing: false });
}
