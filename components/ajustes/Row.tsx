/* Una fila de ajuste: qué es y para qué sirve a la izquierda, el control a la derecha. Con `htmlFor`, el título es la
   etiqueta del campo. */
import type { ReactNode } from 'react';
import { cx } from '@/components/pista/util';

export function Row({ title, desc, htmlFor, className, children }: { title: ReactNode; desc?: ReactNode; htmlFor?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cx('aj-row', className)}>
      <div className="aj-rt">
        {htmlFor ? <label htmlFor={htmlFor}>{title}</label> : <b>{title}</b>}
        {desc ? <small>{desc}</small> : null}
      </div>
      <div className="aj-ctl">{children}</div>
    </div>
  );
}

/** el error de un campo suelto (los de `Field` ya lo traen) */
export const FieldErr = ({ id, children }: { id: string; children: ReactNode }) =>
  children ? (
    <span className="aj-err" id={id + '-err'}>
      {children}
    </span>
  ) : null;
