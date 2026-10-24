'use client';
/* Vuelta por vuelta: los parciales del reloj traídos de Strava (quedan en caché mientras la app está abierta). */
import { useState, type CSSProperties } from 'react';
import { getUi, useApp, useUi } from '@/lib/store';
import { svCall, stravaErrMsg } from '@/lib/strava/client';
import { fmt, fmtPace, sum } from '@/lib/domain/util';

/** un parcial: km, segundos y FC media (0 si no hay) */
export interface LapRow {
  d: number;
  t: number;
  h: number;
}

export function LapsHtml({ L }: { L: LapRow[] }) {
  if (!L || !L.length) return <p className="hint">Strava no trae parciales de esta corrida.</p>;
  const pc = (l: LapRow) => l.t / l.d,
    W = L.filter((l) => l.d >= 0.5),
    best = Math.min(...W.map(pc)),
    worst = Math.max(...W.map(pc));
  const U = L.filter((l) => l.d >= 0.9 && l.d <= 1.1);
  let split: string | null = null;
  if (U.length >= 4 && U.length >= L.length * 0.8) {
    const m = Math.floor(U.length / 2),
      a = sum(U.slice(0, m).map(pc)) / m,
      b = sum(U.slice(-m).map(pc)) / m,
      d = (b / a - 1) * 100;
    split = 'Primera mitad a ' + fmtPace(a) + ' y segunda a ' + fmtPace(b) + '/km: ' + (d < -1 ? 'negative split (' + fmt(-d, 1) + '% más rápido al final).' : d <= 1.5 ? 'ritmo parejo.' : 'segunda mitad ' + fmt(d, 1) + '% más lenta.');
  }
  return (
    <>
      <div className="reps">
        {L.slice(0, 40).map((l, i) => (
          <div className="rp" key={i}>
            <span>{i + 1}</span>
            <div className="meter sm" style={{ '--bc': l.d < 0.5 ? 'var(--base)' : pc(l) === best ? 'var(--good)' : 'var(--c1)' } as CSSProperties}>
              <i style={{ width: (l.d < 0.5 ? 30 : Math.round(40 + (60 * (worst - pc(l))) / (worst - best || 1))) + '%' }}></i>
            </div>
            <b>{fmtPace(pc(l))}</b>
            <em>{l.h ? Math.round(l.h) + ' lpm' : ''}</em>
            <small>{fmt(l.d, 2)} km</small>
          </div>
        ))}
      </div>
      {split ? (
        <p className="note" style={{ border: 0 }}>
          {split}
        </p>
      ) : null}
    </>
  );
}

type Phase = { k: 'idle' } | { k: 'busy' } | { k: 'done' } | { k: 'msg'; t: string };

export function DtLaps({ id }: { id: string }) {
  const [cache, setCache] = useUi<Record<string, LapRow[]>>('lapsCache', {});
  const [ph, setPh] = useState<Phase>({ k: 'idle' });

  async function load() {
    const s = useApp.getState().sessions.find((x) => x.id === id);
    if (!s || !s.result) return;
    const r = s.result;
    try {
      let sid = r.sid ? String(r.sid) : null;
      if (!getUi<Record<string, LapRow[]>>('lapsCache', {})[id]) {
        setPh({ k: 'busy' });
        if (!sid) {
          const pl = await svCall('list_activities', { first: 60, ordering: 'StartDateLocalDesc' });
          const a = ((pl && pl.activities) || []).find((q) => /run/i.test(q.sport_type || '') && String(q.start_local || '').slice(0, 10) === r.date && Math.abs(((q.summary && q.summary.distance) || 0) / 1000 - r.distKm) < 0.4);
          if (!a) {
            setPh({ k: 'msg', t: 'No encontré esta corrida en Strava.' });
            return;
          }
          sid = String(a.id);
        }
        const pf = await svCall('get_activity_performance', { activity_id: sid });
        setCache({ [id]: ((pf && pf.laps) || []).map((l) => ({ d: (l.distance || 0) / 1000, t: l.moving_time || l.elapsed_time || 0, h: l.avg_hr! > 0 ? l.avg_hr! : 0 })).filter((l) => l.d > 0.05 && l.t > 0) });
      }
      setPh({ k: 'done' });
    } catch (e) {
      setPh({ k: 'msg', t: stravaErrMsg(e) });
    }
  }

  return (
    <div id="dt-laps">
      {ph.k === 'idle' ? (
        <>
          <p className="sub" style={{ marginTop: 2 }}>
            Traé los parciales de tu reloj desde Strava para ver cada vuelta con su ritmo y FC.
          </p>
          <button className="btn blk" style={{ marginTop: 10 }} data-a="dt-laps" onClick={load}>
            Ver parciales de Strava
          </button>
        </>
      ) : ph.k === 'busy' ? (
        <p className="hint">Buscando en Strava…</p>
      ) : ph.k === 'msg' ? (
        <p className="hint">{ph.t}</p>
      ) : (
        <LapsHtml L={cache[id] || []} />
      )}
    </div>
  );
}
