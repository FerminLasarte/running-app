/* Estructura del rediseño «Pista» (estilos en app/styles/components/structure.css): título de marca, encabezado de
   página, panel, fila de números, lista de marcas, bloque estadio con los andariveles y tabla de datos. */
import { type CSSProperties, type ElementType, type ReactNode } from 'react';
import Link from 'next/link';
import { CaretDown, CaretRight, CaretUp } from '@phosphor-icons/react';
import { cssVars, cx } from './util';

/** voz de marca: angosta, itálica, en mayúsculas y con el punto final en tartán */
export function BrandTitle({ as: As = 'h1', id, className, style, children }: { as?: ElementType; id?: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <As id={id} className={cx('brand-t', className)} style={style}>
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
      {actions ? <div className="p-acts">{actions}</div> : null}
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

export interface MarkItem {
  key: string;
  label: ReactNode;
  /** de dónde sale (la carrera y la fecha) */
  sub?: ReactNode;
  value: ReactNode;
  /** con `href`, la fila lleva a la sesión */
  href?: string;
}
/** lista de marcas: el nombre con su origen a la izquierda y el número grande a la derecha (tus marcas, las de un par) */
export function MarkList({ items, label }: { items: MarkItem[]; label?: string }) {
  return (
    <ul className="p-marks" aria-label={label}>
      {items.map((m) => {
        const body = (
          <>
            <span>
              {m.label}
              {m.sub ? <small>{m.sub}</small> : null}
            </span>
            <span className="disp">{m.value}</span>
          </>
        );
        return (
          <li key={m.key}>
            {m.href ? (
              <Link className="mrow" href={m.href}>
                {body}
              </Link>
            ) : (
              <div className="mrow">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
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
  /** se puede ordenar por esta columna: la clave del orden */
  sort?: string;
  cell: (row: T) => ReactNode;
}
/** orden de la tabla: por qué columna (`by`, la clave de `Col.sort`) y para qué lado; tocar el encabezado llama a `onSort` */
export interface TableSort {
  by: string;
  dir: 1 | -1;
  onSort: (by: string) => void;
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
  sort,
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
  sort?: TableSort;
  label?: string;
}) {
  const n = cols.length + (href ? 1 : 0);
  return (
    <table className="p-tbl" aria-label={label}>
      <thead>
        <tr>
          {cols.map((c) => {
            const on = sort && c.sort === sort.by;
            return (
              <th key={c.key} className={cx(c.num && 'r', c.hideS && 'hide-s')} aria-sort={on ? (sort.dir < 0 ? 'descending' : 'ascending') : undefined}>
                {sort && c.sort ? (
                  <button type="button" className={cx('p-sort', on && 'on')} onClick={() => sort.onSort(c.sort!)}>
                    {c.label}
                    {on ? sort.dir < 0 ? <CaretDown weight="bold" aria-hidden="true" /> : <CaretUp weight="bold" aria-hidden="true" /> : null}
                  </button>
                ) : (
                  c.label
                )}
              </th>
            );
          })}
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
