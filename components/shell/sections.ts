/* Secciones de la app: una ruta cada una. Las seis primeras van en la barra lateral (y abajo en el celu) con su
   atajo 1–6; Ajustes va en el menú de la cuenta. */
import { CalendarBlank, ChartLineUp, FlagCheckered, MapTrifold, Medal, Rows, SlidersHorizontal, type Icon } from '@phosphor-icons/react';
import { navigate } from '@/lib/nav';

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

/* Registro y Análisis guardan sus filtros, su pestaña y su período en la URL. Mientras la app está abierta se recuerda
   la última de cada una (como los filtros en memoria del original) y la barra, los atajos 1–6 y ⌘K vuelven ahí */
const last: Partial<Record<Section, string>> = {};
const REMEMBER: readonly Section[] = ['registro', 'analisis'];
/** anota la URL de ahora (la llama la barra cada vez que cambia) */
export function rememberUrl(pathname: string, search: string) {
  const s = sectionOf(pathname);
  if (s && REMEMBER.includes(s.id)) last[s.id] = pathname + (search ? '?' + search : '');
}
/** a dónde lleva una sección: la última URL que tuvo, o su ruta */
export const sectionHref = (s: SectionDef) => last[s.id] || s.href;
/** los parámetros de la última URL de una sección («periodo=52s»), sin el «?» */
export const lastQuery = (id: Section) => (last[id] || '').split('?')[1] || '';
/** a una sección desde los atajos o ⌘K; si ya estás en ella, nada (no se pierde lo que tenías). Desde una página de
    adentro (la vitrina) vuelve a la sección */
export function goSection(s: SectionDef) {
  if (window.location.pathname !== s.href) navigate(sectionHref(s));
}
