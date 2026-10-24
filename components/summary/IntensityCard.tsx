/* Reparto de intensidad de los últimos 28 días (línea 4290 del original). */
import { zoneRange } from '@/lib/domain/config';
import { hardKm } from '@/lib/domain/analysis';
import { doneList, hrRangeOf } from '@/lib/domain/stats';
import { addDays, sod, sum, ymd } from '@/lib/domain/util';

export function IntensityCard() {
  const today = sod(new Date()),
    a = ymd(addDays(today, -27)),
    b = ymd(today);
  const w = doneList().filter((x) => x.result.date >= a && x.result.date <= b);
  if (w.length < 4) return null;
  const tot = sum(w.map((x) => x.result.distKm));
  if (tot <= 0) return null;
  const kh = sum(w.filter((x) => x.type === 'series' || x.type === 'tempo' || x.type === 'test').map(hardKm)),
    ph = Math.round((kh / tot) * 100),
    pe = 100 - ph;
  const msg =
    pe >= 90
      ? 'Casi todo es fácil: si tu plan lo permite, sumá una sesión de calidad por semana.'
      : pe >= 70
        ? 'Reparto equilibrado: la mayor parte fácil y un bloque de trabajo fuerte. Es lo que se busca para un 10K.'
        : 'Más de un tercio de tus kilómetros es a ritmo fuerte. Cuidá que los fondos sean realmente suaves.';
  const fo = w.filter((x) => x.type === 'fondo' && x.result.hrAvg! > 0);
  let zt = null;
  if (fo.length) {
    /* cada fondo se compara con el rango de FC que tenía planificado; si no tenía, con Z2 */
    const tops = fo.map((x) => {
      const g = hrRangeOf(x) || zoneRange(1);
      return { h: x.result.hrAvg!, top: g[1], own: !!hrRangeOf(x) };
    });
    const ok = tops.filter((q) => q.h <= q.top).length,
      over = tops.filter((q) => q.h > q.top),
      avg = Math.round(sum(fo.map((x) => x.result.hrAvg!)) / fo.length),
      own = tops.filter((q) => q.own).length;
    const by = over.length ? Math.round(sum(over.map((q) => q.h - q.top)) / over.length) : 0;
    zt = (
      <p className="sub" style={{ marginTop: 10 }}>
        Tus fondos: FC media <b>{avg} lpm</b>.{' '}
        <b>
          {ok} de {fo.length}
        </b>{' '}
        quedaron dentro del rango {own === fo.length ? 'que tenían planificado' : own ? 'planificado (o de Z2 si no tenían uno)' : 'de Z2 (' + zoneRange(1).join('–') + ' lpm)'}.{' '}
        {!over.length
          ? 'Los hacés bien fáciles.'
          : by <= 5
            ? 'Los demás se pasaron por poco (' + by + ' lpm en promedio): con calor o cansancio es normal.'
            : 'Los demás se pasaron ' + by + ' lpm en promedio: si querés fondos más suaves, bajá un poco el ritmo.'}
      </p>
    );
  }
  return (
    <section className="card">
      <div className="h3">Reparto de intensidad</div>
      <div className="sub">Tus últimos 28 días, por kilómetros.</div>
      <div className="zwrap">
        <div className="zbar">
          <i style={{ flex: pe, background: 'var(--good)' }}></i>
          <i style={{ flex: Math.max(ph, 1), background: 'var(--serious)' }}></i>
        </div>
        <div className="zlab">
          <span style={{ flex: pe }}>fácil {pe}%</span>
          <span style={{ flex: Math.max(ph, 1) }}>fuerte {ph}%</span>
        </div>
      </div>
      <p style={{ marginTop: 8 }}>{msg}</p>
      {zt}
      <div className="tv-row">
        <details className="tv">
          <summary>¿Cómo se calcula?</summary>
          <p className="sub">
            Fuerte: los kilómetros de trabajo de series, tempos y tests. Si en la nota de la sesión está escrito «8x600 m», cuento 8 por 600 m; si no, estimo el 40% de la sesión (el resto es calentamiento, pausas y enfriamiento). Para un
            10K se busca algo así como 75 a 85% fácil.
          </p>
        </details>
      </div>
    </section>
  );
}
