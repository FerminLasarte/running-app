'use client';
/* Hoja «Planificar sesión» / «Editar plan» (openPlan, paintPlan, savePlan). */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { SheetFrame } from './SheetFrame';
import { DelConfirm } from './DelConfirm';
import { closeSheet, useSheetDirty } from '@/lib/sheets';
import { saveSession, toast } from '@/lib/data/actions';
import { useDraft } from '@/lib/data/draft';
import { AiError } from '@/lib/ai/client';
import { TYPE_KEYS, TYPES } from '@/lib/domain/config';
import { cleanSteps } from '@/lib/domain/stages';
import type { SessionType } from '@/lib/domain/types';
import { aiErr, applyAiPlan, buildPlan, pfType, planDraftData, planInit, planPrompt, sampleRun, type AiPlanJson, type PlanDraft, type PlanF } from '@/lib/domain/planForm';
import { StepsList } from '@/components/forms/StepEditor';
import { PlanAiBox, useAi } from '@/components/forms/AiBox';

export default function PlanSheet(props: { id?: string | null; date?: string; draft?: PlanDraft | null }) {
  const [init] = useState(() => {
    const f = planInit(props);
    return { f, snap: JSON.stringify(planDraftData(f)) };
  });
  const [f, setF] = useState<PlanF>(init.f);
  const [err, setErr] = useState('');
  const [delAsk, setDelAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ m: string; bad: boolean }>({ m: '', bad: false });
  const ai = useAi();
  const tok = useRef(0);
  /* si la hoja se cierra mientras Claude lee, la respuesta se descarta */
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
      setAiNote('Listo. Revisá que las etapas estén bien y corregí lo que haga falta.');
    } catch (e) {
      if (tok.current !== t) return;
      setBusy(false);
      setAiNote(aiErr(e), true);
    }
  }

  function save() {
    const r = buildPlan(f);
    setF(r.f);
    if ('err' in r) {
      setErr(r.err);
      return;
    }
    saveSession(r.s);
    closeSheet();
    toast('Plan guardado');
  }

  const foot = delAsk ? (
    <DelConfirm id={f.sid!} />
  ) : (
    <>
      <button className="btn pri blk" data-a="pf-save" onClick={save}>
        Guardar plan
      </button>
      {init.f.sid ? (
        <button className="btn dng blk" data-a="del-ask" onClick={() => setDelAsk(true)}>
          Eliminar sesión
        </button>
      ) : null}
    </>
  );

  return (
    <SheetFrame title={init.f.sid ? 'Editar plan' : 'Planificar sesión'} foot={foot}>
      <h3 className="fsec" style={{ marginTop: 0 }}>
        Tipo de sesión
      </h3>
      <div className="tgrid">
        {TYPE_KEYS.map((k: SessionType) => (
          <button key={k} className="tchip" data-a="pf-type" data-v={k} style={{ '--tc': TYPES[k].t } as CSSProperties} aria-pressed={f.type === k} onClick={() => setF((g) => pfType(g, k))}>
            <i></i>
            {TYPES[k].label}
          </button>
        ))}
      </div>
      <p className="hint" id="pf-hint" style={{ margin: '8px 2px 0' }}>
        {TYPES[f.type].hint}
      </p>
      <div className="field" style={{ marginTop: 18 }}>
        <label htmlFor="pf-date">Fecha</label>
        <input className="in" type="date" id="pf-date" value={f.date} onChange={(e) => setF((g) => ({ ...g, date: e.target.value }))} />
      </div>
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
      <h3 className="fsec">Etapas</h3>
      <div id="pf-steps">
        <StepsList f={f} upd={setF} />
      </div>
      <div className="field">
        <label htmlFor="pf-notes">Notas (opcional)</label>
        <textarea className="in" id="pf-notes" rows={2} value={f.notes} onChange={(e) => setF((g) => ({ ...g, notes: e.target.value }))} />
      </div>
      <div className="err" id="pf-err" role="alert">
        {err}
      </div>
    </SheetFrame>
  );
}
