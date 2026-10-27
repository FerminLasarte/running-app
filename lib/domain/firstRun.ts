/* Primera vez: cuándo se muestra la bienvenida y qué pasos ya están hechos (cuenta, Strava, próxima carrera y FC
   máxima). El estado de Strava se pide al servidor: lo pasa quien llama. */
import { S } from '@/lib/store';
import { upcomingRaces } from './config';

/** sin ninguna sesión (ni planificada) y fuera del modo ejemplo */
export const isFirstRun = () => !S.sessions.length && !S.demo;

export type FirstStepKey = 'account' | 'strava' | 'race' | 'hr';
export interface FirstStep {
  k: FirstStepKey;
  done: boolean;
}

/** la FC máxima todavía es la provisoria y las zonas salen de ella (con las zonas cargadas a mano no importa) */
export const hrPending = () => !S.cfg.hrSet && !S.cfg.zones;

/** los cuatro pasos, en orden. La FC máxima cuenta como hecha si la cargaste o si cargaste las zonas a mano. */
export function firstSteps(strava: boolean): FirstStep[] {
  return [
    { k: 'account', done: S.mode === 'cloud' },
    { k: 'strava', done: strava },
    { k: 'race', done: upcomingRaces().length > 0 },
    { k: 'hr', done: !hrPending() },
  ];
}
