'use client';
/* Ritmo y FC a lo largo de la distancia, con las bandas del objetivo de cada tramo (las series de Strava). Sin series,
   un estado vacío que explica por qué no está. */
import { useMemo } from 'react';
import type { Session } from '@/lib/domain/types';
import { planSpans, seriesKm, type Series, type Span } from '@/lib/domain/streams';
import { fmt, fmtPace } from '@/lib/domain/util';
import { loadStreams, type StreamsState } from '@/lib/data/streams';
import { Chart, GridY, Guide, Key, LabelsX, Line, Tip, lin, useCursor, type Pt } from '@/components/pista/charts';
import { Panel } from '@/components/pista/structure';
import { Button } from '@/components/pista/controls';
import { typeColor } from '@/components/pista/util';

const W = 760,
  H = 270,
  M = { l: 40, r: 40, t: 12, b: 28 },
  IH = H - M.t - M.b;

/** el valor en la posición `q` (0 a 1) de una lista ordenada */
const at = (a: number[], q: number) => a[Math.min(a.length - 1, Math.max(0, Math.round(q * (a.length - 1))))];
/** de `lo` a `hi` en pasos de `step`, redondeando hacia afuera */
function ticks(lo: number, hi: number, step: number) {
  const out: number[] = [];
  for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step; v += step) out.push(v);
  return out;
}
const tgtOf = (sp: Span) => sp.st.pf! > 0 || sp.st.hl! > 0;

function Plot({ s, se }: { s: Session; se: Series }) {
  const km = seriesKm(se),
    tc = typeColor(s.type);
  const g = useMemo(() => {
    const spans = planSpans(s, km);
    /* ritmo: sin los extremos (paradas, el pique del final) y con lugar para el objetivo; más rápido arriba */
    const ps = se.p.filter((p) => p > 0).sort((a, b) => a - b),
      tg = spans.filter((x) => x.k === 'run' && x.st.pf! > 0).flatMap((x) => [x.st.pf!, x.st.ps!]),
      plo = Math.min(at(ps, 0.02), ...tg) - 8,
      phi = Math.max(at(ps, 0.98), ...tg) + 12,
      pStep = phi - plo > 150 ? 60 : 30,
      pT = ticks(plo, phi, pStep),
      P = lin(pT[0], pT[pT.length - 1], M.t, M.t + IH);
    /* FC: a la derecha, en su color */
    const hs = (se.h || []).filter((h) => h > 0),
      hT = hs.length ? ticks(Math.min(...hs) - 6, Math.max(...hs) + 6, 20) : [],
      Hy = hT.length ? lin(hT[0], hT[hT.length - 1], M.t + IH, M.t) : null;
    const X = lin(0, km, M.l, W - M.r),
      xs = se.d.map((d) => X(d / 1000)),
      clampP = (p: number) => Math.min(pT[pT.length - 1], Math.max(pT[0], p || pT[pT.length - 1]));
    const pace: Pt[] = se.p.map((p, i) => [xs[i], P(clampP(p))]),
      hr: Pt[] = Hy && se.h ? se.h.map((h, i): Pt | null => (h > 0 ? [xs[i], Hy(h)] : null)).filter((q): q is Pt => !!q) : [];
    const kStep = km <= 16 ? 2 : km <= 40 ? 5 : 10,
      kx = ticks(0, km, kStep).filter((v) => v <= km);
    return { spans, pT, P, hT, Hy, X, xs, pace, hr, kx, clampP };
  }, [s, se, km]);

  const { sel, cursor } = useCursor(g.xs, W);
  const k = sel ?? null,
    spanAt = (d: number) => g.spans.find((x) => d >= x.a && d < x.b);
  let tip = null,
    live = '';
  if (k != null) {
    const d = se.d[k] / 1000,
      sp = spanAt(d),
      head = 'KM ' + fmt(d, 2) + (sp && sp.n ? ' · TRAMO ' + sp.n : ''),
      p = se.p[k],
      h = se.h ? se.h[k] : 0,
      lines = [{ t: p ? fmtPace(p) + ' /km' : 'parado' }, ...(h ? [{ t: h + ' lpm', color: 'var(--hr)' }] : [])];
    live = 'Kilómetro ' + fmt(d, 2) + ': ' + lines.map((l) => l.t).join(', ');
    tip = (
      <g>
        <Guide x={g.xs[k]} y0={M.t} y1={M.t + IH} />
        <circle cx={g.xs[k]} cy={g.P(g.clampP(p))} r="4" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
        {h && g.Hy ? <circle cx={g.xs[k]} cy={g.Hy(h)} r="4" fill="var(--surface)" stroke="var(--hr)" strokeWidth="2" /> : null}
        <Tip x={g.xs[k]} y={M.t + 30} w={124} head={head} lines={lines} xMax={W - M.r} />
      </g>
    );
  }

  const label = 'Ritmo' + (g.Hy ? ' y frecuencia cardíaca' : '') + ' a lo largo de ' + fmt(km, 2) + ' km' + (g.spans.some(tgtOf) ? ', con el objetivo de cada tramo' : '');
  return (
    <Chart w={W} h={H} label={label} cursor={cursor} live={live}>
      <GridY ticks={g.pT} y={g.P} x0={M.l} x1={W - M.r} fmt={fmtPace} />
      {g.spans.map((sp, i) => {
        if (sp.k !== 'run') return null;
        const x0 = g.X(sp.a),
          w = g.X(sp.b) - x0,
          st = sp.st,
          pace = st.pf! > 0,
          y0 = pace ? g.P(st.pf!) : g.Hy && st.hl! > 0 ? g.Hy(st.hh!) : null,
          y1 = pace ? g.P(st.ps!) : g.Hy && st.hl! > 0 ? g.Hy(st.hl!) : null;
        return (
          <g key={i}>
            <rect x={x0} y={M.t} width={w} height={IH} fill={`color-mix(in oklab, ${tc} 7%, transparent)`} />
            {y0 != null && y1 != null ? (
              <rect x={x0} y={y0} width={w} height={Math.max(0.5, y1 - y0)} fill="none" stroke={pace ? tc : 'var(--hr)'} strokeWidth="1.2" strokeDasharray="4 3" />
            ) : null}
            {sp.n && w > 44 ? (
              <text className="ses-band-t" x={x0 + w / 2} y={M.t + 15} textAnchor="middle" style={{ fill: `color-mix(in oklab, ${tc} 80%, var(--ink))` }}>
                TRAMO {sp.n}
              </text>
            ) : null}
          </g>
        );
      })}
      {g.hr.length ? <Line pts={g.hr} color="var(--hr)" width={1.5} opacity={0.9} /> : null}
      <Line pts={g.pace} color="var(--ink)" width={1.8} />
      {g.Hy ? <GridY ticks={g.hT} y={g.Hy} x0={M.l} x1={W - M.r} side="right" color="color-mix(in oklab, var(--hr) 75%, var(--ink-3))" /> : null}
      <LabelsX items={g.kx.map((v) => ({ x: g.X(v), label: v + ' km' }))} y={H - 6} />
      {tip}
    </Chart>
  );
}

/* por qué no hay gráfico, y qué hacer */
function Empty({ s, st }: { s: Session; st: StreamsState | undefined }) {
  if (!st || st.k === 'busy')
    return (
      <div className="ses-empty" role="status">
        <div className="ses-skel" aria-hidden="true" />
        <span className="p-sr">Trayendo las series de Strava…</span>
      </div>
    );
  if (st.k === 'ok') return null;
  const [t, p] =
    st.k === 'err'
      ? ['Strava no respondió', st.msg]
      : st.why === 'demo'
        ? ['Datos de ejemplo', 'Los datos de ejemplo no traen las series de Strava. Con tu cuenta y Strava conectado, acá ves el ritmo y la FC a lo largo de la salida.']
        : st.why === 'local'
          ? ['Sin series', 'El ritmo y la FC a lo largo de la salida vienen de Strava. Entrá con tu cuenta y conectá Strava para verlos.']
          : st.why === 'missing'
            ? ['No está en Strava', 'No encontré esta salida en Strava (la misma fecha y una distancia parecida). Si la cargaste a mano, no hay series para dibujar; si la subiste a Strava después, buscala de nuevo.']
            : ['Sin distancia', 'Strava no tiene la distancia de esta salida a lo largo del recorrido, así que no hay gráfico.'];
  const reauth = st.k === 'err' && (st.code === 'not_connected' || st.code === 'needs_reauth');
  return (
    <div className="ses-empty">
      <b>{t}</b>
      <p>{p}</p>
      {st.k === 'err' ? (
        reauth ? (
          <Button size="sm" href="/ajustes">
            Ir a Ajustes
          </Button>
        ) : (
          <Button size="sm" onClick={() => loadStreams(s, true)}>
            Probar de nuevo
          </Button>
        )
      ) : st.why === 'missing' ? (
        /* queda anotado que no está: si la subiste a Strava después, se busca de nuevo a mano */
        <Button size="sm" onClick={() => loadStreams(s, true)}>
          Buscar de nuevo
        </Button>
      ) : null}
    </div>
  );
}

export function PacePanel({ s, st }: { s: Session; st: StreamsState | undefined }) {
  const se = st?.k === 'ok' ? st.se : null;
  const keys = se ? (
    <>
      <Key color="var(--ink)">Ritmo</Key>
      {se.h ? <Key color="var(--hr)">FC</Key> : null}
      {planSpans(s, seriesKm(se)).some(tgtOf) ? (
        <Key color={typeColor(s.type)} kind="dash">
          Objetivo
        </Key>
      ) : null}
    </>
  ) : null;
  return (
    <Panel title={se && !se.h ? 'Ritmo' : 'Ritmo y frecuencia'} actions={keys} className="ses-pace">
      {se ? <Plot s={s} se={se} /> : <Empty s={s} st={st} />}
    </Panel>
  );
}
