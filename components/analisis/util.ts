/* Ayudas chicas de las pantallas de Análisis, sin interfaz. */
import { DF_MY } from '@/lib/domain/util';

export const plural = (n: number, one: string, many: string) => n + ' ' + (n === 1 ? one : many);

/** marcas del eje desde 0 con un paso redondo, para que entren unas 4: el tope y las marcas */
export function niceTicks(max: number, n = 4) {
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find((s) => Math.ceil(max / s) <= n) || 1000,
    hi = Math.max(step, Math.ceil(max / step) * step);
  return { hi, ticks: Array.from({ length: hi / step + 1 }, (_, k) => k * step) };
}

/** marcas de ritmo (s/km) cada 15 o 30 segundos entre `lo` y `hi`, para que entren unas 5 */
export function paceTicks(lo: number, hi: number) {
  const step = hi - lo > 120 ? 30 : 15,
    a = Math.floor(lo / step) * step,
    b = Math.ceil(hi / step) * step,
    ticks: number[] = [];
  for (let v = a; v <= b; v += step) ticks.push(v);
  return { lo: a, hi: b, ticks };
}


const DF_MON = new Intl.DateTimeFormat('es-AR', { month: 'long' });
/** «junio», o «junio de 2025» si no es de este año */
export const monthOf = (d: Date) => (d.getFullYear() === new Date().getFullYear() ? DF_MON : DF_MY).format(d);
