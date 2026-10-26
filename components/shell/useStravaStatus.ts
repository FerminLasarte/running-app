'use client';
/* Estado de la conexión con Strava, pedido una vez por pantalla. Sin cuenta (modo local) no se pide: queda null. */
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/store';
import { stravaStatus } from '@/lib/strava/client';

export type StravaStatus = Awaited<ReturnType<typeof stravaStatus>>;

export function useStravaStatus(): StravaStatus | null {
  const cloud = useApp((s) => s.mode === 'cloud');
  const [st, setSt] = useState<StravaStatus | null>(null);
  useEffect(() => {
    if (!cloud) return;
    let live = true;
    stravaStatus().then((v) => live && setSt(v));
    return () => {
      live = false;
    };
  }, [cloud]);
  return cloud ? st : null;
}
