'use client';
/* Forma de las últimas 12 semanas: estado físico, fatiga y forma (la misma serie que Análisis → Forma y carga),
   con el gráfico que se recorre con el mouse o con las flechas. */
import { formSeries, type FormPoint } from '@/lib/domain/analysis';
import { isoWeek } from '@/lib/domain/util';
import { formState } from '@/components/ui/glance';
import { Button } from '@/components/pista/controls';
import { Kpis, Panel } from '@/components/pista/structure';
import { Chart, GridY, Guide, LabelsX, Line, Tip, lin, useCursor, type Pt } from '@/components/pista/charts';
import { cssVars } from '@/components/pista/util';

const W = 640,
  H = 200,
  M = { l: 26, r: 64, t: 10, b: 24 },
  TOP = 120,
  BOT = 190;
const sign = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);

function FormChart({ pts }: { pts: FormPoint[] }) {
  const n = pts.length,
    X = (k: number) => M.l + (k / Math.max(1, n - 1)) * (W - M.l - M.r),
    vals = pts.flatMap((p) => [p.ctl, p.atl]),
    lo = Math.floor(Math.min(...vals) / 10) * 10,
    hi = Math.max(lo + 10, Math.ceil(Math.max(...vals) / 10) * 10),
    step = hi - lo > 40 ? 20 : 10,
    Y = lin(lo, hi, TOP - 10, M.t),
    big = Math.max(10, ...pts.map((p) => Math.abs(p.tsb))),
    T = (v: number) => (TOP + BOT) / 2 - v * (30 / big),
    xs = pts.map((_, k) => X(k)),
    { sel, cursor } = useCursor(xs, W),
    L = pts[n - 1],
    c = sel ?? n - 1,
    P = pts[c],
    /* si las dos líneas terminan muy cerca, los nombres se separan: el de arriba sube y el de abajo baja */
    gap = Y(L.atl) - Y(L.ctl),
    nudge = Math.abs(gap) < 12 ? (gap >= 0 ? 1 : -1) * (12 - Math.abs(gap)) / 2 : 0;
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  const line = (f: (p: FormPoint) => number): Pt[] => pts.map((p, k) => [X(k), Y(f(p))]);
  const live = `Semana ${isoWeek(P.d)}: estado ${Math.round(P.ctl)}, fatiga ${Math.round(P.atl)}, forma ${sign(Math.round(P.tsb))}`;
  return (
    <Chart w={W} h={H} label="Estado físico, fatiga y forma de las últimas semanas" cursor={cursor} live={sel != null ? live : undefined}>
      <GridY ticks={ticks} y={Y} x0={M.l} x1={W - M.r} />
      <Line pts={line((p) => p.atl)} color="var(--ink-3)" width={1.4} dash="3 3" />
      <Line pts={line((p) => p.ctl)} color="var(--ink)" width={2.2} />
      <circle cx={X(n - 1)} cy={Y(L.ctl)} r="3.5" fill="var(--ink)" />
      <circle cx={X(n - 1)} cy={Y(L.atl)} r="3" fill="var(--surface)" stroke="var(--ink-3)" strokeWidth="1.4" />
      <text className="p-ax ink" x={X(n - 1) + 10} y={Y(L.ctl) + 3.5 - nudge}>
        Estado
      </text>
      <text className="p-ax" x={X(n - 1) + 10} y={Y(L.atl) + 3.5 + nudge}>
        Fatiga
      </text>
      <line className="p-gl0" x1={M.l} x2={W - M.r} y1={T(0)} y2={T(0)} />
      {pts.map((p, k) => (
        <rect key={k} x={X(k) - 8} y={Math.min(T(p.tsb), T(0))} width="16" height={Math.abs(T(p.tsb) - T(0)) || 1} fill={p.tsb >= 0 ? 'var(--pos)' : 'var(--t-tempo)'} opacity={k === c ? 1 : 0.5} />
      ))}
      <text className="p-ax" x={X(n - 1) + 10} y={T(0) + 3.5}>
        Forma
      </text>
      <LabelsX y={H - 4} items={pts.map((p, k) => ({ x: X(k), label: (n - 1 - k) % 3 === 0 ? 'S' + isoWeek(p.d) : '' })).filter((q) => q.label)} />
      {sel != null ? (
        <>
          <Guide x={X(sel)} y0={M.t} y1={BOT} />
          <Tip
            x={X(sel)}
            y={M.t}
            xMax={W}
            head={'Semana ' + isoWeek(P.d)}
            lines={[{ t: 'Estado ' + Math.round(P.ctl) }, { t: 'Fatiga ' + Math.round(P.atl) }, { t: 'Forma ' + sign(Math.round(P.tsb)), color: P.tsb >= 0 ? 'var(--pos)' : 'var(--t-tempo)' }]}
          />
        </>
      ) : null}
    </Chart>
  );
}

export function FormPanel() {
  const F = formSeries();
  const more = (
    <Button size="sm" variant="ghost" arrow href="/analisis">
      Análisis
    </Button>
  );
  if (!F)
    return (
      <Panel className="p-c7 p-rise" style={cssVars({ '--i': 3 })} title="Forma" actions={more}>
        <p className="sem-note">Con 5 salidas en 3 semanas aparecen tu estado físico, tu fatiga y tu forma.</p>
      </Panel>
    );
  /* una muestra por semana, la última es hoy */
  const pts = Array.from({ length: 12 }, (_, k) => F[F.length - 1 - (11 - k) * 7]).filter(Boolean),
    L = pts[pts.length - 1],
    A = pts[0],
    wk = F[Math.max(0, F.length - 8)],
    dCtl = Math.round(L.ctl - A.ctl),
    dAtl = Math.round(L.atl - wk.atl),
    tsb = Math.round(L.tsb);
  return (
    <Panel className="p-c7 p-rise" style={cssVars({ '--i': 3 })} title="Forma" sub={'Últimas ' + pts.length + ' semanas'} flush actions={more}>
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
          { label: 'Forma', value: sign(tsb), color: tsb < 0 ? 'var(--t-tempo)' : 'var(--pos)', note: formState(L.tsb)[0] },
        ]}
      />
      <div className="p-panel-b">
        <FormChart pts={pts} />
      </div>
    </Panel>
  );
}
