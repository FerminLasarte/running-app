'use client';
/* Tramos del plan: una fila por tramo, los bloques de repeticiones que se suman y restan, y el tramo abierto que se
   edita ahí mismo (Enter o «Listo» lo cierra). La lógica es la de lib/domain/planForm.ts. */
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowUp, Plus, Repeat, X } from '@phosphor-icons/react';
import { ZN, zoneRange } from '@/lib/domain/config';
import { KINDS, stepDesc, stepTgt } from '@/lib/domain/stages';
import type { StepKind } from '@/lib/domain/types';
import { edAdd, edDel, edDone, edEm, edKind, edMove, edOpen, edTm, edZone, emOf, repDel, repN, tmOf, type EdFields, type EdStep, type PlanF } from '@/lib/domain/planForm';
import { Button, Choices, Segmented, Stepper } from '@/components/pista/controls';
import { Field, MsInput, UnitInput } from '@/components/pista/fields';
import { cssVars } from '@/components/pista/util';

type Upd = (fn: (f: PlanF) => PlanF) => void;
const KIND_KEYS = Object.keys(KINDS) as StepKind[];
const rowId = (path: string) => 'st-' + path;

function MoveBtns({ path, label, upd }: { path: string; label: string; upd: Upd }) {
  return (
    <span className="mv">
      <button type="button" className="ib" aria-label={'Subir ' + label} onClick={() => upd((f) => edMove(f, path, -1))}>
        <ArrowUp aria-hidden="true" />
      </button>
      <button type="button" className="ib" aria-label={'Bajar ' + label} onClick={() => upd((f) => edMove(f, path, 1))}>
        <ArrowDown aria-hidden="true" />
      </button>
    </span>
  );
}

function StepRow({ st, path, f, upd, onClose }: { st: EdStep; path: string; f: PlanF; upd: Upd; onClose: (path: string) => void }) {
  const K = KINDS[st.k];
  if (f.edit === path) return <StepForm st={st} ed={f.ed} upd={upd} onClose={() => onClose(path)} />;
  const tg = stepTgt(st);
  return (
    <li className="p-st" style={cssVars({ '--kc': K.c })}>
      <button type="button" className="go" id={rowId(path)} aria-label={'Editar ' + K.l.toLowerCase() + ': ' + (stepDesc(st) || 'sin medida')} onClick={() => upd((g) => edOpen(g, path))}>
        <span className="k">{K.l}</span>
        <span className="v">
          {stepDesc(st) || 'Sin medida'}
          {tg ? <span className="tgt">{tg}</span> : null}
        </span>
      </button>
      <MoveBtns path={path} label={K.l.toLowerCase()} upd={upd} />
    </li>
  );
}

function StepForm({ st, ed, upd, onClose }: { st: EdStep; ed: EdFields; upd: Upd; onClose: () => void }) {
  const em = emOf(st),
    tm = tmOf(st);
  const set = (p: Partial<EdFields>) => upd((f) => ({ ...f, ed: { ...f.ed, ...p } }));
  /* Enter en un campo cierra el tramo (⌘↵ guarda todo el plan) */
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.metaKey || e.ctrlKey || (e.target as HTMLElement).tagName !== 'INPUT') return;
    e.preventDefault();
    upd(edDone);
    onClose();
  };
  return (
    <li className="p-st ed" style={cssVars({ '--kc': KINDS[st.k].c })} onKeyDown={onKeyDown}>
      <Segmented label="Qué tramo es" value={st.k} onChange={(k: StepKind) => upd((f) => edKind(f, k))} options={KIND_KEYS.map((k) => ({ value: k, label: KINDS[k].l }))} />
      <div className="p-fld" style={{ marginTop: 14 }}>
        <span className="p-flab">Termina por</span>
        <Segmented
          label="Termina por"
          value={em}
          onChange={(v: 'dist' | 'dur') => upd((f) => edEm(f, v))}
          options={[
            { value: 'dist', label: 'Distancia' },
            { value: 'dur', label: 'Tiempo' },
          ]}
        />
        {em === 'dist' ? (
          <UnitInput id="ed-dist" unit="km" aria-label="Distancia en km" placeholder="1,2" autoFocus value={ed.dist} onChange={(e) => set({ dist: e.target.value })} />
        ) : (
          <div className="p-fld">
            <span className="p-flab p-sr" id="ed-dur-l">
              Duración
            </span>
            <MsInput id="ed-dur" value={{ m: ed.dm, s: ed.ds }} ph={{ m: '2' }} onChange={(v) => set({ dm: v.m, ds: v.s })} />
          </div>
        )}
      </div>
      {st.k !== 'rec' ? (
        <div className="p-fld" style={{ marginTop: 14 }}>
          <span className="p-flab">Objetivo</span>
          <Segmented
            label="Objetivo"
            value={tm}
            onChange={(v: 'none' | 'pace' | 'hr') => upd((f) => edTm(f, v))}
            options={[
              { value: 'none', label: 'Sin objetivo' },
              { value: 'pace', label: 'Ritmo' },
              { value: 'hr', label: 'FC' },
            ]}
          />
          {tm === 'pace' ? (
            <>
              <div className="p-dr-g2">
                <Field id="ed-pa" label="Más rápido" group>
                  <MsInput id="ed-pa" ph={{ m: '4', s: '30' }} value={{ m: ed.pam, s: ed.pas }} onChange={(v) => set({ pam: v.m, pas: v.s })} />
                </Field>
                <Field id="ed-pb" label="Más lento" group>
                  <MsInput id="ed-pb" ph={{ m: '4', s: '40' }} value={{ m: ed.pbm, s: ed.pbs }} onChange={(v) => set({ pbm: v.m, pbs: v.s })} />
                </Field>
              </div>
              <p className="p-dr-hint">En minutos por km, como el rango de tu reloj. Si cargás solo uno, uso ±5 segundos.</p>
            </>
          ) : null}
          {tm === 'hr' ? (
            <>
              <Choices
                label="Zona de FC"
                value={null}
                onChange={(v) => v != null && upd((f) => edZone(f, +v))}
                options={ZN.map((q, i) => {
                  const r = zoneRange(i);
                  return { value: String(i), label: q[0], sub: r[0] + '–' + r[1] };
                })}
              />
              <div className="p-dr-g2">
                <Field id="ed-hl" label="FC mínima">
                  <UnitInput id="ed-hl" unit="lpm" inputMode="numeric" value={ed.hl} onChange={(e) => set({ hl: e.target.value })} />
                </Field>
                <Field id="ed-hh" label="FC máxima">
                  <UnitInput id="ed-hh" unit="lpm" inputMode="numeric" value={ed.hh} onChange={(e) => set({ hh: e.target.value })} />
                </Field>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      <p className="p-lres bad" role="alert">
        {ed.err}
      </p>
      <div className="p-acts">
        <Button
          size="sm"
          variant="pri"
          onClick={() => {
            upd(edDone);
            onClose();
          }}
        >
          Listo
        </Button>
        <Button size="sm" className="dng" icon={X} onClick={() => upd(edDel)}>
          Quitar tramo
        </Button>
      </div>
    </li>
  );
}

export function StepsEditor({ f, upd }: { f: PlanF; upd: Upd }) {
  /* al cerrar un tramo, el foco vuelve a su fila (si cerró: si quedó un error, sigue en el editor) */
  const back = useRef<string | null>(null);
  useEffect(() => {
    if (!back.current || f.edit != null) return;
    document.getElementById(rowId(back.current))?.focus();
    back.current = null;
  });
  const onClose = (path: string) => {
    back.current = path;
  };
  const row = (st: EdStep, path: string) => <StepRow key={path} st={st} path={path} f={f} upd={upd} onClose={onClose} />;
  return (
    <>
      {!f.steps.length ? <p className="p-dr-hint">Todavía no hay tramos. Partí de una sesión anterior o sumá uno abajo.</p> : null}
      <ol className="p-steps">
        {f.steps.map((st, i) =>
          st.k === 'rep' ? (
            <li className="p-rep" key={i}>
              <div className="p-rep-h">
                <b>{st.n} ×</b>
                <span className="lbl">Bloque de repeticiones</span>
                <span className="r">
                  <Stepper label="Repeticiones" value={st.n} min={1} max={50} onChange={(v) => upd((g) => repN(g, i, v - st.n))} />
                  <MoveBtns path={String(i)} label="el bloque" upd={upd} />
                </span>
              </div>
              <ol className="p-steps">{st.steps.map((x, j) => row(x, i + '.' + j))}</ol>
              <div className="p-steps-add" style={{ marginTop: 4 }}>
                <Button size="sm" variant="ghost" icon={Plus} onClick={() => upd((g) => edAdd(g, String(i)))}>
                  Tramo en el bloque
                </Button>
                <Button size="sm" variant="ghost" icon={X} onClick={() => upd((g) => repDel(g, i))}>
                  Quitar bloque
                </Button>
              </div>
            </li>
          ) : (
            row(st, String(i))
          ),
        )}
      </ol>
      <div className="p-steps-add">
        <Button size="sm" icon={Plus} onClick={() => upd((g) => edAdd(g, ''))}>
          Tramo
        </Button>
        <Button size="sm" icon={Repeat} onClick={() => upd((g) => edAdd(g, 'rep'))}>
          Bloque de repeticiones
        </Button>
      </div>
    </>
  );
}
