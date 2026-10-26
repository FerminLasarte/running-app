'use client';
/* El estado de Análisis vive en la URL, como los filtros del Registro: la pestaña es la ruta (`/analisis/ritmo`) y el
   período (`?periodo=52s`) y la base de tus ritmos (`?ritmos=objetivo`) van como parámetros. Se comparten, sobreviven
   a recargar y el período sigue al pasar de una pestaña a otra. Se leen con useSearchParams y se escriben con
   history.replaceState; los valores por defecto no se escriben. */
import { AN_PERIODS, anWeeks, type AnPeriod } from '@/lib/domain/analysis';
import { weekSeries } from '@/lib/domain/stats';
import { useParam } from '@/components/shell/useParam';
import { plural } from './util';

export const AN_INIT: AnPeriod = '26s';

/** las pestañas de Análisis: cada una es una ruta */
export type AnTab = 'vol' | 'ritmo' | 'forma' | 'zapas';
/** `more`: lo que muestra cada una, para encontrarla en la paleta ⌘K */
export const AN_TABS: { value: AnTab; label: string; path: string; more: string }[] = [
  { value: 'vol', label: 'Volumen', path: '/analisis', more: 'kilómetros por semana por tipo intensidad si corrieras hoy predicción tiempos marcas récords' },
  { value: 'ritmo', label: 'Ritmo y eficiencia', path: '/analisis/ritmo', more: 'vdot 10k estimado evolución del ritmo tus ritmos daniels corazón frecuencia cardíaca deriva' },
  { value: 'forma', label: 'Forma y carga', path: '/analisis/forma', more: 'preparación carrera relación de carga estado físico fatiga proyección' },
  { value: 'zapas', label: 'Zapatillas', path: '/analisis/zapatillas', more: 'zapas calzado vida útil límite km por mes' },
];
export const tabOf = (pathname: string) => AN_TABS.find((t) => t.path === pathname)?.value || 'vol';

/** link a una pestaña con un período (para las pestañas y la paleta) */
export const analisisHref = (tab: AnTab, per: AnPeriod = AN_INIT) => AN_TABS.find((t) => t.value === tab)!.path + (per !== AN_INIT ? '?periodo=' + per : '');

/** lo que abarca el período, para los rótulos de los paneles: «26 semanas» (menos si tu historial es más corto) */
export const periodLabel = (p: AnPeriod) => plural(weekSeries(anWeeks(p)).length, 'semana', 'semanas');

const PER_KEYS = AN_PERIODS.map((p) => p[0]);
/** el período de los gráficos */
export const useAnPeriod = () => useParam<AnPeriod>('periodo', PER_KEYS, AN_INIT);

/** tus ritmos de entrenamiento: desde tu forma de hoy o desde tu objetivo */
export type PaceBase = 'hoy' | 'objetivo';
export const usePaceBase = () => useParam<PaceBase>('ritmos', ['hoy', 'objetivo'], 'hoy');
