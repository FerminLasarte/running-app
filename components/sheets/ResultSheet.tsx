'use client';
/* Hoja «Registrar resultado» / «Editar resultado» (openResult, paintResult, Strava, capturas y saveResult). */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { SheetFrame } from './SheetFrame';
import { openSheet, useSheetDirty } from '@/lib/sheets';
import { useApp } from '@/lib/store';
import { blockDemo, saveSession } from '@/lib/data/actions';
import { draftClear, useDraft } from '@/lib/data/draft';
import { AiError } from '@/lib/ai/client';
import { svCall, stravaErrMsg } from '@/lib/strava/client';
import { activeShoes, shoeById, TYPE_KEYS, TYPES } from '@/lib/domain/config';
import { DEC_MIN_ACT, decLine, svStreams } from '@/lib/domain/dec';
import { stepsBrief } from '@/lib/domain/stages';
import { planSummary, sdate } from '@/lib/domain/stats';
import { announceProgress, gotIds } from '@/lib/domain/trophies';
import type { Decoupling } from '@/lib/domain/types';
import { dateLabel, todayS, WEATHER } from '@/lib/domain/util';
import { SV_DAYS, type SvItem } from '@/lib/domain/week';
import { xpState } from '@/lib/domain/xp';
import { aiErr, sampleRun } from '@/lib/domain/planForm';
import {
  buildResult,
  exOf,
  fillVueltas,
  lapsPrompt,
  paceLabel,
  resultDraftData,
  resultInit,
  rfPick,
  setFlat,
  svActs,
  svFill,
  type ResF,
  type ResultProps,
  type Vuelta,
} from '@/lib/domain/resultForm';
import { HmsInput, MsInput } from '@/components/ui/fields';
import { FeelPicker } from '@/components/forms/FeelPicker';
import { StageRows } from '@/components/forms/StageRows';
import { StravaBox } from '@/components/forms/StravaBox';
import { LapsAiBox, useAi } from '@/components/forms/AiBox';

const svPickStart = (g: ResF, id: string): ResF => ({ ...g, sv: { ...g.sv, busy: true, pick: id, msg: 'Leyendo el detalle de la corrida…' } });

export default function ResultSheet(props: ResultProps) {
  const [init] = useState(() => {
    let f = resultInit(props);
    /* desde la Semana: arranca leyendo la corrida elegida (svGo) */
    const a0 = props.sv && props.sv.pick ? props.sv.list.find((x) => x.id === props.sv!.pick) || null : null;
    const snap = JSON.stringify(resultDraftData(f));
    if (a0) f = svPickStart(f, a0.id);
    return { f, snap, a0, tS: todayS() };
  });
  const [f, setF] = useState<ResF>(init.f);
  const [err, setErr] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const sessions = useApp((st) => st.sessions);
  const cfg = useApp((st) => st.cfg);
  const ai = useAi();
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
      setF((g) => {
        const n = svFill({ ...g, dec: dec || null, sv: { ...g.sv, busy: false } }, a, p || {});
        return dec ? { ...n, sv: { ...n.sv, msg: n.sv.msg + ' Deriva cardíaca: ' + decLine(dec) + '.' } } : n;
      });
    } catch (e) {
      if (!alive.current) return;
      setF((g) => ({ ...g, sv: { ...g.sv, busy: false, pick: null, msg: stravaErrMsg(e) } }));
    }
  }
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !init.a0) return;
    started.current = true;
    svPickRun(init.a0.id, init.a0);
    // solo al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function svPick(id: string) {
    const a = (f.sv.list || []).find((x) => x.id === id);
    if (!a) return;
    setF((g) => svPickStart(g, id));
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
        same = list.filter((a) => a.date === cur.date);
      if (same.length === 1) {
        setF((g) => svPickStart({ ...g, sv: { ...g.sv, list, busy: false } }, same[0].id));
        await svPickRun(same[0].id, same[0]);
        return;
      }
      const msg = list.length ? 'Elegí la corrida que corresponde.' : 'No encontré corridas nuevas en los últimos ' + SV_DAYS + ' días.';
      setF((g) => ({ ...g, sv: { ...g.sv, list, busy: false, msg } }));
    } catch (e) {
      if (!alive.current) return;
      setF((g) => ({ ...g, sv: { ...g.sv, busy: false, msg: stravaErrMsg(e) } }));
    }
  }

  /* ---- laps desde capturas ---- */
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
          if (n > 1) setAiNote('Leyendo lote ' + i + ' de ' + n + '… puede tardar un rato, no cierres esta pantalla.');
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

  async function save() {
    const r = buildResult(f);
    if ('err' in r) {
      setErr(r.err);
      return;
    }
    if (blockDemo()) return;
    const had = gotIds(),
      x0 = xpState();
    await saveSession(r.s);
    draftClear();
    openSheet('score', { id: r.s.id, fresh: true });
    announceProgress(had, x0);
  }

  const s = f.sid ? sessions.find((x) => x.id === f.sid) || null : null;
  const rShoe = f.editRes && f.editRes.shoe ? f.editRes.shoe : '';
  const more = !!(f.editing && f.editRes && (f.editRes.weather || f.editRes.notes));
  const tS = init.tS;

  /* en orden de uso: qué sesión, los datos (o Strava), cómo te sentiste y, plegado, lo opcional */
  return (
    <SheetFrame
      title={f.editing ? 'Editar resultado' : 'Registrar resultado'}
      foot={
        <button className="btn pri blk" data-a="rf-save" onClick={save}>
          Guardar y ver puntaje
        </button>
      }
    >
      <div id="rf-pick">
        {!f.editing ? (
          <div className="field">
            <span className="lab">¿Qué sesión fue?</span>
            <div className="chips">
              {f.pend.map((p) => (
                <button
                  key={p.id}
                  className="chip"
                  data-a="rf-pick"
                  data-id={p.id}
                  aria-pressed={f.sid === p.id}
                  onClick={() => {
                    setF((g) => rfPick(g, p.id));
                    setAiNote('');
                  }}
                >
                  <span className="dot" style={{ background: TYPES[p.type].t }}></span>
                  {TYPES[p.type].label + ' · ' + dateLabel(sdate(p))}
                </button>
              ))}
              <button
                className="chip"
                data-a="rf-pick"
                data-id=""
                aria-pressed={!f.sid}
                onClick={() => {
                  setF((g) => rfPick(g, null));
                  setAiNote('');
                }}
              >
                Sesión libre
              </button>
            </div>
          </div>
        ) : null}
        {s && s.plan ? (
          <div className="ref-plan" style={{ '--tc': TYPES[s.type].t } as CSSProperties}>
            <b>Plan: {TYPES[s.type].label}</b>
            {s.plan.steps ? stepsBrief(s.plan.steps) : planSummary(s.plan)}
            {s.plan.notes ? (
              <>
                <br />
                <span className="mut">{s.plan.notes}</span>
              </>
            ) : null}
          </div>
        ) : (
          <div className="field">
            <span className="lab">Tipo de sesión</span>
            <div className="chips">
              {TYPE_KEYS.map((k) => (
                <button key={k} className="chip tchip" data-a="rf-type" data-v={k} aria-pressed={f.type === k} style={{ '--tc': TYPES[k].t } as CSSProperties} onClick={() => setF((g) => ({ ...g, type: k }))}>
                  <span className="dot" style={{ background: TYPES[k].t }}></span>
                  {TYPES[k].label}
                </button>
              ))}
            </div>
            <p className="hint">Sin plan no hay puntaje, pero queda en tu historial.</p>
          </div>
        )}
      </div>
      <div id="rf-strava">
        <StravaBox sv={f.sv} onLoad={svLoad} onPick={svPick} />
      </div>
      <h3 className="fsec">Datos de la salida</h3>
      <div className="field">
        <label htmlFor="rf-date">Fecha</label>
        <input className="in" type="date" id="rf-date" max={tS} value={f.date} onChange={(e) => setF((g) => ({ ...g, date: e.target.value }))} />
      </div>
      <div id="rf-main">
        {f.mode === 'flat' ? (
          <>
            <div className="g2">
              <div className="field">
                <label htmlFor="rf-dist">Distancia (km)</label>
                <input className="in" id="rf-dist" inputMode="decimal" placeholder="10,2" value={f.flat.dist} onChange={(e) => setF((g) => setFlat(g, { dist: e.target.value }))} />
              </div>
              <div className="field">
                <span className="lab">Tiempo</span>
                <HmsInput id="rf-t" value={f.flat.t} onChange={(t) => setF((g) => setFlat(g, { t }))} />
              </div>
            </div>
            <div className="field">
              <span className="lab" id="rf-pace-lab">
                {paceLabel(f.type)}
              </span>
              <MsInput id="rf-pace" unit="min/km" ph={['5', '30']} labels={['minutos del ritmo', 'segundos del ritmo']} value={f.flat.pace} onChange={(pace) => setF((g) => setFlat(g, { pace }))} />
              <p className="hint" id="rf-pace-hint">
                {f.type === 'series' || f.type === 'tempo'
                  ? 'Usá el ritmo de las vueltas de tu reloj si podés. El promedio de toda la sesión incluye la entrada en calor y las pausas.'
                  : 'Se calcula solo con distancia y tiempo. Cambialo si tu reloj marca otro.'}
              </p>
            </div>
            <div className="g2">
              <div className="field">
                <label htmlFor="rf-hr">FC promedio</label>
                <input className="in" id="rf-hr" inputMode="numeric" placeholder="140" value={f.flat.hr} onChange={(e) => setF((g) => setFlat(g, { hr: e.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="rf-hrmax">FC máxima</label>
                <input className="in" id="rf-hrmax" inputMode="numeric" placeholder="165" value={f.flat.hrmax} onChange={(e) => setF((g) => setFlat(g, { hrmax: e.target.value }))} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div id="rf-laps">
              <LapsAiBox ai={ai} busy={aiBusy} note={aiNote} onFiles={aiLaps} />
            </div>
            <p className="hint" style={{ marginBottom: 14 }}>
              Cargá lo que marca tu reloj en cada vuelta. Si una etapa terminó por distancia, solo necesito el tiempo; si terminó por tiempo, solo la distancia. Si no la hiciste, tocá «No la hice».
            </p>
            <div id="rf-rows">
              <StageRows
                f={f}
                upd={setF}
                onLapAdded={(id) => {
                  focusId.current = id;
                }}
              />
            </div>
          </>
        )}
      </div>
      <h3 className="fsec">¿Cómo te sentiste?</h3>
      <FeelPicker feel={f.feel} onPick={(n) => setF((g) => ({ ...g, feel: n }))} />
      <div className="frow">
        <span>¿Alguna molestia o dolor?</span>
        <div className="chips">
          <button className="chip s" data-a="rf-pain" data-v="0" aria-pressed={f.pain === 0} onClick={() => setF((g) => ({ ...g, pain: 0 }))}>
            No
          </button>
          <button className="chip s" data-a="rf-pain" data-v="1" aria-pressed={f.pain === 1} onClick={() => setF((g) => ({ ...g, pain: 1 }))}>
            Sí
          </button>
        </div>
      </div>
      <details className="fmore" open={more}>
        <summary>
          Más detalles <small>zapatillas, clima y notas</small>
        </summary>
        {activeShoes().length || (rShoe && shoeById(rShoe)) ? (
          <div className="field">
            <span className="lab">Zapatillas</span>
            <div className="chips">
              {(cfg.shoes || [])
                .filter((z) => !z.retired || z.id === rShoe)
                .map((z) => (
                  <button key={z.id} className="chip s" data-a="rf-shoe" data-v={z.id} aria-pressed={(f.shoe || '') === z.id} onClick={() => setF((g) => ({ ...g, shoe: z.id }))}>
                    {z.name}
                  </button>
                ))}
              <button className="chip s" data-a="rf-shoe" data-v="" aria-pressed={!f.shoe} onClick={() => setF((g) => ({ ...g, shoe: '' }))}>
                Ninguna
              </button>
            </div>
          </div>
        ) : null}
        <div className="field">
          <span className="lab">Clima</span>
          <div className="chips">
            {WEATHER.map((w) => (
              <button key={w} className="chip s" data-a="rf-weather" data-v={w} aria-pressed={f.weather === w} onClick={() => setF((g) => ({ ...g, weather: g.weather === w ? '' : w }))}>
                {w}
              </button>
            ))}
          </div>
        </div>
        <div className="field" style={{ marginBottom: 4 }}>
          <label htmlFor="rf-notes">Notas</label>
          <textarea className="in" id="rf-notes" rows={2} value={f.notes} onChange={(e) => setF((g) => ({ ...g, notes: e.target.value }))} />
        </div>
      </details>
      <div className="err" id="rf-err" role="alert">
        {err}
      </div>
    </SheetFrame>
  );
}
