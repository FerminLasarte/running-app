/* Estructura del rediseño «Pista» (estilos en app/styles/components/structure.css): título de marca, encabezado de
   página, panel, fila de números, bloque estadio con los andariveles y tabla de datos. */
import { type CSSProperties, type ElementType, type ReactNode } from 'react';
import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react';
import { cssVars, cx } from './util';

/** voz de marca: angosta, itálica, en mayúsculas y con el punto final en tartán */
export function BrandTitle({ as: As = 'h1', className, style, children }: { as?: ElementType; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <As className={cx('brand-t', className)} style={style}>
      {children}
      <em>.</em>
    </As>
  );
}

export function PageHead({ eyebrow, title, actions, children }: { eyebrow?: ReactNode; title: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="p-phd p-rise">
      <div>
        {eyebrow ? <div className="lbl">{eyebrow}</div> : null}
        <BrandTitle>{title}</BrandTitle>
        {children ? <p>{children}</p> : null}
      </div>
      {actions ? <div className="acts">{actions}</div> : null}
    </header>
  );
}

/** panel con encabezado. `flush`: el contenido va sin el margen interno (tablas, filas de números, gráficos a lo ancho) */
export function Panel({
  title,
  sub,
  actions,
  flush,
  className,
  style,
  children,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  flush?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <article className={cx('p-panel', className)} style={style}>
      {title ? (
        <div className="p-panel-h">
          <h2>{title}</h2>
          {sub ? <span className="lbl">{sub}</span> : null}
          {actions ? <div className="r">{actions}</div> : null}
        </div>
      ) : null}
      {flush ? children : <div className="p-panel-b">{children}</div>}
    </article>
  );
}

export interface Kpi {
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  note?: ReactNode;
  /** color del número (la forma en negativo, en ámbar) */
  color?: string;
}
/** fila de números; `lg` para los cuatro grandes de Análisis */
export function Kpis({ items, lg }: { items: Kpi[]; lg?: boolean }) {
  return (
    <div className={cx('p-kpis', lg && 'lg')} style={cssVars({ '--n': items.length })}>
      {items.map((k, i) => (
        <div key={i}>
          <span className="lbl">{k.label}</span>
          <span className="disp" style={k.color ? { color: k.color } : undefined}>
            {k.value}
            {k.unit ? <span className="p-u">{k.unit}</span> : null}
          </span>
          {k.note ? <small>{k.note}</small> : null}
        </div>
      ))}
    </div>
  );
}

/** la pista de fondo de los bloques oscuros: andariveles enormes, uno en tartán */
export const Lanes = () => (
  <svg className="p-lanes" viewBox="0 0 900 560" aria-hidden="true">
    {Array.from({ length: 7 }, (_, k) => {
      const o = 40 + k * 24;
      return <rect key={k} className={k === 3 ? 'a' : undefined} x={o} y={o} width={900 - o * 2} height={560 - o * 2} rx={240 - k * 24} />;
    })}
  </svg>
);

/** bloque estadio: el momento de cada pantalla. `side` va a la derecha (el dorsal, la pulsera, la ficha) */
export function Stadium({ side, sideWidth, className, style, children }: { side?: ReactNode; sideWidth?: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <article className={cx('p-stadium', !side && 'solo', className)} style={{ ...style, ...(sideWidth ? cssVars({ '--side': sideWidth + 'px' }) : null) }}>
      <Lanes />
      <div>{children}</div>
      {side}
    </article>
  );
}

/* ---- tabla de datos ---- */
export interface Col<T> {
  key: string;
  label: ReactNode;
  /** números: a la derecha y en mono */
  num?: boolean;
  /** se esconde en el celu */
  hideS?: boolean;
  className?: string;
  cell: (row: T) => ReactNode;
}
/** fila de grupo (el mes, con sus totales) entre las filas de datos */
export interface Group {
  group: ReactNode;
  key: string;
}
const isGroup = <T,>(r: T | Group): r is Group => typeof r === 'object' && r != null && 'group' in r;

/** con `href`, la fila entera lleva al detalle: el link es la flecha del final y su área cubre la fila */
export function Table<T>({
  cols,
  rows,
  rowKey,
  href,
  goLabel,
  dim,
  label,
}: {
  cols: Col<T>[];
  rows: (T | Group)[];
  rowKey: (r: T) => string;
  href?: (r: T) => string;
  /** nombre del link de cada fila, para los lectores de pantalla */
  goLabel?: (r: T) => string;
  /** planificadas y no hechas: en gris */
  dim?: (r: T) => boolean;
  label?: string;
}) {
  const n = cols.length + (href ? 1 : 0);
  return (
    <table className="p-tbl" aria-label={label}>
      <thead>
        <tr>
          {cols.map((c) => (
            <th key={c.key} className={cx(c.num && 'r', c.hideS && 'hide-s')}>
              {c.label}
            </th>
          ))}
          {href ? <th aria-hidden="true" /> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) =>
          isGroup(r) ? (
            <tr key={'g-' + r.key} className="grp">
              <td colSpan={n}>
                <div className="grp-in">{r.group}</div>
              </td>
            </tr>
          ) : (
            <tr key={rowKey(r)} className={cx(href && 'go', dim?.(r) && 'dim')}>
                {cols.map((c) => (
                  <td key={c.key} className={cx(c.num && 'r', c.hideS && 'hide-s', c.className)}>
                    {c.cell(r)}
                  </td>
                ))}
                {href ? (
                  <td className="r" style={{ width: 36, paddingLeft: 0 }}>
                    <Link className="p-go" href={href(r)} aria-label={goLabel?.(r) || 'Ver el detalle'}>
                      <CaretRight aria-hidden="true" />
                    </Link>
                  </td>
                ) : null}
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}
