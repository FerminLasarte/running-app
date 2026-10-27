'use client';
/* Detalle de una sesión (/sesion/[id]): título y datos del día → seis números → ritmo y FC sobre la distancia con las
   bandas del objetivo → tramos plan contra real y el puntaje; al costado el recorrido, las zonas, la sensación, las
   zapatillas y las notas. Por hacer, el plan con sus tramos. Arriba, las acciones: cargar o editar el resultado,
   editar el plan, mover de día y eliminar. */
import '@/app/styles/screens/sesion.css';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowsLeftRight, Bandaids, PencilSimple, Plus, Sneaker, Thermometer, Trash, Watch } from '@phosphor-icons/react';
import type { Session } from '@/lib/domain/types';
import { useApp } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import { TYPES, shoeById, zoneOf } from '@/lib/domain/config';
import { decBand, decEligible } from '@/lib/domain/dec';
import { scoreSession, bandOf } from '@/lib/domain/score';
import { expand, isRep } from '@/lib/domain/stages';
import { hrRangeOf, planKmOf, sdate } from '@/lib/domain/stats';
import { planEstSec } from '@/lib/domain/planForm';
import { DF_LONG, cap, fmt, fmtDur, fmtPace, pd } from '@/lib/domain/util';
import { canMove } from '@/lib/domain/week';
import { deleteSession } from '@/lib/data/actions';
import { loadStreams, streamsSel } from '@/lib/data/streams';
import { Button, Chip } from '@/components/pista/controls';
import { BrandTitle, Kpis, Panel, type Kpi } from '@/components/pista/structure';
import { Ticks } from '@/components/pista/meters';
import { briefOf, kmOf, SessionBar } from '@/components/pista/session';
import { cssVars } from '@/components/pista/util';
import { PacePanel } from './PaceChart';
import { LapsPanel } from './LapsPanel';
import { FeelPanel, RoutePanel, ZonesPanel } from './SidePanels';
import { ScoreHead, ScoreParts } from './ScoreBreakdown';

/** el título: las repeticiones («3 × 3 km»), la distancia o, en un plan solo por tiempo, los minutos */
function titleOf(s: Session) {
  const km = kmOf(s);
  return ((s.plan?.steps || []).some(isRep) && briefOf(s)) || (!km && s.plan?.durMin ? fmt(s.plan.durMin, 0) + ' min' : fmt(km, 1) + ' km');
}
const longDate = (d: string) => cap(DF_LONG.format(pd(d)).replace(',', ''));

/** el ritmo objetivo del trabajo: el del primer tramo con ritmo, o el del plan */
function paceTgt(s: Session) {
  const p = s.plan,
    st = expand(p?.steps).find((e) => e.k === 'run' && e.st.pf! > 0)?.st;
  if (st) return st.pf === st.ps ? fmtPace(st.pf!) : fmtPace(st.pf!) + '–' + fmtPace(st.ps!);
  return p?.paceSec ? fmtPace(p.paceSec) : null;
}

function doneKpis(s: Session): Kpi[] {
  const r = s.result!,
    p = s.plan,
    planKm = planKmOf(s),
    main = !!(r.mainPaceSec && p?.steps),
    tgt = paceTgt(s),
    sc = scoreSession(s)?.score,
    avg = 'promedio ' + fmtPace(r.paceSec);
  const dec: Kpi =
    r.dec?.p != null
      ? { label: 'Deriva cardíaca', value: fmt(r.dec.p, 1), unit: '%', note: decBand({ p: r.dec.p }).t }
      : decEligible(s)
        ? { label: 'Deriva cardíaca', value: '–', note: r.dec?.na ? 'No se pudo medir' : 'Sin medir: se calcula en Análisis' }
        : { label: 'Sensación', value: r.feel || '–', unit: r.feel ? '/10' : undefined, note: r.pain ? 'Con molestia' : 'Sin molestias' };
  return [
    { label: 'Distancia', value: fmt(r.distKm, 2), unit: 'km', note: planKm ? 'Plan ' + fmt(planKm, 1) + ' km' : undefined },
    { label: 'Tiempo', value: fmtDur(r.timeSec), note: p?.durMin ? 'Plan ' + fmt(p.durMin, 0) + ' min' : undefined },
    { label: main ? 'Ritmo en tramos' : 'Ritmo', value: fmtPace(main ? r.mainPaceSec! : r.paceSec), unit: '/km', note: tgt ? 'Objetivo ' + tgt + (main ? ' · ' + avg : '') : main ? cap(avg) : undefined },
    { label: 'FC media', value: r.hrAvg || '–', unit: r.hrAvg ? 'lpm' : undefined, note: r.hrAvg ? zoneOf(r.hrAvg) + (r.hrMax ? ' · máx ' + r.hrMax : '') : undefined },
    dec,
    {
      label: 'Puntaje',
      value: sc ?? '–',
      note:
        sc != null ? (
          <span className="ses-kpi-sc">
            <Ticks value={sc} />
            {bandOf(sc).t}
          </span>
        ) : p ? (
          'Nada que medir en el plan'
        ) : (
          'Sin plan para comparar'
        ),
    },
  ];
}

function planKpis(s: Session): Kpi[] {
  const p = s.plan!,
    km = planKmOf(s),
    est = p.durMin ? p.durMin * 60 : km ? planEstSec(p.steps?.length ? p.steps : [{ k: 'run', dist: km }]) : 0,
    tgt = paceTgt(s),
    hr = hrRangeOf(s);
  return [
    { label: 'Distancia', value: km ? fmt(km, 1) : '–', unit: km ? 'km' : undefined, note: 'Planificada' },
    { label: 'Tiempo', value: est ? fmtDur(Math.round(est / 60) * 60) : '–', note: est ? (p.durMin ? 'Del plan' : 'Estimado') : undefined },
    { label: 'Ritmo objetivo', value: tgt || '–', unit: tgt ? '/km' : undefined },
    { label: 'FC objetivo', value: hr ? hr[0] + '–' + hr[1] : '–', unit: hr ? 'lpm' : undefined },
  ];
}

/* las acciones; eliminar pide confirmar en el mismo lugar */
function Actions({ s, onDeleted }: { s: Session; onDeleted: () => void }) {
  const [ask, setAsk] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  /* si te vas con la pregunta abierta, al volver no sigue ahí (Next conserva la página oculta) */
  useLayoutEffect(() => () => setAsk(false), []);
  /* el foco va a «Cancelar» al preguntar y vuelve al tacho al cancelar */
  const asked = useRef(false);
  useEffect(() => {
    if (ask || asked.current) box.current?.querySelector<HTMLElement>(ask ? 'button:last-of-type' : '.ses-ic')?.focus();
    asked.current = ask;
  }, [ask]);
  const r = s.result;
  if (ask)
    return (
      <div ref={box} className="p-acts ses-del" role="group" aria-label="Eliminar la sesión" onKeyDown={(e) => e.key === 'Escape' && setAsk(false)}>
        <span>¿Eliminar esta sesión? No se puede deshacer.</span>
        <Button className="dng" onClick={() => deleteSession(s.id, onDeleted)}>
          Sí, eliminar
        </Button>
        <Button onClick={() => setAsk(false)}>Cancelar</Button>
      </div>
    );
  return (
    <div ref={box} className="p-acts">
      {!r && !s.missed ? (
        <Button variant="pri" icon={Plus} iconWeight="bold" onClick={() => openSheet('result', { id: s.id })}>
          Cargar resultado
        </Button>
      ) : null}
      {r ? (
        <Button icon={PencilSimple} onClick={() => openSheet('result', { id: s.id })}>
          Editar resultado
        </Button>
      ) : null}
      {s.plan ? (
        <Button icon={r ? undefined : PencilSimple} variant={r ? 'ghost' : undefined} onClick={() => openSheet('plan', { id: s.id })}>
          Editar plan
        </Button>
      ) : null}
      {canMove(s) ? (
        <Button icon={ArrowsLeftRight} onClick={() => openSheet('move', { id: s.id })}>
          {s.missed ? 'Pasar a otro día' : 'Mover de día'}
        </Button>
      ) : null}
      <Button icon={Trash} aria-label="Eliminar sesión" title="Eliminar sesión" className="ses-ic" onClick={() => setAsk(true)} />
    </div>
  );
}

function Meta({ s }: { s: Session }) {
  const r = s.result,
    z = r?.shoe ? shoeById(r.shoe) : null;
  const it = r
    ? [
        r.weather ? { I: Thermometer, t: r.weather } : null,
        { I: Watch, t: r.sid ? 'Desde Strava' : 'Cargada a mano' },
        z ? { I: Sneaker, t: z.name } : null,
        r.pain ? { I: Bandaids, t: 'Con molestia', warn: true } : null,
      ]
    : [];
  const list = it.filter((x): x is NonNullable<typeof x> => !!x);
  if (!list.length) return null;
  return (
    <div className="ses-meta">
      {list.map((x, i) => (
        <span key={i} className={'warn' in x ? 'warn' : undefined}>
          <x.I aria-hidden="true" />
          {x.t}
        </span>
      ))}
    </div>
  );
}

function Done({ s }: { s: Session }) {
  const st = useApp(streamsSel(s));
  useEffect(() => void loadStreams(s), [s]);
  const se = st?.k === 'ok' ? st.se : null,
    sc = scoreSession(s);
  return (
    <>
      <article className="p-panel p-c12 p-rise" style={cssVars({ '--i': 1 })}>
        <Kpis items={doneKpis(s)} />
      </article>
      <div className="p-c8 ses-col ses-main">
        <div className="p-rise" style={cssVars({ '--i': 2 })}>
          <PacePanel s={s} st={st} />
        </div>
        <div className="p-rise" style={cssVars({ '--i': 3 })}>
          <LapsPanel s={s} se={se} />
        </div>
        {sc ? (
          <div className="p-rise" style={cssVars({ '--i': 4 })}>
            <Panel title="Puntaje" sub={s.plan ? 'Contra el plan' : undefined}>
              <ScoreHead sc={sc} />
              <ScoreParts sc={sc} />
            </Panel>
          </div>
        ) : null}
      </div>
      <div className="p-c4 ses-col ses-side">
        <div className="p-rise" style={cssVars({ '--i': 2 })}>
          <RoutePanel s={s} se={se} />
        </div>
        <div className="p-rise" style={cssVars({ '--i': 3 })}>
          <ZonesPanel se={se} />
        </div>
        <div className="p-rise" style={cssVars({ '--i': 4 })}>
          <FeelPanel s={s} />
        </div>
      </div>
    </>
  );
}

function Planned({ s }: { s: Session }) {
  return (
    <>
      <article className="p-panel p-c12 p-rise" style={cssVars({ '--i': 1 })}>
        <Kpis items={planKpis(s)} />
      </article>
      <div className="p-c8 ses-col ses-main">
        <div className="p-rise" style={cssVars({ '--i': 2 })}>
          <Panel title="Estructura" sub="Ancho, distancia · alto, intensidad">
            <SessionBar s={s} height={56} />
            <p className="ses-note">{TYPES[s.type].hint}</p>
          </Panel>
        </div>
        <div className="p-rise" style={cssVars({ '--i': 3 })}>
          <LapsPanel s={s} se={null} />
        </div>
      </div>
      <div className="p-c4 ses-col ses-side">
        <div className="p-rise" style={cssVars({ '--i': 2 })}>
          <FeelPanel s={s} />
        </div>
      </div>
    </>
  );
}

function Sesion({ id }: { id: string }) {
  const router = useRouter();
  const live = useApp((st) => st.sessions.find((x) => x.id === id));
  /* al borrarla, se sigue viendo la última versión mientras se vuelve atrás */
  const [last, setLast] = useState(live);
  if (live && live !== last) setLast(live);
  const s = live || last;
  if (!s)
    return (
      <div className="p-grid ses">
        <div className="p-c12 ses-gone">
          <BrandTitle>Sin sesión</BrandTitle>
          <p>Esta sesión no existe o ya la borraste.</p>
          <Button variant="pri" arrow href="/registro">
            Ir al registro
          </Button>
        </div>
      </div>
    );
  /* borrada: a la página de la que viniste (o a la semana, si entraste por un link) */
  const leave = () => (window.history.length > 1 ? router.back() : router.replace('/semana'));
  const date = sdate(s);
  return (
    <div className="p-grid ses" style={cssVars({ '--tc': `var(--t-${s.type})` })}>
      <header className="p-c12 p-phd p-rise ses-hd">
        <div>
          <div className="ses-ttl">
            <Chip type={s.type} solid />
            <span className="lbl">{longDate(date)}</span>
            {!s.result ? <span className="lbl ses-st">{s.missed ? 'No la hiciste' : 'Planificada'}</span> : null}
          </div>
          <BrandTitle>{titleOf(s)}</BrandTitle>
          <Meta s={s} />
        </div>
        <Actions s={s} onDeleted={leave} />
      </header>
      {s.result ? <Done s={s} /> : s.plan ? <Planned s={s} /> : null}
    </div>
  );
}

/* con `key`, pasar de una sesión a otra arranca de cero (Next conserva la página oculta y la reusa) */
export default function SesionPage() {
  const { id } = useParams<{ id: string }>();
  return <Sesion key={id} id={id} />;
}
