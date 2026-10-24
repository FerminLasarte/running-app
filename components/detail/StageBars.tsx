/* Etapas como barras: más larga = más rápida, con el color de cada etapa. */
import type { CSSProperties } from 'react';
import type { Session } from '@/lib/domain/types';
import { KINDS, expand, isRep } from '@/lib/domain/stages';
import { fmtPace } from '@/lib/domain/util';

export function StageBars({ s }: { s: Session }) {
  const steps = s.plan!.steps!,
    st = s.result!.stages!,
    R: { c: string; l: string; p: number; km?: number; hr?: number }[] = [];
  expand(steps).forEach((e) => {
    const a = st[e.idx];
    if (!a || a.skipped || !(a.paceSec! > 0) || (a.avg && e.r > 0)) return;
    const g = e.gi >= 0 ? steps[e.gi] : null,
      nrep = g && isRep(g) ? g.n : 0;
    R.push({ c: KINDS[e.k].c, l: KINDS[e.k].s + (e.r >= 0 ? (a.avg ? ' ×' + nrep : ' ' + (e.r + 1)) : ''), p: a.paceSec!, km: a.distKm, hr: a.hrAvg });
  });
  if (R.length < 2) return null;
  const v = R.map((q) => 1 / q.p),
    lo = Math.min(...v),
    hi = Math.max(...v);
  return (
    <>
      <div className="h3 fact-t">Etapas</div>
      <div className="stb">
        {R.map((q, i) => {
          const w = hi > lo ? 28 + (72 * (1 / q.p - lo)) / (hi - lo) : 100;
          return (
            <div className="stb-r" key={i}>
              <span className="stb-l">{q.l}</span>
              <span className="stb-t">
                <i style={{ width: w.toFixed(0) + '%', background: q.c, '--i': i } as CSSProperties}></i>
              </span>
              <span className="stb-v">
                <b>{fmtPace(q.p)}</b>
                {q.hr ? ' · ' + q.hr : ''}
              </span>
            </div>
          );
        })}
      </div>
      <p className="hint" style={{ marginTop: 6 }}>
        Ritmo por etapa (más larga, más rápida) · FC media.
      </p>
    </>
  );
}
