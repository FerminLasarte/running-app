'use client';
/* Test de nivel: cómo estás frente a corredores de tu edad y de tus mismos meses corriendo. El puntaje de 0 a 10, cada
   factor con su peso, lo que más puntos te puede dar, cuánto podés llegar a bajar para tu 10K y cómo se calcula. Se abre
   desde el medallero de Carreras y desde ⌘K. */
import '@/app/styles/screens/carreras.css';
import { requestClose } from '@/lib/sheets';
import { useS } from '@/lib/store';
import { lvBuild, lvTag } from '@/lib/domain/level';
import { dateLabel, fmt, fmtDur } from '@/lib/domain/util';
import { Button } from '@/components/pista/controls';
import { Laps } from '@/components/pista/meters';
import { cssVars } from '@/components/pista/util';
import { PanelFrame, PanelSection } from './PanelFrame';

/** el color de un puntaje de 10: bien, a mitad de camino, flojo */
const col = (v: number) => (v >= 7 ? 'var(--pos)' : v >= 4.5 ? 'var(--t-tempo)' : 'var(--neg)');

const SOURCES: [string, string][] = [
  ['https://pacepercentile.com/guides/what-is-a-good-10k-time/', 'PacePercentile · tiempos de 10K por edad'],
  ['https://www.runpace.co/guides/good-10k-time-benchmarks-by-age-gender-experience', 'RunPace · 10K por edad, sexo y experiencia'],
  ['https://www.runnersblueprint.com/whats-a-good-10k-time-average-10k-pace-by-age-gender-experience/', 'Runner’s Blueprint · rangos por nivel'],
  ['https://runrepeat.com/state-of-running', 'RunRepeat · State of Running'],
  ['https://runnersconnect.net/how-much-faster-can-you-get-in-a-year/', 'Runners Connect · cuánto se mejora en un año'],
  ['https://www.runifyapp.com/blog/running-personal-best-progression-statistics', 'Runify · progresión de marcas personales'],
  ['https://tryterra.co/research/boring-is-fast', 'Terra · frecuencia y mejora'],
  ['https://help.trainingpeaks.com/hc/en-us/articles/204071724-Aerobic-Decoupling-and-Efficiency-Factor', 'TrainingPeaks · deriva y eficiencia'],
];

export default function LevelPanel() {
  const ageSet = useS().cfg.age > 0;
  const R = lvBuild();
  const foot = (
    <Button variant="pri" autoFocus onClick={requestClose}>
      Listo
    </Button>
  );
  if (!R.dims.length || R.B == null)
    return (
      <PanelFrame eyebrow="Carreras" title="Test de nivel" foot={foot}>
        <PanelSection title="Todavía no hay datos suficientes">
          <p className="p-dr-p">El test necesita al menos 6 salidas cargadas y alguna serie, tempo o test reciente. Cargá tus entrenamientos y volvé acá.</p>
        </PanelSection>
      </PanelFrame>
    );
  const B = R.B,
    g = R.goal,
    fa = (t: number) => fmtDur(Math.round(t));
  /* el factor que más suma si mejora: lo que le falta para 10, por su peso (la resistencia aeróbica no se entrena directo) */
  const d = R.dims.filter((x) => x.k !== 'aer').sort((a, b) => (10 - b.b) * b.w - (10 - a.b) * a.w)[0];
  return (
    <PanelFrame eyebrow={(ageSet ? 'Hombre de ' + R.age + ' años' : 'Sin tu edad') + ' · ' + fmt(R.M.months, 0) + ' meses corriendo'} title="Test de nivel" foot={foot}>
      <div className="car-lv-h" style={cssVars({ '--lc': col(B) })}>
        <div>
          <span className="disp">{fmt(B, 1)}</span>
          <span className="lbl">de 10</span>
        </div>
        <div>
          <b className="car-lv-tag">{lvTag(B).t}</b>
          <p className="p-dr-p">
            Comparado con gente que lleva <b>{R.M.weeks} semanas</b> (unos {fmt(R.M.months, 0)} meses) corriendo. Contra los corredores de tu edad en general, sin tener en cuenta el tiempo que llevás, el puntaje es <b>{fmt(R.A, 1)}</b>.
          </p>
        </div>
      </div>
      <PanelSection title="Factores" aside="Puntaje de 10">
        <ul className="car-lv-l">
          {R.dims.map((x) => (
            <li key={x.k} style={cssVars({ '--lc': col(x.b) })}>
              <div className="r">
                <b>
                  {x.n} <small>· pesa {x.w}%</small>
                </b>
                <span className="disp">{fmt(x.b, 1)}</span>
              </div>
              <Laps value={x.b / 10} n={10} gap={3} />
              <p>{x.v}</p>
              <small>
                {x.y}
                {x.k === 'pace' ? '' : ' Contra todos: ' + fmt(x.a, 1) + '.'}
              </small>
            </li>
          ))}
        </ul>
      </PanelSection>
      {(d && d.b < 9) || (g && R.pace) || (R.st && R.st.stale) ? (
        <PanelSection title="Qué mirar">
          {d && d.b < 9 ? (
            <p className="p-dr-p">
              Lo que más puntos te puede dar: <b>{d.n.toLowerCase()}</b> ({fmt(d.b, 1)} de 10, pesa {d.w}% del total).
            </p>
          ) : null}
          {g && R.pace ? (
            <p className="p-dr-p">
              Faltan <b>{Math.floor(g.days / 7)} semanas</b> para tu {g.name} del {dateLabel(g.date)}. Hoy tu 10K estimado es <b>{fa(R.pace.sec)}</b> y tu objetivo es <b>{fa(g.t)}</b>. Con una mejora realista de 1,5% a 2,5% por mes a esta altura, llegarías a{' '}
              <b>
                {fa(g.lo)} – {fa(g.hi)}
              </b>
              . {g.lo > g.t * 1.01 ? 'Bajar de ' + fa(g.t) + ' en lo que queda es difícil: tomá ese tiempo como techo del mejor día y no como piso.' : 'Tu objetivo está dentro de lo posible si el día sale bien.'} El test de 10K solo reemplaza esta estimación por un dato real.
            </p>
          ) : null}
          {R.st && R.st.stale ? <p className="p-dr-p">Tu última salida cargada es de hace más de una semana: el volumen del test ya refleja ese parón. Si corriste y no lo cargaste, usá «Traer de Strava».</p> : null}
        </PanelSection>
      ) : null}
      <PanelSection title="Cómo se calcula">
        <details className="p-more car-more">
          <summary>¿Qué tan confiable es?</summary>
          <p className="p-dr-hint">
            Es una <b>estimación</b>, no una medición. No existe un estudio público con promedios «por tiempo corriendo», así que la comparación combina tres cosas: (1) cómo queda tu 10K frente a la distribución de corredores varones de tu edad (mediana ≈ {fmtDur(R.med)} a los {R.age} años, dispersión típica de carreras populares); (2) el tiempo típico de alguien con tus mismos meses (≈ {fmtDur(R.typ)} a los {fmt(R.M.months, 0)} meses, a partir de los rangos por nivel y de la mejora esperable en el primer año); (3) umbrales de volumen, frecuencia, tirada larga y calidad para preparar un 10K, que para quien lleva pocos meses se aflojan un {Math.round((1 - R.k) * 100)}%.
          </p>
          <p className="p-dr-hint">
            Tu 10K se estima con tu mejor señal de las últimas 6 semanas (un test, series o tempo). Las series dan un piso de tu capacidad, así que es probable que el día real salga igual o más rápido. Pesos: velocidad 35%, volumen 15%, frecuencia, tirada larga, calidad, resistencia y constancia 10% cada una. Los corredores de carreras populares son un grupo más entrenado que la población general, y las referencias de tiempos en la web varían entre sitios: no tomes el decimal como exacto.
          </p>
          <p className="p-dr-hint">
            {ageSet ? 'Edad y fecha de inicio se cambian en Ajustes.' : 'Todavía no cargaste tu edad: te comparo con corredores de ' + R.age + ' años. Cargala en Ajustes → Perfil, junto con la fecha en que empezaste a correr.'}
          </p>
          <ul className="car-lv-src">
            {SOURCES.map(([href, t]) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noopener">
                  {t}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </PanelSection>
    </PanelFrame>
  );
}
