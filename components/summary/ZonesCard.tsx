/* Los ritmos de tu plan: salen de las sesiones planificadas que vienen (línea 4350 del original). */
import { PLAN_CATS, planPaces, planTitle } from '@/lib/domain/daniels';
import { dateLabel, fmtPace } from '@/lib/domain/util';
import { RecalBox } from '@/components/race/RecalBox';
import { DanielsCard } from './DanielsCard';

export function ZonesCard() {
  const P = planPaces(),
    ks = PLAN_CATS.filter((c) => P[c.k]);
  if (ks.length < 2) return <DanielsCard inner={false} />;
  return (
    <section className="card">
      <div className="h3">Los ritmos de tu plan</div>
      <div className="sub">Salen de las sesiones que tenés planificadas de acá en adelante. Si recalibrás tu plan, se actualizan solos.</div>
      <table className="zt" style={{ marginTop: 10 }}>
        <tbody>
          {ks.map((c) => {
            const L = P[c.k]!,
              nx = L[0],
              seen = new Set<string>(),
              d = L.filter((q) => {
                const k = q.x.id;
                if (seen.has(k)) return false;
                seen.add(k);
                return true;
              });
            const lo = Math.min(...L.map((q) => q.lo)),
              hi = Math.max(...L.map((q) => q.hi)),
              isHr = c.k === 'easy';
            const fv = (v: number) => (isHr ? String(v) : fmtPace(v)),
              u = isHr ? ' lpm' : ' /km',
              rng = (a: number, b: number) => (a === b ? fv(a) : fv(a) + '–' + fv(b));
            return [
              <tr key={c.k}>
                <td>
                  <span className="dot" style={{ background: c.c, display: 'inline-block', marginRight: 8 }}></span>
                  <b>{c.n}</b>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <b className="num">{(isHr ? 'FC ' : '') + rng(nx.lo, nx.hi)}</b>
                  <small className="mut">{u}</small>
                </td>
              </tr>,
              <tr key={c.k + '-n'}>
                <td colSpan={2} className="sub" style={{ borderTop: 0, paddingTop: 0 }}>
                  Próxima: {planTitle(nx.x)}, {dateLabel(nx.x.plan.date)}.{lo !== nx.lo || hi !== nx.hi ? ' En todo lo que queda del plan: ' + rng(lo, hi) + (isHr ? ' lpm' : '/km') + '.' : ''} {d.length}
                  {d.length === 1 ? ' sesión' : ' sesiones'}.
                </td>
              </tr>,
            ];
          })}
        </tbody>
      </table>
      <RecalBox />
      <div className="tv-row">
        <details className="tv">
          <summary>Referencia: ritmos calculados por tu 10K estimado</summary>
          <DanielsCard inner={true} />
        </details>
      </div>
    </section>
  );
}
