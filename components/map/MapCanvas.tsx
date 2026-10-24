'use client';
/* El lienzo del mapa con sus gestos (mapInit, mapSize, mapHit, mapZoomAt, mapHint: líneas 4525–4804 del original).
   El encuadre vivo está en un ref: arrastrar o pellizcar no pasa por el estado. Al terminar cada gesto se guarda en
   `ui.map.view` para que sobreviva al cambio de pestaña; si alguien pone otro encuadre ahí (o null para reencuadrar),
   el lienzo lo adopta. */
import { useImperativeHandle, useLayoutEffect, useRef, useState, type Dispatch, type ReactNode, type Ref, type SetStateAction } from 'react';
import { baseMapReady, loadBaseMap, mapFit, mapRoutes, routePts, setMapUi, type MapUi, type MapVp, type Pt } from '@/lib/domain/geo';
import type { Route, Session } from '@/lib/domain/types';
import { clamp } from '@/lib/domain/util';
import { reduceMotion } from '@/lib/motion';
import { mapDraw, type MapRuntime } from './draw';

export interface MapApi {
  /** acerca (k > 1) o aleja alrededor del centro */
  zoom(k: number): void;
  /** ancho y alto del lienzo en píxeles CSS */
  dims(): [number, number] | null;
}

interface Hint {
  t: string;
  on: boolean;
}
interface Rt extends MapRuntime {
  cv: HTMLCanvasElement | null;
  w: HTMLDivElement | null;
  M: MapUi;
  locked: boolean;
  /** animación en curso (se corta cambiando el token) */
  tok: object | null;
  /** último encuadre del estado que ya adopté o guardé */
  seen: MapVp | null;
  /** el encuadre vivo cambió y todavía no se guardó */
  dirty: boolean;
  wheelT?: ReturnType<typeof setTimeout>;
  ht?: ReturnType<typeof setTimeout>;
  setHint: Dispatch<SetStateAction<Hint>> | null;
}

function mapSafeTop(rt: Rt) {
  return rt.w ? parseFloat(getComputedStyle(rt.w).getPropertyValue('--sat')) || 0 : 0;
}
function draw(rt: Rt) {
  if (rt.cv) mapDraw(rt.cv, rt, rt.M, rt.M.fs ? mapSafeTop(rt) : 0);
}
function mapSize(rt: Rt) {
  const cv = rt.cv;
  if (!cv || !cv.parentElement) return false;
  const r = cv.parentElement.getBoundingClientRect(),
    d = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width * d)),
    h = Math.max(1, Math.round(r.height * d));
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  }
  rt.dpr = d;
  return true;
}
function commit(rt: Rt) {
  if (!rt.view || !rt.dirty) return;
  rt.dirty = false;
  const v = { ...rt.view };
  rt.seen = v;
  setMapUi({ view: v });
}
function mapZoomAt(rt: Rt, cx: number, cy: number, k: number) {
  const cv = rt.cv,
    V = rt.view;
  if (!cv || !V) return;
  const W = cv.clientWidth,
    H = cv.clientHeight,
    wx = (cx - W / 2) / V.s + V.x,
    wy = (cy - H / 2) / V.s + V.y;
  V.s = clamp(V.s * k, 800, 4e7);
  V.x = wx - (cx - W / 2) / V.s;
  V.y = wy - (cy - H / 2) / V.s;
  rt.dirty = true;
  draw(rt);
}
/** dibuja los recorridos de a uno, como si se fueran trazando (o directo, sin animación) */
function play(rt: Rt, on: boolean) {
  const L = mapRoutes(rt.M.period);
  rt.t = on && !reduceMotion() && L.length ? 0 : 1;
  const tok = {};
  rt.tok = tok;
  if (rt.t < 1) {
    const t0 = performance.now();
    const step = (now: number) => {
      if (rt.tok !== tok || !rt.cv) return;
      rt.t = clamp((now - t0 - 250) / 1900, 0, 1);
      draw(rt);
      if (rt.t < 1) requestAnimationFrame(step);
    };
    step(t0);
  } else draw(rt);
}
const stopPlay = (rt: Rt) => {
  if (rt.t < 1) {
    rt.t = 1;
    rt.tok = null;
  }
};
function mapToScreen(rt: Rt, p: Pt): Pt {
  const cv = rt.cv!,
    V = rt.view!,
    W = cv.clientWidth,
    H = cv.clientHeight;
  return [(p[0] - V.x) * V.s + W / 2, (p[1] - V.y) * V.s + H / 2];
}
function mapHit(rt: Rt, px: number, py: number): Route | null {
  if (!rt.cv || !rt.view) return null;
  let best: Route | null = null,
    bd = 14;
  mapRoutes(rt.M.period).forEach((r) => {
    const P = routePts(r);
    let prev: Pt | null = null;
    for (let i = 0; i < P.length; i++) {
      const q = mapToScreen(rt, P[i]);
      if (prev) {
        const dx = q[0] - prev[0],
          dy = q[1] - prev[1],
          l2 = dx * dx + dy * dy;
        let u = l2 ? ((px - prev[0]) * dx + (py - prev[1]) * dy) / l2 : 0;
        u = clamp(u, 0, 1);
        const dd = Math.hypot(px - (prev[0] + u * dx), py - (prev[1] + u * dy));
        if (dd < bd) {
          bd = dd;
          best = r;
        }
      }
      prev = q;
    }
  });
  return best;
}
function mapHint(rt: Rt, t: string) {
  const set = rt.setHint;
  if (!set) return;
  set({ t, on: true });
  clearTimeout(rt.ht);
  rt.ht = setTimeout(() => set((h) => ({ ...h, on: false })), 1400);
}

export default function MapCanvas({
  M,
  locked,
  baseReady,
  routes,
  sessions,
  children,
  ref,
}: {
  M: MapUi;
  /** en el celular, fuera de pantalla completa, el dedo hace scroll de la página */
  locked: boolean;
  baseReady: boolean;
  routes: Route[];
  sessions: Session[];
  children?: ReactNode;
  ref?: Ref<MapApi>;
}) {
  const wRef = useRef<HTMLDivElement>(null),
    cRef = useRef<HTMLCanvasElement>(null);
  const R = useRef<Rt>({ view: null, t: 1, dpr: 1, bc: null, cv: null, w: null, M, locked, tok: null, seen: null, dirty: false, setHint: null });
  const [hint, setHint] = useState<Hint>({ t: '', on: false });

  /* lo último que dibujó React: los gestos y la animación lo leen de acá */
  useLayoutEffect(() => {
    R.current.M = M;
    R.current.locked = locked;
  });

  /* encuadre: adopto el del estado o, si no hay, encuadro tus recorridos */
  useLayoutEffect(() => {
    const rt = R.current,
      cv = cRef.current;
    if (!cv || (M.view && M.view === rt.seen)) return;
    if (M.view) {
      rt.view = { ...M.view };
      rt.seen = M.view;
    } else {
      rt.view = mapFit(mapRoutes(M.period), cv.clientWidth, cv.clientHeight);
      rt.dirty = true;
      commit(rt);
    }
  }, [M.view, M.period]);

  /* al montar: tamaño, animación de entrada, gestos y observadores */
  useLayoutEffect(() => {
    const rt = R.current,
      cv = cRef.current,
      w = wRef.current;
    if (!cv || !w) return;
    rt.cv = cv;
    rt.w = w;
    rt.setHint = setHint;
    mapSize(rt);
    play(rt, true);

    const ptrs = new Map<number, Pt>();
    let down: { p: Pt; t: number; moved: number; hinted?: boolean } | null = null,
      pinch = 0;
    const pos = (e: MouseEvent): Pt => {
      const r = cv.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const onDown = (e: PointerEvent) => {
      if (!rt.locked || e.pointerType === 'mouse') cv.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, pos(e));
      down = { p: pos(e), t: performance.now(), moved: 0 };
      pinch = 0;
    };
    const onMove = (e: PointerEvent) => {
      const old = ptrs.get(e.pointerId);
      if (!old) {
        if (e.pointerType === 'mouse') {
          const p = pos(e);
          cv.style.cursor = mapHit(rt, p[0], p[1]) ? 'pointer' : 'grab';
        }
        return;
      }
      const p = pos(e);
      ptrs.set(e.pointerId, p);
      if (down) down.moved += Math.abs(p[0] - old[0]) + Math.abs(p[1] - old[1]);
      /* en el celular, dentro de la página el mapa no se arrastra: el dedo hace scroll. Para moverlo, pantalla completa */
      if (rt.locked && e.pointerType !== 'mouse') {
        if (down && down.moved > 24 && !down.hinted) {
          down.hinted = true;
          mapHint(rt, 'Tocá ⤢ para mover el mapa');
        }
        return;
      }
      stopPlay(rt);
      if (ptrs.size === 1) {
        const V = rt.view;
        if (!V) return;
        V.x -= (p[0] - old[0]) / V.s;
        V.y -= (p[1] - old[1]) / V.s;
        rt.dirty = true;
        draw(rt);
      } else if (ptrs.size === 2) {
        const q = [...ptrs.values()],
          dist = Math.hypot(q[0][0] - q[1][0], q[0][1] - q[1][1]);
        if (pinch > 0 && dist > 0) mapZoomAt(rt, (q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2, dist / pinch);
        pinch = dist;
        if (down) down.moved = 99;
      }
    };
    const onUp = (e: PointerEvent) => {
      const was = ptrs.has(e.pointerId);
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = 0;
      if (was && down && down.moved < 8 && performance.now() - down.t < 600 && ptrs.size === 0) {
        const p = pos(e),
          r = mapHit(rt, p[0], p[1]);
        rt.t = 1;
        rt.tok = null;
        draw(rt);
        setMapUi({ sel: r ? r.id : null });
      }
      if (ptrs.size === 0) {
        commit(rt);
        down = null;
      }
    };
    const onCancel = (e: PointerEvent) => {
      ptrs.delete(e.pointerId);
      pinch = 0;
      down = null;
      commit(rt);
    };
    /* la rueda hace scroll de la página; con Ctrl/⌘ (o pellizcando el trackpad) hace zoom. En pantalla completa, siempre zoom */
    const onWheel = (e: WheelEvent) => {
      if (!rt.M.fs && !e.ctrlKey && !e.metaKey) {
        mapHint(rt, (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl') + ' + rueda para acercar');
        return;
      }
      e.preventDefault();
      const p = pos(e);
      stopPlay(rt);
      mapZoomAt(rt, p[0], p[1], Math.exp(-e.deltaY * (e.ctrlKey && Math.abs(e.deltaY) < 40 ? 0.01 : 0.0016)));
      clearTimeout(rt.wheelT);
      rt.wheelT = setTimeout(() => commit(rt), 250);
    };
    const onDbl = (e: MouseEvent) => {
      const p = pos(e);
      mapZoomAt(rt, p[0], p[1], 2);
      commit(rt);
    };
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onCancel);
    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.addEventListener('dblclick', onDbl);
    const ro = new ResizeObserver(() => {
      mapSize(rt);
      draw(rt);
    });
    ro.observe(w);
    /* al cambiar el tema claro/oscuro, los colores del lienzo salen de las variables CSS: redibujo */
    const mo = new MutationObserver(() => draw(rt));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      cv.removeEventListener('pointerdown', onDown);
      cv.removeEventListener('pointermove', onMove);
      cv.removeEventListener('pointerup', onUp);
      cv.removeEventListener('pointercancel', onCancel);
      cv.removeEventListener('wheel', onWheel);
      cv.removeEventListener('dblclick', onDbl);
      ro.disconnect();
      mo.disconnect();
      clearTimeout(rt.wheelT);
      clearTimeout(rt.ht);
      rt.tok = null;
      commit(rt);
      rt.cv = null;
      rt.setHint = null;
    };
  }, []);

  /* el mapa de fondo se baja recién acá, y solo si está prendido */
  useLayoutEffect(() => {
    if (M.base && !baseMapReady())
      void loadBaseMap().then((ok) => {
        if (!ok) setMapUi({ baseErr: true });
      });
  }, [M.base]);

  /* al cambiar el período, los recorridos se vuelven a trazar */
  useLayoutEffect(() => {
    if (!M.replay) return;
    play(R.current, true);
    setMapUi({ replay: false });
  }, [M.replay]);

  useLayoutEffect(() => {
    draw(R.current);
  }, [M.base, M.zones, M.color, M.sel, M.hb, M.fs, M.period, M.view, baseReady, routes, sessions]);

  useImperativeHandle(
    ref,
    () => ({
      zoom: (k: number) => {
        const rt = R.current,
          cv = rt.cv;
        if (!cv) return;
        mapZoomAt(rt, cv.clientWidth / 2, cv.clientHeight / 2, k);
        commit(rt);
      },
      dims: () => {
        const cv = R.current.cv;
        return cv ? [cv.clientWidth, cv.clientHeight] : null;
      },
    }),
    [],
  );

  return (
    <div className={'mapwrap' + (M.fs ? ' fs' : '')} id="mapw" ref={wRef}>
      <canvas id="mapc" ref={cRef} role="img" aria-label="Mapa de tus recorridos de running" style={{ touchAction: locked ? 'pan-y' : 'none' }} />
      {children}
      <div id="maphint" className={'mp-hint glass' + (hint.on ? ' on' : '')} aria-hidden="true">
        {hint.t}
      </div>
    </div>
  );
}
