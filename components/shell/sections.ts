/* Secciones de la app: una ruta cada una. Las seis primeras van en la barra lateral (y abajo en el celu) con su
   atajo 1–6; Ajustes va en el menú de la cuenta. */
import { CalendarBlank, ChartLineUp, FlagCheckered, MapTrifold, Medal, Rows, SlidersHorizontal, type Icon } from '@phosphor-icons/react';

export type Section = 'semana' | 'registro' | 'analisis' | 'carreras' | 'mapa' | 'logros' | 'ajustes';

export interface SectionDef {
  id: Section;
  href: string;
  label: string;
  Icon: Icon;
  /** ocupa todo el ancho y el alto, sin los márgenes de la página (el Mapa) */
  full?: boolean;
}

export const SECTIONS: SectionDef[] = [
  { id: 'semana', href: '/semana', label: 'Semana', Icon: CalendarBlank },
  { id: 'registro', href: '/registro', label: 'Registro', Icon: Rows },
  { id: 'analisis', href: '/analisis', label: 'Análisis', Icon: ChartLineUp },
  { id: 'carreras', href: '/carreras', label: 'Carreras', Icon: FlagCheckered },
  { id: 'mapa', href: '/mapa', label: 'Mapa', Icon: MapTrifold, full: true },
  { id: 'logros', href: '/logros', label: 'Logros', Icon: Medal },
  { id: 'ajustes', href: '/ajustes', label: 'Ajustes', Icon: SlidersHorizontal },
];
/** las de la barra (sin Ajustes) */
export const NAV = SECTIONS.slice(0, 6);

/** la sección de una ruta; null en las páginas que no son de una sección (el detalle de una sesión) */
export function sectionOf(pathname: string): SectionDef | null {
  const seg = '/' + (pathname.split('/')[1] || '');
  return SECTIONS.find((s) => s.href === seg) || null;
}
