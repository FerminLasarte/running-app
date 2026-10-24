'use client';
/* Marcas: las carreras que ya pasaron, cada una con su estética (raceCardHtml y pastRacesCard, líneas 3268–3280 del original). */
import type { CSSProperties } from 'react';
import { goRaces } from '@/lib/data/actions';
import type { Race } from '@/lib/domain/types';
import { pastRaces } from '@/lib/domain/config';
import { raceTheme } from '@/lib/domain/raceTheme';
import { cap, dateLabel, fmt, fmtDur, fmtPace } from '@/lib/domain/util';
import { RaceMedalSvg } from './RaceMedalSvg';

export function RaceCard({ r }: { r: Race }) {
  const t = raceTheme(r),
    rs = r.resultSec || 0,
    pace = rs && r.km ? fmtPace(rs / r.km) + '/km' : '',
    ok = r.targetSec > 0 && rs > 0 && rs <= r.targetSec;
  return (
    <article className={'rcard rc-' + t.k} style={{ '--r1': t.r1, '--r2': t.r2, '--ra': t.ra } as CSSProperties}>
      <i className="rc-wm" aria-hidden="true">
        <RaceMedalSvg r={r} />
      </i>
      <div className="rc-med">
        <RaceMedalSvg r={r} />
      </div>
      <div className="rc-tx">
        <span className="rc-ev">{(t.n ? t.n + ' · ' : '') + r.date.slice(0, 4)}</span>
        <b className="rc-nm">{r.name}</b>
        <span className="rc-dt">
          {cap(dateLabel(r.date))}
          {r.place ? ' · ' + r.place : ''}
        </span>
        {rs ? (
          <>
            <span className="rc-tm">{fmtDur(rs)}</span>
            <span className="rc-pc">
              {fmt(r.km, r.km % 1 ? 1 : 0)} km · {pace}
              {ok ? (
                <>
                  {' · '}
                  <em>objetivo cumplido</em>
                </>
              ) : null}
            </span>
          </>
        ) : (
          <button className="btn sm" data-a="goRaces" onClick={goRaces}>
            Cargar tiempo
          </button>
        )}
      </div>
    </article>
  );
}

export function PastRacesCard() {
  const P = pastRaces();
  if (!P.length) return null;
  return (
    <section className="card rc-sec">
      <div className="h3">Tus carreras</div>
      <p className="sub">{P.length + (P.length === 1 ? ' carrera terminada' : ' carreras terminadas')}. Cada una con los colores y la medalla de su evento.</p>
      <div className="rc-list">
        {P.map((r) => (
          <RaceCard key={r.id} r={r} />
        ))}
      </div>
    </section>
  );
}
