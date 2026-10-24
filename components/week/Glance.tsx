'use client';
/* De un vistazo: una fila con un número por dato, sin una caja para cada uno. La semana y la próxima sesión
   no se repiten acá: tienen su propia tarjeta arriba. */
import { GlTile, formState } from '@/components/ui/glance';
import { upcomingRaces } from '@/lib/domain/config';
import { streakInfo } from '@/lib/domain/stats';
import { dayDiff, fmtDur, pd, sod } from '@/lib/domain/util';
import { pendingSessions, raceDateLabel } from '@/lib/domain/week';
import { formSeries } from '@/lib/domain/analysis';
import { goChar, goForm, goRace } from '@/lib/data/actions';

/* ---- saltos dentro de la Semana ---- */
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
  document.getElementById('pend-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function Glance({ tS }: { tS: string }) {
  const today = sod(new Date());
  const pend = pendingSessions(tS).length;
  const st = streakInfo();
  const F = formSeries();
  const L = F ? F[F.length - 1] : null,
    fs = L ? formState(L.tsb) : null;
  return (
    <div className="card glance gl-row">
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
