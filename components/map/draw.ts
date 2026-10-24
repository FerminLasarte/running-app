/* Dibujo del mapa en el lienzo (mapDraw, líneas 4564–4700 del original). Es imperativo a propósito: lo llama
   MapCanvas en sus efectos y en cada gesto. */
import { TYPES, TYPE_KEYS } from '@/lib/domain/config';
import { CELL, MPU, baRings, hexA, lumOf, mapCells, mapClamp, mapRoutes, mproj, osmLayers, routePts, routeSess, type MapUi, type MapVp, type OsmFeat, type Pt } from '@/lib/domain/geo';
import type { SessionType } from '@/lib/domain/types';
import { clamp } from '@/lib/domain/util';

/** lo que vive mientras el lienzo está montado (lo que el original guardaba en S.map sin dibujar) */
export interface MapRuntime {
  /** encuadre vivo: los gestos lo mueven sin pasar por el estado */
  view: MapVp | null;
  /** avance de la animación de entrada (0–1) */
  t: number;
  dpr: number;
  /** lienzo aparte para el mapa de fondo */
  bc: HTMLCanvasElement | null;
}

export function mapDraw(cv: HTMLCanvasElement, rt: MapRuntime, M: MapUi, safeTop: number) {
  const d = rt.dpr || 1,
    W = cv.width / d,
    H = cv.height / d;
  const ctx0 = cv.getContext('2d');
  if (!ctx0) return;
  let ctx: CanvasRenderingContext2D = ctx0;
  const cs = getComputedStyle(document.documentElement),
    g = (n: string) => cs.getPropertyValue(n).trim();
  const acc = g('--accent') || '#FF6A1F',
    dark = lumOf(g('--bg')) < 0.5,
    t = rt.t;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = g('--bg2') || '#0C1118';
  ctx.fillRect(0, 0, W, H);
  const V = rt.view;
  if (!V) return;
  const O = M.base ? osmLayers() : null;
  if (O) mapClamp(V, W, H);
  const sx = (x: number) => (x - V.x) * V.s + W / 2,
    sy = (y: number) => (y - V.y) * V.s + H / 2;
  if (O) {
    /* el mapa base se dibuja aparte y se desvanece en sus bordes: así no se ve dónde terminan los datos */
    let bc = rt.bc;
    if (!bc) bc = rt.bc = document.createElement('canvas');
    if (bc.width !== cv.width || bc.height !== cv.height) {
      bc.width = cv.width;
      bc.height = cv.height;
    }
    const main = ctx,
      bx = bc.getContext('2d');
    if (bx) {
      ctx = bx;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      const c = ctx;
      const B = baRings(),
        ink = g('--ink') || '#fff';
      const vw0 = V.x - W / 2 / V.s,
        vw1 = V.x + W / 2 / V.s,
        vh0 = V.y - H / 2 / V.s,
        vh1 = V.y + H / 2 / V.s;
      const vis = (o: OsmFeat) => o.x1 >= vw0 && o.x0 <= vw1 && o.y1 >= vh0 && o.y0 <= vh1;
      const trace = (list: OsmFeat[], close?: boolean) => {
        c.beginPath();
        list.forEach((o) => {
          if (!vis(o)) return;
          const P = o.P;
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
      c.fillStyle = g('--surface2') || '#171F2A';
      c.fillRect(0, 0, W, H);
      trace([O.sea].concat(O.isl), true);
      c.fillStyle = hexA(g('--info') || '#5AA9FF', dark ? 0.17 : 0.3);
      c.fill('evenodd');
      trace(O.water, true);
      c.fill();
      trace(O.park, true);
      c.fillStyle = hexA(g('--good') || '#2FD67A', dark ? 0.14 : 0.22);
      c.fill();
      c.lineJoin = 'round';
      c.lineCap = 'round';
      if (V.s > 2.2e6) {
        trace(O.min);
        c.strokeStyle = hexA(ink, dark ? 0.13 : 0.15);
        c.lineWidth = clamp(0.45 + V.s / 2.4e7, 0.6, 2.6);
        c.stroke();
      }
      if (V.s > 9e5) {
        trace(O.med);
        c.strokeStyle = hexA(ink, dark ? 0.24 : 0.27);
        c.lineWidth = clamp(0.7 + V.s / 1.6e7, 0.8, 3.4);
        c.stroke();
      }
      /* avenidas y autopistas: un borde oscuro debajo y la línea clara encima, para que se lean como calles anchas */
      const mw = clamp(1 + V.s / 1.1e7, 1.1, 4.6);
      trace(O.maj);
      if (V.s > 2.4e6) {
        c.strokeStyle = hexA(g('--bg') || '#000', dark ? 0.55 : 0.18);
        c.lineWidth = mw + 2;
        c.stroke();
      }
      c.strokeStyle = hexA(ink, dark ? 0.4 : 0.42);
      c.lineWidth = mw;
      c.stroke();
      if (O.rail.length && V.s > 6e5) {
        const rw = clamp(1.1 + V.s / 2e7, 1.2, 2.6);
        trace(O.rail);
        c.strokeStyle = hexA(g('--muted') || '#8793A2', dark ? 0.75 : 0.8);
        c.lineWidth = rw + 1.4;
        c.lineCap = 'butt';
        c.stroke();
        if (V.s > 2e6) {
          c.setLineDash([5, 5]);
          c.strokeStyle = g('--surface2') || '#171F2A';
          c.lineWidth = rw * 0.55;
          c.stroke();
          c.setLineDash([]);
        }
        c.lineCap = 'round';
      }
      c.beginPath();
      B.forEach((b) => b.rings.forEach(ring));
      c.setLineDash([5, 5]);
      c.strokeStyle = hexA(ink, dark ? 0.22 : 0.28);
      c.lineWidth = 1;
      c.stroke();
      c.setLineDash([]);
      const hb = (M.hb && B.find((b) => b.n === M.hb)) || null;
      if (hb) {
        c.beginPath();
        hb.rings.forEach(ring);
        c.fillStyle = hexA(acc, 0.1);
        c.fill('evenodd');
        c.strokeStyle = hexA(acc, 0.85);
        c.lineWidth = 1.6;
        c.stroke();
      }
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = '700 10.5px Barlow, system-ui, sans-serif';
      c.lineWidth = 3;
      c.lineJoin = 'round';
      /* lugares tapados por los controles flotantes: ahí no van nombres */
      const st = M.fs ? safeTop : 0,
        boxes: number[][] = [
          [0, 0, Math.min(W * 0.8, 300), st + 96],
          [W - 64, 0, W, st + 250],
          [0, H - (M.sel ? 120 : 96), Math.min(W, 480), H],
        ];
      B.forEach((b) => {
        const w = (b.x1 - b.x0) * V.s,
          h = (b.y1 - b.y0) * V.s,
          cx = sx((b.x0 + b.x1) / 2),
          cy = sy((b.y0 + b.y1) / 2);
        if (w > b.n.length * 6.4 + 10 && h > 16 && cx > -40 && cx < W + 40 && cy > -10 && cy < H + 10) {
          const tx = b.n.toUpperCase();
          c.strokeStyle = hexA(g('--surface2') || '#171F2A', 0.85);
          c.strokeText(tx, cx, cy);
          c.fillStyle = b === hb ? acc : hexA(g('--muted') || '#8793A2', 1);
          c.fillText(tx, cx, cy);
          const tw = c.measureText(tx).width;
          boxes.push([cx - tw / 2 - 4, cy - 9, cx + tw / 2 + 4, cy + 9]);
        }
      });
      /* nombres de avenidas (y de calles al acercarse): sobre el tramo recto más largo, sin pisarse ni repetirse cerca */
      const placed: Record<string, Pt[]> = {},
        halo = hexA(g('--surface2') || '#171F2A', 0.92);
      const label = (list: OsmFeat[], minS: number, font: string, col: string, cap: number) => {
        if (V.s < minS) return;
        c.font = font;
        let cnt = 0;
        for (const o of list) {
          if (o.n < 0 || !vis(o)) continue;
          if (cnt >= cap) break;
          const name = O.nm[o.n];
          if (!name) continue;
          const tw = c.measureText(name).width,
            need = tw + 18,
            Q = o.P.map((q) => [sx(q[0]), sy(q[1])]),
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
              bx = Q[j][0],
              by = Q[j][1],
              ch = Math.hypot(bx - ax, by - ay);
            if (ch / len < 0.97) continue;
            const cx = (ax + bx) / 2,
              cy = (ay + by) / 2;
            if (cx < 24 || cy < 24 || cx > W - 24 || cy > H - 24) continue;
            let an = Math.atan2(by - ay, bx - ax);
            if (an > Math.PI / 2) an -= Math.PI;
            if (an < -Math.PI / 2) an += Math.PI;
            const hw = (Math.abs(Math.cos(an)) * tw) / 2 + Math.abs(Math.sin(an)) * 7 + 3,
              hh = (Math.abs(Math.sin(an)) * tw) / 2 + Math.abs(Math.cos(an)) * 7 + 3;
            const bx0 = cx - hw,
              by0 = cy - hh,
              bx1 = cx + hw,
              by1 = cy + hh;
            if (boxes.some((q) => bx0 < q[2] && bx1 > q[0] && by0 < q[3] && by1 > q[1])) continue;
            if ((placed[name] || []).some((q) => Math.hypot(q[0] - cx, q[1] - cy) < 240)) break;
            boxes.push([bx0, by0, bx1, by1]);
            (placed[name] = placed[name] || []).push([cx, cy]);
            cnt++;
            c.save();
            c.translate(cx, cy);
            c.rotate(an);
            c.strokeStyle = halo;
            c.lineWidth = 3.2;
            c.strokeText(name, 0, 0.5);
            c.fillStyle = col;
            c.fillText(name, 0, 0.5);
            c.restore();
            break;
          }
        }
      };
      label(O.maj, 7e5, '700 11px Barlow, system-ui, sans-serif', hexA(ink, dark ? 0.82 : 0.78), 70);
      label(O.med, 2.6e6, '600 10.5px Barlow, system-ui, sans-serif', hexA(ink, dark ? 0.66 : 0.64), 60);
      label(O.min, 6e6, '500 10px Barlow, system-ui, sans-serif', hexA(ink, dark ? 0.5 : 0.52), 60);
      const rp = mproj(-34.545, -58.335),
        rx = sx(rp[0]),
        ry = sy(rp[1]);
      if (V.s > 9e5 && rx > 0 && rx < W && ry > 0 && ry < H) {
        c.font = 'italic 600 12px Barlow, system-ui, sans-serif';
        c.fillStyle = hexA(g('--info') || '#5AA9FF', 0.8);
        c.fillText('Río de la Plata', rx, ry);
      }
      c.textAlign = 'start';
      c.textBaseline = 'alphabetic';
      ctx = main;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(bc, 0, 0);
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
  }
  // grilla suave de referencia (cada ~1 km)
  const G = 1000 / MPU,
    gs = G * V.s;
  if (gs > 26 && !M.base) {
    ctx.strokeStyle = hexA(g('--line') || '#1F2833', 0.7);
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
  const L = mapRoutes(M.period);
  if (M.zones && L.length) {
    const cc = mapCells(L, M.period),
      sz = CELL * V.s;
    cc.m.forEach((n, k) => {
      const i = k.indexOf(','),
        cx = +k.slice(0, i),
        cy = +k.slice(i + 1),
        px = sx(cx * CELL),
        py = sy(cy * CELL);
      if (px > W || py > H || px + sz < 0 || py + sz < 0) return;
      ctx.fillStyle = hexA(acc, (0.07 + 0.3 * Math.pow(n / cc.max, 0.7)) * t);
      if (sz > 8) ctx.fillRect(px + 0.5, py + 0.5, sz - 1, sz - 1);
      else ctx.fillRect(px, py, sz + 0.5, sz + 0.5);
    });
  }
  const sel = (M.sel && L.find((r) => r.id === M.sel)) || null,
    byType = M.color === 'type';
  const TC = {} as Record<SessionType, string>;
  TYPE_KEYS.forEach((k) => {
    TC[k] = g(TYPES[k].t.slice(4, -1)) || acc;
  });
  const base = dark ? g('--accent-tx') || acc : acc,
    aR = sel && t >= 1 ? 0.18 : 0.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (dark) ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = dark ? 1.7 : 1.9;
  const N = L.length;
  L.forEach((r, ri) => {
    const f = clamp(t * N - ri, 0, 1);
    if (f <= 0) return;
    const P = routePts(r),
      n = Math.max(2, Math.ceil(P.length * f)),
      s = byType ? routeSess(r) : null;
    ctx.strokeStyle = hexA(byType ? (s ? TC[s.type] : g('--muted') || '#8793A2') : base, byType ? aR + 0.12 : aR);
    ctx.beginPath();
    for (let i = 0; i < n && i < P.length; i++) {
      const x = sx(P[i][0]),
        y = sy(P[i][1]);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  });
  ctx.globalCompositeOperation = 'source-over';
  if (sel && t >= 1) {
    const P = routePts(sel),
      s = routeSess(sel),
      c = byType && s ? TC[s.type] : g('--ink') || '#fff';
    const path = () => {
      ctx.beginPath();
      P.forEach((p, i) => {
        const x = sx(p[0]),
          y = sy(p[1]);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
    };
    path();
    ctx.strokeStyle = hexA(g('--bg') || '#000', 0.55);
    ctx.lineWidth = 6.5;
    ctx.stroke();
    path();
    ctx.strokeStyle = c;
    ctx.lineWidth = 3.4;
    ctx.stroke();
    const a = P[0],
      z = P[P.length - 1];
    (
      [
        [a, g('--good') || '#2FD67A'],
        [z, acc],
      ] as [Pt, string][]
    ).forEach((q) => {
      ctx.fillStyle = q[1];
      ctx.strokeStyle = g('--bg') || '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx(q[0][0]), sy(q[0][1]), 5, 0, 6.3);
      ctx.fill();
      ctx.stroke();
    });
  }
  // escala: arriba a la izquierda, debajo del período
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * V.y))),
    mpp = (40075016.686 * Math.cos(lat)) / V.s;
  let len = 5000;
  [50, 100, 200, 500, 1000, 2000, 5000, 10000].some((v) => {
    if (v / mpp >= 60) {
      len = v;
      return true;
    }
    return false;
  });
  const px = len / mpp,
    bx = 16,
    by = (M.fs ? safeTop : 0) + 86;
  ctx.strokeStyle = hexA(g('--ink') || '#fff', 0.7);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx, by - 5);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx + px, by);
  ctx.lineTo(bx + px, by - 5);
  ctx.stroke();
  ctx.fillStyle = hexA(g('--ink') || '#fff', 0.75);
  ctx.font = '600 11px Barlow, system-ui, sans-serif';
  ctx.fillText(len >= 1000 ? len / 1000 + ' km' : len + ' m', bx, by - 10);
}
