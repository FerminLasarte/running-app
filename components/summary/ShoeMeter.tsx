/* Km de un par de zapatillas contra su límite (línea 3431 del original). También la usa Ajustes. */
import type { CSSProperties } from 'react';
import type { Shoe } from '@/lib/domain/types';
import { shoeKm } from '@/lib/domain/shoes';
import { fmt } from '@/lib/domain/util';

export function ShoeMeter({ z }: { z: Shoe }) {
  const km = shoeKm(z),
    f = km / z.limitKm,
    col = f >= 1 ? 'var(--crit)' : f >= 0.85 ? 'var(--warn)' : 'var(--good)';
  return (
    <>
      <div className="lv-r" style={{ marginTop: 8 }}>
        <span className="mut" style={{ fontSize: 14 }}>
          {fmt(km, 0)} de {fmt(z.limitKm, 0)} km
        </span>
        {f >= 1 ? (
          <span className="lv-tag" style={{ '--bc': 'var(--crit)' } as CSSProperties}>
            Pasó el límite
          </span>
        ) : f >= 0.85 ? (
          <span className="lv-tag" style={{ '--bc': 'var(--warn)' } as CSSProperties}>
            Cerca del límite
          </span>
        ) : null}
      </div>
      <div className="meter sm" style={{ '--bc': col } as CSSProperties}>
        <i style={{ width: Math.min(100, Math.round(f * 100)) + '%' }}></i>
      </div>
    </>
  );
}
