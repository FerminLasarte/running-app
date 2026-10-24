/* De dónde sale el ritmo realista: la estimación con tus entrenamientos (trainEstHtml, líneas 3084–3090 del original). */
import type { Race } from '@/lib/domain/types';
import type { TrainEst as TE } from '@/lib/domain/race';
import { dShort, dateLabel, fmtDur, pd } from '@/lib/domain/util';

const KN = { series: 'Series', tempo: 'Tempo', test: 'Test' } as const;

export function TrainEst({ te, race }: { te: TE; race: Race }) {
  const wk = Math.round(-te.slope * 7);
  return (
    <>
      <div className="lv-box" style={{ marginTop: 12 }}>
        <b>De dónde sale el ritmo realista.</b> Uso tus {te.C.length}
        {te.C.length === 1 ? ' sesión' : ' sesiones'} de calidad desde el {dShort(pd(te.from))}. Hoy tu nivel equivale a <b>{fmtDur(te.cur)}</b>
        {wk > 0 ? (
          <>
            {' '}
            y venís mejorando unos <b>{wk} s por semana</b>
          </>
        ) : wk < 0 ? (
          '; en las últimas semanas no venís mejorando'
        ) : (
          ''
        )}
        . Para el {dShort(pd(race.date))} proyecto <b>{fmtDur(te.proj)}</b>
        {te.capped ? ' (tu tendencia da más, pero la limito a una mejora prudente de 3% por mes)' : ''}.
      </div>
      <div className="tv-row">
        <details className="tv">
          <summary>Ver las sesiones</summary>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Sesión</th>
                  <th style={{ textAlign: 'right' }}>{race.name} equivalente</th>
                </tr>
              </thead>
              <tbody>
                {te.C.slice()
                  .reverse()
                  .map((c, i) => (
                    <tr key={i}>
                      <td>{dateLabel(c.date)}</td>
                      <td>{KN[c.k]}</td>
                      <td style={{ textAlign: 'right' }}>{fmtDur(te.conv(c.s10))}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="sub" style={{ marginTop: 6 }}>
            Las series dan tiempos más rápidos y los tempos más lentos: por eso la tendencia se mide entre sesiones del mismo tipo y el nivel de hoy combina los dos. Las repeticiones de menos de 400 m no cuentan.
          </p>
        </details>
      </div>
    </>
  );
}
