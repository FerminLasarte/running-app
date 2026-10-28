'use client';
/* Análisis → Forma y carga: la preparación para la próxima carrera en un cronógrafo de 60 marcas con sus chequeos, la
   relación de carga 7/28 días (por km, como loadInfo) con los km de cada día, y el estado físico, la fatiga y la forma
   del período con las fases del plan y la proyección hasta la largada. Los tres números de la forma son los mismos que
   los de Semana (salen de la misma serie y de la misma pieza). */
import { useS } from '@/lib/store';
import type { SessionType } from '@/lib/domain/types';
import { isLong, longTarget, nextRace } from '@/lib/domain/config';
import { anWeeks, formSeries, formState, type FormPoint } from '@/lib/domain/analysis';
import { PHASES, blockPlan, longRace } from '@/lib/domain/blocks';
import { MARK_DISTS } from '@/lib/domain/marks';
import { formProjection } from '@/lib/domain/projection';
import { READY_MIN, readyItems, readyPts, readyScore, type ReadyKind } from '@/lib/domain/readiness';
import { deloadInfo, doneList, kmByType, loadInfo } from '@/lib/domain/stats';
import { raceDateLabel } from '@/lib/domain/week';
import { DF_WD, addDays, clamp, daysTo, fmt, plural, sod, ymd } from '@/lib/domain/util';
import { goRaces } from '@/lib/data/actions';
import { Button } from '@/components/pista/controls';
import { HowTo, Panel } from '@/components/pista/structure';
import { Laps } from '@/components/pista/meters';
import { Chrono } from '@/components/pista/sport';
import { Chart, GridY, Key, LabelsX, StackedBars, Tip, lin, useCursor, type Bar } from '@/components/pista/charts';
import { FormChart, FormKpis, weeklyOf, type FormPhase } from '@/components/pista/form';
import { PHASE_C, cssVars, typeColor } from '@/components/pista/util';
import { useAnPeriod } from './period';
import { niceTicks } from './util';

const STACK: SessionType[] = ['regen', 'fondo', 'tempo', 'series', 'test'];
const PTS_C: Record<Exclude<ReadyKind, 'na'>, string | undefined> = { good: undefined, warn: 'var(--t-tempo)', crit: 'var(--neg)' };
/** el nombre corto de una distancia para el cuadradito de la carrera: «10K», «21K» */
const shortOf = (km: number) => {
  const m = MARK_DISTS.find((q) => Math.abs(km - q[0]) / q[0] < 0.02);
  return m && m[0] > 20 ? Math.floor(m[0]) + 'K' : m ? m[1] : fmt(km, 0) + 'K';
};

/* ---- preparación ---- */
function ReadyPanel() {
  const race = nextRace();
  if (!race)
    return (
      <Panel className="p-c6 p-rise" style={cssVars({ '--i': 2 })} title="Preparación">
        <p className="an-note">Cargá tu próxima carrera y acá ves qué tan listo llegás: volumen, tirada larga, ritmo, constancia y cómo venís de carga.</p>
        <Button size="sm" onClick={goRaces}>
          Cargar carrera
        </Button>
      </Panel>
    );
  const days = daysTo(race.date),
    wks = Math.floor(days / 7),
    I = readyItems(race),
    sc = readyScore(I),
    withData = I.filter((i) => i.k !== 'na').length,
    when = days === 0 ? 'es hoy' : wks > 0 ? 'faltan ' + plural(wks, 'semana', 'semanas') : 'faltan ' + plural(days, 'día', 'días');
  return (
    <Panel className="p-c6 p-rise" style={cssVars({ '--i': 2 })} title="Preparación" sub={'Para el ' + race.name}>
      <div className="an-ready">
        <Chrono value={sc}>{sc == null ? 'faltan datos · ' + withData + ' de ' + I.length + ' con datos' : 'de 100 · ' + when}</Chrono>
        <ul className="an-factors">
          {I.map((i) => {
            const v = readyPts(i);
            return (
              <li key={i.t}>
                <div className="an-rowb">
                  <b>{i.t}</b>
                  <span className="an-mono" style={i.k !== 'na' && PTS_C[i.k] ? { color: PTS_C[i.k] } : undefined}>
                    {v == null ? 'sin datos' : v}
                  </span>
                </div>
                <small>{i.x}</small>
                <Laps value={(v ?? 0) / 100} />
              </li>
            );
          })}
        </ul>
      </div>
      {days <= 14 && days > 0 ? <p className="an-note">Recta final: no busques más ritmo ni más km.</p> : null}
      <HowTo>
        {raceDateLabel(race)}. Cada chequeo en verde suma 100, en amarillo 50 y en rojo 0; el puntaje es el promedio. Los que todavía no tienen datos no cuentan, y el puntaje sale con {READY_MIN} o más con datos. Son reglas simples sobre tus datos, no una predicción de tu tiempo:{' '}
        {isLong(race) ? 'volumen de unos ' + (race.km > 30 ? 45 : 30) + ' km por semana' : 'series cerca del ritmo de carrera'}, tirada larga de al menos {fmt(longTarget(race.km), 0)} km, cumplimiento de 85% o más, carga entre 0,8 y 1,3 y
        deriva bajo 5%.
      </HowTo>
    </Panel>
  );
}

/* ---- carga de la semana ---- */
/** bandas de la relación de carga, de 0,5 a 1,8 (las mismas franjas que readyItems y loadInfo) */
const BANDS: [string, number, number, string][] = [
  ['Baja', 0.5, 0.8, 'var(--ink-4)'],
  ['Productiva', 0.8, 1.3, 'var(--pos)'],
  ['Alta', 1.3, 1.5, 'var(--t-tempo)'],
  ['Riesgo', 1.5, 1.8, 'var(--neg)'],
];
/* como loadInfo y readyItems: baja hasta 0,8 (sin incluir); productiva hasta 1,3 y alta hasta 1,5, incluidos */
const zoneOfRatio = (r: number) => BANDS.find((b, i) => (i === 0 ? r < b[2] : r <= b[2])) || BANDS[BANDS.length - 1];
const DF_DAYN = new Intl.DateTimeFormat('es-AR', { weekday: 'short' });

function DaysChart({ avg }: { avg: number }) {
  const today = sod(new Date()),
    D = Array.from({ length: 7 }, (_, k) => {
      const d = addDays(today, k - 6),
        x = ymd(d),
        L = doneList().filter((s) => s.result.date === x);
      return { d, bt: kmByType(L), km: L.reduce((a, s) => a + s.result.distKm, 0) };
    }),
    w = 640,
    h = 170,
    M = { l: 34, r: 10, t: 12, b: 24 },
    bw = (w - M.l - M.r) / 7,
    { hi, ticks } = niceTicks(Math.max(avg * 1.3, ...D.map((q) => q.km))),
    Y = lin(0, hi, h - M.b, M.t),
    xc = (k: number) => M.l + k * bw + bw / 2,
    { sel, cursor } = useCursor(
      D.map((_, k) => xc(k)),
      w,
    ),
    Q = sel != null ? D[sel] : null;
  const name = (d: Date) => DF_DAYN.format(d).replace('.', '') + ' ' + d.getDate();
  const bars: Bar[] = D.map((q, k) => ({ x: M.l + k * bw + bw * 0.22, w: bw * 0.56, parts: STACK.map((t) => ({ v: q.bt[t] || 0, c: typeColor(t) })) }));
  return (
    <Chart
      w={w}
      h={h}
      label="Kilómetros de cada uno de los últimos 7 días, contra tu promedio diario de 4 semanas"
      cursor={cursor}
      live={Q ? DF_WD.format(Q.d) + ': ' + (Q.km ? fmt(Q.km, 1) + ' km' : 'descanso') : undefined}
      table={{ head: ['Día', 'Km'], rows: D.map((q) => [DF_WD.format(q.d), q.km ? fmt(q.km, 1) : 'descanso']) }}
    >
      <GridY ticks={ticks} y={Y} x0={M.l} x1={w - M.r} zero />
      <StackedBars bars={bars} y={Y} sel={sel} />
      {D.map((q, k) =>
        q.km ? null : (
          <text key={k} className="p-ax" x={xc(k)} y={Y(0) - 6} textAnchor="middle">
            descanso
          </text>
        ),
      )}
      <line x1={M.l} x2={w - M.r} y1={Y(avg)} y2={Y(avg)} stroke="var(--ink)" strokeDasharray="4 3" />
      <text className="an-halo" x={w - M.r} y={Y(avg) - 6} textAnchor="end" style={{ font: '600 10.5px var(--f-mono)', fill: 'var(--ink)' }}>
        PROMEDIO 4 SEM · {fmt(avg, 1)} KM/DÍA
      </text>
      <LabelsX y={h - 6} items={D.map((q, k) => ({ x: xc(k), label: name(q.d).toUpperCase(), accent: k === 6 }))} />
      {Q && Q.km ? <Tip x={xc(sel!)} y={M.t} w={120} xMax={w} head={name(Q.d)} lines={[{ t: fmt(Q.km, 1) + ' km' }]} /> : null}
    </Chart>
  );
}

function LoadPanel() {
  const L = loadInfo(),
    dl = deloadInfo();
  if (!L)
    return (
      <Panel className="p-c6 p-rise" style={cssVars({ '--i': 3 })} title="Carga de la semana">
        <p className="an-note">Necesito unas 3 semanas de entrenamientos para comparar tu semana con tu promedio y avisarte si estás subiendo muy rápido.</p>
      </Panel>
    );
  const r = L.ratio,
    z = zoneOfRatio(r),
    pc = Math.round((r - 1) * 100),
    pos = ((clamp(r, 0.5, 1.8) - 0.5) / 1.3) * 100;
  const msg =
    z[0] === 'Baja'
      ? 'Vas por debajo de tu promedio: está bien si es una semana liviana a propósito.'
      : z[0] === 'Productiva'
        ? 'Subís a un ritmo razonable: en esta franja el riesgo de lesión fue bajo en estudios.'
        : z[0] === 'Alta'
          ? 'Subida fuerte: mirá cómo te sentís y evitá sumar intensidad esta semana.'
          : 'Subida muy brusca: por encima de 1,5 el riesgo de lesión sube de forma clara. Considerá bajar los km.';
  return (
    <Panel className="p-c6 p-rise" style={cssVars({ '--i': 3 })} title="Carga de la semana" sub={<span className="hide-s">Últimos 7 días contra tu promedio de 4 semanas</span>}>
      <div className="an-acwr">
        <div>
          <span className="lbl">Relación de carga</span>
          <span className="disp">{fmt(r, 2)}</span>
          <small>
            {fmt(L.acute, 1)} km contra {fmt(L.chronic, 1)} por semana: {pc === 0 ? 'igual que' : Math.abs(pc) + '% ' + (pc > 0 ? 'más' : 'menos') + ' que'} tu promedio, zona {z[0].toLowerCase()}.
          </small>
        </div>
        <div className="an-acwr-g" role="img" aria-label={'Relación de carga ' + fmt(r, 2) + ', zona ' + z[0].toLowerCase()}>
          <div className="pin" style={cssVars({ left: pos + '%' })}>
            <b>{fmt(r, 2)}</b>
            <i />
          </div>
          <div className="bands" style={cssVars({ gridTemplateColumns: BANDS.map((b) => b[2] - b[1] + 'fr').join(' ') })}>
            {BANDS.map((b) => (
              <i key={b[0]} style={cssVars({ '--bc': b[3] })} className={b === z ? 'on' : undefined} />
            ))}
          </div>
          <div className="bl" style={cssVars({ gridTemplateColumns: BANDS.map((b) => b[2] - b[1] + 'fr').join(' ') })}>
            {BANDS.map((b) => (
              <span key={b[0]}>{b[0]}</span>
            ))}
          </div>
        </div>
      </div>
      <p className="an-note">{msg}</p>
      <div className="an-days">
        <DaysChart avg={L.chronic / 7} />
      </div>
      {dl != null && dl >= 3 ? <p className="an-note an-warn">Hace {dl} semanas que no bajás el volumen. Una semana liviana (20–30% menos km) ayuda a asimilar el trabajo; si tu plan ya tiene una, seguila.</p> : null}
      <HowTo>Divido los km de tus últimos 7 días por tu promedio semanal de las últimas 4 semanas. Entre 0,8 y 1,3 es la zona más segura; sobre 1,5 el riesgo sube. No uso la regla del «10% por semana»: los estudios no la respaldan.</HowTo>
    </Panel>
  );
}

/* ---- estado físico, fatiga y forma ---- */
/** una muestra por semana de la proyección, contando para atrás desde la carrera (que siempre queda) */
const projWeekly = (P: FormPoint[]) => P.filter((_, i) => (P.length - 1 - i) % 7 === 0);

function FormFull() {
  const [per] = useAnPeriod();
  const F = formSeries();
  if (!F)
    return (
      <Panel className="p-c12 p-rise" style={cssVars({ '--i': 4 })} title="Forma y fatiga">
        <p className="an-note">Con 5 salidas en 3 semanas aparecen tu estado físico, tu fatiga y tu forma.</p>
      </Panel>
    );
  const pts = weeklyOf(F, anWeeks(per) ?? Math.ceil(F.length / 7)),
    race = nextRace(),
    /* proyección solo si la carrera está a 16 semanas o menos: más lejos, el plan cargado todavía no dice mucho */
    near = race && daysTo(race.date) <= 112 ? race : null,
    P = formProjection(near),
    proj = P ? projWeekly(P.pts) : undefined,
    bp = blockPlan(longRace()),
    phases: FormPhase[] = [];
  bp?.weeks.forEach((w) => {
    const t0 = w.mon.getTime(),
      last = phases[phases.length - 1];
    if (last && last.n === PHASES[w.ph].n) last.t1 = t0 + 7 * 864e5;
    else phases.push({ t0, t1: t0 + 7 * 864e5, n: PHASES[w.ph].n, c: PHASE_C[w.ph] });
  });
  const E = proj?.[proj.length - 1],
    st = formState(F[F.length - 1].tsb);
  return (
    <Panel
      className="p-c12 p-rise"
      style={cssVars({ '--i': 4 })}
      title="Forma y fatiga"
      sub={<span className="hide-s">{pts.length + ' semanas' + (P && near ? ' y lo que viene hasta el ' + near.name : '')}</span>}
      flush
      actions={
        <span className="an-keys hide-s">
          <Key color="var(--ink)">Estado físico</Key>
          <Key color="var(--ink-3)" kind="dash">
            Fatiga
          </Key>
          <Key color="var(--t-tempo)" kind="sq">
            Forma
          </Key>
          {P ? (
            <Key color="var(--acc)" kind="dash">
              Proyección
            </Key>
          ) : null}
        </span>
      }
    >
      <FormKpis F={F} pts={pts} />
      <div className="p-panel-b">
        <p className="an-note">
          <b>{st.t}.</b> {st.x}
        </p>
        <div className="an-wide">
          <FormChart
          pts={pts}
          proj={proj}
          race={near ? { short: shortOf(near.km), name: near.name } : undefined}
          phases={phases.length ? phases : undefined}
          w={1180}
          h={300}
          labels={9}
          label={'Estado físico, fatiga y forma de las últimas ' + pts.length + ' semanas' + (P && near ? ', con la proyección hasta el ' + near.name : '')}
          />
        </div>
        {P && near && E ? (
          <p className="an-note">
            {'La proyección usa tus ' +
              plural(P.n, 'sesión planificada', 'sesiones planificadas') +
              ' hasta el ' +
              near.name +
              ' (los días sin plan cuentan como descanso): llegarías con estado ' +
              Math.round(E.ctl) +
              ' y forma ' +
              (E.tsb >= 0 ? '+' : '−') +
              Math.abs(Math.round(E.tsb)) +
              '.'}
          </p>
        ) : near ? (
          <p className="an-note">Planificá lo que falta hasta el {near.name} y acá ves cómo llegás.</p>
        ) : null}
        <HowTo>
          A cada salida le asigno una carga según su duración y su FC (las series y tempos pesan un poco más). El estado físico es el promedio de esa carga en unas 6 semanas, la fatiga en unos 7 días y la forma, la diferencia. Son
          unidades relativas: sirven para comparar tus semanas, no con otras personas.
        </HowTo>
      </div>
    </Panel>
  );
}

export default function Forma() {
  useS();
  return (
    <div className="p-grid">
      <ReadyPanel />
      <LoadPanel />
      <FormFull />
    </div>
  );
}
