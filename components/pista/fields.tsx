'use client';
/* Campos del rediseño «Pista» (estilos en app/styles/components/fields.css). `Field` pone la etiqueta, la ayuda y el
   error; los campos marcan `aria-invalid` y apuntan al error con `aria-describedby` usando el mismo id. */
import { Fragment, type ComponentProps, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { MagnifyingGlass, WarningCircle } from '@phosphor-icons/react';
import type { Hms, Ms } from '@/lib/domain/hms';
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

/* casilleros de tiempo, uno por parte; van con un `Field group` del mismo id */
function TimeBoxes<K extends string>({ id, parts, value, onChange, invalid, ph }: { id: string; parts: [K, string, string][]; value: Record<K, string>; onChange: (v: Record<K, string>) => void; invalid?: boolean; ph?: Partial<Record<K, string>> }) {
  return (
    <div className={cx('p-hms', parts.length === 2 && 'ms')} role="group" aria-labelledby={labelId(id)} aria-describedby={invalid ? errId(id) : undefined}>
      {parts.map(([k, label, p0], i) => (
        <Fragment key={k}>
          {i ? <b aria-hidden="true">:</b> : null}
          <Input id={id + '-' + k} inputMode="numeric" aria-label={label} placeholder={ph?.[k] || p0} invalid={invalid} value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
        </Fragment>
      ))}
    </div>
  );
}

const HMS: [keyof Hms, string, string][] = [
  ['h', 'horas', '0'],
  ['m', 'minutos', '00'],
  ['s', 'segundos', '00'],
];
const MS: [keyof Ms, string, string][] = [
  ['m', 'minutos', '0'],
  ['s', 'segundos', '00'],
];
/** horas : minutos : segundos, cada uno en su casillero */
export const HmsInput = (p: { id: string; value: Hms; onChange: (v: Hms) => void; invalid?: boolean; ph?: Partial<Hms> }) => <TimeBoxes parts={HMS} {...p} />;
/** minutos : segundos (un ritmo, una vuelta) */
export const MsInput = (p: { id: string; value: Ms; onChange: (v: Ms) => void; invalid?: boolean; ph?: Partial<Ms> }) => <TimeBoxes parts={MS} {...p} />;

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
export function SearchField({ label, kbd, ...rest }: ComponentProps<'input'> & { label: string; kbd?: string }) {
  return (
    <label className="p-search">
      <MagnifyingGlass aria-hidden="true" />
      <input type="search" aria-label={label} autoComplete="off" spellCheck={false} {...rest} />
      {kbd ? <kbd>{kbd}</kbd> : null}
    </label>
  );
}
