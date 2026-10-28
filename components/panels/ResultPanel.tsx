'use client';
/* Panel «Registrar» / «Editar resultado»: qué sesión fue → los datos (Strava los completa y cada campo lo dice; el
   ritmo se calcula; avisa en el momento lo que falta y si quedaste dentro del plan) → cómo te sentiste. Con Strava
   conectado, al abrir se busca sola la salida y sus números quedan plegados: alcanza con la sensación. Se guarda con ⌘↵. Si la página se recarga, lo cargado vuelve como borrador (lib/data/draft.ts). La lógica está en
   lib/domain/resultForm.ts. */
import { useEffect, useMemo, useRef, useState, type FocusEvent } from 'react';
import { ArrowsClockwise, Check, Cloud, CloudRain, Fire, Snowflake, Sun, Wind, type Icon } from '@phosphor-icons/react';
import Link from 'next/link';
import { openSheet, useSheetDirty } from '@/lib/sheets';
import { useApp } from '@/lib/store';
import { blockDemo, saveSession } from '@/lib/data/actions';
import { draftClear, useDraft } from '@/lib/data/draft';
import { AiError } from '@/lib/ai/client';
import { svCall, stravaErrMsg } from '@/lib/strava/client';
import { TYPE_KEYS, TYPES } from '@/lib/domain/config';
import { DEC_MIN_ACT, decLine, svStreams } from '@/lib/domain/dec';
import type { Hms } from '@/lib/domain/hms';
import { shoeKm } from '@/lib/domain/shoes';
import { planSummary, sdate } from '@/lib/domain/stats';
import { announceProgress, expectProgress, gotIds } from '@/lib/domain/trophies';
import type { Decoupling, Session, SessionType } from '@/lib/domain/types';
import { cap, DF_LONG, dateLabel, fmt, fmtDur, pd, todayS, WEATHER } from '@/lib/domain/util';
import { SV_DAYS, svActs, type SvItem } from '@/lib/domain/week';
import { xpState } from '@/lib/domain/xp';
import { aiErr, sampleRun } from '@/lib/domain/planForm';
import {
  buildResult,
  exOf,
  FEEL_C,
  FEEL_T,
  FLAT_KEYS,
  fillVueltas,
  flatPlanCheck,
  flatRead,
  lapsPrompt,
  paceLabel,
  resultDraftData,
  resultInit,
  rfPick,
  setFlat,
  svAuto,
  svFill,
  type FlatKey,
  type FlatV,
  type ResF,
  type ResultProps,
  type Vuelta,
} from '@/lib/domain/resultForm';
import { Button, Choices, Segmented, useRoving } from '@/components/pista/controls';
import { Field, HmsInput, Input, MsInput, TextArea, UnitInput } from '@/components/pista/fields';
import { More } from '@/components/pista/structure';
import { briefOf, SessionBar } from '@/components/pista/session';
import { cssVars, typeColor } from '@/components/pista/util';
import { useStravaStatus } from '@/components/shell/useStravaStatus';
import { Advice, PanelActions, PanelFrame, PanelSection } from './PanelFrame';
import { LapsAiBox, useAi } from './AiBox';
import { StageRows } from './StageRows';

const svPickStart = (g: ResF, id: string): ResF => ({ ...g, sv: { ...g.sv, busy: true, pick: id, choose: false, msg: 'Leyendo el detalle de la corrida…' } });

/* cada campo, su id (para enfocar el primero con error al guardar) */
const FID: Record<FlatKey, string> = { dist: 'rf-dist', t: 'rf-t-h', pace: 'rf-pace-m', hr: 'rf-hr', hrmax: 'rf-hrmax' };
/* el valor de un campo, para saber si sigue siendo el que trajo Strava */
const flatVal = (v: FlatV, k: FlatKey) => (k === 't' ? JSON.stringify(v.t) : k === 'pace' ? JSON.stringify(v.pace) : v[k]);
const WEATHER_IC: Record<string, Icon> = { Fresco: Snowflake, Templado: Cloud, Calor: Sun, 'Mucho calor': Fire, Lluvia: CloudRain, Viento: Wind };

/* ---- qué sesión fue: las planificadas sin cargar o una libre ---- */
function SessionPick({ pend, sid, onPick }: { pend: Session[]; sid: string | null; onPick: (id: string | null) => void }) {
  const tS = todayS(),
    ids = [...pend.map((p) => p.id), null],
    cur = Math.max(0, ids.indexOf(sid)),
    bind = useRoving(ids.length, cur, (i) => onPick(ids[i]));
  return (
    <div className="p-pick" role="radiogroup" aria-label="Sesión">
      {pend.map((p, i) => {
        const d = sdate(p);
        return (
          <button key={p.id} type="button" role="radio" className="p-opt" aria-checked={sid === p.id} autoFocus={i === cur} onClick={() => onPick(p.id)} style={cssVars({ '--tc': typeColor(p.type) })} {...bind(i)}>
            <span className="rd" aria-hidden="true" />
            <span>
              <b>
                {TYPES[p.type].label} · {d === tS ? 'hoy' : dateLabel(d)}
              </b>
              <small>
                {briefOf(p) || planSummary(p.plan)}
                {d < tS ? ' · quedó sin cargar' : ''}
              </small>
            </span>
            <SessionBar s={p} height={22} />
          </button>
        );
      })}
      <button type="button" role="radio" className="p-opt free" aria-checked={!sid} autoFocus={cur === pend.length} onClick={() => onPick(null)} {...bind(pend.length)}>
        <span className="rd" aria-hidden="true" />
        <span>
          <b>Sesión libre</b>
          <small>Sin plan no hay puntaje, pero queda en tu historial</small>
        </span>
      </button>
    </div>
  );
}

/* ---- el plan de la sesión elegida: sus notas y, al editar (sin la lista de arriba), qué era ---- */
function PlanRef({ s, full }: { s: Session; full?: boolean }) {
  const p = s.plan;
  if (!p || (!full && !p.notes)) return null;
  return (
    <div className="p-planref" style={cssVars({ '--tc': typeColor(s.type) })}>
      {full ? (
        <b>
          Plan: {TYPES[s.type].label}
          {planSummary(p) ? ' · ' + planSummary(p) : ''}
        </b>
      ) : (
        <span className="lbl">Notas del plan</span>
      )}
      {p.notes ? <p>{p.notes}</p> : null}
    </div>
  );
}

/* ---- Strava: buscar la salida, elegirla y ver lo que trajo ---- */
function StravaFound({ f, onLoad, onPick }: { f: ResF; onLoad: () => void; onPick: (id: string) => void }) {
  const sv = f.sv,
    a = (sv.list || []).find((x) => x.id === sv.pick) || null,
    used = !!(a && f.stravaId === a.id && !sv.busy);
  return (
    <div className="p-found">
      <div className="top">
        <span className="lbl">{a ? 'Esta salida en Strava' : 'Traer de Strava'}</span>
        {used ? (
          <span className="used">
            <Check weight="bold" aria-hidden="true" />
            Datos cargados
          </span>
        ) : null}
        <Button size="sm" variant="on-dark" icon={ArrowsClockwise} disabled={sv.busy} onClick={onLoad}>
          {sv.busy ? 'Leyendo…' : sv.list ? 'Otra salida' : 'Buscar la salida'}
        </Button>
      </div>
      {a ? (
        <div className="nums">
          <div>
            <span className="lbl">Distancia</span>
            <span className="disp">
              {fmt(a.km, 2)}
              <span className="p-u">km</span>
            </span>
          </div>
          <div>
            <span className="lbl">Tiempo</span>
            <span className="disp">{fmtDur(a.tsec)}</span>
          </div>
          <div>
            <span className="lbl">Fecha</span>
            <span className="disp">{dateLabel(a.date)}</span>
          </div>
        </div>
      ) : null}
      {sv.list && sv.list.length && (!used || sv.choose) ? (
        <div className="p-acts" role="group" aria-label="Salidas de Strava">
          {sv.list.map((x) => (
            <Button key={x.id} size="sm" variant="on-dark" aria-pressed={sv.pick === x.id} disabled={sv.busy} onClick={() => onPick(x.id)}>
              {dateLabel(x.date) + ' · ' + fmt(x.km, 1) + ' km · ' + String(x.name).slice(0, 24)}
            </Button>
          ))}
        </div>
      ) : null}
      <p className="p-note" role="status">
        {sv.msg || (!sv.list ? 'Completo distancia, tiempo, FC y parciales por vos.' : '')}
      </p>
    </div>
  );
}

/** `svLoad`: arranca buscando la salida en Strava (desde la paleta) */
export default function ResultPanel(props: ResultProps & { svLoad?: boolean }) {
  const [init] = useState(() => {
    const f = resultInit(props);
    return { f, snap: JSON.stringify(resultDraftData(f)), tS: todayS() };
  });
  const [f, setF] = useState<ResF>(init.f);
  /* el error de guardar se ve mientras el formulario siga igual */
  const [err, setErr] = useState<{ m: string; at: ResF } | null>(null);
  /* campos que ya dejaste (o todos, después de intentar guardar): ahí se avisa lo que falta */
  const [seen, setSeen] = useState<Set<FlatKey>>(() => new Set());
  /* lo que trajo Strava, para marcar los campos que siguen igual */
  const [svFlat, setSvFlat] = useState<FlatV | null>(null);
  /* los datos plegados se abren solos si al guardar falta algo ahí */
  const [dataOpen, setDataOpen] = useState(false);
  /* molestia, zapatillas, clima y notas: abiertos si ya traen algo */
  const [moreOpen] = useState(() => !!(init.f.pain || init.f.shoe || init.f.weather || init.f.notes.trim()));
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const cfg = useApp((st) => st.cfg);
  const sessions = useApp((st) => st.sessions);
  /* con los datos de ejemplo no hay borrador */
  const demo = useApp((st) => st.demo);
  const ai = useAi();
  const strava = useStravaStatus();
  const fRef = useRef(f);
  const alive = useRef(true);
  const tok = useRef(0);
  const focusId = useRef<string | null>(null);
  useEffect(() => {
    fRef.current = f;
  }, [f]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  /* el parcial nuevo: el foco va a sus minutos */
  useEffect(() => {
    if (!focusId.current) return;
    document.getElementById(focusId.current)?.focus();
    focusId.current = null;
  });

  const data = useMemo(() => resultDraftData(f), [f]);
  useDraft(data);
  useSheetDirty(JSON.stringify(data) !== init.snap);

  /* ---- Strava ---- */
  async function svPickRun(id: string, a: SvItem) {
    try {
      const p = await svCall('get_activity_performance', { activity_id: id });
      if (!alive.current) return;
      let dec: Decoupling | null = null;
      const ty = fRef.current.type;
      if ((ty === 'fondo' || ty === 'regen') && a.tsec >= DEC_MIN_ACT) {
        try {
          setF((g) => ({ ...g, sv: { ...g.sv, msg: 'Calculando la deriva cardíaca…' } }));
          dec = await svStreams(id);
        } catch {
          dec = null;
        }
      }
      if (!alive.current) return;
      let n = svFill({ ...fRef.current, dec: dec || null, sv: { ...fRef.current.sv, busy: false } }, a, p || {});
      if (dec) n = { ...n, sv: { ...n.sv, msg: n.sv.msg + ' Deriva cardíaca: ' + decLine(dec) + '.' } };
      setF(n);
      setSvFlat(n.mode === 'flat' ? n.flat : null);
    } catch (e) {
      if (!alive.current) return;
      setF((g) => ({ ...g, sv: { ...g.sv, busy: false, pick: null, msg: stravaErrMsg(e) } }));
    }
  }
  /* desde la paleta, o con Strava conectado al cargar una salida nueva: la búsqueda arranca sola (una vez) */
  const started = useRef(false);
  const svOn = !!(strava && strava.connected);
  useEffect(() => {
    if (started.current) return;
    if (!props.svLoad && !(svOn && !fRef.current.editing && !fRef.current.stravaId)) return;
    started.current = true;
    svLoad();
    // al abrir, o cuando se sabe que Strava está conectado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svOn]);
  function svPick(id: string) {
    const a = (f.sv.list || []).find((x) => x.id === id);
    if (!a) return;
    setF((g) => svPickStart(svAuto(g, a), id));
    svPickRun(id, a);
  }
  async function svLoad() {
    if (f.sv.busy) return;
    setF((g) => ({ ...g, sv: { ...g.sv, busy: true, msg: 'Conectando con Strava…' } }));
    try {
      const pl = await svCall('list_activities', { first: 25, ordering: 'StartDateLocalDesc' });
      if (!alive.current) return;
      const cur = fRef.current,
        list = svActs(pl, cur.sid),
        same = list.filter((a) => a.date === cur.date),
        /* con una ya cargada, el botón es «Otra salida»: se elige de la lista, sin volver a la del día */
        again = !!cur.stravaId;
      if (same.length === 1 && !again) {
        setF((g) => svPickStart(svAuto({ ...g, sv: { ...g.sv, list, busy: false } }, same[0]), same[0].id));
        await svPickRun(same[0].id, same[0]);
        return;
      }
      const msg = list.length ? 'Elegí la corrida que corresponde.' : 'No encontré corridas nuevas en los últimos ' + SV_DAYS + ' días.';
      setF((g) => ({ ...g, sv: { ...g.sv, list, busy: false, choose: again, msg } }));
    } catch (e) {
      if (!alive.current) return;
      setF((g) => ({ ...g, sv: { ...g.sv, busy: false, msg: stravaErrMsg(e) } }));
    }
  }

  /* ---- parciales desde capturas ---- */
  async function aiLaps(files: File[]) {
    if (!ai || aiBusy) return;
    const t = ++tok.current,
      ex = exOf(f);
    setAiBusy(true);
    setAiNote('Leyendo la captura… puede tardar unos segundos.');
    try {
      const j = await sampleRun<{ vueltas?: unknown }>(
        ai,
        files,
        (pv, i, n) => lapsPrompt(ex, pv, i, n),
        (i, n) => {
          if (n > 1) setAiNote('Leyendo lote ' + i + ' de ' + n + '… puede tardar un rato, no cierres este panel.');
        },
      );
      if (tok.current !== t || !alive.current) return;
      const laps = j && Array.isArray(j.vueltas) ? (j.vueltas as Vuelta[]) : null;
      if (!laps) throw new AiError('invalid_json');
      const filled = fillVueltas(fRef.current, laps).filled;
      setF((g) => fillVueltas(g, laps).f);
      setAiBusy(false);
      setAiNote(filled === ex.length ? 'Listo: completé las ' + filled + ' etapas. Revisá los números.' : 'Completé ' + filled + ' de ' + ex.length + ' etapas. Revisá las que quedaron vacías.');
    } catch (e) {
      if (tok.current !== t || !alive.current) return;
      setAiBusy(false);
      setAiNote(aiErr(e));
    }
  }

  function save() {
    const r = buildResult(f);
    if ('err' in r) {
      setDataOpen(true);
      /* sin plan por etapas: el campo con el problema avisa ahí mismo y se lleva el foco */
      const fe = f.mode === 'flat' ? flatRead(f).err : {},
        k = FLAT_KEYS.find((q) => fe[q]);
      if (k && r.err === fe[k]) {
        setSeen(new Set(FLAT_KEYS));
        /* después de que se abran los datos plegados */
        focusId.current = FID[k];
        return;
      }
      setErr({ m: r.err, at: f });
      if (!f.feel) document.getElementById('rf-feel-1')?.focus();
      return;
    }
    if (blockDemo()) return;
    const x0 = xpState();
    /* antes de guardar: así el festejo sabe qué tenías y cuánta XP sumó esta salida */
    expectProgress(gotIds(), x0);
    /* el puntaje sale al instante: la sesión ya está en el estado y la subida a la nube sigue en segundo plano (si
       falla, queda marcada y se reintenta sola) */
    void saveSession(r.s);
    draftClear();
    openSheet('score', { id: r.s.id, fresh: true });
    announceProgress(x0);
  }

  const s = f.sid ? sessions.find((x) => x.id === f.sid) || null : null;
  const tS = init.tS;
  const errs = f.mode === 'flat' ? flatRead(f).err : {};
  const show = (k: FlatKey) => (seen.has(k) ? errs[k] : undefined);
  const src = (k: FlatKey) => (svFlat && f.stravaId && flatVal(f.flat, k) && flatVal(f.flat, k) === flatVal(svFlat, k) ? 'Strava' : undefined);
  const leave = (k: FlatKey) => (e: FocusEvent) => {
    /* entre las casillas del mismo campo (h:m:s) todavía no lo dejaste */
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setSeen((o) => (o.has(k) ? o : new Set(o).add(k)));
  };
  const setFl = (p: Partial<FlatV>) => setF((g) => setFlat(g, p));
  const check = flatPlanCheck(f);
  const paceTxt = f.flat.pace.m || f.flat.pace.s ? (f.flat.pace.m || '0') + ':' + (f.flat.pace.s || '0').padStart(2, '0') + ' /km' : '–';
  const shoes = (cfg.shoes || []).filter((z) => !z.retired || z.id === f.shoe);
  const svShown = !!(strava && strava.connected) || !!f.sv.list || !!f.stravaId;
  /* sin plan, el tipo se elige (también al editar: una libre arranca como fondo y se puede corregir) */
  const typePick =
    !s || !s.plan ? (
      <Segmented
        label="Tipo de sesión"
        value={f.type}
        onChange={(k: SessionType) => setF((g) => ({ ...g, type: k, picked: true }))}
        options={TYPE_KEYS.map((k) => ({ value: k, label: TYPES[k].label, color: typeColor(k) }))}
      />
    ) : null;
  /* lo que marca el reloj: los totales o las etapas */
  const fields = f.mode === 'flat' ? (
    <div className="p-dr-g2">
      <Field id="rf-date" label="Fecha">
        <Input id="rf-date" type="date" max={tS} value={f.date} onChange={(e) => setF((g) => ({ ...g, date: e.target.value }))} />
      </Field>
      <Field id="rf-dist" label="Distancia" src={src('dist')} error={show('dist')}>
        <UnitInput
          id="rf-dist"
          unit="km"
          placeholder="10,2"
          autoFocus={f.editing}
          invalid={!!show('dist')}
          value={f.flat.dist}
          onChange={(e) => setFl({ dist: e.target.value })}
          onBlur={leave('dist')}
        />
      </Field>
      <div onBlur={leave('t')}>
        <Field id="rf-t" label="Tiempo" src={src('t')} error={show('t')} group>
          <HmsInput id="rf-t" invalid={!!show('t')} value={f.flat.t} onChange={(t: Hms) => setFl({ t })} />
        </Field>
      </div>
      <div onBlur={leave('pace')}>
        {f.paceManual ? (
          <Field id="rf-pace" label={paceLabel(f.type)} error={show('pace')} help="Vacío, se calcula con distancia y tiempo." group>
            <MsInput id="rf-pace" invalid={!!show('pace')} value={f.flat.pace} onChange={(pace) => setFl({ pace })} />
          </Field>
        ) : (
          <Field id="rf-pace" label={paceLabel(f.type)} group>
            <div className="p-calc" aria-labelledby="rf-pace-l" role="group">
              <span id="rf-pace" aria-live="polite">
                {paceTxt}
              </span>
              <button type="button" className="p-lnk" onClick={() => setF((g) => ({ ...g, paceManual: true }))}>
                Cambiar
              </button>
            </div>
          </Field>
        )}
      </div>
      <Field id="rf-hr" label="FC media" src={src('hr')} error={show('hr')}>
        <UnitInput id="rf-hr" unit="lpm" inputMode="numeric" placeholder="140" invalid={!!show('hr')} value={f.flat.hr} onChange={(e) => setFl({ hr: e.target.value })} onBlur={leave('hr')} />
      </Field>
      <Field id="rf-hrmax" label="FC máxima" src={src('hrmax')} error={show('hrmax')}>
        <UnitInput
          id="rf-hrmax"
          unit="lpm"
          inputMode="numeric"
          placeholder="165"
          invalid={!!show('hrmax')}
          value={f.flat.hrmax}
          onChange={(e) => setFl({ hrmax: e.target.value })}
          onBlur={leave('hrmax')}
        />
      </Field>
    </div>
  ) : (
    <>
      <div className="p-dr-g2" style={{ marginBottom: 16 }}>
        <Field id="rf-date" label="Fecha">
          <Input id="rf-date" type="date" max={tS} value={f.date} onChange={(e) => setF((g) => ({ ...g, date: e.target.value }))} />
        </Field>
      </div>
      <LapsAiBox ai={ai} busy={aiBusy} note={aiNote} onFiles={aiLaps} />
      <p className="p-dr-hint" style={{ margin: '0 0 12px' }}>
        Cargá lo que marca tu reloj en cada etapa. Si terminó por distancia, alcanza con el tiempo; si terminó por tiempo, con la distancia.
      </p>
      <StageRows
        f={f}
        upd={setF}
        onLapAdded={(id) => {
          focusId.current = id;
        }}
      />
    </>
  );
  /* al editar no se elige la sesión: la sección 01 queda solo si hay tipo para elegir */
  const first = !f.editing || !!typePick;

  return (
    <PanelFrame
      eyebrow={cap(DF_LONG.format(f.editing ? pd(f.date) : new Date()))}
      title={f.editing ? 'Editar resultado' : 'Registrar'}
      onSubmit={save}
      err={err && err.at === f ? err.m : null}
      note={f.editing || demo ? null : 'Si recargás la página, lo cargado vuelve.'}
      foot={<PanelActions label="Guardar y ver puntaje" onSave={save} />}
    >
      {first ? (
        <PanelSection no="01" title="¿Qué sesión fue?">
          {!f.editing ? (
            <SessionPick
              pend={f.pend}
              sid={f.sid}
              onPick={(id) => {
                setF((g) => rfPick(g, id));
                setAiNote('');
              }}
            />
          ) : null}
          {!f.editing && s ? <PlanRef s={s} /> : null}
          {typePick}
        </PanelSection>
      ) : null}

      <PanelSection no={first ? '02' : '01'} title="Datos de la salida">
        {f.editing && s ? <PlanRef s={s} full /> : null}
        {svShown ? (
          <StravaFound f={f} onLoad={svLoad} onPick={svPick} />
        ) : strava && strava.configured !== false ? (
          <p className="p-dr-hint" style={{ marginTop: 0 }}>
            Con Strava conectado, tus salidas se cargan solas. <Link href="/ajustes">Conectalo en Ajustes</Link>.
          </p>
        ) : null}
        {f.stravaId ? (
          <More summary="Ver o corregir los datos" className="p-dr-more" open={dataOpen || undefined}>
            {fields}
          </More>
        ) : (
          fields
        )}
        {f.mode === 'flat' && (f.type === 'series' || f.type === 'tempo') ? (
          <p className="p-dr-hint">Usá el ritmo de las vueltas de tu reloj si podés: el promedio de toda la sesión incluye la entrada en calor y las pausas.</p>
        ) : null}
        {check ? (
          <Advice ok={check.ok}>
            <b>{check.ok ? 'Dentro del plan.' : 'Fuera del plan.'}</b> {check.txt}
          </Advice>
        ) : null}
      </PanelSection>

      <PanelSection no={first ? '03' : '02'} title="¿Cómo te sentiste?">
        <div className="p-feel" role="group" aria-label="Sensación de 1 a 10">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button key={n} id={'rf-feel-' + n} type="button" aria-label={n + ' de 10: ' + FEEL_T(n)} aria-pressed={f.feel === n} style={cssVars({ '--fc': FEEL_C(n) })} onClick={() => setF((g) => ({ ...g, feel: n }))}>
              {n}
            </button>
          ))}
        </div>
        <div className="p-feel-l">
          <span>Muy mal</span>
          <span aria-live="polite">
            {f.feel ? (
              <>
                <b>{f.feel}</b> · {FEEL_T(f.feel)}
              </>
            ) : (
              'Elegí un número'
            )}
          </span>
          <span>Excelente</span>
        </div>
        <More summary="Más detalles: molestia, zapatillas, clima y notas" className="p-dr-more" open={moreOpen || undefined}>
          <div className="p-dr-g2" style={{ gridTemplateColumns: 'auto minmax(0, 1fr)' }}>
            <div className="p-fld">
              <span className="p-flab">Molestia</span>
              <Choices
                label="¿Alguna molestia o dolor?"
                value={f.pain ? '1' : '0'}
                onChange={(v) => setF((g) => ({ ...g, pain: v === '1' ? 1 : 0 }))}
                options={[
                  { value: '0', label: 'No' },
                  { value: '1', label: 'Sí' },
                ]}
              />
            </div>
            {shoes.length ? (
              <div className="p-fld">
                <span className="p-flab">Zapatillas</span>
                <Choices
                  label="Zapatillas"
                  value={f.shoe || ''}
                  onChange={(v) => setF((g) => ({ ...g, shoe: v || '' }))}
                  options={[...shoes.map((z) => ({ value: z.id, label: z.name, sub: fmt(shoeKm(z), 0) + ' km' })), { value: '', label: 'Ninguna' }]}
                />
              </div>
            ) : null}
          </div>
          <div className="p-fld" style={{ marginTop: 16 }}>
            <span className="p-flab">Clima</span>
            <Choices toggle label="Clima" value={f.weather || null} onChange={(v) => setF((g) => ({ ...g, weather: v || '' }))} options={WEATHER.map((w) => ({ value: w, label: w, icon: WEATHER_IC[w] }))} />
          </div>
          <div style={{ marginTop: 16 }}>
            <Field id="rf-notes" label="Notas">
              <TextArea id="rf-notes" rows={2} placeholder="Cómo estuvo, qué notaste…" value={f.notes} onChange={(e) => setF((g) => ({ ...g, notes: e.target.value }))} />
            </Field>
          </div>
        </More>
      </PanelSection>
    </PanelFrame>
  );
}
