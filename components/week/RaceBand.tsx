'use client';
/* Próximas carreras en la Semana. `RaceBand` es la franja finita (antes eran dos tarjetas grandes: `RaceBlock`).
   En el original ninguna de las dos se dibuja hoy: quedaron portadas por si vuelven. */
import type { CSSProperties } from 'react';
import { CountUp } from '@/components/ui/CountUp';
import { upcomingRaces } from '@/lib/domain/config';
import { planWeek } from '@/lib/domain/stats';
import { dayDiff, pd, sod } from '@/lib/domain/util';
import { raceDateLabel, raceGoalTxt } from '@/lib/domain/week';
import { goRace, goRaces } from '@/lib/data/actions';
import { LastRaceNote } from './LastRaceNote';

/** las semanas del plan: hechas, la actual y las que faltan */
function WkTicks({ total, cur }: { total: number; cur: number }) {
  return (
    <>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < cur ? 'done' : i === cur ? 'now' : ''} style={{ '--i': i } as CSSProperties}></i>
      ))}
    </>
  );
}

/* franja finita con las próximas carreras */
export function RaceBand() {
  const today = sod(new Date()),
    pw = planWeek(),
    up = upcomingRaces();
  return (
    <>
      {!up.length ? (
        <section className="raceband">
          <div className="rb-it">
            <span className="rb-tx">
              <b>No tenés una carrera cargada</b>
              <span>Sumá tu próximo objetivo y la app se arma alrededor de esa carrera.</span>
            </span>
          </div>
          <button className="btn sm pri" data-a="goRaces" onClick={goRaces}>
            Agregar carrera
          </button>
        </section>
      ) : (
        <section className="raceband">
          {up.slice(0, 2).map((r, ri) => {
            const days = dayDiff(today, pd(r.date)),
              wks = Math.floor(days / 7);
            const num = days === 0 ? 'HOY' : days < 14 ? String(days) : String(wks),
              unit = days === 0 ? '' : days < 14 ? (days === 1 ? 'día' : 'días') : wks === 1 ? 'semana' : 'semanas';
            const v = ri === 0 ? 'race' : 'plan';
            return (
              <button key={r.id} className={'rb-it' + (ri === 0 ? ' first' : '')} data-a="goRace" data-v={v} onClick={() => goRace(v)}>
                <span className="rb-num">
                  {num}
                  <small>{unit}</small>
                </span>
                <span className="rb-tx">
                  <b>
                    {r.name} · {raceDateLabel(r)}
                  </b>
                  <span>{raceGoalTxt(r)}</span>
                  {ri === 0 && pw && days > 0 ? (
                    <>
                      <span className="wkbar" aria-hidden="true">
                        <WkTicks total={pw.total} cur={pw.wk - 1} />
                      </span>
                      <small className="rb-cap">
                        Semana {pw.wk} de {pw.total} del plan · faltan {days} días
                      </small>
                    </>
                  ) : null}
                </span>
              </button>
            );
          })}
        </section>
      )}
      <LastRaceNote />
    </>
  );
}

/* las dos tarjetas grandes de cuenta regresiva */
export function RaceBlock() {
  const today = sod(new Date()),
    pw = planWeek(),
    up = upcomingRaces();
  return (
    <>
      {!up.length ? (
        <section className="hero">
          <div className="eyebrow">Próxima carrera</div>
          <div className="hero-info" style={{ marginTop: 8 }}>
            <b>No tenés una carrera cargada</b>
            <span>Sumá tu próximo objetivo y la app se arma alrededor de esa carrera.</span>
          </div>
          <button className="btn sm pri" style={{ marginTop: 14 }} data-a="goRaces" onClick={goRaces}>
            Agregar carrera
          </button>
        </section>
      ) : null}
      {up.map((r, ri) => {
        const days = dayDiff(today, pd(r.date)),
          wks = Math.floor(days / 7),
          rem = days % 7;
        const goal = raceGoalTxt(r);
        let num, unit: string, extra: string;
        if (days === 0) {
          num = 'HOY';
          unit = 'es la carrera';
          extra = '';
        } else if (wks >= 1) {
          num = <CountUp v={wks} />;
          unit = wks === 1 ? 'semana' : 'semanas';
          extra = rem > 0 ? 'y ' + rem + (rem === 1 ? ' día' : ' días') : '';
        } else {
          num = <CountUp v={days} />;
          unit = days === 1 ? 'día' : 'días';
          extra = '';
        }
        if (ri > 0)
          return (
            <div key={r.id} className="hero2">
              <div className="big">
                {num}
                <small>{unit}</small>
              </div>
              <div>
                <b>
                  {r.name} · {raceDateLabel(r)}
                </b>
                <span>{goal}</span>
              </div>
            </div>
          );
        return (
          <section key={r.id} className="hero">
            <div className="eyebrow">Cuenta regresiva · {r.name}</div>
            <div className="hero-main">
              <div className="hero-num">
                {num}
                <small>{unit}</small>
              </div>
              <div className="hero-info">
                <b>{raceDateLabel(r)}</b>
                <span>{goal}</span>
                {extra ? <span>{extra}</span> : null}
              </div>
            </div>
            {pw && days > 0 ? (
              <>
                <div className="wkbar" aria-hidden="true">
                  <WkTicks total={pw.total} cur={pw.wk - 1} />
                </div>
                <div className="wkcap">
                  <span>
                    Semana {pw.wk} de {pw.total} del plan
                  </span>
                  <span>Faltan {days} días</span>
                </div>
              </>
            ) : null}
            <button className="btn sm" style={{ marginTop: 14 }} data-a="goRace" onClick={() => goRace()}>
              Plan de carrera
            </button>
          </section>
        );
      })}
      <LastRaceNote />
    </>
  );
}
