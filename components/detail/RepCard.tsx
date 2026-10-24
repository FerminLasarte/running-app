/* Repeticiones de series y tempos: cómo se repartió el ritmo de principio a fin. */
import type { CSSProperties } from 'react';
import type { Session } from '@/lib/domain/types';
import { repData } from '@/lib/domain/reps';
import { fmt, fmtPace, sum } from '@/lib/domain/util';

export function RepCard({ s }: { s: Session }) {
  const R = repData(s);
  if (!R) return null;
  const P = R.map((x) => x.pace),
    best = Math.min(...P),
    worst = Math.max(...P),
    avg = sum(P) / P.length;
  const k = Math.max(1, Math.floor(P.length / 3)),
    f = sum(P.slice(0, k)) / k,
    l = sum(P.slice(-k)) / k,
    fade = (l / f - 1) * 100;
  const sd = Math.sqrt(sum(P.map((x) => (x - avg) * (x - avg))) / P.length),
    cv = (sd / avg) * 100;
  const msg =
    fade < -1.5
      ? 'Fuiste de menos a más: las últimas repeticiones fueron más rápidas. Muy buen manejo del esfuerzo.'
      : fade <= 1.5
        ? 'Ritmo muy parejo de principio a fin. Eso es controlar la sesión.'
        : fade <= 4
          ? 'Caíste un poco hacia el final (' + fmt(fade, 1) + '% más lento). Es normal; si pasa siempre, salí 2 o 3 segundos más tranquilo.'
          : 'Te caíste ' + fmt(fade, 1) + '% hacia el final: probablemente saliste muy fuerte o llegaste cansado.';
  const hrs = R.filter((x) => x.hr! > 0);
  return (
    <>
      <div className="h3" style={{ marginTop: 16 }}>
        Repeticiones
      </div>
      <div className="reps">
        {R.map((x, i) => (
          <div className="rp" key={i}>
            <span>{i + 1}</span>
            <div className="meter sm" style={{ '--bc': x.pace === best ? 'var(--good)' : 'var(--c1)' } as CSSProperties}>
              <i style={{ width: Math.round(40 + (60 * (worst - x.pace)) / (worst - best || 1)) + '%' }}></i>
            </div>
            <b>{fmtPace(x.pace)}</b>
          </div>
        ))}
      </div>
      <table className="cmp">
        <tbody>
          <tr>
            <td>Mejor y peor</td>
            <td>
              {fmtPace(best)} y {fmtPace(worst)}/km
            </td>
          </tr>
          <tr>
            <td>Promedio</td>
            <td>{fmtPace(avg)}/km</td>
          </tr>
          <tr>
            <td>Variación entre repeticiones</td>
            <td>{fmt(cv, 1)}%</td>
          </tr>
          <tr>
            <td>Inicio vs final</td>
            <td>{(fade > 0 ? '+' : '') + fmt(fade, 1) + '% (' + (fade > 0 ? 'más lento' : 'más rápido') + ')'}</td>
          </tr>
          {hrs.length >= 3 ? (
            <tr>
              <td>FC primera y última</td>
              <td>{Math.round(hrs[0].hr!) + ' → ' + Math.round(hrs[hrs.length - 1].hr!) + ' lpm'}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <p className="note" style={{ border: 0 }}>
        {msg}
      </p>
    </>
  );
}
