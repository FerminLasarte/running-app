'use client';
/* De un vistazo: una idea por tarjeta, un número grande. */
import type { Session } from '@/lib/domain/types';
import { GlTile, formState } from '@/components/ui/glance';
import { TYPES, upcomingRaces } from '@/lib/domain/config';
import { planKmOf, sdate, streakInfo } from '@/lib/domain/stats';
import { WD, cap, clamp, dayDiff, fmt, fmtDur, pd, sod, sum } from '@/lib/domain/util';
import { nextSession, pendingSessions, raceDateLabel } from '@/lib/domain/week';
import { formSeries } from '@/lib/domain/analysis';
import { goChar, goForm, goRace } from '@/lib/data/actions';
import { openSheet } from '@/lib/sheets';
import { S } from '@/lib/store';

/* ---- saltos dentro de la Semana ---- */
/** la tarjeta de la semana (desde «Esta semana») */
export function weekCardJump() {
  document.getElementById('wk-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
/** el día en el «Día por día», con un destello */
export function dayJump(date: string) {
  const li = document.querySelector<HTMLElement>('.cal .day[data-date="' + date + '"]');
  if (!li) return;
  li.scrollIntoView({ behavior: 'smooth', block: 'center' });
  li.classList.remove('flash');
  void li.offsetWidth;
  li.classList.add('flash');
}
/** la tarjeta de pendientes */
export function pendJump() {
  document.querySelector('.wk-r .card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function Glance({ wk, tS }: { wk: Session[]; tS: string }) {
  const today = sod(new Date());
  /* esta semana: anillo de km */
  const done = sum(wk.filter((x) => x.result).map((x) => x.result!.distKm || 0)),
    plan = sum(wk.map(planKmOf)),
    pc = plan > 0 ? clamp(done / plan, 0, 1) : 0;
  const nx = nextSession(tS);
  const pend = pendingSessions(tS).length;
  const st = streakInfo();
  const F = formSeries();
  const L = F ? F[F.length - 1] : null,
    fs = L ? formState(L.tsb) : null;
  return (
    <div className="glance">
      <GlTile
        ic="week"
        c="var(--accent)"
        t={S.weekOff === 0 ? 'Esta semana' : 'Semana'}
        onClick={weekCardJump}
        body={
          <span className="gl-ring">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle className="rt" cx="50" cy="50" r="43" />
              <circle className="rf" cx="50" cy="50" r="43" pathLength={100} style={{ strokeDasharray: (pc * 100).toFixed(1) + ' 100' }} />
            </svg>
            <b>{fmt(done, done < 10 ? 1 : 0)}</b>
          </span>
        }
        s={plan > 0 ? 'de ' + fmt(plan, 1) + ' km' : 'km hechos'}
      />
      {/* próxima sesión */}
      {nx
        ? (() => {
            const d = pd(sdate(nx)),
              nd = dayDiff(today, d),
              km = planKmOf(nx);
            return (
              <GlTile
                ic="next"
                c={TYPES[nx.type].t}
                t="Próxima sesión"
                onClick={() => openSheet('detail', { id: nx.id })}
                body={
                  <span className="gl-v" style={{ color: TYPES[nx.type].t }}>
                    {TYPES[nx.type].label}
                  </span>
                }
                s={(nd === 0 ? 'Hoy' : nd === 1 ? 'Mañana' : cap(WD[(d.getDay() + 6) % 7].toLowerCase()) + ' ' + d.getDate()) + (km ? ' · ' + fmt(km, 1) + ' km' : '')}
              />
            );
          })()
        : null}
      {/* pendientes de cargar */}
      {pend ? (
        <GlTile ic="pend" c="var(--warn)" t="Para cargar" onClick={pendJump} body={<span className="gl-v">{pend}</span>} s={pend === 1 ? 'sesión sin resultado' : 'sesiones sin resultado'} />
      ) : null}
      {/* carreras */}
      {upcomingRaces()
        .slice(0, 2)
        .map((r, ri) => {
          const d = dayDiff(today, pd(r.date)),
            w = Math.floor(d / 7);
          return (
            <GlTile
              key={r.id}
              ic={ri === 0 ? 'race' : 'flag'}
              c={ri === 0 ? 'var(--accent)' : 'var(--t5)'}
              t={r.name}
              onClick={() => goRace(ri === 0 ? 'race' : 'plan')}
              body={
                <span className="gl-v">
                  {d === 0 ? 'Hoy' : d < 14 ? d : w}
                  <small>{d === 0 ? '' : d < 14 ? (d === 1 ? 'día' : 'días') : 'semanas'}</small>
                </span>
              }
              s={r.targetSec > 0 ? 'Objetivo ' + (r.lt ? '< ' : '') + fmtDur(r.targetSec) : raceDateLabel(r)}
            />
          );
        })}
      {/* racha y forma */}
      <GlTile
        ic="streak"
        c="var(--serious)"
        t="Racha"
        onClick={goChar}
        body={
          <span className="gl-v">
            {st.cur}
            <small>{st.cur === 1 ? 'semana' : 'semanas'}</small>
          </span>
        }
        s={st.thisWeek + ' de ' + st.goal + ' esta semana'}
      />
      {L && fs ? (
        <GlTile
          ic="form"
          c="var(--info)"
          t="Forma"
          onClick={goForm}
          body={<span className="gl-v">{Math.round(L.ctl)}</span>}
          s={
            <>
              <i className="gl-dot" style={{ background: fs[1] }}></i>
              {fs[0]}
            </>
          }
        />
      ) : null}
    </div>
  );
}
