'use client';
/* Una sesión del «Día por día»: se toca para ver el detalle y, si todavía no está hecha, se arrastra a otro día. */
import type { CSSProperties, DragEvent } from 'react';
import type { Session } from '@/lib/domain/types';
import { TYPES } from '@/lib/domain/config';
import { bandOf, scoreSession } from '@/lib/domain/score';
import { planSummary, resSummary, sdate } from '@/lib/domain/stats';
import { todayS } from '@/lib/domain/util';
import { canMove } from '@/lib/domain/week';
import { goSession } from '@/lib/nav';

export function SessChip({
  s,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  s: Session;
  dragging?: boolean;
  onDragStart?: (e: DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
}) {
  const T = TYPES[s.type],
    today = todayS(),
    d = sdate(s);
  let badge;
  if (s.result) {
    const sc = scoreSession(s);
    badge =
      sc && sc.score != null ? (
        <span className={'pill b-' + bandOf(sc.score).k} aria-label={'Puntaje ' + sc.score}>
          {sc.score}
        </span>
      ) : (
        <span className="tag">Hecho</span>
      );
  } else if (s.missed) badge = <span className="tag">No hecho</span>;
  else badge = <span className="tag">{d < today ? 'Falta cargar' : 'Pendiente'}</span>;
  const sub = s.result ? resSummary(s.result) : planSummary(s.plan);
  const mv = canMove(s);
  return (
    <button
      className={'sess' + (dragging ? ' dragging' : '')}
      style={{ '--tc': T.t } as CSSProperties}
      data-a="detail"
      data-id={s.id}
      draggable={mv || undefined}
      title={mv ? 'Arrastrala a otro día para moverla' : undefined}
      onClick={() => goSession(s.id)}
      onDragStart={mv ? onDragStart : undefined}
      onDragEnd={mv ? onDragEnd : undefined}
    >
      <span className="dot" style={{ background: T.t }}></span>
      <span className="st">
        <b>
          {T.label}
          {s.plan && s.plan.moved && !s.result ? (
            <>
              {' '}
              <i className="mv-tag">movida</i>
            </>
          ) : null}
        </b>
        <small>{sub}</small>
      </span>
      {badge}
    </button>
  );
}
