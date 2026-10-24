'use client';
/* Campos de tiempo (h:min:s) y ritmo (min:s), controlados. Reemplazan a hmsFields/readHMS/readMS/setHMS/setMS. */
import { num } from '@/lib/domain/util';

export type Hms = { h: string; m: string; s: string };
export type Ms = { m: string; s: string };

export const hmsFromSec = (sec: number | null | undefined): Hms => {
  if (sec == null || !(sec > 0)) return { h: '', m: '', s: '' };
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60),
    s = Math.round(sec % 60);
  return { h: h ? String(h) : '', m: String(m), s: String(s) };
};
export const msFromSec = (sec: number | null | undefined): Ms => {
  if (sec == null || !(sec > 0)) return { m: '', s: '' };
  sec = Math.round(sec);
  return { m: String(Math.floor(sec / 60)), s: String(sec % 60) };
};
/** segundos; null si está todo vacío, NaN si algo no se entiende */
export function readHms(v: Hms): number | null {
  const h = num(v.h),
    m = num(v.m),
    s = num(v.s);
  if (h == null && m == null && s == null) return null;
  const a = [h, m, s].map((x) => (x == null ? 0 : x));
  if (a.some((x) => isNaN(x) || x < 0) || a[1] >= 60 || a[2] >= 60) return NaN;
  return a[0] * 3600 + a[1] * 60 + a[2];
}
export function readMs(v: Ms): number | null {
  const m = num(v.m),
    s = num(v.s);
  if (m == null && s == null) return null;
  const a = m == null ? 0 : m,
    b = s == null ? 0 : s;
  if (isNaN(a) || isNaN(b) || a < 0 || b < 0 || b >= 60) return NaN;
  return a * 60 + b;
}

/** horas : minutos : segundos (ids `${id}-h`, `${id}-m`, `${id}-s`, como el original) */
export function HmsInput({ id, value, onChange }: { id: string; value: Hms; onChange: (v: Hms) => void }) {
  const f = (k: keyof Hms, ph: string, label: string) => (
    <input className="in" id={id + '-' + k} inputMode="numeric" placeholder={ph} aria-label={label} value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
  );
  return (
    <div className="row">
      {f('h', 'h', 'horas')}
      <span className="u">:</span>
      {f('m', 'min', 'minutos')}
      <span className="u">:</span>
      {f('s', 's', 'segundos')}
    </div>
  );
}

/** minutos : segundos por km */
export function MsInput({
  id,
  value,
  onChange,
  unit = '/km',
  ph = ['min', 's'],
  labels = ['minutos', 'segundos'],
}: {
  id: string;
  value: Ms;
  onChange: (v: Ms) => void;
  unit?: string;
  /** textos de ayuda de minutos y segundos */
  ph?: [string, string];
  labels?: [string, string];
}) {
  return (
    <div className="row">
      <input className="in" id={id + '-m'} inputMode="numeric" placeholder={ph[0]} aria-label={labels[0]} value={value.m} onChange={(e) => onChange({ ...value, m: e.target.value })} />
      <span className="u">:</span>
      <input className="in" id={id + '-s'} inputMode="numeric" placeholder={ph[1]} aria-label={labels[1]} value={value.s} onChange={(e) => onChange({ ...value, s: e.target.value })} />
      {unit ? <span className="u">{unit}</span> : null}
    </div>
  );
}
