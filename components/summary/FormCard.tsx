/* Forma y fatiga (línea 4220 del original). */
import type { CSSProperties } from 'react';
import { CountUp } from '@/components/ui/CountUp';
import { LineChart } from '@/components/charts';
import { formSeries } from '@/lib/domain/analysis';
import { dShort, fmt } from '@/lib/domain/util';

const sign = (t: number) => (Math.round(t) > 0 ? '+' : '') + fmt(Math.round(t) || 0, 0);

export function FormCard() {
  const F = formSeries();
  if (!F)
    return (
      <section className="card">
        <div className="h3">Forma y fatiga</div>
        <p>Con unas 3 semanas de entrenamientos te muestro cuánta forma acumulaste y qué tan descansado estás.</p>
      </section>
    );
  const L = F[F.length - 1],
    pts = F.slice(-84)
      .filter((q, i, a) => (a.length - 1 - i) % 2 === 0)
      .map((q) => ({ t: q.t, v: q.ctl * 1, read: dShort(q.d) + ' · forma ' + fmt(q.ctl, 0) + ' · fatiga ' + fmt(q.atl, 0) + ' · frescura ' + sign(q.tsb) }));
  const t = L.tsb;
  const st =
    t < -20
      ? { c: 'var(--crit)', t: 'Muy cargado', x: 'Venís acumulando más de lo que asimilás. Una semana más liviana te haría bien.' }
      : t < -8
        ? { c: 'var(--warn)', t: 'Cargado', x: 'Zona normal de bloque de entrenamiento: cansado pero productivo.' }
        : t < 6
          ? { c: 'var(--good)', t: 'Equilibrado', x: 'Buen punto para entrenar bien sin acumular fatiga de más.' }
          : t < 18
            ? { c: 'var(--info)', t: 'Fresco', x: 'Descansado: el estado ideal para competir.' }
            : { c: 'var(--base)', t: 'Muy descansado', x: 'Hace varios días que entrenás poco; la forma empieza a bajar.' };
  const wk = F.length > 8 ? F[F.length - 8] : F[0],
    dv = L.ctl - wk.ctl;
  return (
    <section className="card" style={{ '--bc': st.c } as CSSProperties}>
      <div className="eyebrow">Forma y fatiga</div>
      <div className="lv-h">
        <div className="big">
          <CountUp v={Math.round(L.ctl)} d={0} />
          <small>forma</small>
        </div>
        <div className="lv-s">
          <span className="lv-tag">{st.t}</span>
          <br />
          Fatiga <b>{fmt(L.atl, 0)}</b> · frescura <b>{sign(t)}</b>. {st.x} Tu forma {dv > 1 ? 'subió' : dv < -1 ? 'bajó' : 'está estable'} {fmt(Math.abs(dv), 0)} puntos en la última semana.
        </div>
      </div>
      <LineChart id="form" pts={pts} o={{ invert: false, yFmt: (v) => fmt(v, 0), minPad: 3, aria: 'Forma acumulada' }} />
      <div className="tv-row">
        <details className="tv">
          <summary>¿Cómo se calcula?</summary>
          <p className="sub">
            A cada salida le asigno una carga según su duración y qué tan alta fue tu frecuencia cardíaca (las series y tempos pesan un poco más). La <b>forma</b> es el promedio de esa carga en unas 6 semanas, la <b>fatiga</b> en unos 7
            días y la <b>frescura</b> es la diferencia. Son unidades relativas: sirven para comparar tu semana con tus semanas anteriores, no con otras personas. No cuento el gimnasio ni la bici.
          </p>
        </details>
      </div>
    </section>
  );
}
