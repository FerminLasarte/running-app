'use client';
/* Test de nivel (viewLevel, líneas 2934–2954 del original). */
import type { CSSProperties } from 'react';
import { lvBuild, lvTag } from '@/lib/domain/level';
import { dateLabel, fmt, fmtDur } from '@/lib/domain/util';
import { CountUp } from '@/components/ui/CountUp';

const cssVars = (o: Record<string, string>) => o as CSSProperties;

export function Level() {
  const R = lvBuild();
  if (!R.dims.length || R.B == null)
    return (
      <section className="card">
        <div className="h3">Todavía no hay datos suficientes</div>
        <p>El test necesita al menos 6 salidas cargadas y alguna serie, tempo o test reciente. Cargá tus entrenamientos y volvé acá.</p>
      </section>
    );
  const B = R.B,
    tg = lvTag(B),
    col = (v: number) => (v >= 7 ? 'var(--good)' : v >= 4.5 ? 'var(--warn)' : 'var(--serious)');
  const d = R.dims.filter((x) => x.k !== 'aer').sort((a, b) => (10 - b.b) * b.w - (10 - a.b) * a.w)[0];
  const g = R.goal,
    fa = (t: number) => fmtDur(Math.round(t));
  return (
    <section className="card lv" style={cssVars({ '--bc': tg.c })}>
      <div className="eyebrow">
        Test de nivel · hombre de {R.age} años · {fmt(R.M.months, 0)} meses corriendo
      </div>
      <div className="lv-h">
        <div className="ring" role="img" aria-label={'Puntaje ' + fmt(B, 1) + ' de 10'} style={cssVars({ '--circ': '326.7', '--off': (326.7 * (1 - B / 10)).toFixed(1), '--bc': tg.c })}>
          <svg viewBox="0 0 124 124" aria-hidden="true">
            <circle className="rt" cx="62" cy="62" r="52" />
            <circle className="rf" cx="62" cy="62" r="52" />
          </svg>
          <div className="sc-num">
            <CountUp v={Math.round(B * 10) / 10} d={1} />
            <small>DE 10</small>
          </div>
        </div>
        <div className="lv-s">
          <span className="lv-tag">{tg.t}</span>
          <br />
          Comparado con gente que lleva <b>{R.M.weeks} semanas</b> (unos {fmt(R.M.months, 0)} meses) corriendo. Contra los corredores de tu edad en general, sin tener en cuenta el tiempo que llevás, el puntaje es <b>{fmt(R.A, 1)}</b>.
        </div>
      </div>
      <ul className="lv-l">
        {R.dims.map((x) => (
          <li key={x.k}>
            <div className="lv-r">
              <b>{x.n}</b>
              <span className="num" style={{ color: col(x.b) }}>
                <CountUp v={Math.round(x.b * 10) / 10} d={1} />
              </span>
            </div>
            <div className="meter sm" style={cssVars({ '--bc': col(x.b) })}>
              <i style={{ width: Math.round(x.b * 10) + '%' }}></i>
            </div>
            <div className="lv-x">{x.v}</div>
            <div className="lv-y">
              {x.y}
              {x.k === 'pace' ? '' : ' · Contra todos: ' + fmt(x.a, 1)}
            </div>
          </li>
        ))}
      </ul>
      {d && d.b < 9 ? (
        <div className="lv-box">
          Lo que más puntos te puede dar: <b>{d.n.toLowerCase()}</b> ({fmt(d.b, 1)} de 10, pesa {d.w}% del total).
        </div>
      ) : null}
      {g && R.pace ? (
        <div className="lv-box">
          Faltan <b>{Math.floor(g.days / 7)} semanas</b> para tu {g.name} del {dateLabel(g.date)}. Hoy tu 10K estimado es <b>{fa(R.pace.sec)}</b> y tu objetivo es <b>{fa(g.t)}</b>. Con una mejora realista de 1,5% a 2,5% por mes a esta altura, llegarías a{' '}
          <b>
            {fa(g.lo)} – {fa(g.hi)}
          </b>
          . {g.lo > g.t * 1.01 ? 'Bajar de ' + fa(g.t) + ' en lo que queda es difícil: tomá ese tiempo como techo del mejor día y no como piso.' : 'Tu objetivo está dentro de lo posible si el día sale bien.'} El test de 10K solo reemplaza esta estimación por un dato real.
        </div>
      ) : null}
      {R.st && R.st.stale ? <div className="lv-box">Tu última salida cargada es de hace más de una semana: el volumen del test ya refleja ese parón. Si corriste y no lo cargaste, usá «Traer de Strava».</div> : null}
      <div className="tv-row">
        <details className="tv">
          <summary>¿Cómo se calcula y qué tan confiable es?</summary>
          <p className="sub">
            Es una <b>estimación</b>, no una medición. No existe un estudio público con promedios «por tiempo corriendo», así que armé la comparación combinando tres cosas: (1) cómo queda tu 10K frente a la distribución de corredores varones de tu edad (mediana ≈ {fmtDur(R.med)} a los {R.age} años, dispersión típica de carreras populares); (2) el tiempo típico de alguien con tus mismos meses (≈ {fmtDur(R.typ)} a los {fmt(R.M.months, 0)} meses, a partir de los rangos por nivel y de la mejora esperable en el primer año); (3) umbrales de volumen, frecuencia, tirada larga y calidad para preparar un 10K, que para quien lleva pocos meses se aflojan un {Math.round((1 - R.k) * 100)}%.
          </p>
          <p className="sub">
            Tu 10K se estima con tu mejor señal de las últimas 6 semanas (un test, series o tempo). Las series dan un piso de tu capacidad, así que es probable que el día real salga igual o más rápido. Pesos: velocidad 35%, volumen 15%, frecuencia, tirada larga, calidad, resistencia y constancia 10% cada una. Los corredores de carreras populares son un grupo más entrenado que la población general, y las referencias de tiempos en la web varían entre sitios: no tomes el decimal como exacto.
          </p>
          <p className="sub">Edad y fecha de inicio se cambian en Ajustes.</p>
          <ul className="lv-src">
            <li>
              <a href="https://pacepercentile.com/guides/what-is-a-good-10k-time/" target="_blank" rel="noopener">
                PacePercentile · tiempos de 10K por edad
              </a>
            </li>
            <li>
              <a href="https://www.runpace.co/guides/good-10k-time-benchmarks-by-age-gender-experience" target="_blank" rel="noopener">
                RunPace · 10K por edad, sexo y experiencia
              </a>
            </li>
            <li>
              <a href="https://www.runnersblueprint.com/whats-a-good-10k-time-average-10k-pace-by-age-gender-experience/" target="_blank" rel="noopener">
                Runner’s Blueprint · rangos por nivel
              </a>
            </li>
            <li>
              <a href="https://runrepeat.com/state-of-running" target="_blank" rel="noopener">
                RunRepeat · State of Running
              </a>
            </li>
            <li>
              <a href="https://runnersconnect.net/how-much-faster-can-you-get-in-a-year/" target="_blank" rel="noopener">
                Runners Connect · cuánto se mejora en un año
              </a>
            </li>
            <li>
              <a href="https://www.runifyapp.com/blog/running-personal-best-progression-statistics" target="_blank" rel="noopener">
                Runify · progresión de marcas personales
              </a>
            </li>
            <li>
              <a href="https://tryterra.co/research/boring-is-fast" target="_blank" rel="noopener">
                Terra · frecuencia y mejora
              </a>
            </li>
            <li>
              <a href="https://help.trainingpeaks.com/hc/en-us/articles/204071724-Aerobic-Decoupling-and-Efficiency-Factor" target="_blank" rel="noopener">
                TrainingPeaks · deriva y eficiencia
              </a>
            </li>
          </ul>
        </details>
      </div>
    </section>
  );
}
