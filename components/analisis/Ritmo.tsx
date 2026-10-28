'use client';
/* Análisis → Ritmo y eficiencia: VDOT, 10K estimado, ritmo a tu FC habitual y deriva; cada sesión como punto con la
   recta de cada tipo; tus ritmos de entrenamiento en una regla de lento a rápido; tu corazón semana a semana y la
   deriva de cada fondo con la línea del 5%. Los números de arriba no dependen del período; los gráficos, sí. */
import { ArrowsClockwise } from '@phosphor-icons/react';
import { S, useS, useUi } from '@/lib/store';
import type { Race, SessionType } from '@/lib/domain/types';
import { TYPES, nextRace, racePaceSec, refRace } from '@/lib/domain/config';
import { anFrom, hrPace, paceTrends, type HrPace, type PaceTrend } from '@/lib/domain/analysis';
import { PZ, paceAtV, vdotOf, vdotTime, type PaceZone } from '@/lib/domain/daniels';
import { DEC_UI0, decBackfill, decBand, decEligible, type DecUi } from '@/lib/domain/dec';
import { lvHistory, lvPace } from '@/lib/domain/level';
import { doneList, type DoneSession } from '@/lib/domain/stats';
import { addDays, dShort, dateLabel, dayDiff, fmt, fmtDur, fmtPace, isoWeek, monthOf, pd, plural, sod, sum, ymd } from '@/lib/domain/util';
import { Button, Segmented, deltaTxt } from '@/components/pista/controls';
import { HowTo, Kpis, Panel } from '@/components/pista/structure';
import { Chart, Dots, GridY, Guide, Key, LabelsX, Line, Tip, chartFont, lin, useCursor, type Pt } from '@/components/pista/charts';
import { cssVars, typeColor } from '@/components/pista/util';
import { useAnPeriod, usePaceBase } from './period';
import { niceTicks, paceTicks } from './util';

const DAY = 864e5;
const up = (d: number, better: 'lower' | 'higher' = 'lower') => (Math.round(d) === 0 ? undefined : (better === 'lower' ? d < 0 : d > 0) ? 'p-up' : 'p-dn');
/** marcas del eje X con fecha: unas `n`, repartidas entre t0 y t1 */
const dateLabels = (t0: number, t1: number, X: (t: number) => number, n = 6) =>
  Array.from({ length: n }, (_, k) => {
    const t = t0 + ((t1 - t0) * k) / (n - 1);
    return { x: X(t), label: 'S' + isoWeek(new Date(t)) };
  });

/* ---- los cuatro números ---- */
function Big() {
  const lv = lvPace(),
    vd = lv ? vdotOf(lv.sec, 10) : null,
    /* contra tu estimación de hace unas 8 semanas */
    ref = lvHistory()
      .filter((c) => c.date <= ymd(addDays(sod(new Date()), -56)))
      .pop(),
    hp = hrPace(),
    dc = doneList()
      .filter((q) => q.result.dec && q.result.dec.p != null)
      .slice(-3),
    dav = dc.length ? sum(dc.map((q) => q.result.dec!.p!)) / dc.length : null;
  const hNow = hp ? hp.at(hp.last) : 0,
    hD = hp ? hNow - hp.at(hp.first) : 0;
  return (
    <Panel className="p-c12 p-rise" style={cssVars({ '--i': 2 })} flush>
      <Kpis
        lg
        items={[
          {
            label: 'VDOT',
            value: vd ? fmt(vd, 1) : '–',
            note: !vd ? (
              'Con un test o series aparece tu VDOT'
            ) : !ref ? (
              'Tu capacidad aeróbica, de tu 10K estimado'
            ) : Math.abs(vd - vdotOf(ref.sec, 10)) < 0.05 ? (
              'Igual que el ' + dShort(pd(ref.date))
            ) : (
              <>
                <span className={up(vd - vdotOf(ref.sec, 10), 'higher')}>{(vd > vdotOf(ref.sec, 10) ? '+' : '−') + fmt(Math.abs(vd - vdotOf(ref.sec, 10)), 1)}</span> desde el {dShort(pd(ref.date))}
              </>
            ),
          },
          {
            label: '10K estimado',
            value: lv ? fmtDur(lv.sec) : '–',
            note: !lv ? undefined : !ref ? (
              'De ' + lv.txt.replace(/^tu |^tus /, '')
            ) : Math.round(lv.sec - ref.sec) === 0 ? (
              'Igual que el ' + dShort(pd(ref.date))
            ) : (
              <>
                <span className={up(lv.sec - ref.sec)}>{deltaTxt(lv.sec - ref.sec)}</span> desde el {dShort(pd(ref.date))}
              </>
            ),
          },
          {
            label: 'Ritmo a ' + (hp ? hp.hr : '–') + ' lpm',
            value: hp ? fmtPace(hNow) : '–',
            unit: hp ? '/km' : undefined,
            note: hp ? (
              <>
                <span className={up(hD)}>{deltaTxt(hD)}</span> desde {monthOf(new Date(hp.first))}, con el mismo esfuerzo
              </>
            ) : (
              'Con 4 fondos o regenerativos con FC aparece'
            ),
          },
          {
            label: 'Deriva en fondos',
            value: dav == null ? '–' : fmt(dav, 1),
            unit: dav == null ? undefined : '%',
            note: dav == null ? 'Calculala con Strava, abajo' : (dc.length === 1 ? 'Último fondo' : 'Promedio de los últimos ' + dc.length + ' fondos') + ': ' + decBand({ p: dav }).t.toLowerCase(),
          },
        ]}
      />
    </Panel>
  );
}

/* ---- evolución del ritmo ---- */
/** la carrera de la línea del objetivo, como el original: la próxima si tiene tiempo objetivo, si no la de referencia */
const goalRace = () => {
  const nr = nextRace();
  return nr && nr.targetSec > 0 ? nr : refRace();
};

function PaceChart({ T, from, race }: { T: PaceTrend[]; from: string; race: Race }) {
  const w = 760,
    h = 420,
    M = { l: 40, r: 48, t: 18, b: 28 },
    t0 = pd(from).getTime(),
    t1 = sod(new Date()).getTime(),
    X = lin(t0, t1, M.l, w - M.r),
    all = T.flatMap((q) => q.pts).sort((a, b) => a.t - b.t),
    /* el ritmo objetivo entra siempre en el gráfico (el original lo dibujaba solo si caía entre los puntos) */
    goal = racePaceSec(race),
    { lo, hi, ticks } = paceTicks(Math.min(goal, ...all.map((p) => p.v)) - 5, Math.max(goal, ...all.map((p) => p.v)) + 5),
    /* más rápido arriba */
    Y = lin(lo, hi, M.t, h - M.b),
    { sel, cursor } = useCursor(
      all.map((p) => X(p.t)),
      w,
    );
  /* los números del final de cada recta no se pisan: se separan de a 13 */
  const ends = T.filter((q) => q.line)
    .map((q) => ({ k: q.k, y: Y(q.line!.v1), v: q.line!.v1, x: X(q.line!.t1) }))
    .sort((a, b) => a.y - b.y);
  ends.forEach((e, i) => {
    if (i && e.y - ends[i - 1].y < 13) e.y = ends[i - 1].y + 13;
  });
  const P = sel != null ? all[sel] : null;
  const read = (p: (typeof all)[number]) => dateLabel(p.s.result.date) + ' · ' + TYPES[p.s.type].label + ': ' + fmtPace(p.v) + ' /km · ' + fmt(p.s.result.distKm, 1) + ' km';
  return (
    <Chart
      w={w}
      h={h}
      label={'Ritmo principal de cada sesión, por tipo, con su tendencia y el ritmo objetivo del ' + race.name + ' (' + fmtPace(goal) + ' /km)'}
      cursor={cursor}
      live={P ? read(P) : undefined}
      table={{ head: ['Sesión', 'Ritmo', 'Km'], rows: all.map((p) => [dateLabel(p.s.result.date) + ' · ' + TYPES[p.s.type].label, fmtPace(p.v) + ' /km', fmt(p.s.result.distKm, 1)]) }}
    >
      <GridY ticks={ticks} y={Y} x0={M.l} x1={w - M.r} fmt={fmtPace} />
      <line x1={M.l} x2={w - M.r} y1={Y(goal)} y2={Y(goal)} stroke="var(--ink)" strokeDasharray="4 3" />
      <text className="an-halo" x={M.l + 6} y={Y(goal) - 6} style={{ font: chartFont('lbl'), fill: 'var(--ink)' }}>
        OBJETIVO {race.name.toUpperCase()} · {fmtPace(goal)}
      </text>
      <text className="p-ax" x={M.l} y={M.t - 6}>
        ↑ MÁS RÁPIDO
      </text>
      <Dots pts={all.map((p) => ({ x: X(p.t), y: Y(p.v), c: typeColor(p.s.type), o: P && P !== p ? 0.25 : 0.55 }))} />
      {T.map((q) =>
        q.line ? (
          <g key={q.k}>
            <line x1={X(q.line.t0)} y1={Y(q.line.v0)} x2={X(q.line.t1)} y2={Y(q.line.v1)} stroke={typeColor(q.k)} strokeWidth="2.4" strokeLinecap="round" />
            <circle cx={X(q.line.t1)} cy={Y(q.line.v1)} r="4.5" fill={typeColor(q.k)} stroke="var(--surface)" strokeWidth="2" />
          </g>
        ) : null,
      )}
      {ends.map((e) => (
        <text key={e.k} x={Math.max(e.x, w - M.r) + 6} y={e.y + 4} style={{ font: chartFont('xs'), fill: typeColor(e.k) }}>
          {fmtPace(e.v)}
        </text>
      ))}
      <LabelsX y={h - 6} items={dateLabels(t0, t1, X)} />
      {P ? (
        <>
          <Guide x={X(P.t)} y0={M.t} y1={h - M.b} />
          <circle cx={X(P.t)} cy={Y(P.v)} r="5" fill={typeColor(P.s.type)} stroke="var(--surface)" strokeWidth="2" />
          <Tip x={X(P.t)} y={M.t} w={160} xMax={w} head={dateLabel(P.s.result.date)} lines={[{ t: TYPES[P.s.type].label, color: typeColor(P.s.type) }, { t: fmtPace(P.v) + ' /km' }, { t: fmt(P.s.result.distKm, 1) + ' km' }]} />
        </>
      ) : null}
    </Chart>
  );
}

function PacePanel({ from }: { from: string }) {
  const T = paceTrends(from),
    race = goalRace();
  return (
    <Panel
      className="p-c8 p-rise"
      style={cssVars({ '--i': 3 })}
      title="Evolución del ritmo"
      actions={
        <span className="an-keys hide-s">
          {T.map((q) => (
            <Key key={q.k} color={typeColor(q.k)} kind="sq">
              {TYPES[q.k].label}
            </Key>
          ))}
        </span>
      }
    >
      {T.length ? <PaceChart T={T} from={from} race={race} /> : <p className="an-note">No hay sesiones con ritmo en este período.</p>}
      <HowTo summary="¿Cómo se lee?">
        Cada punto es el ritmo principal de una sesión, en el color de su tipo; la recta es su tendencia (con 3 sesiones o más). En series y tempos cuenta el ritmo de la parte principal. La línea cortada es el ritmo
        objetivo del {race.name}.
      </HowTo>
    </Panel>
  );
}

/* ---- tus ritmos de entrenamiento: una regla de lento a rápido ---- */
/** cada ritmo de Daniels, en el color del tipo de sesión que lo usa */
const PZ_TYPE: Record<PaceZone['k'], SessionType> = { e: 'regen', m: 'fondo', t: 'tempo', i: 'series', r: 'test' };

function ZonesPanel() {
  const [base, setBase] = usePaceBase(),
    cur = lvPace(),
    race = refRace(),
    goal = base === 'objetivo' || !cur,
    vd = goal ? vdotOf(race.targetSec, race.km) : vdotOf(cur!.sec, 10),
    p = (z: PaceZone, j: 0 | 1) => paceAtV(vd, z.f[j]),
    slow = Math.ceil((p(PZ[0], 0) + 10) / 15) * 15,
    fast = Math.floor((p(PZ[PZ.length - 1], 0) - 10) / 15) * 15,
    P = (s: number) => ((slow - s) / (slow - fast)) * 100,
    marks: number[] = [];
  for (let s = Math.ceil(fast / 30) * 30; s <= slow; s += 30) if (P(s) > 4 && P(s) < 80) marks.push(s);
  /* tus fondos de las últimas 4 semanas, contra el rango fácil */
  const fo = doneList().filter((x) => x.type === 'fondo' && x.result.paceSec > 0 && dayDiff(pd(x.result.date), new Date()) <= 28),
    foAvg = fo.length >= 2 ? sum(fo.map((x) => x.result.paceSec)) / fo.length : null,
    gap = cur && goal ? cur.sec - tenOf(race) : null;
  return (
    <Panel
      className="p-c4 p-rise"
      style={cssVars({ '--i': 4 })}
      title="Tus ritmos"
      sub={'VDOT ' + fmt(vd, 1)}
      actions={
        cur ? (
          <Segmented
            label="Calcular tus ritmos desde"
            value={goal ? 'objetivo' : 'hoy'}
            onChange={setBase}
            options={[
              { value: 'hoy', label: 'Hoy' },
              { value: 'objetivo', label: 'Objetivo' },
            ]}
          />
        ) : null
      }
    >
      <div className="an-ruler" aria-hidden="true">
        {marks.map((s) => (
          <span key={s} style={cssVars({ left: P(s) + '%' })}>
            {fmtPace(s)}
          </span>
        ))}
        <span className="end">más rápido →</span>
      </div>
      <ul className="an-dan">
        {PZ.map((z, j) => {
          /* f[1] da el ritmo más rápido del rango y f[0] el más lento */
          const a = p(z, 1),
            b = p(z, 0);
          return (
            <li key={z.k} style={cssVars({ '--a': P(b) + '%', '--w': Math.max(1.5, P(a) - P(b)) + '%', '--dc': typeColor(PZ_TYPE[z.k]), '--j': j })}>
              <span>
                <b>{z.n}</b>
                <span className="z" title="Zona de FC">
                  {z.z}
                </span>
                <small>{z.u}</small>
              </span>
              <span className="disp">{z.f[0] !== z.f[1] ? fmtPace(a) + '–' + fmtPace(b) : fmtPace(b)}</span>
              <i className="bar" />
            </li>
          );
        })}
      </ul>
      {gap != null || foAvg != null ? (
        <p className="an-note">
          {gap != null ? (gap > 5 ? 'Para ese objetivo hoy te faltan unos ' + fmtDur(gap) + ' en el 10K. ' : 'Tu forma de hoy ya alcanza para ese objetivo. ') : ''}
          {foAvg != null ? 'Tus fondos de las últimas 4 semanas van a ' + fmtPace(foAvg) + '/km' + (foAvg > p(PZ[0], 1) + 20 ? ': más lentos que el rango fácil, y está bien (en los fondos manda la FC).' : ', dentro del rango fácil.') : ''}
        </p>
      ) : null}
      <HowTo>
        {goal ? 'Como si ya corrieras el ' + race.name + ' en ' + fmtDur(race.targetSec) + '.' : 'Desde ' + cur!.txt + '.'} Con la fórmula de Jack Daniels, y al lado de cada nombre la zona de FC que le
        corresponde: son una guía; si la FC o las piernas dicen otra cosa, mandan ellas.
      </HowTo>
    </Panel>
  );
}
/** el 10K que corresponde al objetivo de una carrera (con su VDOT) */
const tenOf = (r: { targetSec: number; km: number }) => (r.km === 10 ? r.targetSec : vdotTime(vdotOf(r.targetSec, r.km), 10));

/* ---- tu corazón: el ritmo a tu FC habitual, semana a semana ---- */
function HeartChart({ hp, from }: { hp: HrPace; from: string }) {
  const W = hp.weeks.filter((q) => q.t >= pd(from).getTime()),
    w = 560,
    h = 220,
    M = { l: 40, r: 56, t: 16, b: 26 },
    t0 = W[0].t,
    t1 = Math.max(W[W.length - 1].t, t0 + 7 * DAY),
    X = lin(t0, t1, M.l, w - M.r),
    a = hp.at(Math.max(t0, hp.first)),
    b = hp.at(hp.last),
    { lo, hi, ticks } = paceTicks(Math.min(a, b, ...W.map((q) => q.v)) - 4, Math.max(a, b, ...W.map((q) => q.v)) + 4),
    Y = lin(lo, hi, M.t, h - M.b),
    { sel, cursor } = useCursor(
      W.map((q) => X(q.t)),
      w,
    ),
    pts: Pt[] = W.map((q) => [X(q.t), Y(q.v)]),
    xa = X(Math.max(t0, hp.first)),
    xb = Math.min(X(hp.last), w - M.r),
    Q = sel != null ? W[sel] : null;
  const read = (q: (typeof W)[number]) => 'Semana ' + isoWeek(q.mon) + ': ' + fmtPace(q.v) + ' /km a ' + hp.hr + ' lpm, ' + plural(q.n, 'salida', 'salidas');
  return (
    <Chart
      w={w}
      h={h}
      label={'Ritmo a ' + hp.hr + ' lpm, semana a semana'}
      cursor={cursor}
      live={Q ? read(Q) : undefined}
      table={{ head: ['Semana', 'Ritmo a ' + hp.hr + ' lpm', 'Salidas'], rows: W.map((q) => ['S' + isoWeek(q.mon) + ' · ' + dShort(q.mon), fmtPace(q.v) + ' /km', q.n]) }}
    >
      <GridY ticks={ticks} y={Y} x0={M.l} x1={w - M.r} fmt={fmtPace} />
      <Line pts={pts} color="var(--hr)" width={1.4} area={h - M.b} opacity={0.75} />
      <line x1={xa} y1={Y(a)} x2={xb} y2={Y(b)} stroke="var(--hr)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx={xa} cy={Y(a)} r="4" fill="var(--surface)" stroke="var(--hr)" strokeWidth="2" />
      <circle cx={xb} cy={Y(b)} r="4.5" fill="var(--hr)" />
      <text x={xa + 8} y={Y(a) + (a > b ? 18 : -10)} style={{ font: chartFont('xs'), fill: 'var(--ink-2)' }}>
        {fmtPace(a)} en {monthOf(new Date(Math.max(t0, hp.first)))}
      </text>
      <text x={xb - 4} y={Y(b) + (a > b ? -10 : 18)} textAnchor="end" style={{ font: chartFont('sm'), fill: 'var(--hr)' }}>
        {fmtPace(b)} ahora
      </text>
      <LabelsX y={h - 6} items={dateLabels(t0, t1, X, 5)} />
      {Q ? (
        <>
          <Guide x={X(Q.t)} y0={M.t} y1={h - M.b} />
          <Tip x={X(Q.t)} y={M.t} w={150} xMax={w} head={'Semana ' + isoWeek(Q.mon)} lines={[{ t: fmtPace(Q.v) + ' /km', color: 'var(--hr)' }, { t: plural(Q.n, 'salida', 'salidas') }]} />
        </>
      ) : null}
    </Chart>
  );
}

function HeartPanel({ from }: { from: string }) {
  const hp = hrPace(),
    has = hp && hp.weeks.some((q) => q.t >= pd(from).getTime());
  return (
    <Panel className="p-c6 p-rise" style={cssVars({ '--i': 5 })} title="Tu corazón" sub={hp ? 'Ritmo a ' + hp.hr + ' lpm, semana a semana' : undefined}>
      {hp && has ? (
        <HeartChart hp={hp} from={from} />
      ) : (
        <p className="an-note">{hp ? 'No hay fondos ni regenerativos con FC en este período.' : 'Necesito al menos 4 fondos o regenerativos con frecuencia cardíaca, de 3 km o más y sin caminatas, para medir cómo cambia tu corazón.'}</p>
      )}
      <p className="an-note">Más arriba es más rápido con la misma FC.</p>
      <HowTo>
        Sale de tus fondos y regenerativos con FC: los metros por minuto que avanzás por cada latido, llevados a {hp ? hp.hr + ' lpm' : 'tu FC habitual'} (la mediana de esas salidas). La recta es la
        tendencia desde tu primera salida, con un método robusto. Dejo afuera las salidas con caminatas y los valores fuera de lo normal. El calor, las subidas o el cansancio suben la FC: mirá la tendencia, no una semana.
      </HowTo>
    </Panel>
  );
}

/* ---- deriva cardíaca de cada fondo ---- */
function DriftChart({ L }: { L: DoneSession[] }) {
  const w = 560,
    h = 220,
    M = { l: 34, r: 10, t: 16, b: 26 },
    n = L.length,
    bw = (w - M.l - M.r) / n,
    { hi, ticks } = niceTicks(Math.max(8, ...L.map((q) => q.result.dec!.p!))),
    Y = lin(0, hi, h - M.b, M.t),
    xc = (k: number) => M.l + k * bw + bw / 2,
    { sel, cursor } = useCursor(
      L.map((_, k) => xc(k)),
      w,
    ),
    every = Math.max(1, Math.ceil(n / 6)),
    Q = sel != null ? L[sel] : null;
  const read = (q: DoneSession) => dateLabel(q.result.date) + ': deriva ' + fmt(q.result.dec!.p!, 1) + '% en ' + fmt(q.result.distKm, 1) + ' km';
  return (
    <Chart
      w={w}
      h={h}
      label="Deriva cardíaca de cada fondo, con la línea del 5%"
      cursor={cursor}
      live={Q ? read(Q) : undefined}
      table={{ head: ['Fondo', 'Deriva', 'Km'], rows: L.map((q) => [dateLabel(q.result.date), fmt(q.result.dec!.p!, 1) + '%', fmt(q.result.distKm, 1)]) }}
    >
      <GridY ticks={ticks} y={Y} x0={M.l} x1={w - M.r} fmt={(v) => v + '%'} zero />
      {L.map((q, k) => {
        const v = q.result.dec!.p!;
        return (
          <rect
            key={q.id}
            x={M.l + k * bw + bw * 0.2}
            y={Y(Math.max(0, v))}
            width={bw * 0.6}
            height={Math.abs(Y(0) - Y(Math.max(0, v))) || 1}
            fill={v > 5 ? 'var(--neg)' : 'var(--pos)'}
            opacity={sel == null ? (k === n - 1 ? 1 : 0.7) : k === sel ? 1 : 0.4}
          />
        );
      })}
      <line x1={M.l} x2={w - M.r} y1={Y(5)} y2={Y(5)} stroke="var(--ink)" strokeDasharray="4 3" />
      <text className="an-halo" x={w - M.r} y={Y(5) - 6} textAnchor="end" style={{ font: chartFont('lbl'), fill: 'var(--ink)' }}>
        5% · TOPE
      </text>
      <LabelsX y={h - 6} items={L.map((q, k) => ({ x: xc(k), label: (n - 1 - k) % every === 0 ? dShort(pd(q.result.date)) : '' })).filter((q) => q.label)} />
      {Q ? <Tip x={xc(sel!)} y={M.t} w={140} xMax={w} head={dShort(pd(Q.result.date))} lines={[{ t: fmt(Q.result.dec!.p!, 1) + '%', color: Q.result.dec!.p! > 5 ? 'var(--neg)' : 'var(--pos)' }, { t: fmt(Q.result.distKm, 1) + ' km' }]} /> : null}
    </Chart>
  );
}

function DriftPanel({ from }: { from: string }) {
  const [M] = useUi<DecUi>('dec', DEC_UI0);
  const L = doneList().filter((q) => q.result.date >= from && q.result.dec && q.result.dec.p != null),
    pend = S.sessions.filter((q) => decEligible(q) && !q.result.dec).length;
  return (
    <Panel
      className="p-c6 p-rise"
      style={cssVars({ '--i': 6 })}
      title="Deriva en los fondos"
      sub={<span className="hide-s">Bajo 5%: la base aeróbica aguanta</span>}
    >
      {L.length ? <DriftChart L={L} /> : <p className="an-note">No hay fondos con deriva en este período. Se calcula con las series de Strava.</p>}
      <div className="an-act">
        <Button size="sm" icon={ArrowsClockwise} disabled={M.busy} onClick={() => void decBackfill()}>
          {M.busy ? 'Calculando…' : pend ? 'Calcular ' + plural(pend, 'fondo', 'fondos') + ' con Strava' : 'Actualizar con Strava'}
        </Button>
        <span role="status">{M.msg}</span>
      </div>
      <p className="an-note">Menos de 5% es buena resistencia aeróbica; de 5 a 10%, moderada.</p>
      <HowTo>
        La deriva compara tu eficiencia (velocidad por latido) en la primera y la segunda mitad del fondo, sin los primeros 10 minutos. El calor, la deshidratación o ir cansado la suben.
      </HowTo>
    </Panel>
  );
}

export default function Ritmo() {
  useS();
  const [per] = useAnPeriod(),
    from = anFrom(per);
  return (
    <div className="p-grid">
      <Big />
      <PacePanel from={from} />
      <ZonesPanel />
      <HeartPanel from={from} />
      <DriftPanel from={from} />
    </div>
  );
}
