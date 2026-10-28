/* El puntaje de una sesión con piezas «Pista»: el número con sus marcas y qué quiere decir, el desglose por parte y
   las notas. Lo usan el detalle de sesión y el panel que se abre al guardar un resultado. */
import type { Score } from '@/lib/domain/score';
import { bandOf } from '@/lib/domain/score';
import { HowTo } from '@/components/pista/structure';
import { Laps, Ticks } from '@/components/pista/meters';
import { cx } from '@/components/pista/util';

/** el número grande con sus marcas, la banda («Muy bien») y el resumen */
export function ScoreHead({ sc }: { sc: Score }) {
  if (sc.score == null) return null;
  const b = bandOf(sc.score);
  return (
    <div className={cx('ses-sc', 'b-' + b.k)}>
      <span className="disp">
        {sc.score}
        <span className="p-u">/100</span>
      </span>
      <div>
        <div className="ses-sc-b">
          <Ticks value={sc.score} />
          <b>{b.t}</b>
        </div>
        {sc.summary ? <p>{sc.summary}</p> : null}
      </div>
    </div>
  );
}

/** cada parte con sus puntos, una barra y la explicación; después las notas */
export function ScoreParts({ sc }: { sc: Score }) {
  return (
    <>
      {sc.parts.length ? (
        <ul className="ses-parts">
          {sc.parts.map((p, i) => (
            <li key={i} className={'b-' + bandOf(p.sc).k}>
              <div className="ses-row">
                <b>{p.label}</b>
                <span className="mono">
                  {p.pts} de {p.max}
                </span>
              </div>
              <Laps value={p.sc / 100} n={20} h={6} />
              <p>{p.text}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {sc.notes.map((n, i) => (
        <p className="ses-note" key={i}>
          {n}
        </p>
      ))}
      {sc.how ? <HowTo>{sc.how}</HowTo> : null}
    </>
  );
}
