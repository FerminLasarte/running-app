'use client';
/* Estado de la conexión con Strava, uno solo para toda la app: la barra de arriba, Ajustes, el panel de carga, el Mapa…
   leen el mismo, así desconectar se ve en todos lados a la vez. Cada pieza que lo usa lo vuelve a pedir al aparecer
   (como antes, que lo pedía cada pantalla) y mientras tanto muestra el último. Sin cuenta (modo local) no se pide:
   queda null. */
import { useEffect, useSyncExternalStore } from 'react';
import { useApp } from '@/lib/store';
import { stravaStatus } from '@/lib/strava/client';

export type StravaStatus = Awaited<ReturnType<typeof stravaStatus>>;

let cur: StravaStatus | null = null,
  asking = false,
  /* sube con cada cambio a mano: una respuesta pedida antes no lo pisa */
  gen = 0;
const subs = new Set<() => void>();

function put(v: StravaStatus) {
  cur = v;
  subs.forEach((f) => f());
}
function sub(f: () => void) {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
}
function refresh() {
  if (asking) return;
  asking = true;
  const g = gen;
  stravaStatus()
    .then((v) => {
      if (g === gen) put(v);
    })
    .catch(() => {})
    .finally(() => {
      asking = false;
    });
}

/** cambia el estado para todos sin volver a preguntar (al desconectar) */
export function setStravaStatus(v: StravaStatus) {
  gen++;
  put(v);
}

export function useStravaStatus(): StravaStatus | null {
  const cloud = useApp((s) => s.mode === 'cloud');
  const st = useSyncExternalStore(
    sub,
    () => cur,
    () => null,
  );
  useEffect(() => {
    if (cloud) refresh();
  }, [cloud]);
  return cloud ? st : null;
}
