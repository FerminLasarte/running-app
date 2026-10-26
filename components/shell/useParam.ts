'use client';
/* Un parámetro de la URL que toma uno de `values` (si no, `def`) y cómo cambiarlo sin tocar los demás. Se lee con
   useSearchParams y se escribe con history.replaceState (Next lo sincroniza); el valor por defecto no se escribe.
   Lo usan el período de Análisis, la base de tus ritmos y el escenario de Carreras. */
import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

export function useParam<V extends string>(key: string, values: readonly V[], def: V): [V, (v: V) => void] {
  const sp = useSearchParams();
  const raw = sp.get(key) as V | null;
  const v = raw && values.includes(raw) ? raw : def;
  const set = useCallback(
    (x: V) => {
      /* parto de la URL de ahora y no de la de este dibujo, que puede venir atrasada */
      const q = new URLSearchParams(window.location.search);
      if (x === def) q.delete(key);
      else q.set(key, x);
      const qs = q.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
    },
    [key, def],
  );
  return [v, set];
}
