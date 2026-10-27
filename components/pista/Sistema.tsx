'use client';
/* Sistema de diseño «Pista»: las piezas sueltas, con los datos de ejemplo de los bocetos (design/bocetos, #sistema y
   las pantallas de donde sale cada una), para revisarlas en claro y oscuro. Solo en desarrollo. */
import '@/app/styles/screens/sistema.css';
import { useState, type ReactNode } from 'react';
import { ArrowsLeftRight, Calendar, CalendarCheck, CaretDown, Check, Clock, FlagCheckered, MapPin, Mountains, Plus, Timer, UsersThree, type Icon } from '@phosphor-icons/react';
import type { SessionType } from '@/lib/domain/types';
import { TYPES } from '@/lib/domain/config';
import { readHms, type Hms } from '@/lib/domain/hms';
import { fmt, fmtPace, num, pd, WD } from '@/lib/domain/util';
import { cssVars, typeColor } from './util';
import { Button, Chip, Delta, Pr, Segmented, Stepper, Switch, Tabs, Tag } from './controls';
import { Calc, Field, HmsInput, Input, SearchField, TextArea, UnitInput } from './fields';
import { BrandTitle, Kpis, PageHead, Panel, Stadium, Table, type Col, type Group } from './structure';
import { Laps, StructureBar, Ticks, ZoneBar, type Seg } from './meters';
import { Bib, Chrono, Countdown, Medal, Oval, PaceBand, Shield } from './sport';
import { Chart, Dots, GridY, Guide, Key, LabelsX, Line, Spark, StackedBars, Tip, lin, useCursor, type Bar, type Pt } from './charts';

/* ---- datos de ejemplo: los mismos del boceto ---- */
const rng = (s: number) => () => (s = (s * 16807) % 2147483647) / 2147483647; /* fijo: siempre igual */
const W = (d: number): Seg => ({ d, k: 'w', i: 0.36 }),
  R = (d: number, i: number): Seg => ({ d, k: 'r', i }),
  X = (d: number): Seg => ({ d, k: 'x', i: 0.2 });
const reps = (n: number, d: number, i: number, p: number) => Array.from({ length: n }, (_, k) => (k < n - 1 ? [R(d, i), X(p)] : [R(d, i)])).flat();
const STRUCT: Record<SessionType, Seg[]> = {
  series: [W(2), ...reps(6, 0.8, 0.96, 0.4), W(1.2)],
  regen: [W(1), R(6, 0.34), W(1)],
  tempo: [W(1.5), ...reps(3, 3, 0.78, 0.5), W(0.92)],
  fondo: [W(1), R(16.3, 0.55), W(1)],
  test: [W(2), R(3, 1), W(1.5)],
};
const ORDER: SessionType[] = ['regen', 'fondo', 'tempo', 'series', 'test'];

const SWATCH = (rows: [string, string][]) => (
  <div className="sx-sw">
    {rows.map(([n, v]) => (
      <div key={v} style={cssVars({ '--c': `var(${v})` })}>
        <b>{n}</b>
        <code>{v}</code>
      </div>
    ))}
  </div>
);

function Spec({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="sx-spec">
      <small>{title}</small>
      <div className="sx-gal">{children}</div>
    </div>
  );
}

/* ---- km por semana, apilados por tipo, con el promedio de 4 semanas ---- */
const BLOCK_DONE = [29.6, 34.8, 37.2, 41.0, 43.1, 47.9, 46.5];
const VOL = (() => {
  const r = rng(11),
    N = 26;
  const weeks = Array.from({ length: N }, (_, k) => {
    let tot = 22 + k * 0.52 + (r() - 0.5) * 3;
    if (k % 4 === 3) tot *= 0.76; /* semana de descarga */
    if (k >= 19) tot = BLOCK_DONE[k - 19];
    const f: Record<SessionType, number> = { regen: 0.2 + (r() - 0.5) * 0.04, fondo: 0.38 + (r() - 0.5) * 0.05, tempo: 0.22 + (r() - 0.5) * 0.05, series: 0.17, test: k === 22 ? 0.12 : 0 };
    const s = ORDER.reduce((a, t) => a + f[t], 0);
    return { k, tot, parts: ORDER.map((t) => ({ v: (tot * f[t]) / s, c: typeColor(t) })) };
  });
  const w = 760,
    h = 330,
    m = { l: 34, r: 12, t: 16, b: 28 },
    iw = w - m.l - m.r,
    bw = iw / N,
    y = lin(0, 60, h - m.b, m.t);
  const cx = (k: number) => m.l + k * bw + bw / 2;
  const bars: Bar[] = weeks.map((wk) => ({ x: m.l + wk.k * bw + bw * 0.18, w: bw * 0.64, parts: wk.parts, cur: wk.k === N - 1, target: wk.k === N - 1 ? 54.5 : undefined }));
  const avg = weeks.map((_, k) => {
    const s = weeks.slice(Math.max(0, k - 3), k + 1);
    return s.reduce((a, q) => a + q.tot, 0) / s.length;
  });
  return { w, h, m, N, y, weeks, bars, xs: weeks.map((wk) => cx(wk.k)), avg: avg.map((v, k): Pt => [cx(k), y(v)]) };
})();

function VolumeChart() {
  const { w, h, m, N, y, weeks, bars, xs, avg } = VOL;
  const { sel, cursor } = useCursor(xs, w);
  const k = sel ?? N - 1,
    cur = k === N - 1,
    wk = weeks[k];
  const head = `SEMANA ${18 + k}` + (cur ? ' · EN CURSO' : '');
  const val = cur ? `${fmt(wk.tot)} de 54,5 km` : `${fmt(wk.tot)} km`;
  return (
    <Chart
      w={w}
      h={h}
      label="Kilómetros por semana, apilados por tipo, con el promedio de 4 semanas"
      cursor={cursor}
      live={`Semana ${18 + k}: ${val}`}
      table={{ head: ['Semana', 'Km'], rows: weeks.map((q) => ['S' + (18 + q.k), fmt(q.tot)]) }}
    >
      <GridY ticks={[0, 20, 40, 60]} y={y} x0={m.l} x1={w - m.r} zero />
      <StackedBars bars={bars} y={y} sel={sel} />
      <Line pts={avg} color="var(--ink)" />
      <circle cx={avg[N - 1][0]} cy={avg[N - 1][1]} r="3.5" fill="var(--ink)" />
      <LabelsX items={weeks.filter((q) => q.k % 4 === 1 || q.k === N - 1).map((q) => ({ x: xs[q.k], label: 'S' + (18 + q.k) }))} y={h - 6} />
      <Tip x={xs[k]} y={Math.max(m.t, y(cur ? 54.5 : wk.tot) - 50)} w={142} head={head} lines={[{ t: val }]} xMax={w - m.r} />
    </Chart>
  );
}

/* ---- forma: estado físico y fatiga en líneas, la forma en barras ---- */
function FormChart() {
  const ctl = [38, 39, 40, 41, 42, 43, 43, 44, 45, 46, 47, 48],
    atl = [42, 40, 45, 47, 44, 49, 41, 50, 52, 47, 55, 56];
  const w = 640,
    h = 200,
    m = { l: 26, r: 64, t: 10, b: 24 },
    x = lin(0, 11, m.l, w - m.r),
    y = lin(30, 60, 110, m.t),
    t = (v: number) => 155 - v * 3;
  const pts = (a: number[]) => a.map((v, k): Pt => [x(k), y(v)]);
  return (
    <Chart w={w} h={h} label="Estado físico, fatiga y forma de las últimas 12 semanas">
      <GridY ticks={[30, 40, 50, 60]} y={y} x0={m.l} x1={w - m.r} />
      <Line pts={pts(atl)} color="var(--ink-3)" width={1.4} dash="3 3" />
      <Line pts={pts(ctl)} color="var(--ink)" width={2.2} />
      <circle cx={x(11)} cy={y(48)} r="3.5" fill="var(--ink)" />
      <circle cx={x(11)} cy={y(56)} r="3" fill="var(--surface)" stroke="var(--ink-3)" strokeWidth="1.4" />
      <text className="p-ax ink" x={x(11) + 10} y={y(48) + 3.5}>
        Estado
      </text>
      <text className="p-ax" x={x(11) + 10} y={y(56) + 3.5}>
        Fatiga
      </text>
      <line className="p-gl0" x1={m.l} x2={w - m.r} y1={t(0)} y2={t(0)} />
      {ctl.map((c, k) => {
        const v = c - atl[k];
        return <rect key={k} x={x(k) - 8} y={Math.min(t(v), t(0))} width="16" height={Math.abs(t(v) - t(0)) || 1} fill={v >= 0 ? 'var(--pos)' : 'var(--t-tempo)'} opacity={k === 11 ? 1 : 0.5} />;
      })}
      <text className="p-ax" x={x(11) + 10} y={t(0) + 3.5}>
        Forma
      </text>
      <LabelsX items={['32', '', '', '35', '', '', '38', '', '', '41', '', '43'].map((s, k) => ({ x: x(k), label: s && 'S' + s })).filter((q) => q.label)} y={h - 4} />
    </Chart>
  );
}

/* ---- ritmo: cada sesión es un punto; las rectas muestran hacia dónde va cada tipo ---- */
const PACE = (() => {
  const r = rng(5),
    N = 26,
    TR: [SessionType, number, number][] = [
      ['regen', 384, 372],
      ['fondo', 352, 332],
      ['tempo', 292, 273],
      ['series', 271, 255],
    ];
  const w = 760,
    h = 420,
    m = { l: 40, r: 44, t: 14, b: 28 },
    x = lin(0, N - 1, m.l, w - m.r),
    y = lin(240, 400, m.t, h - m.b);
  const pts: { t: SessionType; k: number; wk: number; s: number }[] = [];
  for (let k = 0; k < N; k++)
    TR.forEach(([t, a, b]) => {
      for (let j = 0; j < (t === 'regen' ? 2 : 1); j++) pts.push({ t, k: Math.max(0, Math.min(N - 1, k + (r() - 0.5) * 0.6)), wk: k, s: a + (b - a) * (k / (N - 1)) + (r() - 0.5) * 12 });
    });
  return { w, h, m, N, x, y, TR, pts };
})();

function PaceChart() {
  const { w, h, m, N, x, y, TR, pts } = PACE;
  const xs = Array.from({ length: N }, (_, k) => x(k));
  const { sel, cursor } = useCursor(xs, w);
  const week = sel != null ? TR.map(([t]) => ({ t, s: pts.filter((p) => p.wk === sel && p.t === t) })).map((q) => ({ t: q.t, s: q.s.reduce((a, p) => a + p.s, 0) / q.s.length })) : [];
  return (
    <Chart
      w={w}
      h={h}
      label="Ritmo de cada sesión por semana, con la tendencia de cada tipo; más rápido, más arriba"
      cursor={cursor}
      live={sel != null ? `Semana ${18 + sel}: ` + week.map((q) => `${TYPES[q.t].label} ${fmtPace(q.s)}`).join(', ') : undefined}
    >
      <GridY ticks={[240, 270, 300, 330, 360, 390]} y={y} x0={m.l} x1={w - m.r} fmt={fmtPace} />
      <text className="p-ax" x={m.l} y={m.t - 2}>
        ↑ MÁS RÁPIDO
      </text>
      <Dots pts={pts.map((p) => ({ x: x(p.k), y: y(p.s), c: typeColor(p.t), r: p.wk === sel ? 4.5 : 3.4, o: sel == null || p.wk === sel ? (p.wk === sel ? 1 : 0.55) : 0.25 }))} />
      {TR.map(([t, a, b]) => (
        <g key={t}>
          <line x1={x(0)} y1={y(a)} x2={x(N - 1)} y2={y(b)} stroke={typeColor(t)} strokeWidth="2.4" />
          <circle cx={x(N - 1)} cy={y(b)} r="4.5" fill={typeColor(t)} stroke="var(--surface)" strokeWidth="2" />
          <text x={x(N - 1) + 9} y={y(b) + 4} style={{ font: '600 11px var(--f-mono)', fill: typeColor(t) }}>
            {fmtPace(b)}
          </text>
        </g>
      ))}
      <LabelsX items={[0, 4, 8, 12, 16, 20, 25].map((k) => ({ x: x(k), label: 'S' + (18 + k) }))} y={h - 6} />
      {sel != null ? (
        <>
          <Guide x={xs[sel]} y0={m.t} y1={h - m.b} />
          <Tip x={xs[sel]} y={m.t + 20} w={150} head={`SEMANA ${18 + sel}`} lines={week.map((q) => ({ t: `${fmtPace(q.s)} ${TYPES[q.t].label.toLowerCase()}`, color: typeColor(q.t) }))} xMax={w - m.r} />
        </>
      ) : null}
    </Chart>
  );
}

/* ---- tabla ---- */
interface Row {
  d: string;
  t: SessionType;
  ds: string;
  km: number;
  tm: string;
  p: string;
  hr: number;
  sc: number;
  st?: 'plan' | 'miss';
  pain?: boolean;
}
const ROWS: (Row | Group)[] = [
  { key: 'oct', group: (<><b>Octubre 2026</b><span><span className="mono">5</span> sesiones · <span className="mono">57,3</span> km · <span className="mono">5:01</span> h</span></>) },
  { d: '2026-10-25', t: 'regen', ds: '8 km suaves', km: 8, tm: '', p: '', hr: 0, sc: 0, st: 'plan' },
  { d: '2026-10-24', t: 'fondo', ds: '18 km en Z2', km: 18.32, tm: '1:41:22', p: '5:32', hr: 142, sc: 91 },
  { d: '2026-10-22', t: 'tempo', ds: '3 × 3 km', km: 12.42, tm: '1:01:26', p: '4:57', hr: 158, sc: 88 },
  { d: '2026-10-21', t: 'regen', ds: 'Suave, Z1–Z2', km: 6.2, tm: '38:26', p: '6:12', hr: 131, sc: 94 },
  { d: '2026-10-16', t: 'series', ds: '5 × 1000 m', km: 10.8, tm: '52:30', p: '4:52', hr: 156, sc: 72, pain: true },
  { d: '2026-10-10', t: 'series', ds: '6 × 1000 m', km: 11, tm: '', p: '', hr: 0, sc: 0, st: 'miss' },
];
const DASH = <span className="mut">–</span>;
const COLS: Col<Row>[] = [
  {
    key: 'd',
    label: 'Fecha',
    className: 'dd',
    cell: (r) => (
      <>
        <b>{pd(r.d).getDate()}</b>
        <span>{WD[(pd(r.d).getDay() + 6) % 7]}</span>
      </>
    ),
  },
  {
    key: 't',
    label: 'Sesión',
    cell: (r) => (
      <>
        <Chip type={r.t} />
        <span className="s">{r.ds}</span>
        {r.pain ? <span className="pain" title="Con molestia" /> : null}
      </>
    ),
  },
  { key: 'sb', label: 'Estructura', hideS: true, className: 'sbc', cell: (r) => <StructureBar segs={STRUCT[r.t]} color={typeColor(r.t)} height={16} /> },
  { key: 'km', label: 'Km', num: true, cell: (r) => fmt(r.km, 2) },
  { key: 'tm', label: 'Tiempo', num: true, hideS: true, cell: (r) => r.tm || DASH },
  { key: 'p', label: 'Ritmo', num: true, cell: (r) => r.p || DASH },
  { key: 'hr', label: 'FC', num: true, hideS: true, cell: (r) => r.hr || DASH },
  {
    key: 'sc',
    label: 'Puntaje',
    num: true,
    cell: (r) =>
      r.st ? (
        <Tag>{r.st === 'plan' ? 'Pendiente' : 'No hecha'}</Tag>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Ticks value={r.sc} />
          {r.sc}
        </span>
      ),
  },
];

/* ---- el estadio de Semana: el ritmo del fondo en tartán ---- */
const SPARK = (() => {
  const r = rng(7),
    n = 72;
  return Array.from({ length: n }, (_, k) => {
    const f = k / (n - 1);
    return 338 - 14 * Math.min(1, f * 8) + Math.sin(f * 9) * 3 + (r() - 0.5) * 8 - (f > 0.93 ? 10 : 0);
  });
})();

const RACE = new Date('2026-11-28T08:00:00-03:00');
const MEDALS: [string, string, string, string, string, boolean, string][] = [
  ['21K', 'Buenos Aires', '23 ago 2026', '1:42:10', '4:50 /km', true, 'var(--t-fondo)'],
  ['10K', 'Nocturna Costanera', '16 may 2026', '46:12', '4:37 /km', true, 'var(--acc)'],
  ['15K', 'Vuelta al Lago', '22 mar 2026', '1:11:48', '4:47 /km', false, 'var(--t-tempo)'],
  ['5K', 'Parque Centenario', '7 feb 2026', '22:31', '4:30 /km', false, 'var(--t-regen)'],
];
const TROPHIES: [string, Icon, number, string | null, number?, string?][] = [
  ['Bajar 25′ en 5K', Timer, 0, '7 feb'],
  ['Media en menos de 1:50', Timer, 1, '23 ago'],
  ['100 horas', Clock, 2, '12 oct'],
  ['Mes de 200 km', CalendarCheck, 2, 'ago'],
  ['Bajar 45′ en 10K', Timer, 1, null, 0.9, '46:12 → 45:00'],
  ['5 carreras', FlagCheckered, 2, null, 0.8, '4 de 5'],
];
const FACTORS: [string, number, string][] = [
  ['Volumen semanal', 82, '46,5 km; el plan pide 50 en el bloque específico'],
  ['Sesiones de calidad', 70, '7 de 10 tempos y series dentro del ritmo'],
  ['Fondo más largo', 88, '18,3 km en las últimas 4 semanas'],
  ['Constancia', 75, '6 de 8 semanas con 4 salidas o más'],
];
const ZONES: [string, string, number][] = [
  ['Z1', '<128', 6],
  ['Z2', '128–143', 18],
  ['Z3', '144–155', 22],
  ['Z4', '156–167', 41],
  ['Z5', '>167', 13],
];

export default function Sistema() {
  const [hms, setHms] = useState<Hms>({ h: '1', m: '41', s: '22' });
  const [km, setKm] = useState('18,32');
  const [hr, setHr] = useState('142');
  const [notes, setNotes] = useState('Salí con fresco. Los últimos 3 km se sintieron livianos.');
  const [q, setQ] = useState('');
  const [ft, setFt] = useState<SessionType | 'all'>('all');
  const [per, setPer] = useState<'30' | '90' | 'all'>('90');
  const [zonesOn, setZonesOn] = useState(true);
  const [base, setBase] = useState(true);
  const [goal, setGoal] = useState(4);
  const [tab, setTab] = useState<'vol' | 'ritmo' | 'forma' | 'zapas'>('vol');

  const kmN = num(km),
    sec = readHms(hms),
    pace = kmN && kmN > 0 && sec && sec > 0 ? fmtPace(sec / kmN) + ' /km' : '–';
  const kmErr = km.trim() === '' ? 'Falta la distancia' : kmN == null || isNaN(kmN) || kmN <= 0 ? 'Escribí los km con coma: 12,5' : null;
  const hrN = num(hr),
    hrErr = hr.trim() === '' ? 'Falta la FC media' : hrN == null || isNaN(hrN) || hrN < 60 || hrN > 230 ? 'Tiene que estar entre 60 y 230' : null;
  const counts: Record<SessionType, number> = { fondo: 6, series: 6, tempo: 5, regen: 5, test: 1 };

  return (
    <div className="sx">
      <PageHead eyebrow="Solo en desarrollo" title="Pista">
        Una herramienta seria con voz de marca deportiva: títulos angostos e itálicos, alto contraste, esquinas casi rectas, y el idioma del atletismo en los detalles: la pista, el dorsal, la pulsera de ritmos, la planilla de
        parciales.
      </PageHead>

      <div className="p-grid">
        <Panel title="Principios" className="p-c5 p-rise" style={cssVars({ '--i': 1 })}>
          <ol className="sx-princ">
            <li><span><b>Un momento por pantalla.</b> Cada sección abre con lo más importante, grande y con voz de marca. Debajo, las herramientas.</span></li>
            <li><span><b>El dato manda.</b> Números angostos y tabulares, unidades chicas, decimales con coma.</span></li>
            <li><span><b>Deporte en el detalle.</b> Pista, dorsal, pulsera y línea de llegada solo donde significan un dato.</span></li>
            <li><span><b>Un solo acento.</b> Tartán para lo que importa ahora. Tipos y zonas son datos, no decoración.</span></li>
            <li><span><b>Compu primero.</b> Barra lateral, atajos, ⌘K, tablas densas, filtros a la vista. El celu apila lo mismo.</span></li>
            <li><span><b>Movimiento con propósito.</b> Barras que crecen, pista que se dibuja, reloj que corre. Nada más.</span></li>
          </ol>
        </Panel>
        <Panel title="Tipografía" className="p-c7 p-rise" style={cssVars({ '--i': 2 })}>
          <Spec title={<>Archivo 900, angosta 62%, itálica, mayúsculas<br />Títulos y momentos</>}>
            <BrandTitle as="span" className="sx-t64">Fondo cumplido</BrandTitle>
          </Spec>
          <Spec title={<>Archivo 800, angosta 70%<br />Números protagonistas</>}>
            <span className="disp" style={{ fontSize: 52 }}>
              4:33<span className="p-u">/km</span> 12,42<span className="p-u">km</span>
            </span>
          </Spec>
          <Spec title={<>Archivo 800, angosta 72%, mayúsculas<br />Títulos de panel</>}>
            <span style={{ font: '800 17px/1 var(--f-disp)', fontStretch: '72%', textTransform: 'uppercase', letterSpacing: '.015em' }}>Últimas sesiones</span>
          </Spec>
          <Spec title={<>Geist 400 / 500<br />Interfaz y texto</>}>
            <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>Rodaje para soltar las piernas después del fondo.</span>
          </Spec>
          <Spec title={<>Geist Mono, tabular<br />Tablas, parciales, tiempos</>}>
            <span className="mono" style={{ fontSize: 14 }}>01:01:26 · 4:33 /km · 158 lpm</span>
          </Spec>
          <Spec title={<>Geist 600, mayúsculas, +10%<br />Etiquetas y botones</>}>
            <span className="lbl">Ritmo en tramos</span>
            <Button size="sm">Mover</Button>
          </Spec>
        </Panel>

        <Panel title="Color" sub="Cambiá el tema arriba a la derecha" className="p-c12 p-rise" style={cssVars({ '--i': 3 })}>
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <div className="lbl" style={{ marginBottom: 10 }}>Base y acento</div>
              {SWATCH([['Fondo', '--bg'], ['Superficie', '--surface'], ['Línea', '--line'], ['Tinta', '--ink'], ['Estadio', '--hero'], ['Tartán', '--acc'], ['Mejora', '--pos'], ['Frecuencia', '--hr'], ['Papel', '--paper']])}
            </div>
            <div>
              <div className="lbl" style={{ marginBottom: 10 }}>Tipos de sesión: de suave a fuerte</div>
              {SWATCH(ORDER.map((t) => [TYPES[t].label, '--t-' + t]))}
            </div>
            <div>
              <div className="lbl" style={{ marginBottom: 10 }}>Zonas de frecuencia cardíaca</div>
              {SWATCH([1, 2, 3, 4, 5].map((z) => ['Z' + z, '--z' + z]))}
            </div>
          </div>
        </Panel>

        <Panel title="Piezas" className="p-c12 p-rise" style={cssVars({ '--i': 4 })}>
          <Spec title={<>Botones<br />Uno primario por pantalla</>}>
            <Button variant="pri" icon={Plus} iconWeight="bold" kbd="R">Registrar</Button>
            <Button variant="acc">Conectar con Strava</Button>
            <Button>Mover</Button>
            <Button variant="ghost" arrow>Ver todo</Button>
            <Button size="sm" icon={ArrowsLeftRight}>Chico</Button>
            <Button disabled>Deshabilitado</Button>
          </Spec>
          <Spec title="Tipo de sesión">
            {ORDER.map((t) => <Chip key={t} type={t} />)}
            <Chip type="fondo" solid>Sólido</Chip>
            <Chip type="test" solid>Test sólido</Chip>
          </Spec>
          <Spec title="Estados y marcas">
            <Delta sec={-5} />
            <Delta sec={0} />
            <Delta sec={7} />
            <Tag>Pendiente</Tag>
            <Tag warn>Falta cargar</Tag>
            <Pr />
          </Spec>
          <Spec title={<>Estructura del entrenamiento<br />Ancho = distancia, alto = intensidad</>}>
            <div style={{ width: 'min(420px, 100%)' }}>
              <StructureBar segs={STRUCT.series} color={typeColor('series')} height={40} label="Series: 6 × 800 m" />
            </div>
          </Spec>
          <Spec title={<>Medidores<br />Marcas discretas, no barras lisas</>}>
            <Ticks value={72} label="Puntaje 72" />
            <Laps value={0.64} partial className="sx-w160" label="64% al nivel 8" />
          </Spec>
          <Spec title="Atajos">
            <kbd>1</kbd>–<kbd>6</kbd><span className="mut">secciones</span>
            <kbd>←</kbd><kbd>→</kbd><span className="mut">semana</span>
            <kbd>R</kbd><span className="mut">registrar</span>
            <kbd>/</kbd><span className="mut">buscar en registro</span>
            <kbd>⌘K</kbd><span className="mut">buscar todo</span>
          </Spec>
        </Panel>

        {/* ---------- formulario y controles ---------- */}
        <div className="sx-sec"><BrandTitle as="h2">Formulario</BrandTitle><span className="lbl">Panel de carga, planificar y ajustes</span></div>
        <Panel title="Campos" sub="Datos de la salida" className="p-c7">
          <div className="sx-g2">
            <Field id="sx-date" label="Fecha">
              <Input id="sx-date" type="date" defaultValue="2026-10-24" max="2026-10-24" />
            </Field>
            <Field id="sx-km" label="Distancia" src="Strava" error={kmErr}>
              <UnitInput id="sx-km" unit="km" value={km} invalid={!!kmErr} onChange={(e) => setKm(e.target.value)} />
            </Field>
            <Field id="sx-tm" label="Tiempo" src="Strava" group>
              <HmsInput id="sx-tm" value={hms} onChange={setHms} />
            </Field>
            <Field id="sx-pace" label="Ritmo">
              <Calc id="sx-pace">{pace}</Calc>
            </Field>
            <Field id="sx-hr" label="FC media" src="Strava" help="Borrá el número para ver el error." error={hrErr}>
              <UnitInput id="sx-hr" unit="lpm" inputMode="numeric" value={hr} invalid={!!hrErr} hasHelp onChange={(e) => setHr(e.target.value)} />
            </Field>
            <Field id="sx-name" label="Nombre">
              <Input id="sx-name" placeholder="Cómo te dicen" />
            </Field>
          </div>
          <div style={{ marginTop: 16 }}>
            <Field id="sx-notes" label="Notas">
              <TextArea id="sx-notes" placeholder="Cómo estuvo, qué notaste…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </Panel>
        <Panel title="Controles" className="p-c5">
          <div className="sx-stack">
            <div className="sx-row">
              <SearchField label="Buscar sesiones" placeholder="Buscar sesiones…" kbd="/" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Segmented
              label="Tipo de sesión"
              value={ft}
              onChange={setFt}
              options={[{ value: 'all' as const, label: 'Todas', n: 23 }, ...(['fondo', 'series', 'tempo'] as SessionType[]).map((t) => ({ value: t, label: TYPES[t].label, n: counts[t], color: typeColor(t) }))]}
            />
            <Segmented label="Período" fill value={per} onChange={setPer} options={[{ value: '30', label: '30 días' }, { value: '90', label: '90 días' }, { value: 'all', label: 'Todo' }]} />
            <div className="sx-tgs">
              <Switch checked={zonesOn} onChange={setZonesOn} label="Zonas pintadas" desc="Cuadrículas de 200 m, más fuertes cuanto más pasás" />
              <Switch checked={base} onChange={setBase} label="Calles y barrios" desc="El mapa de la Ciudad de fondo" />
            </div>
            <div className="sx-row">
              <Stepper label="Salidas por semana" value={goal} min={1} max={7} onChange={setGoal} />
              <span className="mut" style={{ fontSize: 12.5 }}>salidas por semana</span>
            </div>
          </div>
        </Panel>
        <div className="p-c12">
          <Tabs
            label="Análisis"
            idPrefix="sx-an"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'vol', label: 'Volumen' },
              { value: 'ritmo', label: 'Ritmo y eficiencia' },
              { value: 'forma', label: 'Forma y carga' },
              { value: 'zapas', label: 'Zapatillas' },
            ]}
          />
          <p role="tabpanel" id={'sx-an-' + tab} aria-labelledby={'sx-an-tab-' + tab} className="mut" style={{ paddingTop: 12, fontSize: 13 }}>
            Pestaña elegida: {tab}. Con el foco en una pestaña, las flechas pasan a la de al lado.
          </p>
        </div>

        {/* ---------- estructura ---------- */}
        <div className="sx-sec"><BrandTitle as="h2">Estructura</BrandTitle><span className="lbl">Estadio, panel, números y tabla</span></div>
        <Stadium
          className="p-c12"
          style={cssVars({ '--tc': typeColor('fondo') })}
          side={
            <Bib
              band={['10K Palermo', 'Sáb 28 nov']}
              num="35"
              numLabel="días"
              meta={[{ label: 'Largada', value: '08:00' }, { label: 'Corral', value: 'B' }]}
              tear={[{ label: 'Objetivo', value: '45:00' }, { label: 'Ritmo', value: <>4:30<span className="p-u">/km</span></> }]}
            >
              <Button size="sm" variant="on-dark" arrow href="/carreras">Plan de carrera</Button>
            </Bib>
          }
        >
          <div className="p-st-top">
            <Chip type="fondo" solid />
            <span className="lbl">Sábado 24 de octubre · Hoy</span>
            <span className="p-st-ok"><Check weight="bold" aria-hidden="true" />Hecho</span>
          </div>
          <BrandTitle className="p-st-h">Fondo<br />cumplido</BrandTitle>
          <div className="p-st-stats">
            <div><span className="lbl">Distancia</span><span className="disp">18,32<span className="p-u">km</span></span></div>
            <div><span className="lbl">Tiempo</span><span className="disp">1:41:22</span></div>
            <div><span className="lbl">Ritmo</span><span className="disp">5:32<span className="p-u">/km</span></span></div>
            <div><span className="lbl">FC media</span><span className="disp">142<span className="p-u">lpm</span></span></div>
          </div>
          <div className="sx-foot">
            <div className="sx-score"><span className="disp">91</span><span><Ticks value={91} onDark /><span className="lbl" style={{ display: 'block', marginTop: 5 }}>Puntaje</span></span></div>
            <Spark values={SPARK} label="Ritmo a lo largo de la salida" className="sx-spark" />
            <Button size="sm" variant="on-dark" arrow>Ver la salida</Button>
          </div>
        </Stadium>

        <Panel
          title="Forma"
          sub="Últimas 12 semanas"
          className="p-c7"
          flush
          actions={<Button size="sm" variant="ghost" arrow href="/analisis">Análisis</Button>}
        >
          <Kpis
            items={[
              { label: 'Estado físico', value: 48, note: <><span className="p-up">+10</span> en 12 semanas</> },
              { label: 'Fatiga', value: 56, note: 'Semana cargada' },
              { label: 'Forma', value: '−8', color: 'var(--t-tempo)', note: 'Carga productiva' },
            ]}
          />
          <div className="p-panel-b">
            <FormChart />
          </div>
        </Panel>
        <Panel title="Mañana" sub="Domingo 25" className="p-c5" actions={<Chip type="regen" />}>
          <BrandTitle as="div" className="sx-t52">8 km suaves</BrandTitle>
          <p style={{ padding: '8px 0 18px', color: 'var(--ink-2)' }}>Rodaje para soltar las piernas después del fondo. FC por debajo de 140.</p>
          <StructureBar segs={STRUCT.regen} color={typeColor('regen')} height={52} axis={['0 km', 'Intensidad baja todo el rodaje', '8 km']} label="Regenerativo de 8 km" />
          <div className="sx-row" style={{ marginTop: 18 }}>
            <Button icon={ArrowsLeftRight}>Mover</Button>
            <Button variant="ghost">Editar plan</Button>
          </div>
        </Panel>

        <Panel title="Kilómetros" className="p-c12" flush>
          <Kpis
            lg
            items={[
              { label: 'Esta semana', value: '46,5', unit: 'km', note: <><span className="p-up">+8%</span> contra la anterior</> },
              { label: 'Octubre', value: '145,8', unit: 'km', note: '14 sesiones, quedan 7 días' },
              { label: '2026', value: '1.684', unit: 'km', note: 'Ya pasaste todo 2025 (1.512)' },
              { label: 'Racha', value: '6', unit: 'semanas', note: 'Cumpliendo el objetivo semanal' },
            ]}
          />
        </Panel>

        <Panel title="Últimas sesiones" className="p-c12 tw" flush actions={<Button size="sm" variant="ghost" arrow href="/registro">Todo el registro</Button>}>
          <Table cols={COLS} rows={ROWS} rowKey={(r) => r.d} href={() => '/registro'} goLabel={(r) => `${TYPES[r.t].label} del ${r.d}`} dim={(r) => !!r.st} label="Últimas sesiones" />
        </Panel>

        {/* ---------- medidores ---------- */}
        <div className="sx-sec"><BrandTitle as="h2">Medidores</BrandTitle><span className="lbl">Puntaje, vueltas, estructura y zonas</span></div>
        <Panel title="Vueltas" className="p-c5">
          <div className="sx-stack">
            <div>
              <div className="lbl" style={{ marginBottom: 8 }}>Nivel 7 · 64% al 8</div>
              <Laps value={0.64} partial label="64% al nivel 8" />
            </div>
            <div>
              <div className="lbl" style={{ marginBottom: 8 }}>Pegasus 41 · 612 de 800 km</div>
              <Laps value={612 / 800} n={20} h={10} soft warnFrom={14} label="612 de 800 km" />
            </div>
            <div>
              <div className="lbl" style={{ marginBottom: 8 }}>XP del nivel, grande</div>
              <Laps value={0.42} n={20} h={10} gap={3} partial label="42% del nivel" />
            </div>
            <div className="sx-row">
              {[95, 72, 40].map((v) => (
                <span key={v} className="sx-row" style={{ gap: 8 }}><Ticks value={v} />{v}</span>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title="Estructura por tipo" className="p-c7">
          <div className="sx-sbs">
            {ORDER.map((t) => (
              <div key={t} style={{ display: 'contents' }}>
                <Chip type={t} />
                <StructureBar segs={STRUCT[t]} color={typeColor(t)} height={28} plan={t === 'test'} />
              </div>
            ))}
          </div>
          <p className="mut" style={{ paddingTop: 12, fontSize: 12.5 }}>La de test está planificada: va más clara.</p>
        </Panel>
        <Panel title="Zonas" sub="Tempo 3 × 3 km" className="p-c5">
          <ZoneBar zones={ZONES.map((z) => z[2])} label={ZONES.map((z) => `${z[0]} ${z[2]}%`).join(', ')} />
          <ul className="sx-zl">
            {ZONES.map((z, j) => (
              <li key={z[0]} style={cssVars({ '--zc': `var(--z${j + 1})` })}>
                <b>{z[0]}</b>
                <span>{z[1]} lpm</span>
                <span className="r">{z[2]}%</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Preparación" sub="Para el 10K Palermo" className="p-c7">
          <div className="sx-ready">
            <Chrono value={78}>de 100 · faltan 5 semanas</Chrono>
            <ul className="sx-factors">
              {FACTORS.map(([n, v, d]) => (
                <li key={n}>
                  <div className="fr"><b>{n}</b><span className="mono">{v}</span></div>
                  <small>{d}</small>
                  <Laps value={v / 100} />
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        {/* ---------- deporte ---------- */}
        <div className="sx-sec"><BrandTitle as="h2">Deporte</BrandTitle><span className="lbl">Cada guiño significa un dato</span></div>
        <Panel title="Semana 43" sub="Volumen" className="p-c4">
          <Oval done={46.52} total={54.52} />
          <p className="mut" style={{ paddingTop: 12, fontSize: 12.5 }}>La pista se completa con cada salida, en sentido antihorario.</p>
        </Panel>
        <Panel title="Semana vacía" sub="Sin salidas" className="p-c4">
          <Oval done={0} total={40} />
        </Panel>
        <Panel title="Dorsal" sub="Sobre una superficie clara" className="p-c4">
          <Bib
            notch="var(--surface)"
            band={['21K Rosario', 'Dom 12 abr']}
            num="168"
            numLabel="días"
            tear={[{ label: 'Objetivo', value: '1:40:00' }, { label: 'Ritmo', value: <>4:44<span className="p-u">/km</span></> }]}
          />
        </Panel>

        <Stadium className="p-c12" sideWidth={260} side={<PaceBand title="Pulsera 45:00" sub="10K Palermo · en negativo" splits={[273, 273, 273, 270, 270, 270, 270, 268, 268, 264]} breaks={[3, 7]} />}>
          <div className="p-st-top">
            <Chip color="var(--acc)" solid>Próxima carrera</Chip>
            <span className="lbl">Sábado 28 de noviembre · 08:00</span>
          </div>
          <BrandTitle className="p-st-h">10K Palermo</BrandTitle>
          <div className="sx-meta">
            <span><MapPin aria-hidden="true" />Av. Sarmiento y Figueroa Alcorta</span>
            <span><UsersThree aria-hidden="true" />Corral B</span>
            <span><Mountains aria-hidden="true" />Plana, +14 m</span>
          </div>
          <div className="sx-clock">
            <Countdown to={RACE} />
          </div>
        </Stadium>

        <Panel title="Medallero" className="p-c12" flush>
          <div className="sx-medals">
            {MEDALS.map(([d, n, f, t, p, pr, c]) => (
              <Medal key={n} dist={d} color={c} name={n} time={t} pr={pr} note={`${f} · ${p}`} />
            ))}
          </div>
        </Panel>

        <Panel title="Vitrina" sub="Bronce, plata y oro" className="p-c12" flush>
          <div className="sx-vit">
            {TROPHIES.map(([n, I, tier, date, pg, txt]) => (
              <div key={n}>
                <Shield tier={tier} got={!!date} icon={I} />
                <b>{n}</b>
                {date ? <small>{date}</small> : <><Laps value={pg!} className="sx-w70" label={txt} /><small>{txt}</small></>}
              </div>
            ))}
          </div>
        </Panel>

        {/* ---------- gráficos ---------- */}
        <div className="sx-sec"><BrandTitle as="h2">Gráficos</BrandTitle><span className="lbl">Con el foco, las flechas recorren los puntos</span></div>
        <Panel
          title="Kilómetros por semana"
          className="p-c12"
          actions={
            <div className="sx-row" style={{ gap: 14 }}>
              {ORDER.slice(0, 4).map((t) => <Key key={t} color={typeColor(t)} kind="sq">{TYPES[t].label}</Key>)}
              <Key color="var(--ink)">Promedio 4 sem</Key>
            </div>
          }
        >
          <VolumeChart />
        </Panel>
        <Panel
          title="Ritmo por tipo"
          sub="26 semanas"
          className="p-c12"
          actions={
            <div className="sx-row" style={{ gap: 14 }}>
              {ORDER.slice(0, 4).map((t) => <Key key={t} color={typeColor(t)} kind="sq">{TYPES[t].label}</Key>)}
              <Button size="sm" icon={Calendar}>26 semanas<CaretDown aria-hidden="true" /></Button>
            </div>
          }
        >
          <PaceChart />
        </Panel>
      </div>
    </div>
  );
}
