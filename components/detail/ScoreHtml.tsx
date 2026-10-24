/* Puntaje completo de una sesión: anillo, banda, desglose por parte y notas. */
import type { CSSProperties } from 'react';
import type { Session } from '@/lib/domain/types';
import { bandOf, scoreSession, type ScorePart } from '@/lib/domain/score';
import { TYPES } from '@/lib/domain/config';
import { sdate } from '@/lib/domain/stats';
import { dateLabel } from '@/lib/domain/util';
import { CountUp } from '@/components/ui/CountUp';

/** desglose por parte (lo comparten el puntaje completo y el compacto del detalle) */
export function ScoreParts({ parts }: { parts: ScorePart[] }) {
  return (
    <ul className="parts">
      {parts.map((p, i) => (
        <li className={'b-' + bandOf(p.sc).k} key={i}>
          <div className="pt">
            <b>{p.label}</b>
            <span>
              {p.pts} de {p.max}
            </span>
          </div>
          <div className="meter sm">
            <i style={{ width: Math.round(p.sc) + '%' }}></i>
          </div>
          <p>{p.text}</p>
        </li>
      ))}
    </ul>
  );
}

export function ScoreHtml({ s }: { s: Session }) {
  const sc = scoreSession(s);
  if (!sc) return null;
  if (sc.score == null)
    return (
      <div className="scorebox">
        <div className="h3">Puntaje</div>
        {sc.notes.map((n, i) => (
          <p className="note" style={{ border: 0, padding: 0, marginTop: 6 }} key={i}>
            {n}
          </p>
        ))}
      </div>
    );
  const b = bandOf(sc.score);
  return (
    <div className={'scorebox b-' + b.k}>
      <div className="sc-head">
        <div className="ring" style={{ '--circ': 326.7, '--off': (326.7 * (1 - sc.score / 100)).toFixed(1) } as CSSProperties}>
          <svg viewBox="0 0 124 124" aria-hidden="true">
            <circle className="rt" cx="62" cy="62" r="52" />
            <circle className="rf" cx="62" cy="62" r="52" />
          </svg>
          <div className="sc-num">
            <CountUp v={sc.score} />
            <small>/100</small>
          </div>
        </div>
        <div className="sc-band">
          <b>{b.t}</b>
          <span>
            {TYPES[s.type].label} · {dateLabel(sdate(s))}
          </span>
        </div>
      </div>
      <p className="sc-sum">{sc.summary}</p>
      <ScoreParts parts={sc.parts} />
      {sc.notes.map((n, i) => (
        <p className="note" key={i}>
          {n}
        </p>
      ))}
    </div>
  );
}
