'use client';
/* Análisis → Volumen: los cuatro números grandes, los km por semana apilados por tipo con el promedio de 4 semanas, el
   reparto por tipo e intensidad, lo que harías hoy en cada distancia y tus marcas. Los gráficos siguen al período. */
import { useS } from '@/lib/store';
import type { SessionType } from '@/lib/domain/types';
import { TYPES, nextRace, upcomingRaces, zoneRange } from '@/lib/domain/config';
import { anFrom, anWeeks, fondoHrFit, intensitySplit, yearKm } from '@/lib/domain/analysis';
import { vdotOf } from '@/lib/domain/daniels';
import { lvPace, lvTimeAt } from '@/lib/domain/level';
import { bestMarks } from '@/lib/domain/marks';
import { doneList, kmBetween, kmByType, monthNow, streakInfo, weekSeries, type WeekRow } from '@/lib/domain/stats';
import { weekTotalKm } from '@/lib/domain/week';
import { addDays, cap, dShort, fmt, fmtDur, fmtPace, isoWeek, mondayOf, nf, pd, sod, sum } from '@/lib/domain/util';
import { sessionHref } from '@/lib/nav';
import { Chip, Delta } from '@/components/pista/controls';
import { Kpis, MarkList, Panel } from '@/components/pista/structure';
import { ShareBars } from '@/components/pista/meters';
import { Chart, GridY, Key, LabelsX, Line, StackedBars, Tip, lin, useCursor, type Bar, type Pt } from '@/components/pista/charts';
import { cssVars, typeColor } from '@/components/pista/util';
import { periodLabel, useAnPeriod } from './period';
import { niceTicks, plural } from './util';

/** de abajo hacia arriba: de lo más suave a lo más fuerte */
const STACK: SessionType[] = ['regen', 'fondo', 'tempo', 'series', 'test'];
const DF_MONTH = new Intl.DateTimeFormat('es-AR', { month: 'long' });
const kmTxt = (v: number) => (v >= 100 ? nf(v) : fmt(v, 1));

function Big() {
  const today = sod(new Date()),
    m0 = mondayOf(today),
    wk = kmBetween(m0, today),
    prev = kmBetween(addDays(m0, -7), addDays(m0, -1)),
    mo = monthNow(),
    left = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate(),
    y = today.getFullYear(),
    yk = yearKm(y),
    pk = yearKm(y - 1),
    st = streakInfo(),
    first = doneList()[0];
  return (
    <Panel className="p-c12 p-rise" style={cssVars({ '--i': 2 })} flush>
      <Kpis
        lg
        items={[
          { label: 'Esta semana', value: fmt(wk, 1), unit: 'km', note: prev > 0 ? 'La anterior: ' + fmt(prev, 1) + ' km' : 'De lunes a hoy' },
          { label: cap(DF_MONTH.format(today)), value: fmt(mo.km, 1), unit: 'km', note: plural(mo.count, 'sesión', 'sesiones') + (left > 0 ? ', ' + (left === 1 ? 'queda 1 día' : 'quedan ' + left + ' días') : '') },
          {
            label: String(y),
            value: kmTxt(yk),
            unit: 'km',
            note: pk > 0 ? (yk >= pk ? 'Ya pasaste todo ' + (y - 1) + ' (' + nf(pk) + ')' : 'En todo ' + (y - 1) + ': ' + nf(pk) + ' km') : first ? 'Desde el ' + dShort(pd(first.result.date)) : undefined,
          },
          { label: 'Racha', value: st.cur, unit: st.cur === 1 ? 'semana' : 'semanas', note: st.thisWeek + ' de ' + st.goal + ' salidas esta semana · mejor racha: ' + st.best },
        ]}
      />
    </Panel>
  );
}

/** km por semana apilados por tipo, con el promedio de las 4 semanas anteriores (las cerradas) y lo planificado de la
    semana en curso, punteado */
function VolChart({ W }: { W: WeekRow[] }) {
  const w = 760,
    h = 330,
    M = { l: 34, r: 12, t: 16, b: 28 },
    N = W.length,
    bw = (w - M.l - M.r) / N,
    cur = W[N - 1],
    target = weekTotalKm(cur.start),
    avg = W.map((_, k) => {
      const L = W.slice(Math.max(0, k - 3), k + 1).filter((q) => !q.cur);
      return L.length && !W[k].cur ? sum(L.map((q) => q.km)) / L.length : null;
    }),
    { ticks, hi } = niceTicks(Math.max(10, target, ...W.map((q) => q.km))),
    Y = lin(0, hi, h - M.b, M.t),
    xc = (k: number) => M.l + k * bw + bw / 2,
    { sel, cursor } = useCursor(W.map((_, k) => xc(k)), w);
  const bars: Bar[] = W.map((q, k) => ({
    x: M.l + k * bw + bw * 0.18,
    w: bw * 0.64,
    parts: STACK.map((t) => ({ v: q.bt[t] || 0, c: typeColor(t) })),
    cur: q.cur,
    target: q.cur ? target : undefined,
  }));
  const ap: Pt[] = avg.flatMap((v, k) => (v == null ? [] : [[xc(k), Y(v)] as Pt]));
  const every = Math.max(1, Math.ceil(N / 7));
  const S = sel != null ? W[sel] : null;
  const read = (q: WeekRow, k: number) =>
    'Semana ' + isoWeek(q.start) + (q.cur ? ', en curso' : '') + ': ' + fmt(q.km, 1) + (q.cur && target > q.km ? ' de ' + fmt(target, 1) : '') + ' km en ' + plural(q.count, 'salida', 'salidas') + (avg[k] != null ? ', promedio de 4 semanas ' + fmt(avg[k]!, 1) : '');
  return (
    <Chart w={w} h={h} label={'Kilómetros por semana de las últimas ' + N + ' semanas, por tipo de sesión'} cursor={cursor} live={S ? read(S, sel!) : undefined}>
      <GridY ticks={ticks} y={Y} x0={M.l} x1={w - M.r} zero />
      <StackedBars bars={bars} y={Y} sel={sel} />
      <Line pts={ap} color="var(--ink)" width={2} />
      {ap.length ? <circle cx={ap[ap.length - 1][0]} cy={ap[ap.length - 1][1]} r="3.5" fill="var(--ink)" /> : null}
      <LabelsX y={h - 6} items={W.map((q, k) => ({ x: xc(k), label: (N - 1 - k) % every === 0 ? 'S' + isoWeek(q.start) : '', accent: q.cur })).filter((q) => q.label)} />
      {S ? (
        <Tip
          x={xc(sel!)}
          y={M.t}
          w={150}
          xMax={w}
          head={'Semana ' + isoWeek(S.start) + (S.cur ? ' · en curso' : '')}
          lines={[
            { t: fmt(S.km, 1) + (S.cur && target > S.km ? ' de ' + fmt(target, 1) : '') + ' km' },
            { t: plural(S.count, 'salida', 'salidas') },
            ...(avg[sel!] != null ? [{ t: 'Prom. 4 sem ' + fmt(avg[sel!]!, 1), color: 'var(--ink-2)' }] : []),
          ]}
        />
      ) : null}
    </Chart>
  );
}

function VolPanel({ W }: { W: WeekRow[] }) {
  const used = STACK.filter((t) => W.some((q) => (q.bt[t] || 0) > 0));
  return (
    <Panel
      className="p-c8 p-rise"
      style={cssVars({ '--i': 3 })}
      title="Kilómetros por semana"
      actions={
        <span className="an-keys hide-s">
          {used.map((t) => (
            <Key key={t} color={typeColor(t)} kind="sq">
              {TYPES[t].label}
            </Key>
          ))}
          <Key color="var(--ink)">Promedio 4 sem</Key>
        </span>
      }
    >
      <VolChart W={W} />
    </Panel>
  );
}

/** reparto por tipo (km) y por intensidad, con cómo vienen los fondos contra su rango de FC */
function TypePanel({ from, label }: { from: string; label: string }) {
  const L = doneList().filter((s) => s.result.date >= from),
    bt = kmByType(L),
    tot = sum(Object.values(bt)),
    I = L.length >= 4 ? intensitySplit(L) : null,
    fo = fondoHrFit(L);
  const items = STACK.filter((t) => (bt[t] || 0) > 0)
    .sort((a, b) => bt[b]! - bt[a]!)
    .map((t) => ({ key: t, label: <Chip type={t} />, v: bt[t]!, color: typeColor(t), value: kmTxt(bt[t]!) + ' km', pct: Math.round((bt[t]! / tot) * 100) + '%' }));
  return (
    <Panel className="p-c4 p-rise" style={cssVars({ '--i': 4 })} title="Por tipo" sub={label} flush>
      <div className="p-panel-b an-tight">
        <ShareBars items={items} label="Kilómetros por tipo de sesión" />
      </div>
      {I ? (
        <div className="p-panel-b an-sep">
          <div className="an-rowb">
            <span className="lbl">Intensidad</span>
            <span className="an-mono">
              {I.easy} / {I.hard}
            </span>
          </div>
          <div className="an-split" aria-hidden="true">
            <i style={cssVars({ flex: I.easy })} />
            <i style={cssVars({ flex: Math.max(I.hard, 1) })} />
          </div>
          <div className="an-rowb an-mut">
            <small>Suave {I.easy}%</small>
            <small>Fuerte {I.hard}%</small>
          </div>
          <p className="an-note">
            {I.easy >= 90
              ? 'Casi todo es fácil: si tu plan lo permite, sumá una sesión de calidad por semana.'
              : I.easy >= 70
                ? 'Reparto equilibrado: la mayor parte fácil y un bloque de trabajo fuerte. Para un 10K se busca 75 a 85% fácil.'
                : 'Más de un tercio de tus kilómetros es a ritmo fuerte. Cuidá que los fondos sean realmente suaves.'}
          </p>
          {fo ? (
            <p className="an-note">
              Tus fondos: FC media <b>{fo.avg} lpm</b>.{' '}
              <b>
                {fo.ok} de {fo.n}
              </b>{' '}
              quedaron dentro del rango {fo.own === fo.n ? 'que tenían planificado' : fo.own ? 'planificado (o de Z2 si no tenían uno)' : 'de Z2 (' + zoneRange(1).join('–') + ' lpm)'}.{' '}
              {fo.ok === fo.n
                ? 'Los hacés bien fáciles.'
                : fo.by <= 5
                  ? 'Los demás se pasaron por poco (' + fo.by + ' lpm en promedio): con calor o cansancio es normal.'
                  : 'Los demás se pasaron ' + fo.by + ' lpm en promedio: si querés fondos más suaves, bajá un poco el ritmo.'}
            </p>
          ) : null}
          <p className="an-foot">Fuerte: los km de trabajo de series, tempos y tests. Si la nota dice «8x600 m», cuento 8 por 600 m; si no, el 40% de la sesión.</p>
        </div>
      ) : null}
    </Panel>
  );
}

/** lo que harías hoy en cada distancia con tu VDOT, contra el objetivo de tus carreras de esa distancia */
const DISTS: [number, string][] = [
  [5, '5K'],
  [10, '10K'],
  [21.0975, '21K'],
  [42.195, '42K'],
];
function PredPanel() {
  const lv = lvPace(),
    nr = nextRace();
  if (!lv)
    return (
      <Panel className="p-c8 p-rise" style={cssVars({ '--i': 5 })} title="Si corrieras hoy">
        <p className="an-note">Registrá un test de 3 a 21 km a esfuerzo máximo, o algunas series y tempos, y acá aparece lo que harías hoy en cada distancia.</p>
      </Panel>
    );
  const vd = vdotOf(lv.sec, 10),
    up = upcomingRaces();
  return (
    <Panel className="p-c8 p-rise" style={cssVars({ '--i': 5 })} title="Si corrieras hoy" sub={'VDOT ' + fmt(vd, 1)} flush>
      <div className="an-pred">
        {DISTS.map(([km, n]) => {
          const t = lvTimeAt(lv, km),
            r = up.find((x) => Math.abs(x.km - km) / km < 0.02 && x.targetSec > 0),
            gap = r ? t - r.targetSec : 0;
          return (
            <div key={n} className={r && nr && r.id === nr.id ? 'goal' : undefined}>
              <span className="an-dist">{n}</span>
              <span className="disp">{fmtDur(t)}</span>
              <small>
                {r ? (
                  <>
                    <Delta sec={gap} />
                    {gap <= 0 ? 'de margen para ' : 'del objetivo de '}
                    {fmtDur(r.targetSec)}
                  </>
                ) : (
                  fmtPace(t / km) + ' /km'
                )}
              </small>
            </div>
          );
        })}
      </div>
      <p className="p-panel-b an-sep an-foot">
        Sale de {lv.txt} (VDOT {fmt(vd, 1)}), con las equivalencias de Jack Daniels. Se recalcula con cada test, serie o tempo nuevo. Es una estimación, no una promesa.
      </p>
    </Panel>
  );
}

function MarksPanel() {
  const M = bestMarks();
  return (
    <Panel className="p-c4 p-rise" style={cssVars({ '--i': 6 })} title="Tus marcas">
      {M.length ? (
        <MarkList label="Tus marcas" items={M.map((m) => ({ key: m.n, label: m.n, sub: m.x, value: m.v, href: m.id ? sessionHref(m.id) : undefined }))} />
      ) : (
        <p className="an-note">Con tus salidas y tus carreras aparecen acá tus mejores marcas.</p>
      )}
    </Panel>
  );
}

export default function Volumen() {
  useS();
  const [per] = useAnPeriod();
  const W = weekSeries(anWeeks(per));
  return (
    <div className="p-grid">
      <Big />
      {W.length ? <VolPanel W={W} /> : null}
      <TypePanel from={anFrom(per)} label={periodLabel(per)} />
      <PredPanel />
      <MarksPanel />
    </div>
  );
}
