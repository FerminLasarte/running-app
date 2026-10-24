/* Deriva cardíaca (decoupling) con los streams de Strava (líneas 5709–5778 del original). */
import { S, getUi, setUi } from '@/lib/store';
import { blockDemo, saveSessions } from '@/lib/data/actions';
import { svCall, stravaErrMsg, type StreamsPayload } from '@/lib/strava/client';
import type { Decoupling, Session } from './types';
import type { DoneSession } from './stats';
import { fmt, fmtPace, sum } from './util';

/** se descartan los primeros 10 minutos (calentamiento) */
export const DEC_WARM = 600;
/** duración mínima de la salida para medir la deriva (40 min) */
export const DEC_MIN_ACT = 2400;

/** deriva medida: todos los campos presentes */
export type DecFull = Required<Omit<Decoupling, 'na'>>;

export function decCalc(st: StreamsPayload | null | undefined): DecFull | null {
  const t = st && st.time,
    h = st && st.heart_rate,
    v = st && st.velocity_smooth,
    mv = st && st.moving;
  if (!Array.isArray(t) || !Array.isArray(h) || !Array.isArray(v) || t.length < 600 || h.length !== t.length || v.length !== t.length) return null;
  const idx: number[] = [];
  for (let i = 0; i < t.length; i++) {
    if (t[i] >= DEC_WARM && h[i] > 0 && v[i] > 1 && (!mv || mv[i] !== false)) idx.push(i);
  }
  if (idx.length < 600) return null;
  const t0 = t[idx[0]],
    t1 = t[idx[idx.length - 1]],
    mid = t0 + (t1 - t0) / 2,
    win = t1 - t0;
  if (win < 1800) return null;
  const A = idx.filter((i) => t[i] < mid),
    B = idx.filter((i) => t[i] >= mid);
  if (A.length < 300 || B.length < 300) return null;
  const mean = (L: number[], a: number[]) => sum(L.map((i) => a[i])) / L.length;
  const v1 = mean(A, v),
    v2 = mean(B, v),
    h1 = mean(A, h),
    h2 = mean(B, h),
    e1 = v1 / h1,
    e2 = v2 / h2;
  const cover = idx.length / win,
    dv = v2 / v1 - 1;
  return {
    p: Math.round(((e1 - e2) / e1) * 1000) / 10,
    p1: Math.round(1000 / v1),
    p2: Math.round(1000 / v2),
    a: Math.round(h1),
    b: Math.round(h2),
    m: Math.round(win / 60),
    ok: Math.abs(dv) <= 0.06 && cover >= 0.7 ? 1 : 0,
  };
}

export type DecBand = { k: 'good' | 'warn' | 'serious'; t: string };
export function decBand(d: { p: number }): DecBand {
  const p = d.p;
  if (p <= -3) return { k: 'good', t: 'FC más baja o ritmo más fuerte al final' };
  if (p < 5) return { k: 'good', t: 'Buena resistencia aeróbica' };
  if (p <= 10) return { k: 'warn', t: 'Deriva moderada' };
  return { k: 'serious', t: 'Deriva alta' };
}

export function decLine(d: Decoupling) {
  return fmt(d.p, 1) + '% · ritmo ' + fmtPace(d.p1!) + ' → ' + fmtPace(d.p2!) + '/km con FC ' + d.a + ' → ' + d.b + ' lpm' + (d.ok ? '' : ' (ritmo muy cambiante: tomalo como orientativo)');
}

/** baja los streams de una actividad de Strava y calcula la deriva (null si no se puede medir) */
export async function svStreams(id: string) {
  const pl = await svCall('get_activity_streams', { activity_id: id, streams: ['time', 'heart_rate', 'velocity_smooth', 'moving'] });
  return decCalc(pl);
}

/** fondos y regenerativos de 40 minutos o más */
export function decEligible(s: Session): s is DoneSession {
  return !!s.result && (s.type === 'fondo' || s.type === 'regen') && s.result.timeSec >= DEC_MIN_ACT;
}

/** estado del cálculo en lote (lo que era `S.dec`) */
export interface DecUi {
  busy: boolean;
  msg: string;
}
export const DEC_UI0: DecUi = { busy: false, msg: '' };
const decSet = (p: Partial<DecUi>) => setUi<DecUi>('dec', (v) => ({ ...(v || DEC_UI0), ...p }));

/* errores con los que no tiene sentido seguir probando con el resto de las actividades */
const FATAL = new Set(['needs_reauth', 'not_connected', 'not_configured', 'unauthorized', 'server_not_connected', 'approval_required', 'not_in_manifest', 'consent_required']);

/** calcula la deriva de los fondos que todavía no la tienen, buscando su corrida en Strava (hasta 40 por vez) */
export async function decBackfill() {
  if (blockDemo()) return;
  if (getUi<DecUi>('dec', DEC_UI0).busy) return;
  const note = (t: string) => decSet({ msg: t });
  decSet({ busy: true });
  let done = 0,
    fail = 0;
  const out: Session[] = [];
  try {
    const todo = S.sessions.filter((q) => decEligible(q) && !q.result!.dec) as DoneSession[];
    if (!todo.length) {
      decSet({ busy: false, msg: 'No hay fondos pendientes de calcular.' });
      return;
    }
    note('Buscando tus corridas en Strava…');
    const runs: { id: string; date: string; km: number }[] = [];
    let after: string | null = null;
    for (let page = 0; page < 8; page++) {
      const input: { first: number; ordering: string; after?: string } = { first: 100, ordering: 'StartDateLocalDesc' };
      if (after) input.after = after;
      const pl = await svCall('list_activities', input);
      ((pl && pl.activities) || []).forEach((a) => {
        if (/run/i.test(a.sport_type || '')) runs.push({ id: String(a.id), date: String(a.start_local || '').slice(0, 10), km: ((a.summary && a.summary.distance) || 0) / 1000 });
      });
      const minD = runs.length ? runs[runs.length - 1].date : '9999';
      if (!pl || !pl.has_next_page || !pl.end_cursor || minD < todo.map((q) => q.result.date).sort()[0]) break;
      after = pl.end_cursor;
    }
    const used = new Set(S.sessions.filter((q) => q.result && q.result.sid).map((q) => String(q.result!.sid)));
    const jobs: [DoneSession, { id: string; date: string; km: number }][] = [];
    todo
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
    if (!jobs.length) {
      decSet({ busy: false, msg: 'No encontré en Strava corridas que coincidan con tus fondos.' });
      return;
    }
    try {
      for (const [q, c] of jobs.slice(0, 40)) {
        note('Calculando ' + (done + fail + 1) + ' de ' + Math.min(jobs.length, 40) + '…');
        try {
          const d = await svStreams(c.id);
          const cur = S.sessions.find((x) => x.id === q.id);
          if (!cur || !cur.result) continue;
          out.push({ ...cur, result: { ...cur.result, sid: c.id, dec: d ? d : { na: 1 } } });
          if (d) done++;
          else fail++;
        } catch (e) {
          const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
          if (FATAL.has(code)) throw e;
          fail++;
        }
      }
    } finally {
      /* lo que ya se calculó se guarda aunque Strava corte a mitad de camino */
      await saveSessions(out);
    }
    decSet({
      msg:
        'Listo: calculé ' +
        done +
        ' fondo' +
        (done === 1 ? '' : 's') +
        (fail ? '; ' + fail + ' no se pudo' + (fail === 1 ? '' : 'ieron') + ' medir (muy cortos o sin FC).' : '.') +
        (jobs.length > 40 ? ' Quedan más: tocá de nuevo.' : '') +
        (todo.length > jobs.length ? ' ' + (todo.length - jobs.length) + ' no tenían una corrida parecida en Strava (misma fecha y distancia).' : ''),
    });
  } catch (e) {
    decSet({ msg: stravaErrMsg(e) });
    console.error(e);
  }
  decSet({ busy: false });
}
