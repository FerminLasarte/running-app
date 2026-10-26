'use client';
/* Campos del rediseño «Pista» (estilos en app/styles/components/fields.css). `Field` pone la etiqueta, la ayuda y el
   error; los campos marcan `aria-invalid` y apuntan al error con `aria-describedby` usando el mismo id. */
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { MagnifyingGlass, WarningCircle } from '@phosphor-icons/react';
import type { Hms } from '@/lib/domain/hms';
import { cx } from './util';

const errId = (id: string) => id + '-err';
const helpId = (id: string) => id + '-help';
const labelId = (id: string) => id + '-l';
const described = (id: string, invalid?: boolean, help?: boolean) => [invalid && errId(id), help && helpId(id)].filter(Boolean).join(' ') || undefined;

/** `group`: la etiqueta nombra a varios campos (h:m:s), no a uno */
export function Field({ id, label, src, help, error, group, children }: { id: string; label: ReactNode; src?: ReactNode; help?: ReactNode; error?: ReactNode; group?: boolean; children: ReactNode }) {
  const lab = (
    <>
      {label}
      {src ? <span className="p-src">{src}</span> : null}
    </>
  );
  return (
    <div className="p-fld">
      {group ? (
        <span className="p-flab" id={labelId(id)}>
          {lab}
        </span>
      ) : (
        <label htmlFor={id}>{lab}</label>
      )}
      {children}
      {error ? (
        <span className="errt" id={errId(id)}>
          <WarningCircle weight="fill" aria-hidden="true" />
          {error}
        </span>
      ) : null}
      {help ? (
        <span className="help" id={helpId(id)}>
          {help}
        </span>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { id: string; invalid?: boolean; hasHelp?: boolean; num?: boolean };
export function Input({ id, invalid, hasHelp, num, className, ...rest }: InputProps) {
  return <input id={id} className={cx('p-in', num && 'num', className)} aria-invalid={invalid || undefined} aria-describedby={described(id, invalid, hasHelp)} {...rest} />;
}

export function TextArea({ id, invalid, hasHelp, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; invalid?: boolean; hasHelp?: boolean }) {
  return <textarea id={id} className={cx('p-in', className)} aria-invalid={invalid || undefined} aria-describedby={described(id, invalid, hasHelp)} {...rest} />;
}

/** número con la unidad adentro, a la derecha */
export function UnitInput({ unit, ...rest }: InputProps & { unit: string }) {
  return (
    <span className="p-unit">
      <Input num inputMode="decimal" {...rest} />
      <span aria-hidden="true">{unit}</span>
    </span>
  );
}

/** horas : minutos : segundos, cada uno en su casillero; va con un `Field group` del mismo id */
export function HmsInput({ id, value, onChange, invalid }: { id: string; value: Hms; onChange: (v: Hms) => void; invalid?: boolean }) {
  const f = (k: keyof Hms, label: string) => (
    <Input id={id + '-' + k} inputMode="numeric" aria-label={label} placeholder={k === 'h' ? '0' : '00'} invalid={invalid} value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
  );
  return (
    <div className="p-hms" role="group" aria-labelledby={labelId(id)} aria-describedby={invalid ? errId(id) : undefined}>
      {f('h', 'horas')}
      <b aria-hidden="true">:</b>
      {f('m', 'minutos')}
      <b aria-hidden="true">:</b>
      {f('s', 'segundos')}
    </div>
  );
}

/** lo que la app calcula sola (el ritmo con distancia y tiempo): se lee, no se edita */
export function Calc({ id, children, note = 'calculado' }: { id: string; children: ReactNode; note?: string }) {
  return (
    <output id={id} className="p-calc" aria-live="polite">
      <span>{children}</span>
      <small>{note}</small>
    </output>
  );
}

/** búsqueda con el ícono adentro y, si tiene, su atajo */
export function SearchField({ label, kbd, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; kbd?: string }) {
  return (
    <label className="p-search">
      <MagnifyingGlass aria-hidden="true" />
      <input type="search" aria-label={label} autoComplete="off" spellCheck={false} {...rest} />
      {kbd ? <kbd>{kbd}</kbd> : null}
    </label>
  );
}
