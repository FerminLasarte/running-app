'use client';
/* Panel «Planificar» / «Editar plan»: tipo y día (avisa en el momento si quedan dos fuertes seguidas o dos el mismo
   día, con moveAdvice) → la estructura, desde una sesión tuya anterior, la plantilla del tipo o una captura, como
   barra y como lista de tramos → notas. Calcula km y minutos y se guarda con ⌘↵. Lógica en lib/domain/planForm.ts. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { closeSheet, useSheetDirty } from '@/lib/sheets';
import { useApp } from '@/lib/store';
import { deleteSession, saveSession, toast } from '@/lib/data/actions';
import { useDraft } from '@/lib/data/draft';
import { AiError } from '@/lib/ai/client';
import { TYPE_KEYS, TYPES } from '@/lib/domain/config';
import { cleanSteps, planTotals } from '@/lib/domain/stages';
import { sdate } from '@/lib/domain/stats';
import type { Session, SessionType } from '@/lib/domain/types';
import { WD, addDays, dShort, dateLabel, fmt, isoWeek, mondayOf, pd, todayS, ymd } from '@/lib/domain/util';
import { moveAdvice, planFromSteps } from '@/lib/domain/week';
import {
  aiErr,
  applyAiPlan,
  buildPlan,
  pfType,
  planDraftData,
  planEstSec,
  planInit,
  planPrompt,
  planTemplates,
  sampleRun,
  setSteps,
  template,
  type AiPlanJson,
  type PlanDraft,
  type PlanF,
} from '@/lib/domain/planForm';
import { Button, Choices, useRoving } from '@/components/pista/controls';
import { Field, TextArea } from '@/components/pista/fields';
import { StructureBar } from '@/components/pista/meters';
import { briefOf, segsOf } from '@/components/pista/session';
import { cssVars, cx, typeColor } from '@/components/pista/util';
import { Advice, PanelActions, PanelFrame, PanelSection } from './PanelFrame';
import { PlanAiBox, useAi } from './AiBox';
import { StepsEditor } from './StepsEditor';

/* para qué sirve cada tipo, en pocas palabras (cabe en el botón) */
const SHORT: Record<SessionType, string> = { fondo: 'Largo y fácil, por FC', series: 'Rápido con pausas, por ritmo', tempo: 'Sostenido, por ritmo', regen: 'Muy suave, por FC', test: 'Esfuerzo máximo' };
const NEW_ID = 'nueva';
/** lo que ya hay ese día (hecho o planificado), sin contar la sesión que se edita */
const dayHas = (sessions: Session[], sid: string | null, d: string) => sessions.filter((s) => s.id !== sid && sdate(s) === d);

function TypePick({ value, onPick }: { value: SessionType; onPick: (t: SessionType) => void }) {
  const cur = TYPE_KEYS.indexOf(value),
    bind = useRoving(TYPE_KEYS.length, cur, (i) => onPick(TYPE_KEYS[i]));
  return (
    <div className="p-ptype" role="radiogroup" aria-label="Tipo de sesión">
      {TYPE_KEYS.map((k, i) => (
        <button key={k} type="button" role="radio" aria-checked={k === value} autoFocus={i === cur} style={cssVars({ '--tc': typeColor(k) })} onClick={() => onPick(k)} {...bind(i)}>
          {TYPES[k].label}
          <small>{SHORT[k]}</small>
        </button>
      ))}
    </div>
  );
}

/** la semana del día elegido; las flechas pasan a la anterior o a la siguiente (mismo día de la semana) */
function DayPick({ date, sid, sessions, onPick }: { date: string; sid: string | null; sessions: Session[]; onPick: (d: string) => void }) {
  const mon = mondayOf(pd(date)),
    tS = todayS(),
    days = WD.map((n, i) => ymd(addDays(mon, i))),
    cur = days.indexOf(date),
    bind = useRoving(7, cur, (i) => onPick(days[i]));
  return (
    <div className="p-pweek">
      <button type="button" className="ib" aria-label="Semana anterior" onClick={() => onPick(ymd(addDays(pd(date), -7)))}>
        <CaretLeft aria-hidden="true" />
      </button>
      <div className="p-pdays" role="radiogroup" aria-label={'Día, semana ' + isoWeek(mon)}>
        {days.map((d, i) => {
          const has = dayHas(sessions, sid, d)[0];
          return (
            <button key={d} type="button" role="radio" aria-checked={d === date} className={cx(d === tS && 'today')} aria-label={dateLabel(d) + (has ? ', ya tiene ' + TYPES[has.type].label.toLowerCase() : '')} onClick={() => onPick(d)} {...bind(i)}>
              <span className="lbl">{WD[i]}</span>
              <span className="disp">{pd(d).getDate()}</span>
              {has ? <span className="busy" style={cssVars({ '--tc': typeColor(has.type) })} /> : null}
            </button>
          );
        })}
      </div>
      <button type="button" className="ib" aria-label="Semana siguiente" onClick={() => onPick(ymd(addDays(pd(date), 7)))}>
        <CaretRight aria-hidden="true" />
      </button>
    </div>
  );
}

export default function PlanPanel(props: { id?: string | null; date?: string; draft?: PlanDraft | null }) {
  const [init] = useState(() => {
    const f = planInit(props);
    return { f, snap: JSON.stringify(planDraftData(f)) };
  });
  const [f, setF] = useState<PlanF>(init.f);
  const [err, setErr] = useState<{ m: string; at: PlanF } | null>(null);
  const [delAsk, setDelAsk] = useState(false);
  /* de dónde salió la estructura: una sesión anterior (su id), la plantilla o una captura */
  const [tpl, setTpl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ m: string; bad: boolean }>({ m: '', bad: false });
  const sessions = useApp((s) => s.sessions);
  const ai = useAi();
  const tok = useRef(0);
  /* si el panel se cierra mientras Claude lee, la respuesta se descarta */
  useEffect(
    () => () => {
      tok.current++;
    },
    [],
  );

  const data = useMemo(() => planDraftData(f), [f]);
  useDraft(data);
  useSheetDirty(JSON.stringify(data) !== init.snap);

  const setAiNote = (m: string, bad = false) => setNote({ m, bad });
  async function aiPlan(files: File[] | null, text: string | null) {
    if (!ai || busy) return;
    const t = ++tok.current;
    setBusy(true);
    setAiNote('Leyendo el entrenamiento… puede tardar unos segundos.');
    try {
      const j = await sampleRun<AiPlanJson>(
        ai,
        files,
        (pv, i, n) => planPrompt(text, pv, i, n),
        (i, n) => {
          if (n > 1) setAiNote('Leyendo lote ' + i + ' de ' + n + '… puede tardar un rato.');
        },
      );
      if (tok.current !== t) return;
      const steps = cleanSteps(j && j.pasos);
      if (!steps.length) throw new AiError('invalid_json');
      setF((g) => applyAiPlan(g, steps, j!));
      setBusy(false);
      setAiNote('Listo. Revisá que los tramos estén bien y corregí lo que haga falta.');
    } catch (e) {
      if (tok.current !== t) return;
      setBusy(false);
      setAiNote(aiErr(e), true);
    }
  }

  /* la sesión como quedaría: para los avisos, la barra y los totales */
  const steps = cleanSteps(data.steps),
    prov: Session = { id: f.sid || NEW_ID, created: 0, updated: 0, type: f.type, plan: planFromSteps(f.date, f.type, steps), result: null, missed: false },
    tot = planTotals(steps),
    min = Math.round(planEstSec(steps) / 60),
    occ = dayHas(sessions, f.sid, f.date),
    adv = moveAdvice(prov, f.date);
  const tpls = planTemplates(f.type, f.sid);
  const d = pd(f.date),
    dayTxt = WD[(d.getDay() + 6) % 7] + ' ' + d.getDate(),
    mon = mondayOf(d);

  function save() {
    const r = buildPlan(f);
    setF(r.f);
    if ('err' in r) {
      setErr({ m: r.err, at: r.f });
      return;
    }
    saveSession(r.s);
    closeSheet();
    toast(f.sid ? 'Plan guardado' : TYPES[f.type].label + ' planificada para el ' + dateLabel(f.date));
  }

  const foot = delAsk ? (
    <>
      <Button variant="ghost" autoFocus onClick={() => setDelAsk(false)}>
        Cancelar
      </Button>
      <Button className="dng" onClick={() => deleteSession(f.sid!, closeSheet)}>
        Sí, eliminar
      </Button>
    </>
  ) : (
    <>
      {init.f.sid ? (
        <Button variant="ghost" className="dng" onClick={() => setDelAsk(true)}>
          Eliminar
        </Button>
      ) : null}
      <PanelActions label={init.f.sid ? 'Guardar cambios' : 'Planificar el ' + dayTxt.toLowerCase()} onSave={save} />
    </>
  );

  return (
    <PanelFrame
      eyebrow={'Semana ' + isoWeek(mon) + ' · ' + dShort(mon) + ' – ' + dShort(addDays(mon, 6))}
      title={init.f.sid ? 'Editar plan' : 'Planificar'}
      onSubmit={save}
      err={err && err.at === f ? err.m : null}
      note={delAsk ? '¿Eliminar esta sesión? No se puede deshacer.' : dayTxt + ' · ' + TYPES[f.type].label + ' · ' + fmt(tot.dist, 1) + ' km'}
      foot={foot}
    >
      <PanelSection no="01" title="Tipo y día">
        <TypePick
          value={f.type}
          onPick={(k) => {
            setF((g) => pfType(g, k));
            setTpl(null);
          }}
        />
        <DayPick date={f.date} sid={f.sid} sessions={sessions} onPick={(date) => setF((g) => ({ ...g, date }))} />
        {occ.length || adv.length ? (
          <Advice>
            {occ.length ? (
              <p>
                El {dateLabel(f.date)} ya tenés {occ.map((x) => TYPES[x.type].label.toLowerCase()).join(' y ')}: si seguís, quedan dos sesiones ese día.
              </p>
            ) : null}
            {adv.map((a, i) => (
              <p key={i}>{a}</p>
            ))}
          </Advice>
        ) : (
          <Advice ok>Bien: no quedan dos sesiones fuertes seguidas ni dos el mismo día.</Advice>
        )}
      </PanelSection>

      <PanelSection
        no="02"
        title="Estructura"
        aside={
          tot.dist > 0 ? (
            <>
              <b>{fmt(tot.dist, 1)} km</b> · ~{min} min
            </>
          ) : null
        }
      >
        <div className="p-ptpl">
          <span className="lbl">Partir de</span>
          <Choices
            label="Partir de"
            value={tpl}
            onChange={(v) => {
              if (v == null) return;
              setTpl(v);
              if (v === 'ai') return;
              const src = tpls.find((s) => s.id === v);
              setF((g) => setSteps(g, src ? cleanSteps(src.plan.steps) : template(g.type)));
            }}
            options={[
              ...tpls.map((s) => ({ value: s.id, label: (briefOf(s) || TYPES[s.type].label) + ' · ' + dShort(pd(s.plan.date)) })),
              { value: 'tpl', label: 'Plantilla del tipo' },
              { value: 'ai', label: 'Desde una captura', icon: Camera, disabled: !ai, title: ai ? undefined : 'Leer capturas no está activo en esta cuenta' },
            ]}
          />
        </div>
        {tpl === 'ai' && ai ? (
          <PlanAiBox
            ai={ai}
            busy={busy}
            note={note.m}
            noteBad={note.bad}
            text={f.aiText}
            onText={(v) => setF((g) => ({ ...g, aiText: v }))}
            onFiles={(fs) => aiPlan(fs, null)}
            onTextGo={() => {
              const t = f.aiText.trim();
              if (!t) {
                setAiNote('Escribí o pegá el texto del entrenamiento.', true);
                return;
              }
              aiPlan(null, t);
            }}
          />
        ) : null}
        {steps.length ? (
          <div className="p-pprev">
            <StructureBar
              segs={segsOf(prov)}
              color={typeColor(f.type)}
              height={60}
              plan
              axis={['0 km', fmt(tot.dist / 2, 1) + ' km', fmt(tot.dist, 1) + ' km']}
              label={'Estructura: ' + fmt(tot.dist, 1) + ' km'}
            />
          </div>
        ) : null}
        <StepsEditor f={f} upd={setF} />
        {tot.timeOnly > 0 ? <p className="p-dr-hint">Más {Math.round(tot.timeOnly / 60)} min en tramos por tiempo (las pausas).</p> : null}
      </PanelSection>

      <PanelSection no="03" title="Notas">
        <Field id="pf-notes" label="Para el día" help="Las ves en el plan y en el detalle de la sesión.">
          <TextArea id="pf-notes" hasHelp rows={2} placeholder="Dónde, con quién, qué cuidar…" value={f.notes} onChange={(e) => setF((g) => ({ ...g, notes: e.target.value }))} />
        </Field>
      </PanelSection>
    </PanelFrame>
  );
}
