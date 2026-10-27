'use client';
/* Plan por bloques de la próxima media o maratón: una columna por semana del plan (con la fecha del lunes) con su fase,
   los km planificados (punteado) y los que hiciste (lleno), el nombre de la semana o «liviana» si es de descarga, la
   semana de hoy y la de la carrera. Si son más de 12 semanas, la fila se corre de costado y arranca mostrando la de
   hoy. Recalibrar los ritmos va en el encabezado; esta semana, cómo viene y cómo se arma, al pie. */
import { useEffect, useRef } from 'react';
import { FlagCheckered } from '@phosphor-icons/react';
import { useS } from '@/lib/store';
import type { PhaseKey, Race } from '@/lib/domain/types';
import { isLong } from '@/lib/domain/config';
import { PHASES, blockPlan } from '@/lib/domain/blocks';
import { kmBetween } from '@/lib/domain/stats';
import { openRecal, rcSources, recalUndoTap } from '@/lib/domain/recal';
import { addDays, dShort, dateLabel, fmt, mondayOf, pd, ymd } from '@/lib/domain/util';
import { Button } from '@/components/pista/controls';
import { Key } from '@/components/pista/charts';
import { Panel } from '@/components/pista/structure';
import { PHASE_C, cssVars, cx } from '@/components/pista/util';

function Recal() {
  const { cfg } = useS();
  const last = (cfg.recals || []).slice(-1)[0];
  return (
    <>
      {rcSources().length ? (
        <Button size="sm" onClick={() => openRecal(null)}>
          Recalibrar ritmos
        </Button>
      ) : (
        <Button size="sm" disabled>
          Falta un test
        </Button>
      )}
      {last ? (
        <Button size="sm" variant="ghost" onClick={recalUndoTap}>
          Deshacer la última
        </Button>
      ) : null}
    </>
  );
}

export function BlocksPanel({ race, other }: { race: Race; other: boolean }) {
  const { cfg } = useS();
  const scroller = useRef<HTMLOListElement>(null);
  const P = blockPlan(race);
  useEffect(() => {
    const el = scroller.current,
      cur = el?.querySelector<HTMLElement>('.cur');
    if (el && cur && el.scrollWidth > el.clientWidth) el.scrollLeft = cur.offsetLeft - (el.clientWidth - cur.offsetWidth) / 2;
  }, [P]);
  if (!P) return null;
  const m0 = mondayOf(new Date()),
    lg = isLong(race),
    last = (cfg.recals || []).slice(-1)[0];
  const W = P.weeks.map((w, i) => {
    const now = ymd(w.mon) === ymd(m0),
      done = w.mon <= m0 ? kmBetween(w.mon, addDays(w.mon, 6)) : null;
    /* el nombre de la semana sale de las notas de tus sesiones; si no tiene, la de descarga se marca como liviana */
    return { ...w, now, done, first: i === 0 || P.weeks[i - 1].ph !== w.ph, nm: w.label || (w.deload ? 'liviana' : '') };
  });
  const cw = W.find((w) => w.now),
    max = Math.max(1, ...W.map((w) => Math.max(w.km, w.done || 0)));
  const ks = [...new Set(P.weeks.map((w) => w.ph))] as PhaseKey[];
  const sub = cw ? 'Semana ' + cw.n + ' de ' + P.N + ' · ' + PHASES[cw.ph].n : !P.started ? P.N + ' semanas · arranca el ' + dShort(P.weeks[0].mon) : P.N + ' semanas hasta la largada';
  return (
    <Panel
      id="car-plan"
      className="p-c12 p-rise car-blocks"
      style={cssVars({ '--i': 1 })}
      title={other ? 'Plan por bloques · ' + race.name : 'Plan por bloques'}
      sub={sub}
      flush
      actions={
        <>
          <span className="car-keys">
            <Key color="var(--ink)" kind="sq">
              Hecho
            </Key>
            <Key color="var(--ink-4)" kind="dash">
              Planificado
            </Key>
          </span>
          {P.loaded ? <Recal /> : null}
        </>
      }
    >
      <ol className="car-weeks" ref={scroller} style={cssVars({ '--n': P.N })} aria-label={'Semanas del plan hasta ' + race.name}>
        {W.map((w) => (
          <li key={w.n} className={cx(w.done != null && !w.now && 'done', w.now && 'cur', w.race && 'race', w.deload && 'dl')} style={cssVars({ '--pc': PHASE_C[w.ph] })}>
            <span className="p-sr">
              {'Semana ' + w.n + ', del ' + dShort(w.mon) + ', ' + PHASES[w.ph].n.toLowerCase() + (w.nm ? ' (' + w.nm.toLowerCase() + ')' : '') + ': ' + (w.race ? 'la carrera' : (w.done != null ? 'hiciste ' + fmt(w.done, 1) + ' de ' : '') + w.km + ' km planificados') + (w.long && !w.race ? ', larga de ' + w.long + ' km' : '')}
            </span>
            <div className="ph" aria-hidden="true" />
            {w.first ? (
              <span className="phl" aria-hidden="true">
                {PHASES[w.ph].n}
              </span>
            ) : null}
            <div className="hd" aria-hidden="true">
              <span className="lbl">S{w.n}</span>
              {w.now ? <span className="now">Hoy</span> : null}
            </div>
            <span className="dt" aria-hidden="true">
              {dShort(w.mon)}
            </span>
            <div className="bars" aria-hidden="true">
              {w.race ? (
                <span className="flag">
                  <FlagCheckered weight="fill" />
                </span>
              ) : (
                <>
                  <i className="p" style={{ height: (w.km / max) * 100 + '%' }} />
                  {w.done != null ? <i className="d" style={cssVars({ height: (w.done / max) * 100 + '%', '--j': w.n })} /> : null}
                </>
              )}
            </div>
            <div className="ft" aria-hidden="true">
              {w.race ? (
                <>
                  <b>Carrera</b>
                  {dShort(pd(race.date))}
                </>
              ) : (
                <>
                  <b>{fmt(w.done != null ? w.done : w.km, 1)}</b>
                  {w.done != null ? 'de ' + fmt(w.km, 1) : 'plan'}
                  {w.long ? <span>larga {w.long}</span> : null}
                  {w.nm ? <span className="nm">{w.nm}</span> : null}
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="p-panel-b car-sep">
        {cw ? (
          <p className="car-note">
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
            . Llevás <b>{fmt(cw.done || 0, 1)} km</b>.
          </p>
        ) : null}
        <p className="car-foot">
          {P.loaded ? (
            <>
              Sale de las <b>{P.sessions} sesiones</b> que tenés planificadas: pico de <b>{P.peak} km</b> en la semana {P.peakWeek} y tirada más larga de <b>{P.longest} km</b> en la semana {P.longWeek}.
            </>
          ) : (
            <>
              Parte de {P.started ? 'los' : 'tus'} <b>{fmt(P.cur, 0)} km por semana</b> {P.started ? 'que hacías antes de empezar' : 'actuales'} y llega a unos <b>{P.peak} km</b> en el bloque específico. Si cargás las sesiones de tu plan, sale de ellas.
            </>
          )}
          {!cw && !P.started && P.prev ? ' Arranca después de tu ' + P.prev.name + ': hasta entonces seguí el plan de esa carrera.' : ''}
          {last ? ' Última recalibración de ritmos: ' + dateLabel(last.at) + ' con tu ' + String(last.src).toLowerCase() + '.' : P.loaded ? ' Después de cada test o carrera podés recalibrar los ritmos de las sesiones que vienen.' : ''}
        </p>
        <details className="car-more">
          <summary>¿Cómo se arma?</summary>
          <ul className="car-phases">
            {ks.map((k) => (
              <li key={k} style={cssVars({ '--pc': PHASE_C[k] })}>
                <b>{PHASES[k].n}</b> {PHASES[k].x}
              </li>
            ))}
          </ul>
          {P.loaded ? (
            <p className="car-foot">
              Cada semana suma los km de las sesiones que tenés planificadas (las etapas por tiempo se estiman con su ritmo) y la larga es el fondo o la carrera más largos.{' '}
              {(race.phases || []).length ? 'Las fases son las de tu plan.' : 'Las fases se reparten por proporción: las últimas ' + (lg ? 3 : 2) + ' semanas son la puesta a punto.'} Si cambiás una sesión, el plan se actualiza solo.
            </p>
          ) : null}
          <p className="car-foot">
            Si no hay sesiones cargadas, el plan genérico arranca de tu promedio de las últimas 4 semanas y sube hasta 8% por semana, con una semana 25% más liviana cada 4. El techo es de unos {P.peak} km por semana en el específico (base 80%, desarrollo 90%). La tirada larga crece 1,5 km por semana hasta{' '}
            {lg ? '20 km en base, 26 en desarrollo y 32 en el específico' : '14 km en base, 16 en desarrollo y 20 en el específico'}. Las últimas {lg ? 3 : 2} semanas bajan el volumen. Es una guía general para corredores populares: si tenés entrenador, manda su plan.
          </p>
        </details>
      </div>
    </Panel>
  );
}
