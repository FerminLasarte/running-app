/* Secciones de la app: una ruta cada una. Las seis primeras van en la barra lateral (y abajo en el celu) con su
   atajo 1–6; Ajustes va en el menú de la cuenta. */
import { CalendarBlank, ChartLineUp, FlagCheckered, MapTrifold, Medal, Rows, SlidersHorizontal, type Icon } from '@phosphor-icons/react';

export type Section = 'semana' | 'registro' | 'analisis' | 'carreras' | 'mapa' | 'logros' | 'ajustes';

export interface SectionDef {
  id: Section;
  href: string;
  label: string;
  Icon: Icon;
  /** color de la sección en las pantallas viejas (encabezado y subpestañas) */
  c: string;
  /** pantalla rehecha: trae su propio comienzo y no lleva el encabezado viejo */
  redone?: boolean;
}

export const SECTIONS: SectionDef[] = [
  { id: 'semana', href: '/semana', label: 'Semana', Icon: CalendarBlank, c: 'var(--t2)', redone: true },
  { id: 'registro', href: '/registro', label: 'Registro', Icon: Rows, c: 'var(--t3)', redone: true },
  { id: 'analisis', href: '/analisis', label: 'Análisis', Icon: ChartLineUp, c: 'var(--info)', redone: true },
  { id: 'carreras', href: '/carreras', label: 'Carreras', Icon: FlagCheckered, c: 'var(--accent)', redone: true },
  { id: 'mapa', href: '/mapa', label: 'Mapa', Icon: MapTrifold, c: 'var(--t5)' },
  { id: 'logros', href: '/logros', label: 'Logros', Icon: Medal, c: 'var(--warn)' },
  { id: 'ajustes', href: '/ajustes', label: 'Ajustes', Icon: SlidersHorizontal, c: 'var(--ink2)' },
];
/** las de la barra (sin Ajustes) */
export const NAV = SECTIONS.slice(0, 6);

/** la sección de una ruta; null en las páginas que no son de una sección (el detalle de una sesión) */
export function sectionOf(pathname: string): SectionDef | null {
  const seg = '/' + (pathname.split('/')[1] || '');
  return SECTIONS.find((s) => s.href === seg) || null;
}
