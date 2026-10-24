/* Plan vs. real, etapa por etapa (con los parciales cargados de cada una). */
import { Fragment, type CSSProperties, type ReactNode } from 'react';
import type { Session, Stage } from '@/lib/domain/types';
import { KINDS, expand, isRep, stepDesc, stepTgt } from '@/lib/domain/stages';
import { judge, judgeTxt } from '@/lib/domain/score';
import { fmt, fmtDur, fmtPace } from '@/lib/domain/util';

export function StagesTable({ s }: { s: Session }) {
  const steps = s.plan!.steps!,
    st = s.result!.stages!;
  const rows: ReactNode[] = [];
  expand(steps).forEach((e) => {
    const a: Stage = st[e.idx] || { skipped: true };
    if (a.avg && e.r > 0) return;
    const g = e.gi >= 0 ? steps[e.gi] : null,
      nrep = g && isRep(g) ? g.n : 0;
    const label = KINDS[e.k].s + (e.r >= 0 ? (a.avg ? ' (prom. de ' + nrep + ')' : ' ' + (e.r + 1)) : '');
    let real: ReactNode;
    if (a.skipped) real = 'No la hiciste';
    else {
      const jt = judgeTxt(judge(e.st, a, e.k));
      real = (
        <>
          {fmt(a.distKm, 2) + ' km' + (a.est ? ' (est.)' : '')}
          <br />
          {fmtDur(a.timeSec!) + ' · ' + fmtPace(a.paceSec!) + '/km'}
          {a.hrAvg ? (
            <>
              <br />
              {'FC ' + a.hrAvg + (a.hrMax ? ' / ' + a.hrMax : '')}
            </>
          ) : null}
          {jt ? (
            <>
              <br />
              <small className="mut">{jt}</small>
            </>
          ) : null}
        </>
      );
    }
    rows.push(
      <Fragment key={e.idx}>
        <tr style={{ '--kc2': KINDS[e.k].c } as CSSProperties}>
          <td className="kcell">
            <b>{label}</b>
          </td>
          <td>
            {stepDesc(e.st)}
            {stepTgt(e.st) ? (
              <>
                <br />
                {stepTgt(e.st)}
              </>
            ) : null}
          </td>
          <td>{real}</td>
        </tr>
        {a.laps && a.laps.length
          ? a.laps.map((l, i) => {
              const jt = judgeTxt(judge(e.st, l, e.k));
              return (
                <tr className="lapr" key={i}>
                  <td>Parcial {i + 1}</td>
                  <td></td>
                  <td>
                    {fmt(l.distKm, 2) + ' km · ' + fmtDur(l.timeSec!) + ' · ' + fmtPace(l.paceSec!) + '/km' + (l.hrAvg ? ' · FC ' + l.hrAvg + (l.hrMax ? '/' + l.hrMax : '') : '')}
                    {jt ? (
                      <>
                        <br />
                        <small className="mut">{jt}</small>
                      </>
                    ) : null}
                  </td>
                </tr>
              );
            })
          : null}
      </Fragment>,
    );
  });
  return (
    <table className="cmp">
      <thead>
        <tr>
          <th>Etapa</th>
          <th>Plan</th>
          <th>Real</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}
