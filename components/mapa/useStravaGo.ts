'use client';
/* El botón de Strava del Mapa: con la cuenta sin conectar lleva a conectarla (y al volver trae los recorridos solo,
   ver stravaReturn); conectada, trae los recorridos nuevos. */
import { stravaConnect } from '@/lib/strava/client';
import { stravaSync } from '@/lib/strava/sync';
import { useStravaStatus } from '@/components/shell/useStravaStatus';

export function useStravaGo() {
  const st = useStravaStatus();
  const connect = !!st && !st.connected && st.configured !== false;
  return { connect, go: connect ? () => stravaConnect('/mapa') : () => void stravaSync() };
}
