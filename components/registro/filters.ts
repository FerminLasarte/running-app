'use client';
/* Los filtros del Registro viven en la URL (`/registro?tipo=fondo&q=lluvia`): se comparten y sobreviven a recargar.
   Se leen con useSearchParams y se escriben con history.replaceState, que Next sincroniza sin recargar ni sumar pasos al
   historial (guía single-page-applications). Los valores por defecto no se escriben. */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { SessionType } from '@/lib/domain/types';
import { isType } from '@/lib/domain/config';
import { LG_PERIODS, LG_SORTS, type LgPeriod, type LgSortKey, type LgStatus } from '@/lib/domain/log';

export interface RegFilters {
  tipo: SessionType | 'all';
  q: string;
  estado: LgStatus | 'all';
  per: LgPeriod;
  sort: LgSortKey;
  dir: 1 | -1;
}

/* los valores de la URL, en castellano */
const ESTADO: Record<string, LgStatus> = { hechas: 'done', planificadas: 'plan', 'no-hechas': 'miss' };
const ORDEN: Record<string, LgSortKey> = { fecha: 'date', km: 'km', tiempo: 'time', ritmo: 'pace', fc: 'hr', sensacion: 'feel', puntaje: 'score' };
const keyOf = <V>(m: Record<string, V>, v: V) => Object.keys(m).find((k) => m[k] === v)!;

export const REG_INIT: RegFilters = { tipo: 'all', q: '', estado: 'all', per: 'todo', sort: 'date', dir: LG_SORTS.date[2] };

export function readFilters(sp: URLSearchParams): RegFilters {
  const t = sp.get('tipo'),
    e = sp.get('estado'),
    p = sp.get('periodo'),
    d = sp.get('sentido'),
    sort = ORDEN[sp.get('orden') || ''] || REG_INIT.sort;
  return {
    tipo: isType(t) ? t : REG_INIT.tipo,
    q: sp.get('q') || '',
    estado: ESTADO[e || ''] || REG_INIT.estado,
    per: LG_PERIODS.find((x) => x[0] === p)?.[0] || REG_INIT.per,
    sort,
    dir: d === 'asc' ? 1 : d === 'desc' ? -1 : LG_SORTS[sort][2],
  };
}

function writeFilters(f: RegFilters) {
  const sp = new URLSearchParams();
  if (f.tipo !== 'all') sp.set('tipo', f.tipo);
  if (f.q.trim()) sp.set('q', f.q);
  if (f.estado !== 'all') sp.set('estado', keyOf(ESTADO, f.estado));
  if (f.per !== REG_INIT.per) sp.set('periodo', f.per);
  if (f.sort !== REG_INIT.sort) sp.set('orden', keyOf(ORDEN, f.sort));
  if (f.dir !== LG_SORTS[f.sort][2]) sp.set('sentido', f.dir === 1 ? 'asc' : 'desc');
  return sp.toString();
}

/** link al Registro con esos filtros (para la paleta) */
export const registroHref = (f: Partial<RegFilters>) => {
  const qs = writeFilters({ ...REG_INIT, ...f });
  return '/registro' + (qs ? '?' + qs : '');
};

/** los filtros de la URL y cómo cambiarlos (los cambios se mezclan con lo que ya hay) */
export function useRegFilters(): [RegFilters, (patch: Partial<RegFilters>) => void] {
  const sp = useSearchParams();
  const f = useMemo(() => readFilters(sp), [sp]);
  const set = useCallback((patch: Partial<RegFilters>) => {
    /* parto de la URL de ahora y no de `f`: al tipear rápido, la de este dibujo puede venir atrasada */
    const qs = writeFilters({ ...readFilters(new URLSearchParams(window.location.search)), ...patch });
    window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
  }, []);
  return [f, set];
}
