'use client';
/* La columna del costado del detalle: el recorrido (con las marcas de km y el desnivel), el tiempo en cada zona de FC,
   y la sensación, las zapatillas y las notas. */
import { useMemo } from 'react';
import type { Session } from '@/lib/domain/types';
import { useApp } from '@/lib/store';
import { shoeById, zoneRange } from '@/lib/domain/config';
import { decodePoly, mproj, routeSess, type Pt } from '@/lib/domain/geo';
import { shoeKm } from '@/lib/domain/shoes';
import { seriesKm, zoneTimes, type Series } from '@/lib/domain/streams';
import { fmt, fmtDur, nf, sum } from '@/lib/domain/util';
import { Panel } from '@/components/pista/structure';
import { Laps, ZoneBar } from '@/components/pista/meters';
import { Tag } from '@/components/pista/controls';
import { MovedNote, RecalNote } from '@/components/pista/session';
import { cssVars, cx } from '@/components/pista/util';

/* ---- recorrido ---- */
const RW = 300,
  RH = 200,
  PAD = 22;

/** los puntos en el lienzo, centrados y sin deformar, y dónde cae cada marca de km (cada 2, o cada 5 si es largo) */
function routeDraw(ll: Pt[], km: number, dist: number[] | null) {
  const pr = ll.map((q) => mproj(q[0], q[1])),
    xs = pr.map((q) => q[0]),
    ys = pr.map((q) => q[1]),
    x0 = Math.min(...xs),
    y0 = Math.min(...ys),
    k = Math.min((RW - PAD * 2) / (Math.max(...xs) - x0 || 1), (RH - PAD * 2) / (Math.max(...ys) - y0 || 1)),
    ox = (RW - (Math.max(...xs) - x0) * k) / 2,
    oy = (RH - (Math.max(...ys) - y0) * k) / 2,
    pts = pr.map((q): Pt => [ox + (q[0] - x0) * k, oy + (q[1] - y0) * k]);
  /* sin la distancia de cada punto (el recorrido del mapa), la marca va por lo largo del dibujo */
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const along = dist || len.map((l) => (l / (len[len.length - 1] || 1)) * km * 1000),
    step = km > 16 ? 5 : 2,
    marks: { k: number; p: Pt }[] = [];
  for (let m = step; m < km - 0.3; m += step) {
    const i = along.findIndex((d) => d >= m * 1000);
    if (i >= 0) marks.push({ k: m, p: pts[i] });
  }
  return { d: pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(''), start: pts[0], marks };
}

/* la cuadrícula de fondo, girada como las calles de Buenos Aires: solo da idea de ciudad */
const GRID = Array.from({ length: 36 }, (_, k) => (k - 12) * 22);

export function RoutePanel({ s, se }: { s: Session; se: Series | null }) {
  const routes = useApp((st) => st.routes);
  const km = se ? seriesKm(se) : s.result?.distKm || 0;
  const g = useMemo(() => {
    if (se?.ll && se.ll.length > 1) return routeDraw(se.ll, km, se.d);
    const rt = routes.find((r) => r.poly && routeSess(r)?.id === s.id);
    return rt ? routeDraw(decodePoly(rt.poly), km, null) : null;
  }, [se, routes, s.id, km]);
  if (!g) return null;
  return (
    <Panel flush className="ses-route-p">
      <div className="ses-route">
        <svg viewBox={`0 0 ${RW} ${RH}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={'Recorrido de ' + fmt(km, 2) + ' km'}>
          <g transform={`rotate(-34 ${RW / 2} ${RH / 2})`} className="ses-grid" aria-hidden="true">
            {GRID.map((v) => (
              <g key={v}>
                <line x1={v} y1={-80} x2={v} y2={RH + 80} />
                <line x1={-80} y1={v} x2={RW + 80} y2={v} />
              </g>
            ))}
          </g>
          <path d={g.d} fill="none" stroke="var(--surface)" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
          <path d={g.d} fill="none" stroke="var(--acc)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          {g.marks.map((m) => (
            <g key={m.k} transform={`translate(${m.p[0].toFixed(1)} ${m.p[1].toFixed(1)})`} aria-hidden="true">
              <circle r="7.5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.2" />
              <text textAnchor="middle" y="3.4" className="ses-km">
                {m.k}
              </text>
            </g>
          ))}
          <circle cx={g.start[0]} cy={g.start[1]} r="6" fill="var(--pos)" stroke="var(--surface)" strokeWidth="2.5" />
        </svg>
        <div className="ses-route-k">
          <span>{fmt(km, 2)} km</span>
        </div>
      </div>
      {se?.up != null ? (
        <div className="p-panel-b ses-row">
          <span className="lbl">Desnivel</span>
          <span className="mono">
            +{nf(se.up)} m · −{nf(se.down || 0)} m
          </span>
        </div>
      ) : null}
    </Panel>
  );
}

/* ---- zonas ---- */
export function ZonesPanel({ se }: { se: Series | null }) {
  const z = se ? zoneTimes(se) : null;
  if (!z) return null;
  const tot = sum(z),
    range = (i: number) => (i === 0 ? '< ' + zoneRange(1)[0] : i === 4 ? '> ' + zoneRange(3)[1] : zoneRange(i)[0] + '–' + zoneRange(i)[1]);
  return (
    <Panel title="Zonas de FC" sub="Tiempo en cada una">
      <ZoneBar zones={z} />
      <ul className="ses-zl">
        {z.map((v, i) => (
          <li key={i} style={cssVars({ '--zc': `var(--z${i + 1})` })}>
            <b>Z{i + 1}</b>
            <span>{range(i)} lpm</span>
            <span className="r">{fmtDur(v)}</span>
            <span className="r">{Math.round((v / tot) * 100)}%</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ---- sensación, zapatillas y notas ---- */
/** de qué porción de la vida útil en adelante las marcas se pintan en ámbar */
const SHOE_WARN = 0.7;

export function FeelPanel({ s }: { s: Session }) {
  const r = s.result,
    p = s.plan,
    z = r?.shoe ? shoeById(r.shoe) : null,
    notes = r ? r.notes : p?.notes,
    extra = !!(p?.moved || p?.recal);
  if (!r?.feel && !r?.pain && !z && !notes && !extra) return null;
  const used = z ? shoeKm(z) : 0;
  return (
    <Panel className="ses-feel">
      {r?.feel ? (
        <div className="ses-blk">
          <div className="ses-row">
            <span className="lbl">Sensación</span>
            <span className="mono">{r.feel} / 10</span>
          </div>
          <div className="ses-scale" role="img" aria-label={'Sensación ' + r.feel + ' de 10'}>
            {Array.from({ length: 10 }, (_, k) => (
              <i key={k} className={cx(k + 1 === r.feel && 'on')}>
                {k + 1}
              </i>
            ))}
          </div>
        </div>
      ) : null}
      {r?.pain ? (
        <div className="ses-blk">
          <Tag warn>Con molestia</Tag>
        </div>
      ) : null}
      {z ? (
        <div className="ses-blk">
          <div className="ses-row">
            <span className="lbl">Zapatillas · {z.name}</span>
            <span className="mono">
              {nf(used)} / {nf(z.limitKm)} km
            </span>
          </div>
          <Laps value={used / (z.limitKm || 1)} n={20} h={10} soft warnFrom={Math.round(20 * SHOE_WARN)} className="ses-shoe" label={'Vida útil: ' + nf(used) + ' de ' + nf(z.limitKm) + ' km'} />
        </div>
      ) : null}
      {notes || extra ? (
        <div className="ses-blk">
          <span className="lbl">Notas</span>
          {notes ? <p className="ses-note">{notes}</p> : null}
          <MovedNote p={p} className="ses-note mut" />
          <RecalNote p={p} className="ses-note mut" />
        </div>
      ) : null}
    </Panel>
  );
}
