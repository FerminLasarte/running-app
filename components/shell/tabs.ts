/* Pestañas e íconos (Phosphor): contorno si no está elegida, relleno si lo está. */
import { CalendarBlank, ChartBar, MapTrifold, Notebook, SlidersHorizontal, Timer, Trophy, type Icon } from '@phosphor-icons/react';
import type { Tab } from '@/lib/store';

export const TABS: { v: Tab; label: string; Icon: Icon }[] = [
  { v: 'week', label: 'Semana', Icon: CalendarBlank },
  { v: 'sum', label: 'Resumen', Icon: ChartBar },
  { v: 'log', label: 'Registro', Icon: Notebook },
  { v: 'lv', label: 'Carrera', Icon: Timer },
  { v: 'map', label: 'Mapa', Icon: MapTrifold },
  { v: 'top', label: 'Logros', Icon: Trophy },
  { v: 'set', label: 'Ajustes', Icon: SlidersHorizontal },
];

export const TITLES: Record<Tab, string> = { week: 'Semana', sum: 'Resumen', log: 'Registro', lv: 'Carrera', map: 'Mapa', top: 'Logros', set: 'Ajustes' };
