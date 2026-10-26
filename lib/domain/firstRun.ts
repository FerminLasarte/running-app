/* Primera vez: cuándo se muestra la bienvenida y qué pasos ya están hechos (cuenta, Strava, próxima carrera y FC
   máxima). El estado de Strava se pide al servidor: lo pasa quien llama. */
import { S } from '@/lib/store';
import { upcomingRaces } from './config';
import { defaultCfg } from './defaults';

/** sin ninguna sesión (ni planificada) y fuera del modo ejemplo */
export const isFirstRun = () => !S.sessions.length && !S.demo;

export type FirstStepKey = 'account' | 'strava' | 'race' | 'hr';
export interface FirstStep {
  k: FirstStepKey;
  done: boolean;
}

/**
 * los cuatro pasos, en orden. La FC máxima cuenta como hecha si la cambiaste (no hay forma de saber si la de fábrica
 * es la tuya) o si cargaste las zonas a mano.
 */
export function firstSteps(strava: boolean): FirstStep[] {
  const c = S.cfg;
  return [
    { k: 'account', done: S.mode === 'cloud' },
    { k: 'strava', done: strava },
    { k: 'race', done: upcomingRaces().length > 0 },
    { k: 'hr', done: c.hrMax !== defaultCfg().hrMax || !!c.zones },
  ];
}
