'use client';
/* la semana de un vistazo: una barra por sesión, alta según sus km, con el color de su tipo */
import type { CSSProperties } from 'react';
import type { Session } from '@/lib/domain/types';
import { TYPES } from '@/lib/domain/config';
import { planKmOf, sdate } from '@/lib/domain/stats';
import { WD, addDays, dateLabel, fmt, sum, ymd } from '@/lib/domain/util';
import { dayJump } from './Glance';

export function WeekStrip({ mon, wk, tS }: { mon: Date; wk: Session[]; tS: string }) {
  const km = (x: Session) => (x.result ? x.result.distKm || 0 : planKmOf(x));
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = addDays(mon, i),
      ds = ymd(d);
    return { i, d, ds, ss: wk.filter((x) => sdate(x) === ds) };
  });
  const mx = Math.max(8, ...days.map((q) => sum(q.ss.map(km))));
  return (
    <div className="wstrip">
      {days.map((q) => {
        const done = sum(q.ss.filter((x) => x.result).map((x) => x.result!.distKm || 0)),
          plan = sum(q.ss.filter((x) => !x.result && !x.missed).map(km));
        const lab = done > 0 ? <b>{fmt(done, 1)}</b> : plan > 0 ? <span>{fmt(plan, 1)}</span> : <span>–</span>;
        const aria =
          dateLabel(q.ds) +
          ': ' +
          (q.ss.length ? q.ss.map((x) => TYPES[x.type].label + (x.result ? ' hecha' : x.missed ? ' no hecha' : ' pendiente')).join(', ') : 'sin sesiones');
        return (
          <button
            key={q.ds}
            className={'ws-d' + (q.ds === tS ? ' today' : '') + (q.ds < tS ? ' past' : '')}
            data-a="dayjump"
            data-date={q.ds}
            aria-label={aria}
            onClick={() => dayJump(q.ds)}
          >
            <span className="ws-w">{WD[q.i]}</span>
            <span className="ws-n">{q.d.getDate()}</span>
            <span className="ws-bars">
              {q.ss.length ? (
                q.ss.map((x) => {
                  const st = x.result ? 'done' : x.missed ? 'miss' : q.ds < tS ? 'late' : 'plan';
                  return (
                    <i
                      key={x.id}
                      className={'ws-b ' + st}
                      style={{ '--tc': TYPES[x.type].t, height: Math.max(12, (km(x) / mx) * 100).toFixed(0) + '%' } as CSSProperties}
                    ></i>
                  );
                })
              ) : (
                <i className="ws-0"></i>
              )}
            </span>
            <span className="ws-km">{lab}</span>
          </button>
        );
      })}
    </div>
  );
}
