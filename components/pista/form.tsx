'use client';
/* Estado físico, fatiga y forma (la serie de formSeries): los tres números y el gráfico que se recorre con el mouse o
   con las flechas. Los usan Semana (12 semanas) y Análisis → Forma y carga (el período, con las fases del plan y la
   proyección hasta la carrera): salen de la misma serie, así que dan lo mismo en las dos pantallas. */
import { formState, type FormPoint } from '@/lib/domain/analysis';
import { isoWeek } from '@/lib/domain/util';
import { Kpis } from './structure';
import { Chart, GridY, Guide, LabelsX, Line, Tip, lin, useCursor, type Pt } from './charts';

const sign = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);
const tsbColor = (v: number) => (v >= 0 ? 'var(--pos)' : 'var(--t-tempo)');

/** una muestra por semana de la serie diaria, la última es `F[end]` (hoy, si no se dice otra cosa) */
export function weeklyOf(F: FormPoint[], n: number, end = F.length - 1) {
  return Array.from({ length: n }, (_, k) => F[end - (n - 1 - k) * 7]).filter(Boolean);
}

/** los tres números: el estado físico con su cambio en las semanas que se ven, la fatiga con su cambio en 7 días y la
    forma con su estado. `pts`: las muestras semanales que se ven; `F`: la serie diaria entera */
export function FormKpis({ F, pts }: { F: FormPoint[]; pts: FormPoint[] }) {
  const L = F[F.length - 1],
    A = pts[0],
    wk = F[Math.max(0, F.length - 8)],
    dCtl = Math.round(L.ctl - A.ctl),
    dAtl = Math.round(L.atl - wk.atl),
    tsb = Math.round(L.tsb);
  return (
    <Kpis
      items={[
        {
          label: 'Estado físico',
          value: Math.round(L.ctl),
          note: (
            <>
              <span className={dCtl >= 0 ? 'p-up' : 'p-dn'}>{sign(dCtl)}</span> en {pts.length} semanas
            </>
          ),
        },
        { label: 'Fatiga', value: Math.round(L.atl), note: sign(dAtl) + ' en 7 días' },
        { label: 'Forma', value: sign(tsb), color: tsb < 0 ? 'var(--t-tempo)' : 'var(--pos)', note: formState(L.tsb).t },
      ]}
    />
  );
}

/** una fase del plan por bloques, entre dos fechas (ms) */
export interface FormPhase {
  t0: number;
  t1: number;
  n: string;
  c: string;
}

/**
 * el gráfico: estado físico (línea), fatiga (cortada) y forma (barras, verde arriba de 0 y ámbar abajo).
 * Con `proj` sigue hasta la carrera en tartán (cortado), con la marca de hoy y el día de la carrera (`race`, el
 * nombre corto del cuadradito). `phases` pinta las fases del plan arriba. `labels`: cuántas marcas de semana abajo.
 */
export function FormChart({
  pts,
  proj,
  race,
  phases,
  w = 640,
  h = 200,
  labels = 5,
  label,
}: {
  pts: FormPoint[];
  proj?: FormPoint[];
  race?: { short: string; name: string };
  phases?: FormPhase[];
  w?: number;
  h?: number;
  labels?: number;
  label: string;
}) {
  const P = proj || [],
    all = [...pts, ...P],
    n = pts.length,
    M = { l: 26, r: 64, t: phases && phases.length ? 30 : 10, b: 24 },
    LH = Math.round((h - M.t - M.b) * 0.6),
    TOP = M.t + LH + 10,
    BOT = h - 10,
    t0 = all[0].t,
    t1 = all[all.length - 1].t,
    X = lin(t0, t1, M.l, w - M.r),
    vals = all.flatMap((p) => [p.ctl, p.atl]),
    lo = Math.floor(Math.min(...vals) / 10) * 10,
    hi = Math.max(lo + 10, Math.ceil(Math.max(...vals) / 10) * 10),
    step = hi - lo > 40 ? 20 : 10,
    Y = lin(lo, hi, M.t + LH, M.t),
    big = Math.max(10, ...all.map((p) => Math.abs(p.tsb))),
    T = (v: number) => (TOP + BOT) / 2 - v * (((BOT - TOP) / 2 - 5) / big),
    xs = all.map((p) => X(p.t)),
    { sel, cursor } = useCursor(xs, w),
    L = pts[n - 1],
    E = all[all.length - 1],
    c = sel ?? n - 1,
    S = all[c],
    /* ancho de las barras: el de una semana, sin pasar de 16 */
    bw = Math.min(16, (X(t0 + 7 * 864e5) - X(t0)) * 0.6),
    /* si las dos líneas terminan muy cerca, los nombres se separan: el de arriba sube y el de abajo baja */
    gap = Y(L.atl) - Y(L.ctl),
    nudge = Math.abs(gap) < 12 ? ((gap >= 0 ? 1 : -1) * (12 - Math.abs(gap))) / 2 : 0;
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  const line = (L: FormPoint[], f: (p: FormPoint) => number): Pt[] => L.map((p) => [X(p.t), Y(f(p))]);
  /* la proyección arranca en hoy, para que la línea siga sin cortes */
  const pl = P.length ? [L, ...P] : [];
  const every = Math.max(1, Math.ceil(all.length / labels));
  /* el rótulo de la muestra k: una semana (de la proyección, si viene después de hoy) o el día de la carrera */
  const raceAt = (k: number) => !!race && P.length > 0 && k === all.length - 1,
    headOf = (k: number) => (raceAt(k) ? race!.name + ' · el día' : 'Semana ' + isoWeek(all[k].d) + (k >= n ? ' · proyección' : ''));
  const isProj = c >= n,
    isRace = raceAt(c),
    head = headOf(c);
  const live = `${head}: estado ${Math.round(S.ctl)}, fatiga ${Math.round(S.atl)}, forma ${sign(Math.round(S.tsb))}`;
  return (
    <Chart
      w={w}
      h={h}
      label={label}
      cursor={cursor}
      live={sel != null ? live : undefined}
      table={{
        head: ['Semana', 'Estado', 'Fatiga', 'Forma'],
        rows: all.map((p, k) => [
          headOf(k),
          Math.round(p.ctl),
          Math.round(p.atl),
          sign(Math.round(p.tsb)),
        ]),
      }}
    >
      {phases?.map((ph) => {
        const a = Math.max(M.l, X(ph.t0)),
          b = Math.min(w - M.r, X(ph.t1));
        return b - a > 4 ? (
          <g key={ph.t0}>
            <rect x={a} y="0" width={b - a - 2} height="5" fill={ph.c} />
            {b - a > 60 ? (
              <text x={a + 4} y="20" className="p-ax" style={{ fill: ph.c, fontFamily: 'var(--f-ui)', fontWeight: 700, letterSpacing: '.1em', fontSize: 9.5 }}>
                {ph.n.toUpperCase()}
              </text>
            ) : null}
          </g>
        ) : null;
      })}
      {P.length ? <rect x={X(L.t)} y={M.t} width={X(E.t) - X(L.t) + 10} height={h - M.t - M.b} fill="color-mix(in oklab, var(--acc) 5%, transparent)" /> : null}
      <GridY ticks={ticks} y={Y} x0={M.l} x1={w - M.r} />
      <line className="p-gl0" x1={M.l} x2={w - M.r} y1={T(0)} y2={T(0)} />
      {all.map((p, k) =>
        k < n ? (
          <rect key={k} x={X(p.t) - bw / 2} y={Math.min(T(p.tsb), T(0))} width={bw} height={Math.abs(T(p.tsb) - T(0)) || 1} fill={tsbColor(p.tsb)} opacity={k === c ? 1 : 0.5} />
        ) : (
          <rect key={k} x={X(p.t) - bw / 2} y={Math.min(T(p.tsb), T(0))} width={bw} height={Math.abs(T(p.tsb) - T(0)) || 1} fill="none" stroke={tsbColor(p.tsb)} strokeDasharray="2 2" opacity={k === c ? 1 : 0.8} />
        ),
      )}
      <Line pts={line(pts, (p) => p.atl)} color="var(--ink-3)" width={1.4} dash="3 3" />
      <Line pts={line(pts, (p) => p.ctl)} color="var(--ink)" width={2.2} />
      {pl.length ? (
        <>
          <Line pts={line(pl, (p) => p.atl)} color="var(--acc)" width={1.4} dash="3 3" opacity={0.7} />
          <Line pts={line(pl, (p) => p.ctl)} color="var(--acc)" width={2.2} dash="6 4" />
          <line x1={X(L.t)} x2={X(L.t)} y1={M.t} y2={h - M.b} stroke="var(--ink)" opacity=".35" />
          <text className="p-ax ink" x={X(L.t) - 6} y={M.t + 10} textAnchor="end" style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, letterSpacing: '.1em' }}>
            HOY
          </text>
        </>
      ) : null}
      <circle cx={X(L.t)} cy={Y(L.ctl)} r="3.5" fill="var(--ink)" />
      <circle cx={X(L.t)} cy={Y(L.atl)} r="3" fill="var(--surface)" stroke="var(--ink-3)" strokeWidth="1.4" />
      {pl.length && race ? (
        <>
          <g transform={`translate(${X(E.t)} ${T(E.tsb) - (E.tsb >= 0 ? 26 : -26)})`}>
            <rect x="-13" y="-12" width="26" height="24" fill="var(--ink)" transform="skewX(-8)" />
            <text x="0" y="4.5" textAnchor="middle" style={{ font: 'italic 900 12px var(--f-disp)', fontStretch: '70%', fill: 'var(--bg)' }}>
              {race.short}
            </text>
          </g>
          <text x={X(E.t) + 12} y={T(E.tsb) + 4} style={{ font: '600 11px var(--f-mono)', fill: tsbColor(E.tsb) }}>
            {sign(Math.round(E.tsb))} el día
          </text>
          <circle cx={X(E.t)} cy={Y(E.ctl)} r="3.5" fill="var(--acc)" />
          <text x={X(E.t) + 10} y={Y(E.ctl) + 4} style={{ font: '600 11px var(--f-mono)', fill: 'var(--acc)' }}>
            {Math.round(E.ctl)}
          </text>
        </>
      ) : (
        <>
          <text className="p-ax ink" x={X(L.t) + 10} y={Y(L.ctl) + 3.5 - nudge}>
            Estado
          </text>
          <text className="p-ax" x={X(L.t) + 10} y={Y(L.atl) + 3.5 + nudge}>
            Fatiga
          </text>
          <text className="p-ax" x={X(L.t) + 10} y={T(0) + 3.5}>
            Forma
          </text>
        </>
      )}
      <LabelsX y={h - 4} items={all.map((p, k) => ({ x: X(p.t), label: (n - 1 - k) % every === 0 ? 'S' + isoWeek(p.d) : '' })).filter((q) => q.label)} />
      {sel != null ? (
        <>
          <Guide x={X(S.t)} y0={M.t} y1={BOT} />
          <Tip
            x={X(S.t)}
            y={M.t}
            w={isRace || isProj ? 150 : 120}
            xMax={w}
            head={head}
            lines={[{ t: 'Estado ' + Math.round(S.ctl) }, { t: 'Fatiga ' + Math.round(S.atl) }, { t: 'Forma ' + sign(Math.round(S.tsb)), color: tsbColor(S.tsb) }]}
          />
        </>
      ) : null}
    </Chart>
  );
}
