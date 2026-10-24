/* «Tus barrios»: dónde más corrés (barriosCard, línea 4810 del original). */
import type { CSSProperties } from 'react';
import type { BarrioKm, MapBarrios } from '@/lib/domain/geo';
import { fmt } from '@/lib/domain/util';

export function BarriosCard({ bz, hasRoutes, hb, onPick }: { bz: MapBarrios | null; hasRoutes: boolean; hb: string | null; onPick: (n: string) => void }) {
  if (!hasRoutes) return null;
  if (!bz)
    return (
      <section className="card">
        <div className="h3">Tus barrios</div>
        <p className="sub">Cargando el mapa de la Ciudad…</p>
      </section>
    );
  if (!bz.list.length)
    return (
      <section className="card">
        <div className="h3">Tus barrios</div>
        <p className="sub">En este período no hay recorridos dentro de la Ciudad.</p>
      </section>
    );
  const mx = bz.list[0].km;
  const row = (e: BarrioKm, i: number) => (
    <button key={e.b.n} className="bz-r" data-a="mapbarrio" data-v={e.b.n} aria-pressed={hb === e.b.n} onClick={() => onPick(e.b.n)}>
      <span className="bz-i">{i + 1}</span>
      <span className="bz-n">
        {e.b.n}
        <small>
          {e.n}
          {e.n === 1 ? ' salida' : ' salidas'}
        </small>
      </span>
      <span className="bz-v">
        {fmt(e.km, e.km < 10 ? 1 : 0)}
        <small>km</small>
      </span>
      <i style={{ '--w': Math.max(3, Math.round((e.km / mx) * 100)) + '%' } as CSSProperties} />
    </button>
  );
  const top = bz.list.slice(0, 6),
    rest = bz.list.slice(6);
  return (
    <section className="card bz">
      <div className="h3">Tus barrios</div>
      <p className="sub">Dónde más corrés. Tocá uno para verlo en el mapa.</p>
      <div className="bz-l">{top.map(row)}</div>
      {rest.length ? (
        <div className="tv-row">
          <details className="tv">
            <summary>Ver {rest.length === 1 ? 'el otro barrio' : 'los otros ' + rest.length}</summary>
            <div className="bz-l">{rest.map((e, i) => row(e, i + 6))}</div>
          </details>
        </div>
      ) : null}
      {bz.out.km >= 0.5 ? (
        <p className="sub bz-out">
          Fuera de la Ciudad: {fmt(bz.out.km, 0)} km en {bz.out.n}
          {bz.out.n === 1 ? ' salida' : ' salidas'}.
        </p>
      ) : null}
    </section>
  );
}
