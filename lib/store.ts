/* Estado global de la app (Zustand).
   - Los componentes se suscriben con `useApp(selector)` o `useS()` (todo el estado, como el `render()` del artifact
     original, salvo lo que cambia a cada rato y no dibuja nada en las vistas: ver VOLATILE).
   - El código de dominio (lib/domain/*) lee el estado actual a través de `S`, un proxy de solo lectura:
     `S.cfg`, `S.sessions`, `S.routes`… Para escribir, usá `setS` / `setUi` o las acciones de lib/data/actions. */
import { useRef, useSyncExternalStore } from 'react';
import { create } from 'zustand';
import type { Cfg, Route, Session } from './domain/types';
import { defaultCfg } from './domain/defaults';

export interface SheetDesc {
  /** clave del registro de hojas (components/sheets/registry.tsx) */
  kind: string;
  props: Record<string, unknown>;
  /** cambia con cada apertura: remonta el formulario */
  key: number;
}

export interface ToastDesc {
  msg: string;
  ms: number;
  key: number;
  /** botón opcional (por ejemplo «Deshacer») */
  action?: { label: string; run: () => void };
}

export interface AppState {
  /* datos */
  cfg: Cfg;
  sessions: Session[];
  routes: Route[];
  uid: string | null;
  email: string | null;
  /* guardado */
  mode: 'boot' | 'cloud' | 'local';
  loaded: boolean;
  saving: number;
  /** claves con escrituras fallidas pendientes de reintento: id de sesión, 'cfg', 'routes' o 'del_<id>' */
  failed: Record<string, true>;
  cloudLost: boolean;
  /* modo ejemplo: los datos reales quedan a un costado y nada se guarda */
  demo: boolean;
  realSessions: Session[] | null;
  realCfg: Cfg | null;
  /* preferencias de vista (la página en la que estás la dice la URL) */
  weekOff: number;
  topType: string;
  topSort: string;
  topDir: 'a' | 'b';
  topPicked: boolean;
  paceType: string | null;
  sumSub: string;
  /** estado de cada vista que tiene que sobrevivir al cambio de pestaña (filtros del registro, mapa, Strava…) */
  ui: Record<string, unknown>;
  /* capas */
  sheet: SheetDesc | null;
  toast: ToastDesc | null;
}

const lsGet = (k: string) => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(k);
  } catch {
    return null;
  }
};

export const useApp = create<AppState>()(() => ({
  cfg: defaultCfg(),
  sessions: [],
  routes: [],
  uid: null,
  email: null,
  mode: 'boot',
  loaded: false,
  saving: 0,
  failed: {},
  cloudLost: false,
  demo: false,
  realSessions: null,
  realCfg: null,
  weekOff: 0,
  topType: 'all',
  topSort: 'score',
  topDir: 'a',
  topPicked: false,
  paceType: null,
  sumSub: lsGet('rr_sumsub') || 'vol',
  ui: {},
  sheet: null,
  toast: null,
}));

/* lo que cambia seguido y solo lo dibujan el shell, la hoja, el aviso o el estado de guardado (que se suscriben con
   un selector propio): que no redibuje las vistas. El estado que devuelve useS() puede tener estos campos viejos. */
const VOLATILE = new Set<keyof AppState>(['saving', 'toast', 'sheet', 'failed', 'cloudLost']);
const VOLATILE_UI = new Set(['sheetClosing', 'sheetConfirm', 'celebrate', 'palette']);
function sameForViews(a: AppState, b: AppState) {
  if (a === b) return true;
  for (const k in b) {
    const key = k as keyof AppState;
    if (VOLATILE.has(key) || a[key] === b[key]) continue;
    if (key !== 'ui') return false;
    for (const u of new Set([...Object.keys(a.ui), ...Object.keys(b.ui)])) if (!VOLATILE_UI.has(u) && a.ui[u] !== b.ui[u]) return false;
  }
  return true;
}
/** Todo el estado, suscripto: el componente se vuelve a dibujar ante cualquier cambio que pueda verse en una vista. */
export function useS(): AppState {
  const last = useRef<AppState | null>(null);
  const snap = () => {
    const n = useApp.getState();
    if (!last.current || !sameForViews(last.current, n)) last.current = n;
    return last.current;
  };
  return useSyncExternalStore(useApp.subscribe, snap, snap);
}

/** Lectura del estado actual para el código de dominio y los manejadores de eventos (no suscribe). */
export const S: Readonly<AppState> = new Proxy({} as AppState, {
  get: (_t, k) => (useApp.getState() as unknown as Record<string | symbol, unknown>)[k],
});

export const setS = (p: Partial<AppState>) => useApp.setState(p);

/** Estado de una vista: `getUi('lg', init)` / `setUi('lg', {...})` (mezcla superficial si es un objeto). */
export function getUi<T>(key: string, init: T): T {
  const v = useApp.getState().ui[key];
  return (v === undefined ? init : v) as T;
}
export function setUi<T>(key: string, value: T | ((prev: T | undefined) => T)) {
  useApp.setState((st) => {
    const prev = st.ui[key] as T | undefined;
    const next = typeof value === 'function' ? (value as (p: T | undefined) => T)(prev) : value;
    return { ui: { ...st.ui, [key]: next } };
  });
}
/** Hook: estado de vista suscripto, con su setter. Los cambios parciales se mezclan con el valor anterior. */
export function useUi<T extends object>(key: string, init: T): [T, (patch: Partial<T>) => void] {
  const v = useApp((st) => st.ui[key]) as T | undefined;
  const cur = v === undefined ? init : v;
  return [cur, (patch: Partial<T>) => setUi<T>(key, (p) => ({ ...(p === undefined ? init : p), ...patch }))];
}
