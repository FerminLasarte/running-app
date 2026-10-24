'use client';
/* Recalibrar ritmos con un test o carrera (openRecal / paintRecal / readRecalRef, líneas 3503–3532 del original). */
import { useState } from 'react';
import { RACE_PRESETS } from '@/lib/domain/config';
import { RC_F, RC_N, applyRecal, paceAtVo2, rcChanges, rcDelta, rcRefDefault, rcSources, rcSteps, rcTargets, vo2AtPace, type RcCat, type RecalForm } from '@/lib/domain/recal';
import { planTitle, vdotOf } from '@/lib/domain/daniels';
import { dShort, dateLabel, fmt, fmtDur, fmtPace, pd } from '@/lib/domain/util';
import { HmsInput, hmsFromSec, readHms, type Hms } from '@/components/ui/fields';
import { SheetFrame } from './SheetFrame';

const CAT_KEYS = Object.keys(RC_N) as RcCat[];

function initForm(srcId?: string): RecalForm | null {
  const srcs = rcSources();
  if (!srcs.length) return null;
  return { srcs, src: srcs.find((q) => q.id === srcId) || srcs[0], ref: rcRefDefault(), cats: { int: true, thr: true, mp: true, prog: true }, scope: 'next' };
}

export default function RecalSheet({ srcId }: { srcId?: string }) {
  const [F, setF] = useState<RecalForm | null>(() => initForm(srcId));
  const [hms, setHms] = useState<Hms>(() => hmsFromSec(F ? Math.round(F.ref.sec) : 0));
  if (!F) {
    return (
      <SheetFrame title="Recalibrar ritmos">
        <p className="hint">Primero cargá un test (3 km o más) o el tiempo de una carrera en Ajustes.</p>
      </SheetFrame>
    );
  }
  /* la marca escrita a mano reemplaza a la referencia (readRecalRef) */
  const readRef = (f: RecalForm): RecalForm => {
    const t = readHms(hms);
    return t != null && t > 0 && Math.round(t) !== Math.round(f.ref.sec) ? { ...f, ref: { ...f.ref, sec: t, label: 'la marca que cargaste' } } : f;
  };
  const upd = (fn: (f: RecalForm) => RecalForm) => setF(fn(readRef(F)));

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

  return (
    <SheetFrame
      title="Recalibrar ritmos"
      foot={
        <button className="btn pri blk" data-a="rc-apply" id="rc-apply" disabled={!tot} onClick={() => applyRecal(readRef(F))}>
          {tot ? 'Aplicar a ' + tot + (tot === 1 ? ' sesión' : ' sesiones') : 'Nada para cambiar'}
        </button>
      }
    >
      <div id="rc-body">
        <div className="field">
          <span className="lab">Con qué test o carrera</span>
          <div className="chips">
            {F.srcs.slice(0, 6).map((q) => (
              <button key={q.id} className="chip" data-a="rc-src" aria-pressed={q.id === F.src.id} onClick={() => upd((f) => ({ ...f, src: f.srcs.find((s) => s.id === q.id) || f.src }))}>
                {q.label} · {fmtDur(q.sec)}
              </button>
            ))}
          </div>
        </div>
        <div className="field" onBlur={() => setF(readRef(F))}>
          <span className="lab">Tus ritmos de ahora estaban armados para</span>
          <p className="hint" style={{ margin: '0 0 6px' }}>
            {F.ref.label || 'esta marca'}. Si los armaron para otra marca, cambiala.
          </p>
          <div className="chips" style={{ marginBottom: 8 }}>
            {RACE_PRESETS.slice(0, 3).map((q) => (
              <button key={q[0]} className="chip s" data-a="rc-refkm" aria-pressed={Math.abs(F.ref.km - q[0]) < 0.05} onClick={() => upd((f) => ({ ...f, ref: { ...f.ref, km: q[0] } }))}>
                {q[1]}
              </button>
            ))}
          </div>
          <HmsInput id="rc-ref" value={hms} onChange={setHms} />
        </div>
        <div className="lv-box" style={{ margin: '0 0 18px' }}>
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
        </div>
        <div className="field">
          <span className="lab">Qué ritmos cambiar</span>
          <div className="chips">
            {CAT_KEYS.map((k) => (
              <button key={k} className="chip" data-a="rc-cat" aria-pressed={!!F.cats[k]} onClick={() => upd((f) => ({ ...f, cats: { ...f.cats, [k]: !f.cats[k] } }))}>
                {RC_N[k]}
              </button>
            ))}
          </div>
          {F.cats.mp && d !== 0 ? (
            <p className="hint" style={{ marginTop: 6 }}>
              Si cambiás el ritmo maratón, pensá si también conviene ajustar tu objetivo en Mis carreras.
            </p>
          ) : null}
        </div>
        <div className="field">
          <span className="lab">Hasta cuándo</span>
          <div className="seg">
            <button className="chip" data-a="rc-scope" aria-pressed={F.scope === 'next'} disabled={!nextTest} onClick={() => upd((f) => ({ ...f, scope: 'next' }))}>
              {nextTest ? 'Hasta el próximo test (' + dShort(pd(nextTest.plan.date)) + ')' : 'No hay otro test'}
            </button>
            <button className="chip" data-a="rc-scope" aria-pressed={F.scope === 'all' || !nextTest} onClick={() => upd((f) => ({ ...f, scope: 'all' }))}>
              Todo el plan
            </button>
          </div>
        </div>
        <div className="field">
          <span className="lab">Vista previa · {tot + (tot === 1 ? ' sesión cambia' : ' sesiones cambian')}</span>
          {rows.length ? (
            <>
              <ul className="rdy-l" style={{ marginTop: 6, gridTemplateColumns: '1fr' }}>
                {rows.map((r) => (
                  <li key={r.id} style={{ gridTemplateColumns: '1fr' }}>
                    <b>{r.t}</b>
                    <span>{r.c}</span>
                  </li>
                ))}
              </ul>
              {tot > rows.length ? <p className="hint">Y {tot - rows.length} más.</p> : null}
            </>
          ) : (
            <p className="hint">No hay sesiones con ritmo para cambiar.</p>
          )}
        </div>
        <p className="hint">Las etapas guiadas por frecuencia cardíaca no se tocan. Podés deshacerlo después.</p>
      </div>
    </SheetFrame>
  );
}
