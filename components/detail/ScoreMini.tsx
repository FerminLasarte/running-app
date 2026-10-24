/* Puntaje compacto del detalle: el desglose queda a un toque. */
import type { Session } from '@/lib/domain/types';
import { bandOf, scoreSession } from '@/lib/domain/score';
import { ScoreParts } from './ScoreHtml';

export function ScoreMini({ s }: { s: Session }) {
  const sc = scoreSession(s);
  if (!sc) return null;
  const notes = sc.notes.map((n, i) => (
    <p className="note" key={i}>
      {n}
    </p>
  ));
  if (sc.score == null) return <>{notes}</>;
  const b = bandOf(sc.score);
  return (
    <details className={'scm b-' + b.k}>
      <summary>
        <span className="scm-n">{sc.score}</span>
        <span className="scm-t">
          <b>{b.t}</b>
          <span>{sc.summary}</span>
        </span>
        <span className="scm-more">Desglose</span>
      </summary>
      <ScoreParts parts={sc.parts} />
      {notes}
    </details>
  );
}
