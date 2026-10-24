/* Preparación para la próxima carrera (línea 2737 del original). */
import type { CSSProperties } from 'react';
import { isLong, longTarget, nextRace } from '@/lib/domain/config';
import { readyItems, type ReadyItem, type ReadyKind } from '@/lib/domain/readiness';
import { raceDateLabel } from '@/lib/domain/week';
import { dayDiff, fmt, pd, sod } from '@/lib/domain/util';

const COL: Record<ReadyKind, string> = { good: 'var(--good)', warn: 'var(--warn)', crit: 'var(--crit)', na: 'var(--base)' };

function Li({ i }: { i: ReadyItem }) {
  return (
    <li>
      <i style={{ background: COL[i.k] }}></i>
      <div>
        <b>{i.t}</b>
        <span>{i.x}</span>
      </div>
    </li>
  );
}

export function ReadyCard() {
  const race = nextRace();
  if (!race) return null;
  const days = dayDiff(sod(new Date()), pd(race.date));
  const I = readyItems(race),
    val = I.filter((i) => i.k !== 'na'),
    ok = val.filter((i) => i.k === 'good').length,
    wks = Math.floor(days / 7);
  const bad = I.filter((i) => i.k === 'crit').concat(I.filter((i) => i.k === 'warn')),
    rest = I.filter((i) => i.k === 'good').concat(I.filter((i) => i.k === 'na'));
  const pc = val.length ? ok / val.length : 0,
    rc = pc >= 0.8 ? 'var(--good)' : pc >= 0.5 ? 'var(--warn)' : 'var(--crit)';
  const when = wks > 0 ? 'Faltan ' + wks + (wks === 1 ? ' semana' : ' semanas') + (days % 7 ? ' y ' + (days % 7) + (days % 7 === 1 ? ' día' : ' días') : '') : 'Faltan ' + days + (days === 1 ? ' día' : ' días');
  return (
    <section className="card rdy">
      <div className="rdy-top">
        <span className="gl-ring rdy-ring" style={{ '--gc': rc } as CSSProperties}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle className="rt" cx="50" cy="50" r="43" />
            <circle className="rf" cx="50" cy="50" r="43" pathLength={100} style={{ strokeDasharray: (pc * 100).toFixed(1) + ' 100' }} />
          </svg>
          <b>
            {ok}
            <small>/{val.length}</small>
          </b>
        </span>
        <div className="rdy-tx">
          <div className="h3">Preparación para el {race.name}</div>
          <p className="sub">
            {when} · {raceDateLabel(race)}
          </p>
          <p className="rdy-msg">
            {bad.length ? (
              bad.length === 1 ? (
                <>
                  Hay <b>1 cosa</b> para mirar.
                </>
              ) : (
                <>
                  Hay <b>{bad.length} cosas</b> para mirar.
                </>
              )
            ) : val.length ? (
              'Todo viene en orden.'
            ) : (
              'Cargá más sesiones para ver tu estado.'
            )}
            {days <= 14 && days > 0 ? ' Recta final: no busques más ritmo ni más km.' : ''}
          </p>
        </div>
      </div>
      {bad.length ? (
        <ul className="rdy-l">
          {bad.map((i) => (
            <Li key={i.t} i={i} />
          ))}
        </ul>
      ) : null}
      <div className="tv-row">
        {rest.length ? (
          <details className="tv">
            <summary>{ok ? 'Ver ' + (ok === 1 ? 'la que está' : 'las ' + ok + ' que están') + ' en verde' : 'Ver el resto'}</summary>
            <ul className="rdy-l">
              {rest.map((i) => (
                <Li key={i.t} i={i} />
              ))}
            </ul>
          </details>
        ) : null}
        <details className="tv">
          <summary>¿Cómo se evalúa?</summary>
          <p className="sub">
            Verde, amarillo y rojo son reglas simples sobre tus propios datos, no una predicción de tu tiempo.{' '}
            {isLong(race)
              ? 'Volumen: unos ' + (race.km > 30 ? 45 : 30) + ' km por semana en el bloque específico. Tirada larga: al menos ' + fmt(longTarget(race.km), 0) + ' km. Faltando más de 16 semanas, volumen y tirada larga quedan en gris si todavía no llegás: no se esperan aún.'
              : 'Series: cuánto te alejás del ritmo de carrera. Tirada larga: al menos ' + fmt(longTarget(race.km), 0) + ' km.'}{' '}
            Cumplimiento: 85% o más. Carga: entre 0,8 y 1,3. Deriva: menos de 5%. Gris significa que todavía faltan datos.
          </p>
        </details>
      </div>
    </section>
  );
}
