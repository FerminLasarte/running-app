'use client';
/* Personaje: nivel, atributos, últimas ganancias y camino de títulos (viewCharacter del original). */
import type { CSSProperties } from 'react';
import { useS } from '@/lib/store';
import { prXp } from '@/lib/domain/trophies';
import { XP_TITLES, charStats, xpFor, xpState } from '@/lib/domain/xp';
import { dateLabel, nf } from '@/lib/domain/util';

const cssVars = (o: Record<string, string | number>) => o as CSSProperties;

export default function Character() {
  useS();
  const X = xpState(),
    st = charStats();
  if (!X.E.length)
    return (
      <section className="card">
        <p>Cargá tu primera salida y empezás a sumar experiencia.</p>
      </section>
    );
  const need = X.b - X.total,
    recent = X.E.slice(-12).reverse();
  const nextT = XP_TITLES.find((q) => q[0] > X.L);
  return (
    <>
      <section className="card xp-hero">
        <div className="xp-av">
          <span>{X.L}</span>
          <small>nivel</small>
        </div>
        <div className="xp-info">
          <div className="eyebrow">Tu personaje</div>
          <b>{X.title}</b>
          <div className="meter" style={cssVars({ marginTop: '10px', '--bc': 'var(--accent)' })}>
            <i style={{ width: Math.round(X.f * 100) + '%' }}></i>
          </div>
          <div className="xp-row">
            <span>
              {nf(X.total - X.a)} / {nf(X.b - X.a)} XP
            </span>
            <span>
              Faltan {nf(need)} para el nivel {X.L + 1}
            </span>
          </div>
          <p className="sub" style={{ marginTop: 6 }}>
            {nf(X.total) + ' XP en total · ' + nf(X.month) + ' este mes' + (nextT ? ' · «' + nextT[1] + '» en el nivel ' + nextT[0] : '') + '.'}
          </p>
        </div>
      </section>
      <div className="grid2" style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="h3">Atributos</div>
          <div className="sub">De 1 a 99, según tus últimas semanas.</div>
          <ul className="lv-l" style={{ marginTop: 10 }}>
            {st.map((s) => (
              <li key={s.k}>
                <div className="lv-r">
                  <b>{s.n}</b>
                  <span className="num big" style={{ fontSize: 24 }}>
                    {s.v == null ? '–' : s.v}
                  </span>
                </div>
                <div className="meter sm" style={cssVars({ '--bc': s.c })}>
                  <i style={{ width: (s.v || 0) + '%' }}></i>
                </div>
                <div className="lv-y">{s.x}</div>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <div className="h3">Últimas ganancias</div>
          <ul className="xp-log">
            {recent.map((e, i) => (
              <li key={i}>
                <span className="xp-amt">+{e.xp}</span>
                <div>
                  <b>{e.t}</b>
                  <small>{dateLabel(e.d)}</small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="card">
        <div className="h3">Camino de títulos</div>
        <ul className="xp-path">
          {XP_TITLES.map((q) => {
            const up = X.ups.find((u) => u.l === q[0]),
              got = X.L >= q[0];
            return (
              <li key={q[0]} className={got ? 'got' : ''}>
                <span className="xp-lv">{q[0]}</span>
                <div>
                  <b>{q[1]}</b>
                  <small>{got ? (up ? 'Desde el ' + dateLabel(up.d) : 'Inicio') : nf(xpFor(q[0]) - X.total) + ' XP para llegar'}</small>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="tv-row">
          <details className="tv">
            <summary>¿Cómo se gana experiencia?</summary>
            <p className="sub">
              Cada salida da <b>10 XP por km</b>. Suman extra: series o tempo (+20), test o carrera (+50), fondo de 15 km o más (+30), sesión de tu plan (+25) y puntaje de 90 o más (+25; de 75 a 89, +10). Además: trofeos de bronce, plata y oro (+50, +150,
              +400); las <b>marcas</b> dan más cuanto más difíciles son (por ejemplo bajar de 25:00 en 5K da {prXp(1500, 5, 1)} XP, de 50:00 en 10K {prXp(3000, 10, 1.1)}, de 2:00:00 en media {prXp(7200, 21.0975, 1.35)} y de 4:15:00 en maratón{' '}
              {prXp(15300, 42.195, 1.7)}); desafío cumplido (+200), semana con tu objetivo de salidas (+40) y carrera terminada (+300). Para subir de nivel cada vez hace falta un poco más.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
