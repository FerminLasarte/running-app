/* Dibujo del mapa en el lienzo: la ciudad de noche (oscura en los dos temas, como el estadio), las zonas pintadas, los
   recorridos en tartán que se suman donde pasás más, la salida elegida en blanco con sus marcas de km y la escala.
   Es imperativo a propósito: lo llama MapaCanvas en sus efectos y en cada gesto. Los colores salen de las variables
   del contenedor (`.mapa-map`, en app/styles/screens/mapa.css). */
import { TYPE_KEYS } from '@/lib/domain/config';
import { CELL, MPU, baRings, hexA, kmMarks, mapCells, mapClamp, mapRoutes, mproj, osmLayers, routeBarrios, routePts, routeSess, type MapPeriod, type MapVp, type OsmFeat, type Pt } from '@/lib/domain/geo';
import type { Route, SessionType } from '@/lib/domain/types';
import { clamp } from '@/lib/domain/util';

/** lo que se ve: viene de la URL (y de lo recordado en el navegador) */
export interface MapOpts {
  period: MapPeriod;
  /** zonas pintadas */
  zones: boolean;
  /** calles y barrios de fondo */
  base: boolean;
  color: 'one' | 'type';
  /** salida elegida */
  sel: string | null;
  /** barrio resaltado */
  hb: string | null;
}

/** lo que vive mientras el lienzo está montado */
/** una capa dibujada aparte (el mapa de fondo, los recorridos), con el encuadre y las opciones con que se dibujó */
export interface Layer {
  c: HTMLCanvasElement | null;
  view: MapVp | null;
  key: string;
}
export const newLayer = (): Layer => ({ c: null, view: null, key: '' });

/** lo que vive mientras el lienzo está montado */
export interface MapRuntime {
  /** encuadre vivo: los gestos lo mueven sin pasar por el estado */
  view: MapVp | null;
  /** avance del trazado de los recorridos (0–1) */
  t: number;
  dpr: number;
  /** recorrido bajo el puntero */
  hov: string | null;
  base: Layer;
  over: Layer;
}

/** la escala va abajo a la derecha; en un mapa angosto (el celu), arriba a la izquierda, debajo de «Repetir» */
const NARROW = 600;

/** pinta `paint` en la capa y la pega en el lienzo. Si la capa ya tiene eso dibujado (misma `key`) y hay un gesto en
    curso (`fast`), o con `keep` en el mismo encuadre, no se vuelve a trazar: se pega la imagen guardada, llevada al
    encuadre de ahora. Al soltar se traza de nuevo, nítida */
function layer(ly: Layer, main: CanvasRenderingContext2D, cv: HTMLCanvasElement, d: number, V: MapVp, key: string, fast: boolean, keep: boolean, paint: (c: CanvasRenderingContext2D) => void) {
  const W = cv.width / d,
    H = cv.height / d;
  if (!ly.c) ly.c = document.createElement('canvas');
  const lc = ly.c;
  if (lc.width !== cv.width || lc.height !== cv.height) {
    lc.width = cv.width;
    lc.height = cv.height;
    ly.view = null;
  }
  const B0 = ly.view;
  if (B0 && ly.key === key && (fast || (keep && B0.x === V.x && B0.y === V.y && B0.s === V.s))) {
    /* x' = k·x + (W/2 − k·W/2 + (x0 − x)·s) */
    const k = V.s / B0.s;
    main.setTransform(k, 0, 0, k, d * (W / 2 - (k * W) / 2 + (B0.x - V.x) * V.s), d * (H / 2 - (k * H) / 2 + (B0.y - V.y) * V.s));
    main.drawImage(lc, 0, 0);
  } else {
    const c = lc.getContext('2d');
    if (!c) return;
    ly.view = { ...V };
    ly.key = key;
    c.setTransform(d, 0, 0, d, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, W, H);
    paint(c);
    main.setTransform(1, 0, 0, 1, 0, 0);
    main.drawImage(lc, 0, 0);
  }
  main.setTransform(d, 0, 0, d, 0, 0);
}

/** `fast`: hay un gesto en curso. Las calles (miles, con sus nombres) y los recorridos no se vuelven a trazar en cada
    cuadro: se mueven y escalan las imágenes ya dibujadas, y al soltar se trazan de nuevo, nítidas. */
export function mapDraw(cv: HTMLCanvasElement, rt: MapRuntime, o: MapOpts, top: number, fast = false) {
  const d = rt.dpr || 1,
    W = cv.width / d,
    H = cv.height / d;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const cs = getComputedStyle(cv),
    g = (n: string) => cs.getPropertyValue(n).trim();
  const acc = g('--m-acc') || '#F2552F',
    land = g('--m-land') || '#151618',
    ink = g('--m-ink') || '#F2F1ED',
    fUi = g('--f-ui') || 'system-ui, sans-serif',
    fMono = g('--f-mono') || 'ui-monospace, monospace',
    t = rt.t;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = land;
  ctx.fillRect(0, 0, W, H);
  const V = rt.view;
  if (!V) return;
  const O = o.base ? osmLayers() : null;
  if (O) mapClamp(V, W, H);
  const sx = (x: number) => (x - V.x) * V.s + W / 2,
    sy = (y: number) => (y - V.y) * V.s + H / 2;
  const spaced = (c: CanvasRenderingContext2D, em: number, px: number) => {
    /* el espaciado de letras de las etiquetas del boceto (donde el navegador lo sabe hacer) */
    if ('letterSpacing' in c) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = em * px + 'px';
  };
  if (O)
    layer(rt.base, ctx, cv, d, V, [o.hb || '', top, o.sel ? 1 : 0].join('|'), fast, true, (c) => {
      const B = baRings();
      const vw0 = V.x - W / 2 / V.s,
        vw1 = V.x + W / 2 / V.s,
        vh0 = V.y - H / 2 / V.s,
        vh1 = V.y + H / 2 / V.s;
      const vis = (f: OsmFeat) => f.x1 >= vw0 && f.x0 <= vw1 && f.y1 >= vh0 && f.y0 <= vh1;
      const trace = (list: OsmFeat[], close?: boolean) => {
        c.beginPath();
        list.forEach((f) => {
          if (!vis(f)) return;
          const P = f.P;
          for (let i = 0; i < P.length; i++) {
            const x = sx(P[i][0]),
              y = sy(P[i][1]);
            if (i) c.lineTo(x, y);
            else c.moveTo(x, y);
          }
          if (close) c.closePath();
        });
      };
      const ring = (r: Pt[]) => {
        r.forEach((q, i) => {
          const x = sx(q[0]),
            y = sy(q[1]);
          if (i) c.lineTo(x, y);
          else c.moveTo(x, y);
        });
        c.closePath();
      };
      c.fillStyle = land;
      c.fillRect(0, 0, W, H);
      trace([O.sea].concat(O.isl), true);
      c.fillStyle = g('--m-water') || '#0d171e';
      c.fill('evenodd');
      trace(O.water, true);
      c.fill();
      trace(O.park, true);
      c.fillStyle = g('--m-park') || '#18221d';
      c.fill();
      c.lineJoin = 'round';
      c.lineCap = 'round';
      const st = g('--m-st') || '#1e2023',
        av = g('--m-av') || '#2a2d31';
      if (V.s > 2.2e6) {
        trace(O.min);
        c.strokeStyle = st;
        c.lineWidth = clamp(0.45 + V.s / 2.4e7, 0.6, 2.6);
        c.stroke();
      }
      if (V.s > 9e5) {
        trace(O.med);
        c.strokeStyle = st;
        c.lineWidth = clamp(0.9 + V.s / 1.6e7, 1, 3.6);
        c.stroke();
      }
      trace(O.maj);
      c.strokeStyle = av;
      c.lineWidth = clamp(1.4 + V.s / 1.1e7, 1.5, 5);
      c.stroke();
      if (O.rail.length && V.s > 6e5) {
        const rw = clamp(1.1 + V.s / 2e7, 1.2, 2.6);
        trace(O.rail);
        c.strokeStyle = av;
        c.lineWidth = rw + 1.4;
        c.lineCap = 'butt';
        c.stroke();
        if (V.s > 2e6) {
          c.setLineDash([5, 5]);
          c.strokeStyle = land;
          c.lineWidth = rw * 0.55;
          c.stroke();
          c.setLineDash([]);
        }
        c.lineCap = 'round';
      }
      c.beginPath();
      B.forEach((b) => b.rings.forEach(ring));
      c.setLineDash([4, 5]);
      c.strokeStyle = hexA(ink, 0.12);
      c.lineWidth = 1;
      c.stroke();
      c.setLineDash([]);
      const hb = (o.hb && B.find((b) => b.n === o.hb)) || null;
      if (hb) {
        c.beginPath();
        hb.rings.forEach(ring);
        c.fillStyle = hexA(acc, 0.08);
        c.fill('evenodd');
        c.strokeStyle = hexA(acc, 0.7);
        c.lineWidth = 1.5;
        c.stroke();
      }
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineJoin = 'round';
      /* lugares tapados por lo que flota encima (el botón de arriba, los controles y la tarjeta): ahí no van nombres */
      const boxes: number[][] = [
        [0, 0, Math.min(W * 0.8, 260), top + 64],
        [W - 64, 0, W, top + 140],
        [0, H - (W < NARROW ? 200 : 210), Math.min(W, 372), H],
      ];
      const lbl = g('--m-lbl') || 'rgba(242,241,237,.32)';
      c.font = '600 9px ' + fUi;
      spaced(c, 0.22, 9);
      B.forEach((b) => {
        const tx = b.n.toUpperCase(),
          tw = c.measureText(tx).width,
          w = (b.x1 - b.x0) * V.s,
          h = (b.y1 - b.y0) * V.s,
          cx = sx((b.x0 + b.x1) / 2),
          cy = sy((b.y0 + b.y1) / 2);
        if (w > tw + 14 && h > 16 && cx > -40 && cx < W + 40 && cy > -10 && cy < H + 10) {
          c.fillStyle = b === hb ? '#fff' : lbl;
          c.fillText(tx, cx, cy);
          boxes.push([cx - tw / 2 - 4, cy - 8, cx + tw / 2 + 4, cy + 8]);
        }
      });
      /* nombres de avenidas (y de calles al acercarse): sobre el tramo recto más largo, sin pisarse ni repetirse cerca */
      const placed: Record<string, Pt[]> = {};
      const label = (list: OsmFeat[], minS: number, px: number, col: string, cap: number) => {
        if (V.s < minS) return;
        c.font = '500 ' + px + 'px ' + fMono;
        spaced(c, 0.12, px);
        let cnt = 0;
        for (const f of list) {
          if (f.n < 0 || !vis(f)) continue;
          if (cnt >= cap) break;
          const name = O.nm[f.n] ? O.nm[f.n].toUpperCase() : '';
          if (!name) continue;
          const tw = c.measureText(name).width,
            need = tw + 18,
            Q = f.P.map((q) => [sx(q[0]), sy(q[1])]),
            n = Q.length;
          /* busco un tramo casi recto del largo del nombre (puede abarcar varias cuadras) */
          for (let i = 0; i < n - 1; i++) {
            let len = 0,
              j = i;
            while (j < n - 1 && len < need) {
              len += Math.hypot(Q[j + 1][0] - Q[j][0], Q[j + 1][1] - Q[j][1]);
              j++;
            }
            if (len < need) break;
            const ax = Q[i][0],
              ay = Q[i][1],
              bx2 = Q[j][0],
              by2 = Q[j][1],
              ch = Math.hypot(bx2 - ax, by2 - ay);
            if (ch / len < 0.97) continue;
            const cx = (ax + bx2) / 2,
              cy = (ay + by2) / 2;
            if (cx < 24 || cy < 24 || cx > W - 24 || cy > H - 24) continue;
            let an = Math.atan2(by2 - ay, bx2 - ax);
            if (an > Math.PI / 2) an -= Math.PI;
            if (an < -Math.PI / 2) an += Math.PI;
            const hw = (Math.abs(Math.cos(an)) * tw) / 2 + Math.abs(Math.sin(an)) * 6 + 3,
              hh = (Math.abs(Math.sin(an)) * tw) / 2 + Math.abs(Math.cos(an)) * 6 + 3;
            const x0 = cx - hw,
              y0 = cy - hh,
              x1 = cx + hw,
              y1 = cy + hh;
            if (boxes.some((q) => x0 < q[2] && x1 > q[0] && y0 < q[3] && y1 > q[1])) continue;
            if ((placed[name] || []).some((q) => Math.hypot(q[0] - cx, q[1] - cy) < 240)) break;
            boxes.push([x0, y0, x1, y1]);
            (placed[name] = placed[name] || []).push([cx, cy]);
            cnt++;
            c.save();
            c.translate(cx, cy);
            c.rotate(an);
            c.fillStyle = col;
            c.fillText(name, 0, 0.5);
            c.restore();
            break;
          }
        }
      };
      label(O.maj, 7e5, 8.5, hexA(ink, 0.3), 70);
      label(O.med, 2.6e6, 8, hexA(ink, 0.24), 60);
      label(O.min, 6e6, 7.5, hexA(ink, 0.2), 60);
      const rp = mproj(-34.545, -58.335),
        rx = sx(rp[0]),
        ry = sy(rp[1]);
      if (V.s > 9e5 && rx > 0 && rx < W && ry > 0 && ry < H) {
        c.font = 'italic 500 11px ' + fUi;
        spaced(c, 0.06, 11);
        c.fillStyle = hexA(ink, 0.22);
        c.fillText('Río de la Plata', rx, ry);
      }
      spaced(c, 0, 1);
      c.textAlign = 'start';
      c.textBaseline = 'alphabetic';
    });
  /* sin calles: una grilla suave cada ~1 km, para tener referencia */
  const G = 1000 / MPU,
    gs = G * V.s;
  if (gs > 26 && !o.base) {
    ctx.strokeStyle = hexA(ink, 0.06);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.floor((V.x - W / 2 / V.s) / G) * G; sx(x) < W; x += G) {
      ctx.moveTo(Math.round(sx(x)) + 0.5, 0);
      ctx.lineTo(Math.round(sx(x)) + 0.5, H);
    }
    for (let y = Math.floor((V.y - H / 2 / V.s) / G) * G; sy(y) < H; y += G) {
      ctx.moveTo(0, Math.round(sy(y)) + 0.5);
      ctx.lineTo(W, Math.round(sy(y)) + 0.5);
    }
    ctx.stroke();
  }
  const L = mapRoutes(o.period),
    sel = (o.sel && L.find((r) => r.id === o.sel)) || null;
  const trace = (c: CanvasRenderingContext2D, P: Pt[], n = P.length) => {
    c.beginPath();
    for (let i = 0; i < n && i < P.length; i++) {
      const x = sx(P[i][0]),
        y = sy(P[i][1]);
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
  };
  /* las zonas pintadas y los recorridos van en su capa. Los datos pueden cambiar (llegan recorridos de Strava, cambia
     el tipo de una sesión): fuera de un gesto, esta capa siempre se traza de nuevo */
  const overKey = [o.period, o.zones ? 1 : 0, o.color, o.hb || '', rt.hov || '', t, L.length].join('|');
  layer(rt.over, ctx, cv, d, V, overKey, fast, false, (c) => {
    /* zonas pintadas: más fuertes cuantas más salidas pasaron por la cuadrícula */
    if (o.zones && L.length) {
      const cc = mapCells(L, o.period),
        sz = CELL * V.s;
      cc.m.forEach((n, k) => {
        const i = k.indexOf(','),
          cx = +k.slice(0, i),
          cy = +k.slice(i + 1),
          px = sx(cx * CELL),
          py = sy(cy * CELL);
        if (px > W || py > H || px + sz < 0 || py + sz < 0) return;
        c.fillStyle = hexA(acc, (0.06 + 0.34 * Math.pow(n / cc.max, 0.7)) * t);
        if (sz > 8) c.fillRect(px + 0.4, py + 0.4, sz - 0.8, sz - 0.8);
        else c.fillRect(px, py, sz + 0.5, sz + 0.5);
      });
    }
    const byType = o.color === 'type',
      hb = o.hb;
    const TC = {} as Record<SessionType, string>;
    TYPE_KEYS.forEach((k) => {
      TC[k] = g('--t-' + k) || acc;
    });
    const colorOf = (r: Route) => {
      if (!byType) return acc;
      const s = routeSess(r);
      return s ? TC[s.type] : hexA(ink, 0.6);
    };
    /* con un barrio elegido, sus recorridos se encienden y el resto se apaga */
    const inHb = (r: Route) => {
      if (hb) for (const b of routeBarrios(r).km.keys()) if (b.n === hb) return true;
      return false;
    };
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.lineWidth = 1.5;
    /* en un color, cada trazo suma luz: con muchas salidas, cada una pesa menos, así se sigue leyendo dónde pasás más.
       Por tipo, los colores son datos: no se suman (se volverían blancos), se pintan uno encima del otro */
    c.globalCompositeOperation = byType ? 'source-over' : 'lighter';
    const N = L.length,
      a0 = clamp((byType ? 0.5 : 0.3) * Math.sqrt(80 / Math.max(1, N)), byType ? 0.2 : 0.1, byType ? 0.5 : 0.3),
      a1 = clamp(a0 * 3, 0.45, 0.9),
      lit: Route[] = [];
    L.forEach((r, ri) => {
      const f = clamp(t * N - ri, 0, 1);
      if (f <= 0) return;
      if (f >= 1 && (r.id === rt.hov || inHb(r))) {
        lit.push(r);
        return;
      }
      const P = routePts(r);
      c.strokeStyle = hexA(colorOf(r), hb ? a0 * 0.4 : a0);
      trace(c, P, Math.max(2, Math.ceil(P.length * f)));
      c.stroke();
    });
    lit.forEach((r) => {
      c.strokeStyle = hexA(colorOf(r), r.id === rt.hov ? 0.9 : a1);
      trace(c, routePts(r));
      c.stroke();
    });
  });
  if (sel && t >= 1) {
    const P = routePts(sel);
    trace(ctx, P);
    ctx.strokeStyle = g('--m-casing') || '#0b0b0c';
    ctx.lineWidth = 7;
    ctx.stroke();
    trace(ctx, P);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    /* la largada y una marca cada 2 km */
    const a = P[0];
    ctx.fillStyle = g('--pos') || '#5CBB86';
    ctx.strokeStyle = land;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx(a[0]), sy(a[1]), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = '600 8px ' + fMono;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    kmMarks(P, sel.km).forEach((m) => {
      const x = sx(m.p[0]),
        y = sy(m.p[1]);
      if (x < -10 || y < -10 || x > W + 10 || y > H + 10) return;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = land;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText(String(m.k), x, y + 0.5);
    });
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }
  /* escala real: a la latitud del centro del encuadre */
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * V.y))),
    mpp = (40075016.686 * Math.cos(lat)) / V.s;
  let len = 10000;
  [50, 100, 200, 500, 1000, 2000, 5000, 10000].some((v) => {
    if (v / mpp >= 60) {
      len = v;
      return true;
    }
    return false;
  });
  const px = len / mpp,
    txt = len >= 1000 ? len / 1000 + ' km' : len + ' m';
  ctx.font = '500 10px ' + fMono;
  const tw = ctx.measureText(txt).width,
    narrow = W < NARROW,
    bx = narrow ? 16 + tw + 10 : W - 16 - px,
    by = narrow ? top + 74 : H - 16;
  ctx.strokeStyle = hexA(ink, 0.55);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bx, by - 6);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx + px, by);
  ctx.lineTo(bx + px, by - 6);
  ctx.stroke();
  ctx.fillStyle = hexA(ink, 0.55);
  ctx.fillText(txt, bx - 10 - tw, by);
}
