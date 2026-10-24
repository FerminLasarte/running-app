'use client';
/* Gráficos de barras y de líneas en SVG, con lectura del punto tocado (líneas 2517–2606 del original).
   Lo que el original guardaba en el global `CH` (posiciones y datos de cada gráfico) y pintaba a mano
   (`chartPointer`, `fitCharts`) acá es estado del propio gráfico. */
import { useCallback, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import type { SessionType } from '@/lib/domain/types';
import { TYPES } from '@/lib/domain/config';
import { dShort, fmt, fmtDur, fmtPace, sum } from '@/lib/domain/util';
import { TvMore } from '@/components/ui/TvMore';

const cssVars = (o: Record<string, string | number | undefined>) => o as CSSProperties;

/* ---- escalas ---- */
export function niceTicks(min: number, max: number, n: number) {
  const range = max - min || 1,
    rough = range / n,
    mag = Math.pow(10, Math.floor(Math.log10(rough))),
    nr = rough / mag;
  const step = (nr < 1.5 ? 1 : nr < 3 ? 2 : nr < 7 ? 5 : 10) * mag;
  const a = Math.floor(min / step + 1e-9) * step,
    b = Math.ceil(max / step - 1e-9) * step,
    t: number[] = [];
  for (let v = a; v <= b + step / 2; v += step) t.push(Math.round(v * 1e6) / 1e6);
  return t;
}
/* marcas de tiempo en pasos que se leen fácil: 10 s, 15 s, 30 s, 1 min, 2 min, 5 min… */
export function timeTicks(min: number, max: number, n: number) {
  const ST = [5, 10, 15, 20, 30, 60, 120, 300, 600, 900, 1800, 3600],
    step = ST.find((q) => (max - min) / q <= n + 1) || 3600;
  const a = Math.floor(min / step) * step,
    t: number[] = [];
  for (let v = a; v <= max + step * 0.999; v += step) t.push(v);
  return t.length >= 2 ? t : [a, a + step];
}

/* ---- selección y escala (chartPointer y fitCharts) ---- */
/** punto elegido con el dedo o el mouse; null = ninguno (la lectura muestra el último) */
function useChart(W: number, xs: number[]) {
  const [sel, setSel] = useState<number | null>(null);
  const [k, setK] = useState<string | undefined>(undefined);
  /* la escala del dibujo cambia con el ancho de la tarjeta: --k la compensa */
  const svgRef = useCallback(
    (el: SVGSVGElement | null) => {
      if (!el) return;
      const ro = new ResizeObserver(() => {
        const w = el.getBoundingClientRect().width;
        if (w > 0) setK((W / w).toFixed(3));
      });
      ro.observe(el);
      return () => ro.disconnect();
    },
    [W],
  );
  const pick = (e: MouseEvent<SVGSVGElement>) => {
    if (e.type === 'pointermove' && (e as PointerEvent<SVGSVGElement>).pointerType !== 'mouse') return;
    if (!xs.length) return;
    const r = e.currentTarget.getBoundingClientRect(),
      x = ((e.clientX - r.left) / r.width) * W;
    let bi = 0,
      bd = 1e9;
    xs.forEach((px, i) => {
      const d = Math.abs(px - x);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    setSel(bi);
  };
  return { sel: sel != null && sel < xs.length ? sel : null, k, svgRef, pick };
}

/** lectura bajo el gráfico: arranca mostrando el dato más reciente */
export function Readout({ id, items, sel }: { id: string; items: { read: string }[]; sel?: number | null }) {
  const it = items[sel != null ? sel : items.length - 1];
  return (
    <div className="readout" id={'ro-' + id} aria-live="polite">
      {it ? it.read : ''}
    </div>
  );
}

/* ---- barras ---- */
export interface BarItem {
  label: string;
  value: number;
  /** la barra en curso (semana o mes) va más clara */
  cur?: boolean;
  /** tramos apilados de abajo hacia arriba (por tipo de sesión) */
  parts?: { v: number; c: string }[];
  /** texto de la lectura al tocarla */
  read: string;
}
/** `barSvg` + la lectura. `after` va entre el dibujo y la lectura (la leyenda). */
export function BarChart({ id, items, unit, after }: { id: string; items: BarItem[]; unit: string; after?: ReactNode }) {
  const W = 340,
    H = 180,
    L = 34,
    R = 8,
    T = 10,
    B = 26,
    pw = W - L - R,
    ph = H - T - B;
  const mx = Math.max(...items.map((i) => i.value).concat([1])),
    ticks = niceTicks(0, mx, 3),
    top = ticks[ticks.length - 1];
  const n = items.length,
    slot = pw / n,
    bw = Math.min(28, slot * 0.64);
  const xs = items.map((_, i) => L + slot * (i + 0.5));
  const { sel, k, svgRef, pick } = useChart(W, xs);
  const stp = Math.ceil(n / 6);
  return (
    <>
      <svg ref={svgRef} viewBox={'0 0 ' + W + ' ' + H} data-ch={id} role="img" aria-label={'Gráfico de barras, ' + unit} style={cssVars({ '--k': k })} onClick={pick} onPointerMove={pick}>
        {ticks.map((t) => {
          const yy = T + ph * (1 - t / top);
          return [
            <line key={'l' + t} className={t === 0 ? 'axis' : 'grid'} x1={L} x2={W - R} y1={yy} y2={yy} />,
            <text key={'t' + t} x={L - 6} y={yy + 3} textAnchor="end">
              {fmt(t, t < 10 ? 1 : 0)}
            </text>,
          ];
        })}
        {items.map((it, i) => {
          const cx = xs[i],
            h = (ph * it.value) / top,
            x = cx - bw / 2,
            y = T + ph - h,
            r = Math.min(4, h, bw / 2);
          const barD = (yy: number, rr: number) => 'M' + x + ',' + (T + ph) + 'V' + (yy + rr) + 'Q' + x + ',' + yy + ' ' + (x + rr) + ',' + yy + 'H' + (x + bw - rr) + 'Q' + (x + bw) + ',' + yy + ' ' + (x + bw) + ',' + (yy + rr) + 'V' + (T + ph) + 'Z';
          const cls = 'mk' + (it.cur ? ' cur' : '') + (sel === i ? ' sel' : '');
          if (h >= 1 && it.parts && it.parts.length) {
            /* de abajo hacia arriba; cada tramo tapa al anterior y solo el de arriba tiene la punta redondeada */
            let acc = 0;
            const tot = sum(it.parts.map((q) => q.v)) || 1;
            return (
              <g key={i} className={cls} style={cssVars({ '--i': i })} data-m={i}>
                {it.parts.map((q, kk) => {
                  const hh = h * (1 - acc / tot),
                    yy = T + ph - hh;
                  acc += q.v;
                  return <path key={kk} style={{ fill: q.c }} d={barD(yy, kk === 0 ? r : 0)} />;
                })}
              </g>
            );
          }
          if (h >= 1) return <path key={i} className={cls} style={cssVars({ '--i': i })} data-m={i} d={barD(y, r)} />;
          return null;
        })}
        {items.map((it, i) =>
          (i % stp === 0 && n - 1 - i >= stp * 0.6) || i === n - 1 ? (
            <text key={'x' + i} x={xs[i]} y={H - 8} textAnchor="middle">
              {it.label}
            </text>
          ) : null,
        )}
      </svg>
      {after}
      <Readout id={id} items={items} sel={sel} />
    </>
  );
}

/* ---- líneas ---- */
export interface LinePt {
  /** fecha en ms */
  t: number;
  v: number;
  /** color del punto (por tipo de sesión) */
  c?: string;
  read: string;
}
export interface LineOpts {
  W?: number;
  H?: number;
  /** más arriba = valor más chico (ritmos y tiempos) */
  invert?: boolean;
  /** con fmtPace o fmtDur las marcas van en pasos de tiempo */
  yFmt: (v: number) => string;
  minPad?: number;
  /** color de la línea (--c1) */
  color?: string | null;
  aria: string;
  /** línea de referencia (objetivo) */
  ref?: number | null;
  refLabel?: string;
}
/** `lineSvg` + la lectura. Con menos de 2 puntos, un aviso en vez del dibujo. */
export function LineChart({ id, pts, o, after }: { id: string; pts: LinePt[]; o: LineOpts; after?: ReactNode }) {
  const W = o.W || 340,
    H = o.H || 180,
    L = 40,
    R = 10,
    T = 12,
    B = 26,
    pw = W - L - R,
    ph = H - T - B;
  const ok = pts.length >= 2;
  const t0 = ok ? pts[0].t : 0,
    t1 = ok ? pts[pts.length - 1].t : 0;
  const px = (p: LinePt, i: number) => L + pw * (t1 > t0 ? (p.t - t0) / (t1 - t0) : i / (pts.length - 1));
  const xs = ok ? pts.map(px) : [];
  const { sel, k, svgRef, pick } = useChart(W, xs);
  if (!ok)
    return (
      <>
        <p className="mut" style={{ marginTop: 8 }}>
          Con al menos 2 sesiones aparece el gráfico.
        </p>
        {after}
        <Readout id={id} items={[]} />
      </>
    );
  let lo = Math.min(...pts.map((p) => p.v)),
    hi = Math.max(...pts.map((p) => p.v));
  if (o.ref != null && o.ref >= lo - (hi - lo) * 0.3 && o.ref <= hi + (hi - lo) * 0.3) {
    lo = Math.min(lo, o.ref);
    hi = Math.max(hi, o.ref);
  }
  const pad2 = (hi - lo) * 0.15 || o.minPad || 1;
  const ticks = o.yFmt === fmtPace || o.yFmt === fmtDur ? timeTicks(lo - pad2, hi + pad2, 3) : niceTicks(lo - pad2, hi + pad2, 3),
    d0 = ticks[0],
    d1 = ticks[ticks.length - 1];
  const py = (v: number) => (o.invert ? T + ph * ((v - d0) / (d1 - d0)) : T + ph * (1 - (v - d0) / (d1 - d0)));
  const path = 'M' + pts.map((p, i) => xs[i].toFixed(1) + ',' + py(p.v).toFixed(1)).join('L');
  const base = T + ph,
    area = path + 'L' + xs[xs.length - 1].toFixed(1) + ',' + base + 'L' + xs[0].toFixed(1) + ',' + base + 'Z';
  const refY = o.ref != null && o.ref >= d0 && o.ref <= d1 ? py(o.ref) : null;
  return (
    <>
      <svg ref={svgRef} viewBox={'0 0 ' + W + ' ' + H} data-ch={id} style={cssVars({ '--c1': o.color || undefined, '--k': k })} role="img" aria-label={o.aria} onClick={pick} onPointerMove={pick}>
        <defs>
          <linearGradient id={'ag-' + id} x1="0" y1="0" x2="0" y2="1">
            <stop className="ar-a" offset="0" />
            <stop className="ar-b" offset="1" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => {
          const yy = py(t);
          return [
            <line key={'l' + i} className={i === 0 ? 'axis' : 'grid'} x1={L} x2={W - R} y1={yy} y2={yy} />,
            <text key={'t' + i} x={L - 6} y={yy + 3} textAnchor="end">
              {o.yFmt(t)}
            </text>,
          ];
        })}
        {refY != null ? (
          <>
            <line className="ref" x1={L} x2={W - R} y1={refY} y2={refY} />
            <text className="reft" x={W - R} y={refY - 4} textAnchor="end">
              {o.refLabel || ''}
            </text>
          </>
        ) : null}
        <path className="ar" fill={'url(#ag-' + id + ')'} d={area} />
        <path className="ln" pathLength={1} d={path} />
        {pts.map((p, i) => {
          const last = i === pts.length - 1;
          return (
            <circle
              key={i}
              className={'pt' + (last ? ' last' : '') + (sel === i ? ' sel' : '')}
              style={cssVars({ '--i': i, '--pc': p.c })}
              data-m={i}
              cx={xs[i].toFixed(1)}
              cy={py(p.v).toFixed(1)}
              r={last ? 5 : 3.5}
            />
          );
        })}
        <text x={L} y={H - 8} textAnchor="start">
          {dShort(new Date(t0))}
        </text>
        <text x={W - R} y={H - 8} textAnchor="end">
          {dShort(new Date(t1))}
        </text>
      </svg>
      {after}
      <Readout id={id} items={pts} sel={sel} />
    </>
  );
}

/* ---- piezas de las tarjetas ---- */
export function Legend({ keys }: { keys: SessionType[] }) {
  return (
    <div className="ch-leg">
      {keys.map((k) => (
        <span key={k} style={cssVars({ '--lc': TYPES[k].t })}>
          <i></i>
          {TYPES[k].label}
        </span>
      ))}
    </div>
  );
}

/** `tableHtml`: la tabla del gráfico, plegada detrás de «Ver tabla» */
export function TableTv({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="tv tbl">
      <summary>Ver tabla</summary>
      <div className="tw">
        <table>
          <thead>
            <tr>
              {head.map((x, i) => (
                <th key={i}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((x, j) => (
                  <td key={j}>{x}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** `chartCard`: título, bajada, `extra` (chips), el gráfico (que ya trae su lectura) y al pie la tabla y «Cómo se lee».
    `children` va al final de la tarjeta (por ejemplo un botón). */
export function ChartCard({ title, sub, extra, chart, table, more, children }: { title: string; sub: ReactNode; extra?: ReactNode; chart: ReactNode; table?: ReactNode; more?: ReactNode; children?: ReactNode }) {
  return (
    <section className="card chart">
      <div className="h3">{title}</div>
      <div className="sub">{sub}</div>
      {extra}
      {chart}
      {table || more ? (
        <div className="tv-row">
          {table}
          {more ? (
            <TvMore t="Cómo se lee">{more}</TvMore>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
