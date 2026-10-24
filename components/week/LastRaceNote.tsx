'use client';
/* la última carrera queda a la vista 3 semanas, para cargar el tiempo */
import { pastRaces } from '@/lib/domain/config';
import { dayDiff, fmtDur, pd, sod } from '@/lib/domain/util';
import { raceDateLabel } from '@/lib/domain/week';
import { goRaces } from '@/lib/data/actions';

export function LastRaceNote() {
  const today = sod(new Date()),
    last = pastRaces()[0];
  if (!(last && dayDiff(pd(last.date), today) <= 21)) return null;
  return (
    <div className="hero2">
      <div className="big">
        {last.resultSec ? '✓' : '?'}
        <small>{last.resultSec ? 'hecha' : 'tu tiempo'}</small>
      </div>
      <div>
        <b>
          {last.name} · {raceDateLabel(last)}
        </b>
        <span>
          {last.resultSec
            ? 'Hiciste ' +
              fmtDur(last.resultSec) +
              (last.targetSec
                ? last.resultSec <= last.targetSec
                  ? ', mejor que tu objetivo de ' + fmtDur(last.targetSec) + '.'
                  : ', objetivo ' + fmtDur(last.targetSec) + '.'
                : '.')
            : '¿Cuánto hiciste? Cargalo para guardarlo como marca.'}
        </span>
        {last.resultSec ? null : (
          <button className="btn sm" style={{ marginTop: 8 }} data-a="goRaces" onClick={goRaces}>
            Cargar mi tiempo
          </button>
        )}
      </div>
    </div>
  );
}
