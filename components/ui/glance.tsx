/* Tarjetas «de un vistazo»: una idea por tarjeta, un número grande (líneas 2394–2415 del original). */
import type { CSSProperties, ReactNode } from 'react';
import { CalendarBlank, ClipboardText, Fire, FlagCheckered, GridFour, Heartbeat, MapPin, Path, SneakerMove, Timer } from '@phosphor-icons/react';

/* íconos Phosphor, rellenos */
export const GL_IC = {
  week: CalendarBlank,
  next: SneakerMove,
  race: Timer,
  flag: FlagCheckered,
  streak: Fire,
  form: Heartbeat,
  route: Path,
  area: GridFour,
  pin: MapPin,
  pend: ClipboardText,
} as const;
export type GlIcKey = keyof typeof GL_IC;

const cssVars = (o: Record<string, string | number>) => o as CSSProperties;

export function GlIc({ k, c }: { k: GlIcKey; c: string }) {
  const Ic = GL_IC[k];
  return <Ic className="ic ph" weight="fill" aria-hidden="true" style={cssVars({ '--icf': c })} />;
}

/** forma según el balance de carga (TSB) */
export const formState = (t: number): [string, string] =>
  t < -20 ? ['Muy cargado', 'var(--crit)'] : t < -8 ? ['Cargado', 'var(--warn)'] : t < 6 ? ['Equilibrado', 'var(--good)'] : t < 18 ? ['Fresco', 'var(--info)'] : ['Muy descansado', 'var(--muted)'];

/** tarjeta tocable de la Semana */
export function GlTile({ ic, c, t, body, s, onClick, label }: { ic: GlIcKey; c: string; t: string; body: ReactNode; s?: ReactNode; onClick?: () => void; label?: string }) {
  return (
    <button className="gl" style={cssVars({ '--gc': c })} onClick={onClick} aria-label={label}>
      <span className="gl-h">
        <GlIc k={ic} c={c} />
        <span>{t}</span>
      </span>
      {body}
      {s ? <span className="gl-s">{s}</span> : null}
    </button>
  );
}

/** tarjeta de Resumen (no se toca: solo muestra) */
export function SumTile({ ic, c, t, v, viz, sub }: { ic: GlIcKey; c: string; t: string; v: ReactNode; viz?: ReactNode; sub?: string }) {
  return (
    <div className="gl" style={cssVars({ '--gc': c })}>
      <span className="gl-h">
        <GlIc k={ic} c={c} />
        <span>{t}</span>
      </span>
      {v}
      {viz || null}
      {sub ? <span className="gl-s">{sub}</span> : null}
    </div>
  );
}

/** mini barras: la actual más fuerte, las futuras apenas marcadas */
export function Spark({ a, c }: { a: { v: number; cur?: boolean; fut?: boolean }[]; c: string }) {
  const mx = Math.max(1, ...a.map((q) => q.v));
  return (
    <span className="gl-spark" style={cssVars({ '--sc': c })}>
      {a.map((q, i) => (
        <i key={i} className={q.cur ? 'cur' : q.fut ? 'fut' : ''} style={{ height: Math.max(q.v > 0 ? 10 : 4, (q.v / mx) * 100).toFixed(0) + '%' }} />
      ))}
    </span>
  );
}
