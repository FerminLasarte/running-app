'use client';
/* La portada: qué es Lane One en una frase, probarla sin cuenta o entrar, y lo que hace, mostrado con las
   piezas de la Pista (la pista, el dorsal, la pulsera, las barras…) y datos de muestra fijos: la página se arma una vez
   al compilar y no depende de la fecha. Va fuera del shell, como el login. Con sesión, el proxy
   lleva a la semana. */
import '@/app/styles/screens/portada.css';
import { useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { Lightning, Mountains, Sneaker, Trophy } from '@phosphor-icons/react';
import type { SessionType } from '@/lib/domain/types';
import { startGuest } from '@/lib/guest';
import { BrandMark } from '@/components/shell/BrandMark';
import { Nav } from './Nav';
import { useReveal } from './motion';
import { Largada, useMarathon } from './eggs';
import { Button, Chip } from '@/components/pista/controls';
import { BrandTitle, Stadium } from '@/components/pista/structure';
import { Laps, StructureBar, type Seg } from '@/components/pista/meters';
import { Bib, Oval, PaceBand, Shield } from '@/components/pista/sport';
import { Chart, GridY, Line, StackedBars, lin, type Bar, type Pt } from '@/components/pista/charts';
import { cssVars, typeColor } from '@/components/pista/util';

/* ---- datos de muestra ---- */
const W = (d: number): Seg => ({ d, k: 'w', i: 0.36 }),
  R = (d: number, i: number): Seg => ({ d, k: 'r', i }),
  X = (d: number): Seg => ({ d, k: 'x', i: 0.2 });
const reps = (n: number, d: number, i: number, p: number) => Array.from({ length: n }, (_, k) => (k < n - 1 ? [R(d, i), X(p)] : [R(d, i)])).flat();
const SESSIONS: { t: SessionType; name: string; km: string; segs: Seg[] }[] = [
  { t: 'series', name: '6 × 800 m', km: '9,8 km', segs: [W(2), ...reps(6, 0.8, 0.96, 0.4), W(1.5)] },
  { t: 'tempo', name: '3 × 3 km', km: '13 km', segs: [W(2), ...reps(3, 3, 0.78, 0.5), W(1.5)] },
  { t: 'fondo', name: '16 km suaves', km: '18 km', segs: [W(1), R(16, 0.55), W(1)] },
];

/* km por semana de 12 semanas, por tipo (regenerativo, series, tempo y fondo), con el promedio de 4. La última es la
   semana en curso: los mismos 27,4 de 38 km de la pista */
const WEEKS: [number, number, number, number][] = [
  [8, 6, 0, 10], [9, 0, 6, 11], [8, 7, 0, 12], [6, 0, 5, 9], [9, 7, 0, 13], [10, 0, 7, 14],
  [9, 8, 0, 15], [11, 0, 8, 16], [7, 6, 0, 11], [11, 8, 0, 17], [12, 0, 9, 18], [6.4, 9, 0, 12],
];
const PLAN = 38;
const VOL_C = [typeColor('regen'), typeColor('series'), typeColor('tempo'), typeColor('fondo')];

function Volume() {
  const w = 320,
    h = 150,
    x = lin(0, WEEKS.length, 8, w - 4),
    y = lin(0, 45, h - 16, 6),
    bw = (w - 12) / WEEKS.length - 6;
  const tot = WEEKS.map((p) => p.reduce((a, v) => a + v, 0));
  const bars: Bar[] = WEEKS.map((p, i) => ({ x: x(i) + 3, w: bw, parts: p.map((v, k) => ({ v, c: VOL_C[k] })), cur: i === WEEKS.length - 1, target: PLAN }));
  const avg: Pt[] = tot.map((_, i) => [x(i) + 3 + bw / 2, y(tot.slice(Math.max(0, i - 3), i + 1).reduce((a, v) => a + v, 0) / Math.min(4, i + 1))]);
  return (
    <Chart w={w} h={h} label="Km por semana de las últimas 12 semanas, apilados por tipo de sesión, con el promedio de 4 semanas">
      <GridY ticks={[0, 20, 40]} y={y} x0={8} x1={w - 4} side="none" zero />
      <StackedBars bars={bars} y={y} />
      <Line pts={avg} color="var(--ink)" width={1.5} />
    </Chart>
  );
}

/* el Mapa: la ciudad de noche (oscura en los dos temas), con la cuadrícula de calles, el parque y el lago, las pasadas en
   tartán (se suman donde pasás más) y la salida elegida en blanco con sus marcas. Las salidas van por la cuadrícula: se
   dibujan derechas y se giran con ella */
const GRID = 'rotate(-34 200 110)';
const STREETS = Array.from({ length: 41 }, (_, k) => -160 + k * 18);
const RUNS = ['M110 196 H218 V124 H272', 'M110 196 V142 H236 V88', 'M110 196 H164 V70 H290', 'M110 196 H326 V160', 'M110 196 V106 H182 V52'];
const LAKE = 'M262 70 C300 52 336 66 334 90 C332 116 290 124 262 112 C238 102 236 82 262 70Z';
function CityMap() {
  const off = [-2, 0, 2];
  return (
    <svg className="po-map" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mapa de la ciudad de noche con los recorridos en tartán">
      <rect width="400" height="220" fill="#111213" />
      <g transform={GRID} stroke="rgb(242 241 237 / .06)" strokeWidth="1">
        {STREETS.map((v) => (
          <g key={v}>
            <line x1={v} x2={v} y1="-200" y2="420" strokeWidth={v % 90 === 20 ? 2 : 1} />
            <line y1={v} y2={v} x1="-200" x2="600" strokeWidth={v % 90 === 20 ? 2 : 1} />
          </g>
        ))}
      </g>
      <path d="M214 34 C268 4 382 16 390 78 C398 140 312 156 252 140 C206 128 182 62 214 34Z" fill="#15201A" />
      <path d={LAKE} fill="#1A2731" />
      <path d="M0 212 C110 192 270 206 400 178 V220 H0Z" fill="#1A2731" />
      <g className="po-runs" fill="none" stroke="var(--acc)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity=".42">
        {off.map((o) => (
          <g key={o} transform={`translate(${o} ${o / 2})`}>
            <g transform={GRID}>
              {RUNS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            <path d={LAKE} transform={`translate(${o} ${-o})`} />
          </g>
        ))}
      </g>
      <g className="po-run" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
        <path d={RUNS[0]} transform={GRID} />
        <path d={LAKE} />
      </g>
      {/* el corredor, ida y vuelta por la salida elegida */}
      <g className="po-runner" transform={GRID}>
        <circle r="7" fill="var(--acc)" opacity=".35" />
        <circle r="3.4" fill="#fff" />
        <animateMotion dur="7s" repeatCount="indefinite" path={RUNS[0]} keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="linear" />
      </g>
    </svg>
  );
}

/* una vuelta en el andarivel de tartán de los estadios (el cuarto de Lanes), contra el reloj como en la pista */
const Lap = () => (
  <svg className="p-lanes po-lap" viewBox="0 0 900 560" aria-hidden="true">
    <rect x="112" y="112" width="676" height="336" rx="168" pathLength={100} />
  </svg>
);

const FEATURES: { k: string; t: string; p: string; v: ReactNode }[] = [
  {
    k: 'Semana',
    t: 'La semana, en la pista',
    p: 'Cada salida suma metros en el andarivel uno hasta completar el plan. Arrastrás una sesión para pasarla a otro día.',
    v: (
      <div className="po-oval">
        <Oval done={27.4} total={PLAN} />
      </div>
    ),
  },
  {
    k: 'Cargar y planificar',
    t: 'Cargá y planificá',
    p: 'Cargás en tres pasos, con el ritmo calculado. Armás cada sesión por tramos y repeticiones, y te avisa si juntás dos fuertes seguidas.',
    v: (
      <ul className="po-sess">
        {SESSIONS.map((s) => (
          <li key={s.t}>
            <span>
              <Chip type={s.t} />
              <b>{s.name}</b>
              <small className="mono">{s.km}</small>
            </span>
            <StructureBar segs={s.segs} color={typeColor(s.t)} height={24} label={s.name} />
          </li>
        ))}
      </ul>
    ),
  },
  {
    k: 'Análisis',
    t: 'Cómo venís',
    p: 'Los km de cada semana, el reparto entre suave y fuerte, tus ritmos de entrenamiento, la deriva de los fondos y cómo llegás a la carrera.',
    v: (
      <div className="po-vol">
        <Volume />
      </div>
    ),
  },
  {
    k: 'Carreras',
    t: 'El día de la carrera',
    p: 'La cuenta regresiva, el plan por bloques hasta la largada, la estrategia por tramos y la pulsera de ritmos para imprimir.',
    v: (
      <div className="po-band">
        <PaceBand title="10K · 48:00" sub="Ritmo 4:48" splits={[292, 290, 289, 288, 288, 287, 287, 286, 285, 268]} breaks={[3, 7]} />
      </div>
    ),
  },
  {
    k: 'Mapa',
    t: 'Tu ciudad, corrida',
    p: 'Los recorridos de tus salidas sobre Buenos Aires: por dónde pasás más, las cuadras que ya pisaste y los barrios que te faltan.',
    v: <CityMap />,
  },
  {
    k: 'Logros',
    t: 'Cada kilómetro suma',
    p: 'Trofeos de bronce a platino, desafíos con fecha, tu ficha de jugador y un camino de 50 niveles que se gana corriendo.',
    v: (
      <div className="po-tro">
        <div className="po-shields">
          <Shield tier={0} got icon={Sneaker} size={50} />
          <Shield tier={1} got icon={Mountains} size={50} />
          <Shield tier={2} got icon={Lightning} size={50} />
          <Shield tier={3} got={false} icon={Trophy} size={50} />
        </div>
        <div className="po-lvl">
          <div>
            <b>Fondista</b>
            <span className="disp">7</span>
          </div>
          <Laps value={0.64} partial label="64% al nivel 8" />
        </div>
      </div>
    ),
  },
];

/* la carrera del estadio y, con el easter egg (eggs.tsx), el maratón */
interface HeroRace {
  chip: string;
  title: string;
  band: [string, string];
  num: string;
  numLabel: string;
  start: string;
  corral: string;
  goal: string;
  pace: string;
}
const K10: HeroRace = { chip: 'Running', title: 'con plan', band: ['10K de Palermo', 'Domingo'], num: '34', numLabel: 'días', start: '08:00', corral: 'B', goal: '48:00', pace: '4:48' };
const MARA: HeroRace = { chip: 'Maratón', title: '42,195', band: ['Maratón de Buenos Aires', 'Domingo'], num: '42', numLabel: 'km', start: '07:00', corral: 'A', goal: '3:30:00', pace: '4:58' };

/** los dos caminos: probar sin cuenta (lo principal) o entrar (las cuentas las crea el responsable) */
function Ctas() {
  return (
    <div className="po-ctas">
      <Button variant="acc" size="lg" arrow onClick={startGuest}>
        Probar sin cuenta
      </Button>
      <Button variant="on-dark" size="lg" href="/login">
        Entrar
      </Button>
    </div>
  );
}

export default function Portada() {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  const [mara, tap] = useMarathon(),
    r = mara ? MARA : K10;
  return (
    <div className="po" ref={root}>
      <Nav />

      <main>
        <Stadium
          className="po-hero p-rise"
          sideWidth={300}
          side={
            <div key={r.num} className="po-bibtap" onClick={tap}>
              <Bib
                band={r.band}
                num={r.num}
                numLabel={r.numLabel}
                meta={[
                  { label: 'Largada', value: r.start },
                  { label: 'Corral', value: r.corral },
                ]}
                tear={[
                  { label: 'Objetivo', value: r.goal },
                  {
                    label: 'Ritmo',
                    value: (
                      <>
                        {r.pace}
                        <span className="p-u">/km</span>
                      </>
                    ),
                  },
                ]}
              />
            </div>
          }
        >
          <Lap />
          <div className="p-st-top p-rise" style={cssVars({ '--i': 2 })}>
            <Chip color="var(--acc)" solid>
              {r.chip}
            </Chip>
            <span className="lbl">Registro y plan de entrenamiento</span>
          </div>
          <BrandTitle key={r.title} className="po-h1">
            <span className="po-ln">
              <span>Corré</span>
            </span>{' '}
            <span className="po-ln">
              <span>{r.title}</span>
            </span>
          </BrandTitle>
          <p className="po-lead p-rise" style={cssVars({ '--i': 6 })}>
            Lane One es tu registro de running: anotás cada salida, armás la semana hacia tu próxima carrera y ves cómo venís.
            Fondos guiados por frecuencia cardíaca; series y tempos, por ritmo.
          </p>
          <Ctas />
          <p className="po-note p-rise" style={cssVars({ '--i': 8 })}>
            Probala con datos de ejemplo: no se guarda nada.
          </p>
        </Stadium>

        <section className="po-feats" id="que-hace" aria-labelledby="po-feats-h">
          <header className="po-sh" data-reveal>
            <span className="lbl">Qué hace</span>
            <BrandTitle as="h2" id="po-feats-h">
              De la primera salida a la llegada
            </BrandTitle>
          </header>
          <div className="po-grid">
            {FEATURES.map((f, i) => (
              <article key={f.k} className="po-f" data-reveal style={cssVars({ '--d': i % 3 })}>
                <div className="po-f-v">{f.v}</div>
                <div className="po-f-t">
                  <span className="lbl">
                    {String(i + 1).padStart(2, '0')} · {f.k}
                  </span>
                  <h3>{f.t}</h3>
                  <p>{f.p}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div id="probala" data-reveal>
          <Stadium className="po-end">
            <Lap />
            <Largada />
            <p className="po-lead">Probala ahora con datos de ejemplo: la semana, el análisis, la carrera y el mapa, sin cargar nada.</p>
            <Ctas />
          </Stadium>
        </div>
      </main>

      <footer className="po-foot">
        <span className="brand">
          <BrandMark />
          <span>
            <b>Lane One</b>
            <small>Un proyecto de Fermín Lasarte</small>
          </span>
        </span>
        <nav aria-label="Más">
          <Link href="/login">Entrar</Link>
        </nav>
      </footer>
    </div>
  );
}
