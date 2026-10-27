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
/** número de semana ISO: la 1 es la que tiene el primer jueves del año */
export const isoWeek = (d: Date) => {
  const th = addDays(mondayOf(d), 3);
  return Math.floor(dayDiff(new Date(th.getFullYear(), 0, 1), th) / 7) + 1;
};
/** días que faltan desde hoy hasta una fecha AAAA-MM-DD (0 = hoy, negativo = ya pasó) */
export const daysTo = (date: string) => dayDiff(sod(new Date()), pd(date));
export const todayS = () => ymd(new Date());
/** km por mes, desde el mes de `from` hasta el actual (los meses sin nada, en 0): `rows` son [fecha AAAA-MM-DD, km] */
export function kmByMonth(rows: [string, number][], from: Date) {
  const now = sod(new Date()),
    n = (now.getFullYear() - from.getFullYear()) * 12 + now.getMonth() - from.getMonth() + 1;
  return Array.from({ length: Math.max(1, n) }, (_, i) => {
    const m = new Date(from.getFullYear(), from.getMonth() + i, 1),
      key = m.getFullYear() + '-' + pad(m.getMonth() + 1);
    return { m, km: sum(rows.filter((r) => r[0].slice(0, 7) === key).map((r) => r[1])), cur: i === n - 1 };
  });
}
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** «1 salida», «3 salidas» */
export const plural = (n: number, one: string, many: string) => n + ' ' + (n === 1 ? one : many);

export const DF_WD = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
export const DF_D = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
export const DF_M = new Intl.DateTimeFormat('es-AR', { month: 'short' });
export const DF_MY = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });
export const DF_LONG = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
const DF_LONG_Y = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const DF_MON = new Intl.DateTimeFormat('es-AR', { month: 'long' });
/** «junio», o «junio de 2025» si no es de este año */
export const monthOf = (d: Date) => (d.getFullYear() === new Date().getFullYear() ? DF_MON : DF_MY).format(d);
/** «Domingo 9 de noviembre», o «Domingo 9 de noviembre de 2027» si no es de este año */
export const dayLong = (d: Date) => cap((d.getFullYear() === new Date().getFullYear() ? DF_LONG : DF_LONG_Y).format(d).replace(',', ''));

export const dateLabel = (s: string) => DF_WD.format(pd(s)).replace(/[.,]/g, '');
export const dShort = (d: Date) => DF_D.format(d).replace(/\./g, '');
/** cuánto pasó desde un momento (ms): «hace un momento», «hace 4 min», «hace 3 h» o el día */
export function agoTxt(t: number, now = Date.now()) {
  const m = Math.floor((now - t) / 60000);
  if (m < 1) return 'hace un momento';
  if (m < 60) return 'hace ' + m + ' min';
  if (m < 24 * 60) return 'hace ' + Math.floor(m / 60) + ' h';
  return 'el ' + dShort(new Date(t));
}

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
