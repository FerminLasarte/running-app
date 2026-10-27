'use client';
/* Recalibrar ritmos con un test o una carrera: con qué marca, para qué marca estaban armados tus ritmos, cuáles
   cambiar y hasta cuándo, con la vista previa de las sesiones que cambian. Lógica en lib/domain/recal.ts. */
import { useState } from 'react';
import { RACE_PRESETS } from '@/lib/domain/config';
import { RC_F, RC_N, applyRecal, paceAtVo2, rcChanges, rcDelta, rcRefDefault, rcSources, rcSteps, rcTargets, vo2AtPace, type RcCat, type RecalForm } from '@/lib/domain/recal';
import { planTitle, vdotOf } from '@/lib/domain/daniels';
import { dShort, dateLabel, fmt, fmtDur, fmtPace, pd } from '@/lib/domain/util';
import { hmsFromSec, readHms, type Hms } from '@/lib/domain/hms';
import { Choices, Segmented } from '@/components/pista/controls';
import { Field, HmsInput } from '@/components/pista/fields';
import { Advice, PanelActions, PanelFrame, PanelSection } from './PanelFrame';

const CAT_KEYS = Object.keys(RC_N) as RcCat[];

function initForm(srcId?: string): RecalForm | null {
  const srcs = rcSources();
  if (!srcs.length) return null;
  return { srcs, src: srcs.find((q) => q.id === srcId) || srcs[0], ref: rcRefDefault(), cats: { int: true, thr: true, mp: true, prog: true }, scope: 'next' };
}

export default function RecalPanel({ srcId }: { srcId?: string }) {
  const [F, setF] = useState<RecalForm | null>(() => initForm(srcId));
  const [hms, setHms] = useState<Hms>(() => hmsFromSec(F ? Math.round(F.ref.sec) : 0));
  if (!F) {
    return (
      <PanelFrame title="Recalibrar ritmos">
        <p className="p-dr-p" style={{ paddingTop: 24 }}>
          Primero cargá un test (3 km o más) o el tiempo de una carrera en Ajustes.
        </p>
      </PanelFrame>
    );
  }
  /* la marca escrita a mano reemplaza a la referencia en cada cambio, como en el original: así la vista previa y
     «Aplicar» usan siempre lo que está escrito */
  const setRef = (h: Hms) => {
    setHms(h);
    const t = readHms(h);
    if (t != null && t > 0 && Math.round(t) !== Math.round(F.ref.sec)) setF({ ...F, ref: { ...F.ref, sec: t, label: 'la marca que cargaste' } });
  };
  const upd = (fn: (f: RecalForm) => RecalForm) => setF(fn(F));

  const d = rcDelta(F),
    vT = vdotOf(F.src.sec, F.src.km),
    vR = vdotOf(F.ref.sec, F.ref.km),
    { list: T, nextTest } = rcTargets(F);
  const ex = (
    [
      ['thr', 325],
      ['mp', 362],
      ['int', 285],
    ] as [RcCat, number][]
  )
    .map((q) => {
      const p = Math.round(paceAtVo2(vo2AtPace(q[1]) + RC_F[q[0]] * d));
      return ({ thr: 'umbral', mp: 'maratón', int: 'series' } as Record<string, string>)[q[0]] + ' ' + fmtPace(q[1]) + ' → ' + fmtPace(p);
    })
    .join(' · ');
  const rows: { id: string; t: string; c: string }[] = [];
  let tot = 0;
  T.forEach((x) => {
    const r = rcSteps(x, d, F.cats);
    if (!r.n) return;
    tot++;
    if (rows.length < 14) rows.push({ id: x.id, t: dateLabel(x.plan.date) + ' · ' + planTitle(x), c: rcChanges(x, r.steps).join(' · ') });
  });
  const big = Math.abs(d) >= 2.5;
  const apply = () => tot && applyRecal(F);

  return (
    <PanelFrame
      eyebrow="Tus ritmos de entrenamiento"
      title="Recalibrar ritmos"
      onSubmit={apply}
      foot={<PanelActions label={tot ? 'Aplicar a ' + tot + (tot === 1 ? ' sesión' : ' sesiones') : 'Nada para cambiar'} disabled={!tot} onSave={apply} />}
    >
      <PanelSection no="01" title="Con qué test o carrera">
        <Choices
          label="Test o carrera"
          value={F.src.id}
          onChange={(id) => id && upd((f) => ({ ...f, src: f.srcs.find((s) => s.id === id) || f.src }))}
          options={F.srcs.slice(0, 6).map((q) => ({ value: q.id, label: q.label, sub: fmtDur(q.sec) }))}
        />
      </PanelSection>
      <PanelSection no="02" title="Para qué marca estaban armados">
        <p className="p-dr-p">{F.ref.label ? 'Para ' + F.ref.label + '.' : 'Para esta marca.'} Si los armaron para otra, cambiala.</p>
        <div style={{ marginTop: 12 }}>
          <Choices
            label="Distancia de la marca"
            value={RACE_PRESETS.slice(0, 3).find((q) => Math.abs(F.ref.km - q[0]) < 0.05)?.[1] || null}
            onChange={(v) => {
              const q = RACE_PRESETS.find((x) => x[1] === v);
              if (q) upd((f) => ({ ...f, ref: { ...f.ref, km: q[0] } }));
            }}
            options={RACE_PRESETS.slice(0, 3).map((q) => ({ value: q[1], label: q[1] }))}
          />
        </div>
        <div style={{ marginTop: 14 }}>
          <Field id="rc-ref" label="Tiempo de esa marca" group>
            <HmsInput id="rc-ref" value={hms} onChange={setRef} />
          </Field>
        </div>
        <Advice ok={!big}>
          Tu {F.src.label.toLowerCase()} equivale a un VDOT de <b>{fmt(vT, 1)}</b>; tus ritmos estaban en <b>{fmt(vR, 1)}</b>.{' '}
          {Math.abs(d) < 0.3 ? (
            'Es casi lo mismo: no hace falta cambiar nada.'
          ) : (
            <>
              Tus ritmos se mueven <b>{d > 0 ? 'más rápido' : 'más lento'}</b>. Por ejemplo: {ex}.
            </>
          )}
          {big ? (
            <>
              {' '}
              <b>Es un cambio grande</b>: revisá que el test haya salido a esfuerzo máximo y consultalo con tu entrenador.
            </>
          ) : null}
        </Advice>
      </PanelSection>
      <PanelSection no="03" title="Qué ritmos y hasta cuándo">
        <div className="p-choices" role="group" aria-label="Qué ritmos cambiar">
          {CAT_KEYS.map((k) => (
            <button key={k} type="button" aria-pressed={!!F.cats[k]} onClick={() => upd((f) => ({ ...f, cats: { ...f.cats, [k]: !f.cats[k] } }))}>
              {RC_N[k]}
            </button>
          ))}
        </div>
        {F.cats.mp && d !== 0 ? <p className="p-dr-hint">Si cambiás el ritmo maratón, pensá si también conviene ajustar tu objetivo en Carreras.</p> : null}
        <div style={{ marginTop: 14 }}>
          <Segmented
            label="Hasta cuándo"
            value={F.scope === 'all' || !nextTest ? 'all' : 'next'}
            onChange={(v) => (v === 'all' || nextTest) && upd((f) => ({ ...f, scope: v }))}
            options={[
              ...(nextTest ? [{ value: 'next' as const, label: 'Hasta el próximo test (' + dShort(pd(nextTest.plan.date)) + ')' }] : []),
              { value: 'all' as const, label: 'Todo el plan' },
            ]}
          />
        </div>
      </PanelSection>
      <PanelSection title={'Vista previa · ' + tot + (tot === 1 ? ' sesión cambia' : ' sesiones cambian')}>
        {rows.length ? (
          <>
            <ul className="p-prev">
              {rows.map((r) => (
                <li key={r.id}>
                  <b>{r.t}</b>
                  <span>{r.c}</span>
                </li>
              ))}
            </ul>
            {tot > rows.length ? <p className="p-dr-hint">Y {tot - rows.length} más.</p> : null}
          </>
        ) : (
          <p className="p-dr-hint">No hay sesiones con ritmo para cambiar.</p>
        )}
      </PanelSection>
      <p className="p-dr-hint" style={{ marginTop: 20 }}>
        Las etapas guiadas por frecuencia cardíaca no se tocan. Podés deshacerlo después.
      </p>
    </PanelFrame>
  );
}
