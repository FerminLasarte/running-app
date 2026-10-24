'use client';
/* Plan por bloques para media maratón y maratón (viewBlocks, líneas 3395–3420 del original). */
import type { Race, PhaseKey } from '@/lib/domain/types';
import { PHASE_KEYS, isLong } from '@/lib/domain/config';
import { PHASES, blockPlan, blockWeekOf } from '@/lib/domain/blocks';
import { kmBetween } from '@/lib/domain/stats';
import { addDays, dShort, fmt, mondayOf, ymd } from '@/lib/domain/util';
import { raceDateLabel } from '@/lib/domain/week';
import { RecalBox } from './RecalBox';

export function Blocks({ race }: { race: Race | null }) {
  const P = blockPlan(race);
  if (!P || !race)
    return (
      <section className="card">
        <div className="h3">Plan por bloques</div>
        <p>El plan por bloques es para medias maratones y maratones, con al menos 4 semanas por delante.</p>
      </section>
    );
  const m0 = mondayOf(new Date()),
    cw = blockWeekOf(P, m0),
    first = P.weeks[0];
  const cnt: Partial<Record<PhaseKey, number>> = {};
  P.weeks.forEach((w) => {
    cnt[w.ph] = (cnt[w.ph] || 0) + 1;
  });
  const ks = PHASE_KEYS.filter((k) => cnt[k]),
    lg = isLong(race);
  const doneNow = cw ? kmBetween(m0, addDays(m0, 6)) : 0;
  return (
    <>
      <section className="card">
        <div className="eyebrow">
          Plan por bloques · {race.name} · {raceDateLabel(race)}
        </div>
        <div className="lv-h">
          <div className="big">
            {P.N}
            <small>semanas</small>
          </div>
          <div className="lv-s">
            {!cw && !P.started ? (
              <>
                Arranca el <b>{dShort(first.mon)}</b>
                {P.prev ? ', después de tu ' + P.prev.name + '. Hasta entonces seguí el plan de esa carrera. ' : '. '}
                Si querés otra fecha, cargá el inicio del plan en Ajustes.{' '}
              </>
            ) : cw ? (
              <>
                Estás en la <b>semana {cw.n}</b> ({PHASES[cw.ph].n.toLowerCase()}).{' '}
              </>
            ) : null}
            {P.loaded ? (
              <>
                Sale de las <b>{P.sessions} sesiones</b> que tenés planificadas. Pico de <b>{P.peak} km</b> en la semana {P.peakWeek} y tirada más larga de <b>{P.longest} km</b> en la semana {P.longWeek}.
              </>
            ) : (
              <>
                Parte de {P.started ? 'los' : 'tus'} <b>{fmt(P.cur, 0)} km por semana</b> {P.started ? 'que hacías antes de empezar' : 'actuales'} y llega a unos <b>{P.peak} km</b> en el bloque específico. Si cargás las sesiones de tu plan, esta vista sale de ellas.
              </>
            )}
          </div>
        </div>
        <div className="zwrap">
          <div className="zbar">
            {ks.map((k) => (
              <i key={k} style={{ flex: cnt[k], background: PHASES[k].c }}></i>
            ))}
          </div>
        </div>
        <div className="zlab">
          {ks.map((k) => (
            <span key={k} style={{ flex: cnt[k] }}>
              {PHASES[k].n} · {cnt[k]}
            </span>
          ))}
        </div>
        <ul className="rdy-l" style={{ marginTop: 16 }}>
          {ks.map((k) => (
            <li key={k}>
              <i style={{ background: PHASES[k].c }}></i>
              <div>
                <b>{PHASES[k].n}</b>
                <span>{PHASES[k].x}</span>
              </div>
            </li>
          ))}
        </ul>
        {cw ? (
          <div className="lv-box">
            Esta semana{cw.label ? ' (' + cw.label.toLowerCase() + ')' : cw.deload ? ' (semana liviana)' : ''}: <b>{cw.km} km</b>
            {cw.race ? (
              ' con la carrera'
            ) : cw.long ? (
              <>
                {' '}
                con una tirada larga de <b>{cw.long} km</b>
              </>
            ) : (
              ''
            )}
            . Llevás <b>{fmt(doneNow, 1)} km</b>.
          </div>
        ) : null}
        {P.loaded ? <RecalBox /> : null}
      </section>
      <section className="card">
        <div className="h3">Semana por semana</div>
        <div className="sub">{P.loaded ? 'Kilómetros planificados y la salida más larga de cada semana, según tus sesiones cargadas.' : 'Kilómetros totales y tirada larga sugeridos. Cada 4 semanas hay una más liviana para asimilar.'}</div>
        <div className="tw" style={{ maxHeight: 460, overflow: 'auto', marginTop: 10 }}>
          <table className="zt">
            <thead>
              <tr>
                <th>Sem.</th>
                <th>Desde</th>
                <th>Fase</th>
                <th style={{ textAlign: 'right' }}>Km</th>
                <th style={{ textAlign: 'right' }}>Larga</th>
              </tr>
            </thead>
            <tbody>
              {P.weeks.map((w) => {
                const now = ymd(w.mon) === ymd(m0),
                  past = w.mon < m0,
                  done = past || now ? kmBetween(w.mon, addDays(w.mon, 6)) : null;
                return (
                  <tr key={w.n} style={now ? { background: 'var(--accent-soft)' } : undefined}>
                    <td>
                      <b>{w.n}</b>
                    </td>
                    <td>{dShort(w.mon)}</td>
                    <td>
                      <span className="dot" style={{ display: 'inline-block', marginRight: 6, background: PHASES[w.ph].c }}></span>
                      {PHASES[w.ph].n}
                      {w.label ? (
                        <>
                          <br />
                          <small className="mut">{w.label}</small>
                        </>
                      ) : w.deload ? (
                        ' · liviana'
                      ) : (
                        ''
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {w.km}
                      {done != null ? (
                        <>
                          <br />
                          <small className="mut">hiciste {fmt(done, 0)}</small>
                        </>
                      ) : null}
                    </td>
                    <td style={{ textAlign: 'right' }}>{w.race ? 'Carrera' : w.long ? w.long + ' km' : '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="tv-row">
          <details className="tv">
            <summary>¿Cómo se arma?</summary>
            {P.loaded ? (
              <p className="sub">
                Cada semana suma los km de las sesiones que tenés planificadas (las etapas por tiempo se estiman con su ritmo) y la larga es el fondo o la carrera más largos.{' '}
                {(race.phases || []).length ? 'Las fases son las de tu plan.' : 'Las fases se reparten por proporción: las últimas ' + (lg ? 3 : 2) + ' semanas son la puesta a punto.'} Si cambiás una sesión, esta vista se actualiza sola.
              </p>
            ) : null}
            <p className="sub">
              Si no hay sesiones cargadas, el plan genérico arranca de tu promedio de las últimas 4 semanas y sube hasta 8% por semana, con una semana 25% más liviana cada 4. El techo es de unos {P.peak} km por semana en el específico (base 80%, desarrollo 90%). La tirada larga crece 1,5 km por semana hasta{' '}
              {lg ? '20 km en base, 26 en desarrollo y 32 en el específico' : '14 km en base, 16 en desarrollo y 20 en el específico'}. Las últimas {lg ? 3 : 2} semanas bajan el volumen. Es una guía general para corredores populares: si tenés entrenador, manda su plan.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
