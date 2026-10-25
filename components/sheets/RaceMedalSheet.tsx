'use client';
/* La medalla de una carrera de cerca, con su tiempo (openRaceMedal, líneas 3179–3189 del original). */
import type { CSSProperties } from 'react';
import { useS } from '@/lib/store';
import { goRace } from '@/lib/data/actions';
import { pastRaces } from '@/lib/domain/config';
import { raceTheme } from '@/lib/domain/raceTheme';
import { cap, fmt, fmtDur, fmtPace } from '@/lib/domain/util';
import { raceDateLabel } from '@/lib/domain/week';
import { RaceMedalSvg } from '@/components/race/RaceMedalSvg';
import { PanelFrame } from '@/components/panels/PanelFrame';

export default function RaceMedalSheet({ id }: { id: string }) {
  const { cfg } = useS();
  const r = cfg.races.find((q) => q.id === id);
  if (!r) return null;
  const t = raceTheme(r),
    rs = r.resultSec || 0,
    pace = rs && r.km ? fmtPace(rs / r.km) : '',
    all = pastRaces().filter((q) => (q.resultSec || 0) > 0 && Math.abs(q.km - r.km) < 0.3);
  const best = all.length > 1 && all.every((q) => q.resultSec! >= rs);
  return (
    <PanelFrame
      title={r.name}
      foot={
        <button className="btn blk" data-a="goRace" data-v="race" onClick={() => goRace('race')}>
          Ver todas tus carreras
        </button>
      }
    >
      <div className="rmo" style={{ '--r1': t.r1, '--r2': t.r2, '--ra': t.ra } as CSSProperties}>
        <div className="rmo-med">
          <RaceMedalSvg r={r} />
        </div>
        <span className="rc-ev" style={{ color: 'color-mix(in srgb,' + t.ra + ' 80%,var(--ink))' }}>
          {(t.n ? t.n + ' · ' : '') + r.date.slice(0, 4)}
        </span>
        <div className="rmo-tm">{fmtDur(rs)}</div>
        <div className="rmo-st">
          <span>
            <b>{fmt(r.km, r.km % 1 ? 1 : 0)}</b>km
          </span>
          <span>
            <b>{pace}</b>/km
          </span>
          {r.targetSec ? (
            <span>
              <b>{fmtDur(r.targetSec)}</b>objetivo
            </span>
          ) : null}
        </div>
        <p className="rmo-dt">
          {cap(raceDateLabel(r))}
          {r.place ? ' · ' + r.place : ''}
        </p>
        {best ? <p className="rmo-pb">Tu mejor marca en esta distancia</p> : null}
        {r.targetSec && rs <= r.targetSec ? <p className="rmo-pb">Objetivo cumplido</p> : null}
      </div>
    </PanelFrame>
  );
}
