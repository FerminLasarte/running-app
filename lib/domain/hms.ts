/* Tiempos h:min:s y ritmos min:s como los guardan los formularios (texto por casillero), ida y vuelta a segundos. */
import { num } from './util';

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
