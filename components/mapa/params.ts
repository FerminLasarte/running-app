'use client';
/* Lo que se ve en el Mapa va en la URL: el período (`?periodo=3m`), el barrio resaltado (`?barrio=Palermo`), la salida
   elegida (`?salida=<id>`) y las capas (`?color=tipo`, `?zonas=no`, `?calles=no`). Las capas además se recuerdan en el
   navegador: al volver al Mapa desde la barra lateral (sin parámetros) quedan como las dejaste. */
import { useSearchParams } from 'next/navigation';
import { useParam } from '@/components/shell/useParam';
import { MAP_PERIODS, baRings, type MapPeriod } from '@/lib/domain/geo';
import type { Route } from '@/lib/domain/types';
import type { MapOpts } from './draw';

const PERIOD_IDS = MAP_PERIODS.map((p) => p[0]);
const COLORS = ['uno', 'tipo'] as const;
const ONOFF = ['si', 'no'] as const;

/* capas recordadas: { color, zonas, calles }. Antes se recordaba solo el color, en `rr_map_color` ('type') */
const LS = 'rr_map_capas';
type Saved = Partial<Record<'color' | 'zonas' | 'calles', string>>;
function saved(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(LS) || 'null') as Saved | null;
    if (v) return v;
    return localStorage.getItem('rr_map_color') === 'type' ? { color: 'tipo' } : {};
  } catch {
    return {};
  }
}
function save(k: keyof Saved, v: string) {
  try {
    localStorage.setItem(LS, JSON.stringify({ ...saved(), [k]: v }));
  } catch {
    /* sin localStorage: queda solo en la URL */
  }
}

/** una capa: la de la URL; si no está, la recordada; si no, `def` */
function useLayer<V extends string>(key: keyof Saved, values: readonly V[], def: V): [V, (v: V) => void] {
  const sp = useSearchParams();
  const [v, setUrl] = useParam(key, values, def);
  const raw = sp.get(key),
    mem = saved()[key] as V | undefined;
  const cur = raw && values.includes(raw as V) ? v : mem && values.includes(mem) ? mem : def;
  return [
    cur,
    (x: V) => {
      save(key, x);
      setUrl(x);
    },
  ];
}

export function useMapParams(routes: Route[]) {
  const [period, setPeriod] = useParam<MapPeriod>('periodo', PERIOD_IDS, 'todo');
  const [color, setColor] = useLayer('color', COLORS, 'uno');
  const [zonas, setZonas] = useLayer('zonas', ONOFF, 'si');
  const [calles, setCalles] = useLayer('calles', ONOFF, 'si');
  /* el barrio vale cuando ya bajó el mapa de la Ciudad; la salida, si es uno de tus recorridos */
  const [hb, setHb] = useParam<string>(
    'barrio',
    baRings().map((b) => b.n),
    '',
  );
  const [sel, setSel] = useParam<string>(
    'salida',
    routes.map((r) => r.id),
    '',
  );
  const o: MapOpts = { period, zones: zonas === 'si', base: calles === 'si', color: color === 'tipo' ? 'type' : 'one', sel: sel || null, hb: hb || null };
  return {
    o,
    setPeriod,
    setColor: (c: MapOpts['color']) => setColor(c === 'type' ? 'tipo' : 'uno'),
    setZones: (on: boolean) => setZonas(on ? 'si' : 'no'),
    setBase: (on: boolean) => setCalles(on ? 'si' : 'no'),
    setHb: (n: string | null) => setHb(n || ''),
    setSel: (id: string | null) => setSel(id || ''),
  };
}

/** link al Mapa con un barrio resaltado (la paleta lo usa) */
export const mapaHref = (barrio?: string) => '/mapa' + (barrio ? '?barrio=' + encodeURIComponent(barrio) : '');
