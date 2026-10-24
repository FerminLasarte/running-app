/* El plan desplegado tramo por tramo (también lo usa Semana). */
import type { CSSProperties } from 'react';
import type { Plan, Step } from '@/lib/domain/types';
import { KINDS, isRep, stepDesc, stepTgt } from '@/lib/domain/stages';

function Row({ st }: { st: Step }) {
  return (
    <div className="srow">
      <div className="sinfo" style={{ '--kc2': KINDS[st.k].c } as CSSProperties}>
        <b>{KINDS[st.k].l}</b>
        <span>
          {stepDesc(st)}
          {stepTgt(st) ? ' · ' + stepTgt(st) : ''}
        </span>
      </div>
    </div>
  );
}

export function ExpandedPlan({ p }: { p: Plan }) {
  return (
    <>
      {(p.steps || []).map((st, i) =>
        isRep(st) ? (
          <div className="rep" key={i}>
            <b>{st.n} veces</b>
            <div style={{ marginTop: 8 }}>
              {st.steps.map((x, j) => (
                <Row st={x} key={j} />
              ))}
            </div>
          </div>
        ) : (
          <Row st={st} key={i} />
        ),
      )}
    </>
  );
}
