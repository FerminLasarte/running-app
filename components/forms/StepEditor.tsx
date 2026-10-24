'use client';
/* Etapas del plan: barra de colores, filas, bloques que se repiten y el editor de la etapa abierta (stepsHtml). */
import type { CSSProperties } from 'react';
import { ZN, zoneRange } from '@/lib/domain/config';
import { expand, KINDS, planTotals, stepDesc, stepTgt } from '@/lib/domain/stages';
import { stepKm } from '@/lib/domain/stats';
import type { StepKind } from '@/lib/domain/types';
import { fmt, fmtDur, sum } from '@/lib/domain/util';
import { edAdd, edDel, edDone, edEm, edKind, edMove, edOpen, edTm, edZone, emOf, repDel, repN, tmOf, type EdFields, type EdStep, type PlanF } from '@/lib/domain/planForm';

type Upd = (fn: (f: PlanF) => PlanF) => void;
const KIND_KEYS = Object.keys(KINDS) as StepKind[];

function MoveBtns({ path, upd }: { path: string; upd: Upd }) {
  return (
    <div className="smv">
      <button className="ibtn s" data-a="ed-up" data-p={path} aria-label="Subir" onClick={() => upd((f) => edMove(f, path, -1))}>
        ↑
      </button>
      <button className="ibtn s" data-a="ed-down" data-p={path} aria-label="Bajar" onClick={() => upd((f) => edMove(f, path, 1))}>
        ↓
      </button>
    </div>
  );
}

function StepRow({ st, path, f, upd }: { st: EdStep; path: string; f: PlanF; upd: Upd }) {
  const K = KINDS[st.k];
  if (f.edit === path) return <StepEditor st={st} ed={f.ed} upd={upd} />;
  const tg = stepTgt(st);
  return (
    <div className="srow" style={{ '--kc2': K.c } as CSSProperties}>
      <button className="sinfo" data-a="ed-open" data-p={path} onClick={() => upd((g) => edOpen(g, path))}>
        <b>{K.l}</b>
        <span>{(stepDesc(st) || 'Sin medida') + (tg ? ' · ' + tg : '')}</span>
      </button>
      <MoveBtns path={path} upd={upd} />
    </div>
  );
}

function StepEditor({ st, ed, upd }: { st: EdStep; ed: EdFields; upd: Upd }) {
  const K = KINDS[st.k],
    em = emOf(st),
    tm = tmOf(st);
  const inp = (k: keyof EdFields, id: string, mode: 'decimal' | 'numeric', ph: string, label: string) => (
    <input className="in" id={id} key={id} inputMode={mode} placeholder={ph} aria-label={label} value={ed[k]} onChange={(e) => upd((f) => ({ ...f, ed: { ...f.ed, [k]: e.target.value } }))} />
  );
  return (
    <div className="sedit" id="ed-box" style={{ '--kc2': K.c } as CSSProperties}>
      <div className="chips">
        {KIND_KEYS.map((k) => (
          <button key={k} className="chip s" data-a="ed-kind" data-v={k} aria-pressed={st.k === k} onClick={() => upd((f) => edKind(f, k))}>
            {KINDS[k].l}
          </button>
        ))}
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <span className="lab">Termina por</span>
        <div className="seg">
          <button className="chip" data-a="ed-em" data-v="dist" aria-pressed={em === 'dist'} onClick={() => upd((f) => edEm(f, 'dist'))}>
            Distancia
          </button>
          <button className="chip" data-a="ed-em" data-v="dur" aria-pressed={em === 'dur'} onClick={() => upd((f) => edEm(f, 'dur'))}>
            Tiempo
          </button>
        </div>
        {em === 'dist' ? (
          <div className="row">
            {inp('dist', 'ed-dist', 'decimal', '1,2', 'distancia en kilómetros')}
            <span className="u">km</span>
          </div>
        ) : (
          <div className="row">
            {inp('dm', 'ed-dm', 'numeric', '2', 'minutos')}
            <span className="u">:</span>
            {inp('ds', 'ed-ds', 'numeric', '00', 'segundos')}
            <span className="u">min:s</span>
          </div>
        )}
      </div>
      {st.k !== 'rec' ? (
        <div className="field">
          <span className="lab">Objetivo</span>
          <div className="seg">
            <button className="chip" data-a="ed-tm" data-v="none" aria-pressed={tm === 'none'} onClick={() => upd((f) => edTm(f, 'none'))}>
              Sin objetivo
            </button>
            <button className="chip" data-a="ed-tm" data-v="pace" aria-pressed={tm === 'pace'} onClick={() => upd((f) => edTm(f, 'pace'))}>
              Ritmo
            </button>
            <button className="chip" data-a="ed-tm" data-v="hr" aria-pressed={tm === 'hr'} onClick={() => upd((f) => edTm(f, 'hr'))}>
              Frec. cardíaca
            </button>
          </div>
          {tm === 'pace' ? (
            <>
              <span className="hint">Más rápido</span>
              <div className="row">
                {inp('pam', 'ed-pa-m', 'numeric', '4', 'minutos del ritmo más rápido')}
                <span className="u">:</span>
                {inp('pas', 'ed-pa-s', 'numeric', '30', 'segundos del ritmo más rápido')}
                <span className="u">/km</span>
              </div>
              <span className="hint">Más lento</span>
              <div className="row">
                {inp('pbm', 'ed-pb-m', 'numeric', '4', 'minutos del ritmo más lento')}
                <span className="u">:</span>
                {inp('pbs', 'ed-pb-s', 'numeric', '40', 'segundos del ritmo más lento')}
                <span className="u">/km</span>
              </div>
              <span className="hint">Es el rango de tu reloj (por ejemplo 4:30 a 4:40). Si cargás solo uno, uso ±5 segundos.</span>
            </>
          ) : null}
          {tm === 'hr' ? (
            <>
              <div className="chips">
                {ZN.map((q, i) => {
                  const r = zoneRange(i);
                  return (
                    <button key={i} className="chip s" data-a="ed-zone" data-v={i} onClick={() => upd((f) => edZone(f, i))}>
                      {q[0] + ' · ' + r[0] + '–' + r[1]}
                    </button>
                  );
                })}
              </div>
              <div className="row">
                {inp('hl', 'ed-hl', 'numeric', 'mín', 'FC mínima')}
                <span className="u">a</span>
                {inp('hh', 'ed-hh', 'numeric', 'máx', 'FC máxima')}
                <span className="u">lpm</span>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      <div className="err" id="ed-err" role="alert">
        {ed.err}
      </div>
      <div className="acts">
        <button className="btn sm pri" data-a="ed-done" onClick={() => upd(edDone)}>
          Listo
        </button>
        <button className="btn sm dng" data-a="ed-del" onClick={() => upd(edDel)}>
          Quitar etapa
        </button>
      </div>
    </div>
  );
}

export function StepsList({ f, upd }: { f: PlanF; upd: Upd }) {
  const E = expand(f.steps).map((e) => ({ c: KINDS[e.k].c, km: stepKm(e.st) || 0.3 })),
    tk = sum(E.map((e) => e.km));
  const tot = planTotals(f.steps);
  return (
    <>
      {E.length ? (
        <div className="st-bar" aria-hidden="true">
          {E.map((e, i) => (
            <i key={i} style={{ background: e.c, flexGrow: Number(((e.km / tk) * 100).toFixed(2)) }}></i>
          ))}
        </div>
      ) : null}
      {!f.steps.length ? (
        <p className="hint" style={{ marginBottom: 10 }}>
          Todavía no hay etapas. Elegí un tipo de sesión o sumá una abajo.
        </p>
      ) : null}
      {f.steps.map((st, i) =>
        st.k === 'rep' ? (
          <div className="rep" key={i}>
            <div className="rephd">
              <b>Repetir</b>
              <div className="nstep">
                <button className="ibtn s" data-a="rep-n" data-i={i} data-d="-1" aria-label="Una repetición menos" onClick={() => upd((g) => repN(g, i, -1))}>
                  −
                </button>
                <span className="big">{st.n}</span>
                <button className="ibtn s" data-a="rep-n" data-i={i} data-d="1" aria-label="Una repetición más" onClick={() => upd((g) => repN(g, i, 1))}>
                  +
                </button>
              </div>
              <b>veces</b>
              <MoveBtns path={String(i)} upd={upd} />
            </div>
            {st.steps.map((x, j) => (
              <StepRow key={j} st={x} path={i + '.' + j} f={f} upd={upd} />
            ))}
            <div className="acts">
              <button className="addp" data-a="ed-add" data-to={i} onClick={() => upd((g) => edAdd(g, String(i)))}>
                + Etapa en el bloque
              </button>
              <button className="addp" data-a="rep-del" data-i={i} onClick={() => upd((g) => repDel(g, i))}>
                Quitar bloque
              </button>
            </div>
          </div>
        ) : (
          <StepRow key={i} st={st} path={String(i)} f={f} upd={upd} />
        ),
      )}
      <div className="acts" style={{ marginTop: 10 }}>
        <button className="btn sm" data-a="ed-add" data-to="" onClick={() => upd((g) => edAdd(g, ''))}>
          + Etapa
        </button>
        <button className="btn sm" data-a="ed-add" data-to="rep" onClick={() => upd((g) => edAdd(g, 'rep'))}>
          + Bloque que se repite
        </button>
      </div>
      {f.steps.length ? (
        <p className="hint" style={{ marginTop: 10 }}>
          Total por distancia: <b>{fmt(tot.dist, 2)} km</b>
          {tot.timeOnly > 0 ? ' · más ' + fmtDur(tot.timeOnly) + ' en etapas por tiempo (recuperaciones)' : ''}.
        </p>
      ) : null}
    </>
  );
}
