/* Medidores del rediseño «Pista» (estilos en app/styles/components/meters.css): marcas de puntaje, contador de
   vueltas, barra de estructura, barra de zonas y barras de reparto. Con `label` se leen como imagen; sin, quedan fuera del lector
   (cuando el número ya está escrito al lado). */
import type { ReactNode } from 'react';
import { clamp } from '@/lib/domain/util';
import { cssVars, cx } from './util';

const a11y = (label?: string) => (label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true });

/** puntaje 0–100 en 10 rayitas */
export function Ticks({ value, onDark, label }: { value: number; onDark?: boolean; label?: string }) {
  const on = Math.round(clamp(value, 0, 100) / 10);
  return (
    <span className={cx('p-ticks', onDark && 'on-dark')} {...a11y(label)}>
      {Array.from({ length: 10 }, (_, k) => (
        <i key={k} className={k < on ? 'on' : undefined} />
      ))}
    </span>
  );
}

/**
 * contador de vueltas: `value` de 0 a 1 en `n` marcas. Con `partial`, la marca en curso se llena en tartán (el nivel);
 * sin, se redondea (zapatillas, factores). `warnFrom`: desde qué marca se pinta en ámbar (la vida útil que se acaba).
 */
export function Laps({
  value,
  n = 10,
  h,
  gap,
  partial,
  warnFrom,
  soft,
  onDark,
  label,
  className,
}: {
  value: number;
  n?: number;
  /** alto de cada marca en px (4 por defecto) */
  h?: number;
  gap?: number;
  partial?: boolean;
  warnFrom?: number;
  /** marcas hechas en gris oscuro en vez de tinta (las zapatillas) */
  soft?: boolean;
  onDark?: boolean;
  label?: string;
  className?: string;
}) {
  const f = clamp(value, 0, 1) * n,
    on = partial ? Math.floor(f) : Math.round(f),
    p = Math.round((f - on) * 100);
  return (
    <span className={cx('p-laps', soft && 'soft', onDark && 'on-dark', className)} style={cssVars({ '--n': n, '--h': h && h + 'px', '--g': gap && gap + 'px' })} {...a11y(label)}>
      {Array.from({ length: n }, (_, k) => {
        if (partial && k === on && p > 0) return <i key={k} className="cur" style={cssVars({ '--p': p + '%' })} />;
        return <i key={k} className={k < on ? (warnFrom != null && k >= warnFrom ? 'warn' : 'on') : undefined} />;
      })}
    </span>
  );
}

/** un tramo: distancia, tipo (w = calor o calma, r = trabajo, x = pausa) e intensidad de 0 a 1 */
export interface Seg {
  d: number;
  k: 'w' | 'r' | 'x';
  i: number;
}
/** estructura del entrenamiento: ancho = distancia, alto = intensidad; el trabajo va en el color del tipo.
 *  `axis`: las marcas de abajo, repartidas de punta a punta (0 km … 8 km) */
export function StructureBar({ segs, color, height = 28, plan, axis, label }: { segs: Seg[]; color: string; height?: number; plan?: boolean; axis?: ReactNode[]; label?: string }) {
  const gap = height <= 22 ? 1 : height >= 50 ? 2 : 1.5;
  const bar = (
    <div className={cx('p-sb', plan && 'plan')} style={cssVars({ '--tc': color, '--h': height + 'px', '--g': gap + 'px' })} {...a11y(label)}>
      {segs.map((s, j) => (
        <i key={j} className={s.k} style={cssVars({ flex: s.d, height: Math.round(clamp(s.i, 0, 1) * 100) + '%', '--j': j })} />
      ))}
    </div>
  );
  if (!axis) return bar;
  return (
    <div>
      {bar}
      <div className="p-sb-ax" aria-hidden="true">
        {axis.map((a, i) => (
          <span key={i}>{a}</span>
        ))}
      </div>
    </div>
  );
}

/** tiempo en cada zona de FC, de Z1 a Z5 (en cualquier unidad: se reparte por proporción) */
export function ZoneBar({ zones, height, label }: { zones: number[]; height?: number; label?: string }) {
  return (
    <div className="p-zones" style={cssVars({ '--h': height && height + 'px' })} {...a11y(label)}>
      {zones.map((v, j) => (v > 0 ? <i key={j} style={cssVars({ flex: v, '--zc': `var(--z${j + 1})`, '--j': j })} /> : null))}
    </div>
  );
}

/** una fila del reparto: `v` da el largo de la barra (contra la más larga); con `parts`, la barra va apilada */
export interface ShareItem {
  key: string;
  label: ReactNode;
  v: number;
  /** color de la barra (sin `parts`) */
  color?: string;
  parts?: { v: number; c: string }[];
  /** el dato, a la derecha (km) */
  value?: ReactNode;
  /** el porcentaje, en gris */
  pct?: ReactNode;
}
/** reparto en barras horizontales: los km por tipo, para qué usás cada par de zapatillas. Con `onPick`, cada fila es un
    botón que se elige (el ranking de barrios del Mapa) y la barra de la elegida va en tartán */
export function ShareBars({ items, label, sel, onPick }: { items: ShareItem[]; label: string; sel?: string | null; onPick?: (key: string) => void }) {
  const max = Math.max(0, ...items.map((i) => i.v)) || 1;
  return (
    <ul className="p-share" aria-label={label}>
      {items.map((it, j) => {
        const body = (
          <>
            <span className="nm">{it.label}</span>
            <span className="bar" aria-hidden="true">
              <span style={cssVars({ width: (it.v / max) * 100 + '%' })}>
                {(it.parts || [{ v: 1, c: it.color || 'var(--tc, var(--ink-3))' }]).map((p, k) => (p.v > 0 ? <i key={k} style={cssVars({ flex: p.v, background: p.c })} /> : null))}
              </span>
            </span>
            <span className="r">{it.value}</span>
            <span className="r p">{it.pct}</span>
          </>
        );
        return (
          <li key={it.key} style={cssVars({ '--tc': it.color, '--j': j })}>
            {onPick ? (
              <button type="button" className="pick" aria-pressed={sel === it.key} onClick={() => onPick(it.key)}>
                {body}
              </button>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
