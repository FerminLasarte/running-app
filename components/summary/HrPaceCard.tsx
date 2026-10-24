/* FC vs ritmo: cuánto mejoró tu corazón desde el primer día (líneas 4257–4289 del original). */
import { LineChart, TableTv } from '@/components/charts';
import { easyHrRuns, efTrend, medOf } from '@/lib/domain/analysis';
import { DF_M, DF_MY, cap, clamp, dateLabel, fmt, fmtPace, pd } from '@/lib/domain/util';
import { TvMore } from '@/components/ui/TvMore';

/** semicírculo de −10% a +30%; la aguja marca tu mejora */
export function HrGauge({ pct }: { pct: number }) {
  const a = (v: number) => Math.PI * (1 - (clamp(v, -10, 30) + 10) / 40),
    pt = (v: number, r: number) => [100 + r * Math.cos(a(v)), 100 - r * Math.sin(a(v))];
  const arc = (v0: number, v1: number, c: string) => {
    const p0 = pt(v0, 80),
      p1 = pt(v1, 80);
    return <path key={v0} d={'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + 'A80 80 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1)} stroke={c} strokeWidth="16" fill="none" />;
  };
  const n = pt(pct, 64);
  return (
    <svg className="hrg" viewBox="0 0 200 118" role="img" aria-label={'Mejora de eficiencia ' + fmt(pct, 1) + '%'}>
      {arc(-10, 0, 'var(--crit)')}
      {arc(0, 5, 'var(--warn)')}
      {arc(5, 15, 'var(--good)')}
      {arc(15, 30, 'var(--info)')}
      {[-10, 0, 10, 20, 30].map((v) => {
        const q = pt(v, 98);
        return (
          <text key={v} x={q[0].toFixed(1)} y={(q[1] + 3).toFixed(1)} textAnchor="middle">
            {(v > 0 ? '+' : '') + v + '%'}
          </text>
        );
      })}
      <line className="hrg-n" x1="100" y1="100" x2={n[0].toFixed(1)} y2={n[1].toFixed(1)} />
      <circle cx="100" cy="100" r="7" className="hrg-c" />
    </svg>
  );
}

export function HrPaceCard() {
  const R = easyHrRuns();
  if (R.length < 4)
    return (
      <section className="card" style={{ gridColumn: '1/-1' }}>
        <div className="h3">Tu corazón, desde el primer día</div>
        <p>Necesito al menos 4 rodajes o fondos con frecuencia cardíaca para medir cuánto mejoraste.</p>
      </section>
    );
  const tr = efTrend(R),
    e0 = tr(R[0].t),
    e1 = tr(R[R.length - 1].t),
    imp = (e1 / e0 - 1) * 100;
  const refP = Math.round(medOf(R.map((q) => q.p))! / 5) * 5,
    refH = Math.round(medOf(R.map((q) => q.h))! / 5) * 5;
  const hrAt = (ef: number) => Math.round(60000 / refP / ef),
    paceAt = (ef: number) => 60000 / (ef * refH);
  const h0 = hrAt(e0),
    h1 = hrAt(e1),
    p0 = paceAt(e0),
    p1 = paceAt(e1);
  const msg =
    imp > 15
      ? 'Tu corazón cambió mucho: hacés el mismo trabajo con bastante menos esfuerzo.'
      : imp > 5
        ? 'Vas claramente mejor: el mismo ritmo te cuesta menos pulsaciones.'
        : imp > 0
          ? 'Hay una mejora leve. Con más semanas de rodajes suaves se nota más.'
          : 'Por ahora no hay mejora: puede ser calor, cansancio o ritmos más exigentes en los últimos rodajes.';
  /* evolución mes a mes: FC que necesitarías para el ritmo de referencia */
  const by: Record<string, typeof R> = {};
  R.forEach((q) => {
    const m = q.d.slice(0, 7);
    (by[m] = by[m] || []).push(q);
  });
  /* pulsaciones que te ahorrás respecto del primer mes: más arriba es mejor, sin eje invertido */
  const mk = Object.keys(by).sort(),
    hr0 = hrAt(medOf(by[mk[0]].map((q) => q.ef))!),
    m0 = cap(DF_M.format(pd(mk[0] + '-15')).replace(/\./g, ''));
  const pts = mk.map((m) => {
    const L = by[m],
      ef = medOf(L.map((q) => q.ef))!,
      d = pd(m + '-15'),
      hr = hrAt(ef),
      dv = hr0 - hr;
    return {
      t: d.getTime(),
      v: dv,
      hr,
      read:
        cap(DF_MY.format(d)) +
        ': a ' +
        fmtPace(refP) +
        '/km, FC de ' +
        hr +
        ' lpm (' +
        (dv > 0 ? dv + ' menos' : dv < 0 ? -dv + ' más' : 'igual') +
        ' que en ' +
        m0.toLowerCase() +
        ') · a ' +
        refH +
        ' lpm, ' +
        fmtPace(paceAt(ef)) +
        '/km · ' +
        L.length +
        (L.length === 1 ? ' salida' : ' salidas'),
    };
  });
  return (
    <section className="card hrp" style={{ gridColumn: '1/-1' }}>
      <div className="eyebrow">Tu corazón, desde el primer día</div>
      <div className="hrp-top">
        <div className="hrp-g">
          <HrGauge pct={imp} />
          <div className="hrp-num">
            <b style={{ color: imp >= 5 ? 'var(--good)' : imp >= 0 ? 'var(--warn)' : 'var(--serious)' }}>{(imp >= 0 ? '+' : '−') + fmt(Math.abs(imp), 1) + '%'}</b>
            <small>{imp >= 0 ? 'más eficiente' : 'menos eficiente'} que al empezar</small>
          </div>
        </div>
        <div className="hrp-cmp">
          <div className="hrp-row">
            <span className="lab">A {fmtPace(refP)}/km tu FC</span>
            <div>
              <s>{h0}</s> → <b>{h1} lpm</b>
              <em className={h1 <= h0 ? 'up' : 'dn'}>{(h1 <= h0 ? '−' : '+') + Math.abs(h0 - h1) + ' lpm'}</em>
            </div>
          </div>
          <div className="hrp-row">
            <span className="lab">A {refH} lpm tu ritmo</span>
            <div>
              <s>{fmtPace(p0)}</s> → <b>{fmtPace(p1)}/km</b>
              <em className={p1 <= p0 ? 'up' : 'dn'}>{(p1 <= p0 ? '−' : '+') + Math.round(Math.abs(p0 - p1)) + ' s/km'}</em>
            </div>
          </div>
          <p className="sub" style={{ marginTop: 8 }}>
            {msg}
          </p>
        </div>
      </div>
      <div className="chart" style={{ marginTop: 14 }}>
        <div className="h3" style={{ fontSize: 'var(--fs-lg)' }}>
          Pulsaciones ahorradas, mes a mes
        </div>
        <div className="sub">
          Cuántas pulsaciones menos que en {m0.toLowerCase()} necesitás para correr a {fmtPace(refP)}/km. Más arriba es mejor.
        </div>
        <LineChart
          id="hrp"
          pts={pts}
          o={{ W: 640, H: 200, ref: 0, refLabel: m0.toLowerCase(), yFmt: (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v), 0), minPad: 3, aria: 'Pulsaciones ahorradas por mes' }}
        />
      </div>
      <div className="tv-row">
        <TableTv
          head={['Mes', 'FC a ' + fmtPace(refP) + '/km', 'Ritmo a ' + refH + ' lpm']}
          rows={pts.map((q) => {
            const m = q.read.split(':')[0];
            const ef = 60000 / refP / q.hr;
            return [m, q.hr + ' lpm', fmtPace(paceAt(ef)) + '/km'];
          })}
        />
        <TvMore t="¿Cómo se calcula?">
          Uso tus rodajes y fondos con frecuencia cardíaca ({R.length} salidas desde el {dateLabel(R[0].d)}; antes corrías sin reloj). Para cada uno calculo cuántos metros avanzás por cada latido y saco la tendencia de todas tus
          salidas, desde la primera hasta la última, con un método robusto (una salida rara no la mueve). Dejo afuera las salidas con caminatas y los valores fuera de lo normal. Después lo paso a algo concreto: la FC que necesitás
          para tu ritmo habitual ({fmtPace(refP)}/km) y el ritmo que te sale con tu FC habitual ({refH} lpm). El calor, las subidas, el cansancio o dormir mal suben la FC: mirá la tendencia, no un solo mes.
        </TvMore>
      </div>
    </section>
  );
}
