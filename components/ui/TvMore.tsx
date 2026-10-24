/* «Cómo se lee» / «¿Cómo se calcula?»: la explicación larga queda plegada al pie de la tarjeta (el original las
   agrupa en un .tv-row cuando hay más de una). */
import type { ReactNode } from 'react';

export function TvMore({ t, children }: { t: ReactNode; children: ReactNode }) {
  return (
    <details className="tv">
      <summary>{t}</summary>
      <p className="sub">{children}</p>
    </details>
  );
}
