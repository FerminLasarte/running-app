'use client';
/* Podio: tus mejores sesiones por distancia, puntaje o ritmo (el principal: el de las repeticiones en las series). Los
   tres primeros en el podio (2 · 1 · 3) y del cuarto al sexto abajo; cada una lleva a su sesión. El criterio va en la
   URL: `?podio=ritmo`. */
import Link from 'next/link';
import { useS } from '@/lib/store';
import { TYPES } from '@/lib/domain/config';
import { podium, type PodKey, type PodRow } from '@/lib/domain/marks';
import { cap, dateLabel, fmt, fmtPace, todayS } from '@/lib/domain/util';
import { sessionHref } from '@/lib/nav';
import { Segmented } from '@/components/pista/controls';
import { Panel } from '@/components/pista/structure';
import { briefOf } from '@/components/pista/session';
import { cssVars } from '@/components/pista/util';
import { LO_PARTS } from './util';

export const POD_IDS = ['distancia', 'puntaje', 'ritmo'] as const;
export type PodId = (typeof POD_IDS)[number];
const KEY: Record<PodId, PodKey> = { distancia: 'dist', puntaje: 'score', ritmo: 'pace' };
const VAL: Record<PodKey, (v: number) => [string, string]> = {
  dist: (v) => [fmt(v, 2), 'km'],
  score: (v) => [String(v), ''],
  pace: (v) => [fmtPace(v), '/km'],
};
const EMPTY: Record<PodKey, string> = {
  dist: 'Todavía no hay salidas cargadas.',
  score: 'Todavía no hay sesiones con puntaje: sale al cargar una sesión de tu plan.',
  pace: 'Todavía no hay salidas con ritmo.',
};
/* las alturas del podio: el segundo, el primero y el tercero */
const H = [86, 120, 64];

/** la carrera de ese día, las repeticiones («Tempo 3 × 3 km») o el tipo */
function nameOf(x: PodRow) {
  const b = briefOf(x.s);
  return x.race || TYPES[x.s.type].label + (b.includes('×') ? ' ' + b : '');
}
const when = (d: string) => (d === todayS() ? 'Hoy' : cap(dateLabel(d)));

export function Podium({ id, onId, i }: { id: PodId; onId: (v: PodId) => void; i: number }) {
  useS();
  const k = KEY[id],
    R = podium(k),
    top = [R[1], R[0], R[2]];
  return (
    <Panel
      id={LO_PARTS.pod}
      title="Podio"
      actions={<Segmented label="Ordenar el podio" value={id} onChange={onId} options={POD_IDS.map((v) => ({ value: v, label: cap(v) }))} />}
      className="p-c6 p-rise p-stretch lo-pod-p"
      style={cssVars({ '--i': i })}
      flush
    >
      {R.length ? (
        <>
          <ul className="lo-podium">
            {top.map((x, j) => {
              if (!x) return <li key={j} aria-hidden="true" />;
              const n = R.indexOf(x) + 1,
                [v, u] = VAL[k](x.v);
              return (
                <li key={x.s.id} className={'p' + n}>
                  <Link href={sessionHref(x.s.id)} aria-label={n + '.º: ' + nameOf(x) + ', ' + when(x.s.result.date) + ', ' + v + ' ' + u}>
                    <span className="disp">
                      {v}
                      {u ? <span className="p-u">{u}</span> : null}
                    </span>
                    <b>{nameOf(x)}</b>
                    <small>{when(x.s.result.date)}</small>
                    <span className="blk" style={cssVars({ height: H[j] + 'px', animationDelay: 200 + j * 80 + 'ms' })} aria-hidden="true">
                      <span>
                        {n}
                        {n === 1 ? <em>.</em> : null}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {R.length > 3 ? (
            <ol className="lo-podl" start={4}>
              {R.slice(3).map((x, j) => {
                const [v, u] = VAL[k](x.v);
                return (
                  <li key={x.s.id}>
                    <Link href={sessionHref(x.s.id)}>
                      <span className="n" aria-hidden="true">
                        {j + 4}
                      </span>
                      <span>
                        {nameOf(x)}
                        <small>{when(x.s.result.date)}</small>
                      </span>
                      <span className="r">
                        {v} {u}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </>
      ) : (
        <p className="lo-none">{EMPTY[k]}</p>
      )}
    </Panel>
  );
}
