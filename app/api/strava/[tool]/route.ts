/* Las tres consultas que usa la app, con las mismas formas de respuesta que el conector de Strava de claude.ai:
   list_activities, get_activity_performance y get_activity_streams. */
import { NextResponse, type NextRequest } from 'next/server';
import { SvErr, requireUser, stravaGet, svError } from '@/lib/strava/server';

interface SummaryActivity {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  map?: { summary_polyline?: string | null };
}
interface DetailedActivity {
  average_heartrate?: number;
  max_heartrate?: number;
  laps?: { distance: number; moving_time: number; elapsed_time: number; average_heartrate?: number; max_heartrate?: number }[];
}
type Streams = Record<string, { data: unknown[] } | undefined>;
/* series que se pueden pedir: el nombre que usa la app → la clave de Strava. Sin pedir nada, las de la deriva */
const STREAM_KEYS: Record<string, string> = { time: 'time', heart_rate: 'heartrate', velocity_smooth: 'velocity_smooth', moving: 'moving', distance: 'distance', altitude: 'altitude', latlng: 'latlng' };
const STREAMS_DEF = ['time', 'heart_rate', 'velocity_smooth', 'moving'];

const idOf = (v: unknown) => {
  const s = String(v ?? '');
  if (!/^\d{1,20}$/.test(s)) throw new SvErr('tool_error', 'id de actividad inválido');
  return s;
};

export async function POST(request: NextRequest, ctx: RouteContext<'/api/strava/[tool]'>) {
  try {
    const { tool } = await ctx.params;
    const { sb, user } = await requireUser();
    const input = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (tool === 'list_activities') {
      const per = Math.min(200, Math.max(1, Number(input.first) || 30));
      const page = Math.max(1, Number(input.after) || 1);
      const list = await stravaGet<SummaryActivity[]>(sb, user.id, `/athlete/activities?per_page=${per}&page=${page}`);
      return NextResponse.json({
        activities: list.map((a) => ({
          id: String(a.id),
          name: a.name,
          sport_type: a.sport_type || a.type || '',
          start_local: String(a.start_date_local || '').replace(/Z$/, ''),
          summary: { distance: a.distance || 0, moving_time: a.moving_time || 0 },
          ...(input.include_polyline ? { reduced_polyline: a.map?.summary_polyline || undefined } : {}),
        })),
        has_next_page: list.length === per,
        end_cursor: list.length === per ? String(page + 1) : null,
      });
    }
    if (tool === 'get_activity_performance') {
      const a = await stravaGet<DetailedActivity>(sb, user.id, `/activities/${idOf(input.activity_id)}?include_all_efforts=false`);
      return NextResponse.json({
        average_heartrate: a.average_heartrate,
        max_heartrate: a.max_heartrate,
        laps: (a.laps || []).map((l) => ({ distance: l.distance, moving_time: l.moving_time, elapsed_time: l.elapsed_time, avg_hr: l.average_heartrate, max_hr: l.max_heartrate })),
      });
    }
    if (tool === 'get_activity_streams') {
      const asked = Array.isArray(input.streams) ? input.streams.filter((k): k is string => typeof k === 'string' && k in STREAM_KEYS) : [];
      const want = asked.length ? asked : STREAMS_DEF;
      const s = await stravaGet<Streams>(sb, user.id, `/activities/${idOf(input.activity_id)}/streams?keys=${want.map((k) => STREAM_KEYS[k]).join(',')}&key_by_type=true`);
      return NextResponse.json(Object.fromEntries(want.map((k) => [k, s[STREAM_KEYS[k]]?.data])));
    }
    throw new SvErr('tool_error', 'herramienta desconocida', 404);
  } catch (e) {
    return svError(e);
  }
}
