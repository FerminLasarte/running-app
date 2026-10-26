/* Carreras corridas: cada una con la estética de su evento (líneas 3190–3204 del original).
   Basado en las medallas reales de cada carrera (sin logos de marcas):
   · Circuito de las Estaciones 2026, etapa Otoño: aro rojo, hoja de arce sobre un libro abierto y placa «OTOÑO».
   · adidas Supernova 10K: plateada, «Vial Costero · 12.04.26 · Vicente López» alrededor, cinta celeste.
   · adizero 15K: gris oscuro, «15K ADIZERO» alrededor, barras de velocidad y cinta a cuadros de bandera de llegada.
   · Medio Maratón Buenos Aires 2026: plateada, triángulo con el Obelisco, rayos violetas, skyline y franjas celestes; cinta violeta. */
import type { Race } from './types';

export type RaceThemeKey = 'est' | 'nova' | 'adz' | 'mba' | 'gen';
export interface RaceTheme {
  k: RaceThemeKey;
  re?: RegExp;
  /** nombre corto del evento */
  n: string;
  r1: string;
  r2: string;
  ra: string;
}
export const RACE_TH: RaceTheme[] = [
  { k: 'est', re: /estaciones/i, n: 'Etapa otoño', r1: '#F2401C', r2: '#B9C0C8', ra: '#FF5A36' },
  { k: 'nova', re: /supernova/i, n: 'Vial Costero', r1: '#2E9BE0', r2: '#B9C0C8', ra: '#5BB8F0' },
  { k: 'adz', re: /adizero/i, n: 'Palermo', r1: '#3A3F45', r2: '#E9ECEF', ra: '#E9ECEF' },
  { k: 'mba', re: /medi[oa] marat[oó]n.*buenos aires|21k.*buenos aires/i, n: 'Obelisco', r1: '#6A35C9', r2: '#74ACDF', ra: '#A98BFF' },
];
const GEN: RaceTheme = { k: 'gen', n: '', r1: 'var(--acc)', r2: 'var(--t-tempo)', ra: 'var(--acc)' };
export const raceTheme = (r: Pick<Race, 'name'>): RaceTheme => RACE_TH.find((t) => t.re!.test(r.name || '')) || GEN;

/* de estas tres hay foto de la medalla real: la cinta queda dibujada y la medalla es la foto recortada */
export const RACE_PHOTO: Partial<Record<RaceThemeKey, string>> = { mba: '/medals/mba.png', adz: '/medals/adz.png', nova: '/medals/nova.png' };
