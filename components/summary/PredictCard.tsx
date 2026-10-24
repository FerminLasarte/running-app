/* Predicción del tiempo de la próxima carrera (línea 2754 del original). */
import { nextRace, racePaceSec } from '@/lib/domain/config';
import { dShort, dateLabel, fmt, fmtDur, fmtPace, pd } from '@/lib/domain/util';
import { raceEst } from '@/lib/domain/race';
import { TvMore } from '@/components/ui/TvMore';

export function PredictCard() {
  const race = nextRace();
  if (!race) return null;
  const e = raceEst(race),
    hasT = race.targetSec > 0;
  if (!e)
    return (
      <section className="card">
        <div className="h3">Predicción {race.name}</div>
        <p>
          Registrá un <b>test</b> de entre 3 y 21 km a esfuerzo máximo (por ejemplo un 5K a fondo), o algunas series y tempos, y acá aparece cuánto harías en el {race.name}.
        </p>
        {hasT ? (
          <p className="sub">
            Objetivo: {fmtDur(race.targetSec)} ({fmtPace(racePaceSec(race))}/km).
          </p>
        ) : null}
      </section>
    );
  const pr = e.pr,
    lo = e.src === 'test' ? e.lo : undefined,
    gap = e.t - race.targetSec,
    pace = e.t / race.km;
  return (
    <section className="card">
      <div className="h3">Predicción {race.name}</div>
      <div className="big" style={{ fontSize: lo ? '40px' : '54px', lineHeight: 1, marginTop: 6 }}>
        {lo ? fmtDur(lo) + ' – ' + fmtDur(e.t) : fmtDur(e.t)}
      </div>
      <div className="sub">
        {(lo ? fmtPace(lo / race.km) + ' a ' : '') + fmtPace(pace) + '/km · '}
        {e.src === 'test'
          ? 'basado en tu test del ' + dateLabel(e.pr.s.result.date) + ' (' + fmt(e.pr.s.result.distKm, 1) + ' km en ' + fmtDur(e.pr.s.result.timeSec) + ')'
          : 'para el ' + dShort(pd(race.date)) + ', según tus ' + e.te.C.length + ' sesiones de calidad desde el ' + dShort(pd(e.te.from)) + '. Hoy equivale a ' + fmtDur(e.cur)}
      </div>
      {hasT ? (
        <p>
          {gap <= 0
            ? (lo ? 'Aun en el caso prudente estarías ' : 'Con eso ya estarías ') + fmtDur(-gap) + ' por debajo de tu objetivo de ' + fmtDur(race.targetSec) + '.'
            : (lo ? 'En el caso prudente te faltan ' : 'Te faltan ') + fmtDur(gap) + ' para tu objetivo de ' + fmtDur(race.targetSec) + '.'}
        </p>
      ) : null}
      {e.src === 'train' && pr ? (
        <p className="sub">
          Tu test del {dateLabel(pr.s.result.date)} ({fmt(pr.s.result.distKm, 1)} km en {fmtDur(pr.s.result.timeSec)}) daba {fmtDur(pr.lo || pr.t)}
          {pr.lo ? ' a ' + fmtDur(pr.t) : ''}, pero es anterior a tus últimas series y tempos, así que ya no refleja cómo estás.
        </p>
      ) : null}
      <div className="tv-row">
        <TvMore t="¿Cómo se calcula?">
          {e.src === 'test'
            ? 'Uso la fórmula de Riegel: tu tiempo se multiplica por (distancia nueva ÷ distancia del test) elevado a 1,06. Sirve si el test fue a máximo esfuerzo y llegaste descansado. ' +
              (lo
                ? 'Para distancias largas desde un test corto suele dar tiempos demasiado rápidos si no tenés mucho volumen, así que muestro un rango: el número más rápido es el de Riegel y el más lento usa un exponente de 1,10 (caso prudente). '
                : '')
            : 'Cada serie y tempo se convierte a un 10K equivalente, se mide cuánto venís mejorando y se proyecta al día de la carrera, con un tope prudente de 3% por mes. Es el mismo número que el escenario «Realista» de Ritmo de carrera. Un test nuevo a esfuerzo máximo pasa a mandar sobre esta cuenta. '}
          Es una estimación, no una promesa.
        </TvMore>
      </div>
    </section>
  );
}
