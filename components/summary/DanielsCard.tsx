'use client';
/* Tus ritmos de entrenamiento por la fórmula de Jack Daniels (línea 4363 del original). */
import { useApp, setUi } from '@/lib/store';
import { refRace } from '@/lib/domain/config';
import { PZ, paceAtV, vdotOf } from '@/lib/domain/daniels';
import { doneList } from '@/lib/domain/stats';
import { dayDiff, fmt, fmtDur, fmtPace, pd, sum } from '@/lib/domain/util';
import { lvPace } from '@/lib/domain/level';
import { TvMore } from '@/components/ui/TvMore';

/** `inner`: la versión corta que va dentro de «Los ritmos de tu plan» */
export function DanielsCard({ inner }: { inner: boolean }) {
  const pzb = useApp((st) => st.ui.pzb) as string | undefined;
  const race = refRace(),
    cur = lvPace(),
    mode = pzb === 'goal' || !cur ? 'goal' : 'now';
  const baseSec: number = mode === 'goal' ? race.targetSec : cur!.sec,
    vd = vdotOf(baseSec, 10);
  const p = (i: number, j?: number) => paceAtV(vd, PZ[i].f[j || 0]);
  const chips = cur ? (
    <div className="seg" style={{ margin: '10px 0 4px' }}>
      <button className="chip" data-a="pzb" data-v="now" aria-pressed={mode === 'now'} onClick={() => setUi('pzb', 'now')}>
        Mi forma actual · {fmtDur(cur.sec)}
      </button>
      <button className="chip" data-a="pzb" data-v="goal" aria-pressed={mode === 'goal'} onClick={() => setUi('pzb', 'goal')}>
        Mi objetivo · {fmtDur(race.targetSec)}
      </button>
    </div>
  ) : null;
  const table = (
    <table className="zt">
      <tbody>
        {PZ.map((q, i) => {
          const a = q.f[0] !== q.f[1] ? fmtPace(p(i, 1)) + '–' + fmtPace(p(i, 0)) : fmtPace(p(i));
          return [
            <tr key={q.k}>
              <td>
                <span className="dot" style={{ background: q.c, display: 'inline-block', marginRight: 8 }}></span>
                <b>{q.n}</b>
              </td>
              <td style={{ textAlign: 'right' }}>
                <b className="num">{a}</b>
                <small className="mut"> /km</small>
              </td>
              <td style={{ textAlign: 'right' }} className="mut">
                {q.z}
              </td>
            </tr>,
            <tr key={q.k + '-u'}>
              <td colSpan={3} className="sub" style={{ borderTop: 0, paddingTop: 0 }}>
                {q.u}
              </td>
            </tr>,
          ];
        })}
      </tbody>
    </table>
  );
  const I = p(3),
    T = p(2);
  const sets = (
    <>
      <p style={{ marginTop: 12 }}>
        <b>Series con ritmo de intervalos:</b> 400 m en {fmtDur(I * 0.4)} · 600 m en {fmtDur(I * 0.6)} · 800 m en {fmtDur(I * 0.8)} · 1.000 m en {fmtDur(I)}.
      </p>
      <p>
        <b>Tempo:</b> 3 km en {fmtDur(T * 3)} · 5 km en {fmtDur(T * 5)}.
      </p>
    </>
  );
  if (inner)
    return (
      <>
        <p className="sub" style={{ marginTop: 6 }}>
          Es una estimación con la fórmula de Jack Daniels (VDOT {fmt(vd, 1)}), no reemplaza los ritmos de tu plan. Sirve para comparar.
        </p>
        {chips}
        {table}
        {sets}
      </>
    );
  let cmp = null;
  const fo = doneList().filter((x) => x.type === 'fondo' && x.result.paceSec > 0 && dayDiff(pd(x.result.date), new Date()) <= 28);
  if (fo.length >= 2) {
    const avg = sum(fo.map((x) => x.result.paceSec)) / fo.length,
      lo = p(0, 1);
    cmp = (
      <p className="sub" style={{ marginTop: 10 }}>
        Tus fondos de las últimas 4 semanas: <b>{fmtPace(avg)}/km</b>. {avg > lo + 20 ? 'Van más lentos que el rango fácil, y está bien: en los fondos manda la FC (Z2), no el ritmo.' : 'Están dentro del rango fácil.'}
      </p>
    );
  }
  const gap = cur && mode === 'goal' ? cur.sec - race.targetSec : null;
  const msg =
    gap == null ? null : (
      <div className="lv-box" style={{ marginTop: 12 }}>
        {gap > 5 ? (
          <>
            Para llegar a <b>{fmtDur(race.targetSec)}</b> hoy te faltan unos <b>{fmtDur(gap)}</b> respecto a tu forma actual: el ritmo de umbral de ese objetivo sería {fmtPace(T)}/km.
          </>
        ) : (
          <>
            Tu forma actual ya alcanza para <b>{fmtDur(race.targetSec)}</b>. Falta sostenerlo en carrera.
          </>
        )}
      </div>
    );
  return (
    <section className="card">
      <div className="h3">Tus ritmos de entrenamiento</div>
      <div className="sub">
        {mode === 'now' ? 'Calculados desde tu 10K estimado (' + String(cur!.txt).replace(/^tu |^tus /, '') + ').' : 'Calculados como si ya corrieras el 10K en ' + fmtDur(race.targetSec) + '.'} Son una guía: si la FC o las piernas
        dicen otra cosa, mandan ellas.
      </div>
      {chips}
      {table}
      {sets}
      {cmp}
      {msg}
      <div className="tv-row">
        <TvMore t="¿Cómo se calcula?">
          Con la fórmula de Jack Daniels (VDOT): de un tiempo de 10K saca tu capacidad aeróbica ({fmt(vd, 1)}) y de ahí el ritmo de cada tipo de entrenamiento. Es una estimación: un test o una carrera de 10K la ajustan con un dato
          real.
        </TvMore>
      </div>
    </section>
  );
}
