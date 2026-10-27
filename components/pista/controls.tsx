'use client';
/* Controles del rediseño «Pista» (estilos en app/styles/components/controls.css): botón, chip de tipo, etiqueta,
   Δ contra el objetivo, PR, selector segmentado, lista con forma de botón, interruptor, stepper, pestañas y Δ contra la
   semana anterior. */
import { useRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, CaretDown, Minus, Plus, type Icon, type IconWeight } from '@phosphor-icons/react';
import type { SessionType } from '@/lib/domain/types';
import { TYPES } from '@/lib/domain/config';
import { fmt, pad } from '@/lib/domain/util';
import { cssVars, cx, typeColor } from './util';

/* ---- botón ---- */
type BtnLook = { variant?: 'pri' | 'acc' | 'ghost' | 'on-dark'; size?: 'sm' | 'lg'; icon?: Icon; iconWeight?: IconWeight; arrow?: boolean; kbd?: string; children?: ReactNode };
const btnBody = ({ icon: I, iconWeight, arrow, kbd, children }: BtnLook) => (
  <>
    {I ? <I weight={iconWeight} aria-hidden="true" /> : null}
    {children}
    {arrow ? <ArrowRight className="ar" aria-hidden="true" /> : null}
    {kbd ? <kbd>{kbd}</kbd> : null}
  </>
);
const btnClass = (l: BtnLook, extra?: string) => cx('p-btn', l.variant, l.size, extra);

/** con `href` es un link (navega con el router); si no, un botón */
export function Button(props: BtnLook & ({ href: string; className?: string } | (ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined }))) {
  const { variant, size, icon, iconWeight, arrow, kbd, children, className, ...rest } = props;
  const look = { variant, size, icon, iconWeight, arrow, kbd, children };
  if (props.href != null) return <Link className={btnClass(look, className)} href={props.href}>{btnBody(look)}</Link>;
  return (
    <button type="button" className={btnClass(look, className)} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {btnBody(look)}
    </button>
  );
}

/* ---- marcas ---- */
/** tipo de sesión; `color` para lo que no es un tipo (la próxima carrera, en tartán) */
export function Chip({ type, color, solid, children }: { type?: SessionType; color?: string; solid?: boolean; children?: ReactNode }) {
  const tc = color || (type ? typeColor(type) : 'var(--ink-3)');
  return (
    <span className={cx('p-chip', solid && 'solid', solid && type === 'test' && 'ink')} style={cssVars({ '--tc': tc })}>
      {children ?? (type ? TYPES[type].label : null)}
    </span>
  );
}

export const Tag = ({ warn, children }: { warn?: boolean; children: ReactNode }) => <span className={cx('p-tag', warn && 'warn')}>{children}</span>;

export const Pr = () => <span className="p-pr" title="Marca personal">PR</span>;

/** una diferencia de tiempo con su signo: «−0:41», «+1:05», «±0:00» */
export function deltaTxt(sec: number) {
  const s = Math.round(sec),
    a = Math.abs(s);
  return (s < 0 ? '−' : s > 0 ? '+' : '±') + Math.floor(a / 60) + ':' + pad(a % 60);
}
/** diferencia de tiempo contra el objetivo, en segundos: por defecto, menos es mejor (más rápido) */
export function Delta({ sec, better = 'lower' }: { sec: number; better?: 'lower' | 'higher' }) {
  const s = Math.round(sec),
    good = better === 'lower' ? s < 0 : s > 0;
  return <span className={cx('p-delta', s === 0 ? 'eq' : good ? 'good' : 'bad')}>{deltaTxt(sec)}</span>;
}

/* ---- elección de uno entre varios: el foco sigue a la elección y se mueve con las flechas ---- */
export function useRoving(n: number, cur: number, pick: (i: number) => void) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key,
      to = k === 'ArrowRight' || k === 'ArrowDown' ? (cur + 1) % n : k === 'ArrowLeft' || k === 'ArrowUp' ? (cur - 1 + n) % n : k === 'Home' ? 0 : k === 'End' ? n - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    pick(to);
    refs.current[to]?.focus();
  };
  const bind = (i: number) => ({ ref: (el: HTMLElement | null) => void (refs.current[i] = el), tabIndex: i === cur ? 0 : -1, onKeyDown });
  return bind;
}

export interface SegOption<V extends string> {
  value: V;
  label: ReactNode;
  /** cantidad, en mono y en gris */
  n?: number;
  /** cuadradito del color del tipo */
  color?: string;
}
export function Segmented<V extends string>({ options, value, onChange, label, fill }: { options: SegOption<V>[]; value: V; onChange: (v: V) => void; label: string; fill?: boolean }) {
  const cur = Math.max(0, options.findIndex((o) => o.value === value));
  const bind = useRoving(options.length, cur, (i) => onChange(options[i].value));
  return (
    <div className={cx('p-seg', fill && 'fill')} role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button key={o.value} type="button" role="radio" aria-checked={i === cur} onClick={() => onChange(o.value)} style={o.color ? cssVars({ '--tc': o.color }) : undefined} {...bind(i)}>
          {o.color ? <span className="sq" aria-hidden="true" /> : null}
          {o.label}
          {o.n != null ? <span className="n">{o.n}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** una opción de una lista que se despliega, con forma de botón (el período). Es un `select` del navegador, invisible y
    encima de todo el botón: en el celu abre la lista del sistema y con el teclado se elige con las flechas */
export function SelectButton<V extends string>({ options, value, onChange, label, icon: I }: { options: [V, string][]; value: V; onChange: (v: V) => void; label: string; icon?: Icon }) {
  return (
    <span className="p-btn p-selb">
      {I ? <I aria-hidden="true" /> : null}
      <span aria-hidden="true">{options.find((o) => o[0] === value)?.[1]}</span>
      <CaretDown className="cd" aria-hidden="true" />
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as V)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </span>
  );
}

export interface ChoiceOption<V extends string> {
  value: V;
  label: ReactNode;
  /** dato chico al lado, en mono (los km de unas zapatillas) */
  sub?: ReactNode;
  icon?: Icon;
  /** cuadradito del color del tipo */
  color?: string;
  disabled?: boolean;
  title?: string;
}
/** botones sueltos, uno elegido (molestia, zapatillas, clima, plantillas). Con `toggle`, tocar el elegido lo suelta */
export function Choices<V extends string>({ options, value, onChange, label, toggle }: { options: ChoiceOption<V>[]; value: V | null; onChange: (v: V | null) => void; label: string; toggle?: boolean }) {
  return (
    <div className="p-choices" role="group" aria-label={label}>
      {options.map(({ value: v, label: l, sub, icon: I, color, disabled, title }) => (
        <button
          key={v}
          type="button"
          aria-pressed={v === value}
          disabled={disabled}
          title={title}
          style={color ? cssVars({ '--tc': color }) : undefined}
          onClick={() => onChange(toggle && v === value ? null : v)}
        >
          {color ? <span className="sq" aria-hidden="true" /> : null}
          {I ? <I aria-hidden="true" /> : null}
          {l}
          {sub != null ? <small>{sub}</small> : null}
        </button>
      ))}
    </div>
  );
}

/** interruptor: el texto a la izquierda, la llave a la derecha; se guarda solo */
export function Switch({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; desc?: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="p-tg" onClick={() => onChange(!checked)}>
      <span>
        <b>{label}</b>
        {desc ? <small>{desc}</small> : null}
      </span>
      <i className="k" aria-hidden="true" />
    </button>
  );
}

export function Stepper({ value, onChange, min = -Infinity, max = Infinity, step = 1, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string }) {
  return (
    <span className="p-stepper" role="group" aria-label={label}>
      <button type="button" aria-label="Menos" disabled={value - step < min} onClick={() => onChange(value - step)}>
        <Minus aria-hidden="true" />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label="Más" disabled={value + step > max} onClick={() => onChange(value + step)}>
        <Plus aria-hidden="true" />
      </button>
    </span>
  );
}

/* ---- pestañas: con `href` son links a rutas (Análisis); si no, pestañas de la misma página ---- */
export interface TabItem<V extends string> {
  value: V;
  label: ReactNode;
  href?: string;
}
export function Tabs<V extends string>({ items, value, onChange, label, idPrefix }: { items: TabItem<V>[]; value: V; onChange?: (v: V) => void; label: string; idPrefix?: string }) {
  const cur = Math.max(0, items.findIndex((t) => t.value === value));
  const bind = useRoving(items.length, cur, (i) => onChange?.(items[i].value));
  if (items.every((t) => t.href))
    return (
      <nav className="p-tabs" aria-label={label}>
        {items.map((t) => (
          <Link key={t.value} href={t.href!} aria-current={t.value === value ? 'page' : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
    );
  return (
    <div className="p-tabs" role="tablist" aria-label={label}>
      {items.map((t, i) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          id={idPrefix ? idPrefix + '-tab-' + t.value : undefined}
          aria-controls={idPrefix ? idPrefix + '-' + t.value : undefined}
          aria-selected={i === cur}
          onClick={() => onChange?.(t.value)}
          {...bind(i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---- Δ contra la semana anterior ---- */
/** `dlt` del original: «+3,2 km», «−1», «igual»; nada si no hay con qué comparar. Más es mejor (km, sesiones, puntaje,
    tiempo) */
export function Dlt({ v, prev, unit = '', dec = 0 }: { v: number | null; prev: number | null; unit?: string; dec?: number }) {
  if (prev == null || !(prev > 0) || v == null) return null;
  const d = v - prev,
    eq = Math.abs(d) < Math.pow(10, -dec) / 2;
  return (
    <span className={cx('p-delta', eq ? 'eq' : d > 0 ? 'good' : 'bad')} title="Contra la semana anterior">
      {eq ? 'igual' : (d > 0 ? '+' : '−') + fmt(Math.abs(d), dec) + unit}
      <span className="p-sr"> contra la semana anterior</span>
    </span>
  );
}
