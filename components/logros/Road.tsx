'use client';
/* Camino de títulos: la pista recta, de Novato (nivel 1) a Leyenda del asfalto (nivel 50), con un banderín por título,
   la parte hecha en tartán, «vos» donde estás y la llegada a cuadros. Al pie, cómo se gana experiencia. */
import { prXp } from '@/lib/domain/trophies';
import { XP_TITLES, nextTitle, titlePos, xpFor, type XpState } from '@/lib/domain/xp';
import { dateLabel, nf } from '@/lib/domain/util';
import { Panel } from '@/components/pista/structure';
import { cssVars } from '@/components/pista/util';
import { LO_PARTS } from './util';

const W = 1100,
  X0 = 64,
  STEP = (W - 128) / (XP_TITLES.length - 1),
  Y = 62;
const xOf = (k: number) => X0 + k * STEP;

export function Road({ X, i }: { X: XpState; i: number }) {
  const nx = nextTitle(X.L),
    pos = titlePos(X.L, X.f),
    cur = xOf(pos),
    near = Math.round(pos),
    /* «vos» va abajo; si ahí ya está el nombre de un título cercano, arriba */
    vosUp = near % 2 === 1 && Math.abs(cur - xOf(near)) < 70;
  const sr = 'Sos ' + X.title + ', nivel ' + X.L + '.' + (nx ? ' El próximo título es ' + nx[1] + ', en el nivel ' + nx[0] + '.' : ' Llegaste al último título.');
  return (
    <Panel
      id={LO_PARTS.road}
      title="Camino de títulos"
      sub={nx ? '«' + nx[1] + '» en el nivel ' + nx[0] : 'Llegaste al último'}
      actions={
        X.month > 0 ? (
          <span className="lo-month hide-s">
            Este mes sumaste <b>{nf(X.month)} XP</b>
          </span>
        ) : null
      }
      className="p-c12 p-rise lo-road-p"
      style={cssVars({ '--i': i })}
      flush
    >
      <div className="lo-road">
        <svg viewBox={`0 0 ${W} 124`} role="img" aria-label={sr}>
          <defs>
            <pattern id="lo-chk" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="var(--surface)" />
              <rect width="3" height="3" fill="var(--ink)" />
              <rect x="3" y="3" width="3" height="3" fill="var(--ink)" />
            </pattern>
          </defs>
          <rect x={X0} y={Y - 7} width={W - 128} height="14" fill="var(--track)" />
          <line x1={X0} x2={W - 64} y1={Y} y2={Y} stroke="var(--surface)" strokeWidth="1" strokeDasharray="6 5" />
          <rect className="lo-road-done" x={X0} y={Y - 7} width={Math.max(0, cur - X0)} height="14" fill="var(--acc)" />
          <rect x={W - 64} y={Y - 14} width="12" height="28" fill="url(#lo-chk)" />
          {XP_TITLES.map(([lv, n], k) => {
            const got = X.L >= lv,
              up = k % 2 === 0,
              d = X.ups.find((u) => u.l === lv)?.d;
            return (
              <g key={lv} className={got ? undefined : 'off'}>
                <title>{n + ' · nivel ' + lv + ' · ' + (got ? (d ? 'desde el ' + dateLabel(d) : 'desde el comienzo') : nf(xpFor(lv) - X.total) + ' XP para llegar')}</title>
                <circle cx={xOf(k)} cy={Y} r="7" fill={got ? 'var(--ink)' : 'var(--surface)'} stroke={got ? 'var(--ink)' : 'var(--line-2)'} strokeWidth="2" />
                <text className="t-n" x={xOf(k)} y={up ? Y - 26 : Y + 36} textAnchor="middle">
                  {n}
                </text>
                <text className="t-l" x={xOf(k)} y={up ? Y - 13 : Y + 49} textAnchor="middle">
                  NIVEL {lv}
                </text>
              </g>
            );
          })}
          <circle cx={cur} cy={Y} r="10" fill="var(--surface)" stroke="var(--acc)" strokeWidth="3" />
          <text className="t-vos" x={cur} y={vosUp ? Y - 26 : Y + 36} textAnchor="middle">
            VOS · {X.L}
          </text>
        </svg>
      </div>
      <details className="lo-more">
        <summary>¿Cómo se gana experiencia?</summary>
        <p>
          Cada salida da <b>10 XP por km</b>. Suman extra: series o tempo (+20), test o carrera (+50), fondo de 15 km o más (+30), sesión de tu plan (+25) y puntaje de 90 o más (+25; de 75 a 89, +10). Además, los trofeos: bronce (desde +50), plata (desde +150), oro (desde +400) y platino (desde +900);
          las <b>marcas</b> dan más cuanto más difíciles son (por ejemplo, bajar de 25:00 en 5K da {prXp(1500, 5, 1)} XP, de 50:00 en 10K {prXp(3000, 10, 1.1)}, de 2:00:00 en media {prXp(7200, 21.0975, 1.35)} y de 4:15:00 en maratón {prXp(15300, 42.195, 1.7)});
          desafío cumplido (+200), semana con tu objetivo de salidas (+40) y carrera terminada (+300). Para subir de nivel cada vez hace falta un poco más.
        </p>
      </details>
    </Panel>
  );
}
