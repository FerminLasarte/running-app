/* Utilidades de fechas, números y formatos (es-AR). Puras: no tocan el estado ni el DOM. */

export const pad = (n: number) => String(n).padStart(2, '0');
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** inicio del día local */
export const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** fecha local como 'AAAA-MM-DD' */
export const ymd = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
/** 'AAAA-MM-DD' a Date local */
export const pd = (s: string) => {
  const p = String(s).split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
};
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const mondayOf = (d: Date) => addDays(sod(d), -((sod(d).getDay() + 6) % 7));
export const dayDiff = (a: Date, b: Date) => Math.round((+sod(b) - +sod(a)) / 864e5);
/** días que faltan desde hoy hasta una fecha AAAA-MM-DD (0 = hoy, negativo = ya pasó) */
export const daysTo = (date: string) => dayDiff(sod(new Date()), pd(date));
export const todayS = () => ymd(new Date());
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const DF_WD = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
export const DF_D = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
export const DF_M = new Intl.DateTimeFormat('es-AR', { month: 'short' });
export const DF_MY = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });
export const DF_LONG = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

export const dateLabel = (s: string) => DF_WD.format(pd(s)).replace(/[.,]/g, '');
export const dShort = (d: Date) => DF_D.format(d).replace(/\./g, '');

/** número con coma decimal y sin ceros de más; '–' si no es un número */
export const fmt = (x: number | null | undefined, d?: number) => {
  if (x == null || !isFinite(x)) return '–';
  let s = Number(x).toFixed(d == null ? 1 : d);
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('.', ',');
};
/** lee un número escrito con coma o punto: null si está vacío, NaN si no se entiende */
export const num = (v: unknown): number | null => {
  const s = String(v == null ? '' : v).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return isFinite(n) ? n : NaN;
};
export const fmtPace = (s: number) => {
  if (!isFinite(s) || s <= 0) return '–';
  s = Math.round(s);
  return Math.floor(s / 60) + ':' + pad(s % 60);
};
export const fmtDur = (s: number) => {
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), c = s % 60;
  return h ? h + ':' + pad(m) + ':' + pad(c) : m + ':' + pad(c);
};
export const newId = () => 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const cleanObj = <T>(o: T): T => JSON.parse(JSON.stringify(o));

/** sin tildes y en minúsculas, para buscar */
export const norm = (t: unknown) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/** número con separador de miles */
export const nf = (v: number) => Math.round(v).toLocaleString('es-AR');

export const WD = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const WEATHER = ['Fresco', 'Templado', 'Calor', 'Mucho calor', 'Lluvia', 'Viento'];
export const REASONS = ['Resfriado o malestar', 'Molestia o dolor', 'Semana muy cargada', 'Cansancio'];
