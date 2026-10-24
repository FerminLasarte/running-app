'use client';
/* ================= medallero =================
   En la pantalla principal: tus medallas colgadas de una barra, como en la pared de casa.
   Se balancean apenas; tocás una y la ves de cerca con el tiempo de esa carrera. La próxima carrera queda como un gancho vacío.
   (medalleroHtml, líneas 3169–3178 del original.) */
import type { CSSProperties } from 'react';
import { useS } from '@/lib/store';
import { buzz, goRace } from '@/lib/data/actions';
import { openSheet } from '@/lib/sheets';
import { nextRace, pastRaces } from '@/lib/domain/config';
import { dShort, fmtDur, pd } from '@/lib/domain/util';
import { RaceMedalSvg } from './RaceMedalSvg';

const cssVars = (o: Record<string, string>) => o as CSSProperties;

/** abre la medalla de una carrera de cerca (hoja `raceMedal`) */
export function openRaceMedal(id: string) {
  openSheet('raceMedal', { id });
  buzz(6);
}

export function Medallero() {
  useS();
  const P = pastRaces().filter((r) => (r.resultSec || 0) > 0),
    nx = nextRace();
  if (!P.length && !nx) return null;
  return (
    <section className="card mdro">
      <div className="mdro-h">
        <div>
          <span className="eyebrow">Tu medallero</span>
          <h2>{P.length ? P.length + (P.length === 1 ? ' medalla' : ' medallas') : 'Tu primera medalla'}</h2>
        </div>
        {P.length ? (
          <button className="btn sm" data-a="goRace" data-v="race" onClick={() => goRace('race', true)}>
            Ver carreras
          </button>
        ) : null}
      </div>
      <div className="mdro-wall">
        <div className="mdro-row">
          {P.map((r, i) => (
            <button
              key={r.id}
              className="mdro-it"
              data-a="race-open"
              style={cssVars({ '--sw': (-i * 1.3).toFixed(1) + 's', '--dr': (i % 2 ? 10 : 0) + 'px' })}
              aria-label={r.name + ', ' + fmtDur(r.resultSec!)}
              onClick={() => openRaceMedal(r.id)}
            >
              <RaceMedalSvg r={r} />
              <b>{r.name}</b>
              <span>{fmtDur(r.resultSec!)}</span>
            </button>
          ))}
          {nx ? (
            <button className="mdro-it next" data-a="goRace" data-v="race" style={cssVars({ '--dr': (P.length % 2 ? 10 : 0) + 'px' })} aria-label={'Próxima: ' + nx.name} onClick={() => goRace('race', true)}>
              <span className="mdro-hook">
                <i></i>
                <em>{nx.name}</em>
              </span>
              <b>Próxima</b>
              <span>{dShort(pd(nx.date))}</span>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
