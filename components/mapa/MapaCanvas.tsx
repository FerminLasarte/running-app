'use client';
/* El lienzo del mapa con sus gestos: arrastrar, pellizcar, la rueda, doble clic, las flechas y + / − con el foco en el
   mapa, y tocar un recorrido para elegirlo. El encuadre vivo está en un ref: arrastrar o pellizcar no pasa por el
   estado. Al terminar cada gesto se guarda en `ui.map.view` para que sobreviva al cambio de pantalla; si alguien pone
   otro encuadre ahí (o null para reencuadrar), el lienzo lo adopta. */
import { useImperativeHandle, useLayoutEffect, useRef, useState, type Dispatch, type ReactNode, type Ref, type SetStateAction } from 'react';
import { baseMapReady, loadBaseMap, mapFit, mapRoutes, routeBox, routePts, setMapUi, type MapVp, type Pt } from '@/lib/domain/geo';
import type { Route, Session } from '@/lib/domain/types';
import { clamp } from '@/lib/domain/util';
import { reduceMotion } from '@/lib/motion';
import { mapDraw, newLayer, type MapOpts, type MapRuntime } from './draw';

export interface MapApi {
  /** acerca (k > 1) o aleja alrededor del centro */
  zoom(k: number): void;
  /** encuadra todos los recorridos del período */
  fit(): void;
  /** ancho y alto del lienzo en píxeles CSS */
  dims(): [number, number] | null;
  /** traza las salidas del período en orden; `onTick` recibe la que se está dibujando (null al terminar) */
  replay(onTick: (r: Route | null) => void): void;
  /** corta el trazado y deja todo dibujado */
  stop(): void;
  /** sube la página hasta el mapa (cuando va apilado arriba de la columna) */
  reveal(): void;
}

interface Hint {
  t: string;
  on: boolean;
}
interface Rt extends MapRuntime {
  cv: HTMLCanvasElement | null;
  w: HTMLDivElement | null;
  o: MapOpts;
  locked: boolean;
  wheel: boolean;
  fs: boolean;
  onPick: (id: string | null) => void;
  /** trazado en curso (se corta cambiando el token) */
  tok: object | null;
  onTick: ((r: Route | null) => void) | null;
  /** último encuadre del estado que ya adopté o guardé */
  seen: MapVp | null;
  /** el período del último encuadre: si cambia, se reencuadra aunque haya uno guardado */
  per: string | null;
  /** el encuadre vivo cambió y todavía no se guardó */
  dirty: boolean;
  wheelT?: ReturnType<typeof setTimeout>;
  ht?: ReturnType<typeof setTimeout>;
  setHint: Dispatch<SetStateAction<Hint>> | null;
  /** cuadro pedido para el gesto en curso (uno por cuadro aunque lleguen varios movimientos) */
  raf: number;
  /** último puntero sin apretar, para buscar el recorrido de abajo una vez por cuadro */
  hp: Pt | null;
  hraf: number;
}

/** en pantalla completa, lo que ocupa la isla de la cámara (en el celu) */
const safeTop = (rt: Rt) => (rt.fs && rt.w ? parseFloat(getComputedStyle(rt.w).getPropertyValue('--sat')) || 0 : 0);
function draw(rt: Rt, fast = false) {
  if (rt.raf) {
    cancelAnimationFrame(rt.raf);
    rt.raf = 0;
  }
  if (rt.cv) mapDraw(rt.cv, rt, rt.o, safeTop(rt), fast);
}
/** durante un gesto: a lo sumo un dibujo por cuadro, reusando la imagen del mapa de fondo */
function drawSoon(rt: Rt) {
  if (!rt.raf)
    rt.raf = requestAnimationFrame(() => {
      rt.raf = 0;
      draw(rt, true);
    });
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
function zoomAt(rt: Rt, cx: number, cy: number, k: number, gesture = false) {
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
  if (gesture) drawSoon(rt);
  else draw(rt);
}
function panBy(rt: Rt, dx: number, dy: number) {
  const V = rt.view;
  if (!V) return;
  V.x -= dx / V.s;
  V.y -= dy / V.s;
  rt.dirty = true;
}
/** traza los recorridos de a uno, en orden: rápido al entrar o al cambiar el período, más lento con «Repetir». Con
    «reducir movimiento», todo de una */
function play(rt: Rt, slow = false) {
  const L = mapRoutes(rt.o.period),
    N = L.length;
  rt.t = !reduceMotion() && N ? 0 : 1;
  const tok = {};
  rt.tok = tok;
  if (rt.t >= 1) {
    rt.onTick?.(null);
    rt.onTick = null;
    draw(rt);
    return;
  }
  const dur = slow ? clamp(N * 60, 3000, 15000) : 1900,
    t0 = performance.now();
  let last = -1;
  const step = (now: number) => {
    if (rt.tok !== tok || !rt.cv) return;
    rt.t = clamp((now - t0 - 250) / dur, 0, 1);
    const i = Math.min(N - 1, Math.floor(rt.t * N));
    if (rt.onTick && i !== last) {
      last = i;
      rt.onTick(rt.t < 1 ? L[i] : null);
    }
    /* el encuadre no cambia mientras se trazan los recorridos: el mapa de fondo se reusa tal cual */
    draw(rt, true);
    if (rt.t < 1) requestAnimationFrame(step);
    else {
      rt.onTick?.(null);
      rt.onTick = null;
      draw(rt);
    }
  };
  step(t0);
}
function stopPlay(rt: Rt) {
  if (rt.t >= 1) return;
  rt.t = 1;
  rt.tok = null;
  rt.onTick?.(null);
  rt.onTick = null;
}
/** el recorrido más cercano al punto (en píxeles del lienzo), a menos de 14 px. Se mide en coordenadas del mapa y se
    saltean los recorridos cuyo rectángulo queda lejos: así alcanza para buscar en cada cuadro con miles de salidas */
function hit(rt: Rt, px: number, py: number): Route | null {
  const cv = rt.cv,
    V = rt.view;
  if (!cv || !V) return null;
  const wx = (px - cv.clientWidth / 2) / V.s + V.x,
    wy = (py - cv.clientHeight / 2) / V.s + V.y;
  let best: Route | null = null,
    bd = 14 / V.s;
  for (const r of mapRoutes(rt.o.period)) {
    const b = routeBox(r);
    if (wx < b.x0 - bd || wx > b.x1 + bd || wy < b.y0 - bd || wy > b.y1 + bd) continue;
    const P = routePts(r);
    for (let i = 1; i < P.length; i++) {
      const ax = P[i - 1][0],
        ay = P[i - 1][1],
        dx = P[i][0] - ax,
        dy = P[i][1] - ay,
        l2 = dx * dx + dy * dy,
        u = clamp(l2 ? ((wx - ax) * dx + (wy - ay) * dy) / l2 : 0, 0, 1),
        dd = Math.hypot(wx - (ax + u * dx), wy - (ay + u * dy));
      if (dd < bd) {
        bd = dd;
        best = r;
      }
    }
  }
  return best;
}
function hint(rt: Rt, t: string) {
  const set = rt.setHint;
  if (!set) return;
  set({ t, on: true });
  clearTimeout(rt.ht);
  rt.ht = setTimeout(() => set((h) => ({ ...h, on: false })), 1400);
}

export default function MapaCanvas({
  o,
  view,
  fs,
  locked,
  wheel,
  baseReady,
  routes,
  sessions,
  onPick,
  label,
  children,
  ref,
}: {
  o: MapOpts;
  /** el encuadre guardado (null: encuadrar los recorridos) */
  view: MapVp | null;
  fs: boolean;
  /** en el celular, fuera de pantalla completa, el dedo hace scroll de la página */
  locked: boolean;
  /** la rueda acerca y aleja sin apretar ⌘ / Ctrl (cuando el mapa no comparte el scroll con la página) */
  wheel: boolean;
  baseReady: boolean;
  routes: Route[];
  sessions: Session[];
  onPick: (id: string | null) => void;
  label: string;
  children?: ReactNode;
  ref?: Ref<MapApi>;
}) {
  const wRef = useRef<HTMLDivElement>(null),
    cRef = useRef<HTMLCanvasElement>(null);
  const R = useRef<Rt>({ view: null, t: 1, dpr: 1, hov: null, base: newLayer(), over: newLayer(), cv: null, w: null, o, locked, wheel, fs, onPick, tok: null, onTick: null, seen: null, per: null, dirty: false, setHint: null, raf: 0, hp: null, hraf: 0 });
  const [hintS, setHint] = useState<Hint>({ t: '', on: false });

  /* lo último que dibujó React: los gestos y el trazado lo leen de acá */
  useLayoutEffect(() => {
    Object.assign(R.current, { o, locked, wheel, fs, onPick });
  });

  /* encuadre: adopto el del estado o, si no hay (o cambiaste el período), encuadro tus recorridos */
  useLayoutEffect(() => {
    const rt = R.current,
      cv = cRef.current,
      moved = rt.per !== null && rt.per !== o.period;
    rt.per = o.period;
    if (!cv || (view && view === rt.seen && !moved)) return;
    if (view && !moved) {
      rt.view = { ...view };
      rt.seen = view;
    } else {
      rt.view = mapFit(mapRoutes(o.period), cv.clientWidth, cv.clientHeight);
      rt.dirty = true;
      commit(rt);
    }
  }, [view, o.period]);

  /* al montar: tamaño, gestos y observadores */
  useLayoutEffect(() => {
    const rt = R.current,
      cv = cRef.current,
      w = wRef.current;
    if (!cv || !w) return;
    rt.cv = cv;
    rt.w = w;
    rt.setHint = setHint;
    mapSize(rt);

    const ptrs = new Map<number, Pt>();
    let down: { p: Pt; t: number; moved: number; hinted?: boolean } | null = null,
      pinch = 0;
    const pos = (e: MouseEvent): Pt => {
      const r = cv.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const setHov = (id: string | null) => {
      if (rt.hov === id) return;
      rt.hov = id;
      cv.style.cursor = id ? 'pointer' : '';
      drawSoon(rt);
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
        /* el puntero pasa por encima: el recorrido de abajo se enciende (una búsqueda por cuadro) */
        if (e.pointerType !== 'mouse') return;
        rt.hp = pos(e);
        if (!rt.hraf)
          rt.hraf = requestAnimationFrame(() => {
            rt.hraf = 0;
            const p = rt.hp;
            if (p && rt.t >= 1) setHov(hit(rt, p[0], p[1])?.id || null);
          });
        return;
      }
      const p = pos(e);
      ptrs.set(e.pointerId, p);
      if (down) down.moved += Math.abs(p[0] - old[0]) + Math.abs(p[1] - old[1]);
      /* en el celular, dentro de la página el mapa no se arrastra: el dedo hace scroll. Para moverlo, pantalla completa */
      if (rt.locked && e.pointerType !== 'mouse') {
        if (down && down.moved > 24 && !down.hinted) {
          down.hinted = true;
          hint(rt, 'Tocá ⤢ para mover el mapa');
        }
        return;
      }
      if (down && down.moved < 4) return;
      stopPlay(rt);
      setHov(null);
      if (ptrs.size === 1) {
        panBy(rt, p[0] - old[0], p[1] - old[1]);
        drawSoon(rt);
      } else if (ptrs.size === 2) {
        const q = [...ptrs.values()],
          dist = Math.hypot(q[0][0] - q[1][0], q[0][1] - q[1][1]);
        if (pinch > 0 && dist > 0) zoomAt(rt, (q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2, dist / pinch, true);
        pinch = dist;
        if (down) down.moved = 99;
      }
    };
    const onUp = (e: PointerEvent) => {
      const was = ptrs.has(e.pointerId);
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = 0;
      if (was && down && down.moved < 8 && performance.now() - down.t < 600 && ptrs.size === 0) {
        const p = pos(e);
        stopPlay(rt);
        rt.onPick(hit(rt, p[0], p[1])?.id || null);
      }
      if (ptrs.size === 0) {
        /* al soltar, el mapa de fondo se traza de nuevo, nítido */
        if (rt.raf || rt.dirty) draw(rt);
        commit(rt);
        down = null;
      }
    };
    const onCancel = (e: PointerEvent) => {
      ptrs.delete(e.pointerId);
      pinch = 0;
      down = null;
      draw(rt);
      commit(rt);
    };
    const onLeave = () => setHov(null);
    /* la rueda acerca y aleja; si el mapa está dentro de la página (el celu), solo con Ctrl/⌘ o pellizcando el trackpad */
    const onWheel = (e: WheelEvent) => {
      if (!rt.wheel && !rt.fs && !e.ctrlKey && !e.metaKey) {
        hint(rt, (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl') + ' + rueda para acercar');
        return;
      }
      e.preventDefault();
      const p = pos(e);
      stopPlay(rt);
      zoomAt(rt, p[0], p[1], Math.exp(-e.deltaY * (e.ctrlKey && Math.abs(e.deltaY) < 40 ? 0.01 : 0.0016)), true);
      clearTimeout(rt.wheelT);
      rt.wheelT = setTimeout(() => {
        draw(rt);
        commit(rt);
      }, 250);
    };
    const onDbl = (e: MouseEvent) => {
      const p = pos(e);
      zoomAt(rt, p[0], p[1], 2);
      commit(rt);
    };
    /* con el foco en el mapa: las flechas lo mueven y + / − acercan y alejan */
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const step = e.shiftKey ? 240 : 80,
        mv: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      if (mv[e.key]) {
        stopPlay(rt);
        panBy(rt, mv[e.key][0], mv[e.key][1]);
        draw(rt);
      } else if (e.key === '+' || e.key === '=') zoomAt(rt, cv.clientWidth / 2, cv.clientHeight / 2, 1.6);
      else if (e.key === '-' || e.key === '_') zoomAt(rt, cv.clientWidth / 2, cv.clientHeight / 2, 0.625);
      else return;
      e.preventDefault();
      commit(rt);
    };
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onCancel);
    cv.addEventListener('pointerleave', onLeave);
    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.addEventListener('dblclick', onDbl);
    cv.addEventListener('keydown', onKey);
    const ro = new ResizeObserver(() => {
      mapSize(rt);
      draw(rt);
    });
    ro.observe(w);
    return () => {
      cv.removeEventListener('pointerdown', onDown);
      cv.removeEventListener('pointermove', onMove);
      cv.removeEventListener('pointerup', onUp);
      cv.removeEventListener('pointercancel', onCancel);
      cv.removeEventListener('pointerleave', onLeave);
      cv.removeEventListener('wheel', onWheel);
      cv.removeEventListener('dblclick', onDbl);
      cv.removeEventListener('keydown', onKey);
      ro.disconnect();
      clearTimeout(rt.wheelT);
      clearTimeout(rt.ht);
      cancelAnimationFrame(rt.raf);
      cancelAnimationFrame(rt.hraf);
      rt.raf = rt.hraf = 0;
      stopPlay(rt);
      commit(rt);
      rt.cv = null;
      rt.setHint = null;
    };
  }, []);

  /* el mapa de fondo se baja recién acá, y solo si está prendido */
  useLayoutEffect(() => {
    if (o.base && !baseMapReady())
      void loadBaseMap().then((ok) => {
        if (!ok) setMapUi({ baseErr: true });
      });
  }, [o.base]);

  /* al entrar y al cambiar el período, los recorridos se trazan de nuevo */
  useLayoutEffect(() => {
    play(R.current);
  }, [o.period]);

  useLayoutEffect(() => {
    draw(R.current);
  }, [o.base, o.zones, o.color, o.sel, o.hb, fs, view, baseReady, routes, sessions]);

  useImperativeHandle(
    ref,
    () => ({
      zoom: (k: number) => {
        const rt = R.current,
          cv = rt.cv;
        if (!cv) return;
        zoomAt(rt, cv.clientWidth / 2, cv.clientHeight / 2, k);
        commit(rt);
      },
      fit: () => {
        const cv = R.current.cv;
        if (cv) setMapUi({ view: mapFit(mapRoutes(R.current.o.period), cv.clientWidth, cv.clientHeight, true) });
      },
      dims: () => {
        const cv = R.current.cv;
        return cv ? [cv.clientWidth, cv.clientHeight] : null;
      },
      replay: (onTick: (r: Route | null) => void) => {
        const rt = R.current;
        stopPlay(rt);
        rt.onTick = onTick;
        play(rt, true);
      },
      stop: () => {
        stopPlay(R.current);
        draw(R.current);
      },
      reveal: () => R.current.w?.scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' }),
    }),
    [],
  );

  return (
    <div className={'mapa-map' + (fs ? ' fs' : '')} ref={wRef}>
      <canvas ref={cRef} tabIndex={0} role="img" aria-label={label} style={{ touchAction: locked ? 'pan-y' : 'none' }} />
      {children}
      <div className={'mapa-hint' + (hintS.on ? ' on' : '')} aria-hidden="true">
        {hintS.t}
      </div>
    </div>
  );
}
