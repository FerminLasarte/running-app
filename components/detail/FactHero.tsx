/* Ficha de la sesión: los datos en grande arriba. */
import type { CSSProperties } from 'react';
import type { Session } from '@/lib/domain/types';
import { TYPES, zoneOf } from '@/lib/domain/config';
import { planSummary, sdate } from '@/lib/domain/stats';
import { cap, dateLabel, fmt, fmtDur, fmtPace } from '@/lib/domain/util';

export function FactHero({ s }: { s: Session }) {
  const r = s.result!,
    p = s.plan,
    T = TYPES[s.type];
  const it: [string, string | number, string][] = [
    ['Distancia', fmt(r.distKm, 2), 'km'],
    ['Tiempo', fmtDur(r.timeSec), ''],
    ['Ritmo', r.paceSec ? fmtPace(r.paceSec) : '–', r.paceSec ? '/km' : ''],
    ['FC media', r.hrAvg || '–', r.hrAvg ? 'lpm' : ''],
  ];
  const ch = [r.hrAvg ? zoneOf(r.hrAvg) : '', r.hrMax ? 'FC máx. ' + r.hrMax : '', r.mainPaceSec && p && p.steps ? 'Parte principal ' + fmtPace(r.mainPaceSec) + '/km' : '', r.feel ? 'Sensación ' + r.feel + '/10' : '', r.pain ? 'Con molestia' : '', r.weather || ''].filter(Boolean);
  return (
    <div className="fact" style={{ '--tc': T.t } as CSSProperties}>
      <div className="fact-h">
        <span className="dot" style={{ background: T.t }}></span>
        <b>{T.label}</b>
        <span>{cap(dateLabel(r.date || sdate(s)))}</span>
      </div>
      {p ? <p className="fact-p">Plan: {planSummary(p)}</p> : null}
      <div className="fact-g">
        {it.map((q) => (
          <div key={q[0]}>
            <span className="kl">{q[0]}</span>
            <span className="big">
              {q[1]}
              <small>{q[2]}</small>
            </span>
          </div>
        ))}
      </div>
      {ch.length ? (
        <div className="fact-c">
          {ch.map((x, i) => (
            <span key={i}>{x}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
