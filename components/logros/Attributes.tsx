'use client';
/* Atributos explicados: los mismos números de la ficha, de 1 a 99, con de dónde sale cada uno. */
import type { CharStat } from '@/lib/domain/xp';
import { Panel } from '@/components/pista/structure';
import { cssVars } from '@/components/pista/util';
import { LO_PARTS } from './util';

export function Attributes({ st, i }: { st: CharStat[]; i: number }) {
  return (
    <Panel id={LO_PARTS.att} title="Atributos" sub="De 1 a 99 · últimas semanas" className="p-c6 p-rise" style={cssVars({ '--i': i })}>
      <ul className="lo-attl">
        {st.map((s, j) => (
          <li key={s.k} style={cssVars({ '--ac': s.c, '--j': j })}>
            <b>{s.n}</b>
            <span className="disp">{s.v ?? '–'}</span>
            <small>{s.x}</small>
            <span className="sc" role="img" aria-label={s.v == null ? 'Sin medir' : s.v + ' de 99'}>
              <i style={cssVars({ width: (s.v || 0) + '%' })} />
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
