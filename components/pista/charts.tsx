'use client';
/* Gráficos del rediseño «Pista» en SVG (estilos en app/styles/components/charts.css). Se arman por piezas dentro de
   un `Chart`: grilla y eje Y, marcas del eje X, líneas, barras apiladas, puntos y la lectura del punto elegido.
   Todo en las coordenadas del viewBox: las escalas (`lin`) pasan de datos a esas coordenadas.
   Con `useCursor` el gráfico se recorre con el mouse o, con el foco, con las flechas. */
import { useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { cssVars, cx } from './util';

/** escala lineal: del dominio [d0, d1] al rango [r0, r1] (el Y va invertido: d0 abajo) */
export const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
export type Pt = [number, number];
export const pathOf = (pts: Pt[]) => pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');

/* ---- el punto elegido ---- */
/** `xs`: la x de cada punto (en el viewBox de ancho `w`). Devuelve el elegido y lo que hay que pasarle al `Chart` */
export function useCursor(xs: number[], w: number) {
  const [sel, setSel] = useState<number | null>(null);
  const n = xs.length;
  const near = (x: number) => xs.reduce((b, px, i) => (Math.abs(px - x) < Math.abs(xs[b] - x) ? i : b), 0);
  const cursor = {
    tabIndex: 0,
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
      if (!n) return;
      const r = e.currentTarget.getBoundingClientRect();
      setSel(near(((e.clientX - r.left) / r.width) * w));
    },
    onPointerLeave: () => setSel(null),
    onFocus: () => setSel((s) => (s == null && n ? n - 1 : s)),
    onBlur: () => setSel(null),
    onKeyDown: (e: KeyboardEvent<SVGSVGElement>) => {
      if (!n) return;
      const cur = sel ?? n - 1,
        k = e.key,
        to = k === 'ArrowRight' ? Math.min(n - 1, cur + 1) : k === 'ArrowLeft' ? Math.max(0, cur - 1) : k === 'Home' ? 0 : k === 'End' ? n - 1 : null;
      if (k === 'Escape') return setSel(null);
      if (to == null) return;
      e.preventDefault();
      setSel(to);
    },
  };
  return { sel: sel != null && sel < n ? sel : null, cursor };
}
export type Cursor = ReturnType<typeof useCursor>['cursor'];

/**
 * el lienzo: `w`×`h` es el viewBox. `label` describe el gráfico; con `cursor`, se recorre y `live` (el texto del punto
 * elegido) se anuncia a los lectores de pantalla.
 */
export function Chart({ w, h, label, cursor, live, className, children }: { w: number; h: number; label: string; cursor?: Cursor; live?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cx('p-chart', className)}>
      <svg viewBox={`0 0 ${w} ${h}`} role={cursor ? 'group' : 'img'} aria-label={label} aria-roledescription={cursor ? 'gráfico' : undefined} {...cursor}>
        {children}
      </svg>
      {cursor ? (
        <span className="p-sr" aria-live="polite">
          {live}
        </span>
      ) : null}
    </div>
  );
}

/** grilla horizontal con sus valores; `zero` marca más fuerte la línea del 0 */
export function GridY({ ticks, y, x0, x1, fmt = String, side = 'left', zero, color }: { ticks: number[]; y: (v: number) => number; x0: number; x1: number; fmt?: (v: number) => string; side?: 'left' | 'right' | 'none'; zero?: boolean; color?: string }) {
  return (
    <g>
      {ticks.map((v) => (
        <g key={v}>
          {side !== 'right' ? <line className={zero && v === 0 ? 'p-gl0' : 'p-gl'} x1={x0} x2={x1} y1={y(v)} y2={y(v)} /> : null}
          {side !== 'none' ? (
            <text className="p-ax" x={side === 'left' ? x0 - 8 : x1 + 8} y={y(v) + 3.5} textAnchor={side === 'left' ? 'end' : 'start'} style={color ? { fill: color } : undefined}>
              {fmt(v)}
            </text>
          ) : null}
        </g>
      ))}
    </g>
  );
}

/** marcas del eje X (semanas, km), centradas en su x */
export function LabelsX({ items, y }: { items: { x: number; label: string; accent?: boolean }[]; y: number }) {
  return (
    <g>
      {items.map((it, i) => (
        <text key={i} className="p-ax" x={it.x} y={y} textAnchor="middle" style={it.accent ? { fill: 'var(--acc)' } : undefined}>
          {it.label}
        </text>
      ))}
    </g>
  );
}

/** una serie: `area` es la y de la base, para pintar debajo con el mismo color */
export function Line({ pts, color, width = 2, dash, area, opacity }: { pts: Pt[]; color: string; width?: number; dash?: string; area?: number; opacity?: number }) {
  if (!pts.length) return null;
  const d = pathOf(pts);
  return (
    <g opacity={opacity}>
      {area != null ? <path d={`${d} L${pts[pts.length - 1][0]} ${area} L${pts[0][0]} ${area}Z`} fill={`color-mix(in oklab, ${color} 9%, transparent)`} /> : null}
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinejoin="round" strokeLinecap="round" />
    </g>
  );
}

export interface Bar {
  x: number;
  w: number;
  /** tramos apilados de abajo hacia arriba */
  parts: { v: number; c: string }[];
  /** la barra en curso: más clara, y punteada hasta `target` */
  cur?: boolean;
  target?: number;
}
/** barras apiladas (km por semana por tipo); `sel` resalta la elegida y apaga el resto */
export function StackedBars({ bars, y, sel }: { bars: Bar[]; y: (v: number) => number; sel?: number | null }) {
  return (
    <g>
      {bars.map((b, i) => {
        let acc = 0;
        const dim = sel != null && sel !== i;
        return (
          <g key={i} opacity={dim ? 0.45 : b.cur ? 0.55 : 1} style={{ transition: 'opacity .15s' }}>
            {b.parts.map((p, k) => {
              const y0 = y(acc),
                y1 = y(acc + p.v);
              acc += p.v;
              return p.v > 0 ? <rect key={k} x={b.x} y={y1} width={b.w} height={Math.max(0, y0 - y1 - 1)} fill={p.c} /> : null;
            })}
            {b.cur && b.target != null && b.target > acc ? <rect x={b.x} y={y(b.target)} width={b.w} height={y(acc) - y(b.target)} fill="none" stroke="var(--ink-3)" strokeDasharray="3 2" /> : null}
          </g>
        );
      })}
    </g>
  );
}

export interface Dot {
  x: number;
  y: number;
  c: string;
  r?: number;
  o?: number;
}
export function Dots({ pts }: { pts: Dot[] }) {
  return (
    <g>
      {pts.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.r ?? 3.4} fill={p.c} opacity={p.o ?? 0.55} />
      ))}
    </g>
  );
}

/**
 * la lectura del punto elegido: una caja con un rótulo chico arriba y los valores abajo. Va a la derecha de `x` y, si
 * no entra antes de `xMax`, a la izquierda. `color` pinta cada valor (la FC, en su color).
 */
export function Tip({ x, y, w = 120, head, lines, xMax }: { x: number; y: number; w?: number; head: string; lines: { t: string; color?: string }[]; xMax: number }) {
  const h = 10 + 16 * (lines.length + 1),
    left = x + 10 + w > xMax;
  return (
    <g className="p-tip" transform={`translate(${left ? x - 10 - w : x + 10} ${y})`}>
      <rect width={w} height={h} rx="3" />
      <text className="p-ax" x="10" y="16">
        {head}
      </text>
      {lines.map((l, i) => (
        <text key={i} className="t" x="10" y={32 + i * 16} style={l.color ? { fill: l.color } : undefined}>
          {l.t}
        </text>
      ))}
    </g>
  );
}

/** guía vertical del punto elegido, de arriba abajo del área */
export const Guide = ({ x, y0, y1 }: { x: number; y0: number; y1: number }) => <line x1={x} x2={x} y1={y0} y2={y1} stroke="var(--ink)" strokeWidth="1" opacity=".35" />;

/** leyenda: raya (`line`), raya cortada (`dash`) o cuadradito (`sq`) */
export function Key({ color, kind = 'line', children }: { color: string; kind?: 'line' | 'dash' | 'sq'; children: ReactNode }) {
  return (
    <span className="p-key" style={cssVars({ '--kc': color })}>
      <i className={kind === 'line' ? undefined : kind} aria-hidden="true" />
      {children}
    </span>
  );
}
