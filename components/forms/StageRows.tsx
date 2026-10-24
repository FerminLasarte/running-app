'use client';
/* Filas del resultado por etapa, con parciales por km (renderRows, rowHtml, updRow). */
import { Fragment, type CSSProperties } from 'react';
import { KINDS, stepTgt } from '@/lib/domain/stages';
import { fmt } from '@/lib/domain/util';
import { gmToggle, lnSkip, lpAdd, lpDel, phMin, phSec, resRows, rowLabel, rowNote, rowPlan, setLap, setRow, type LapV, type ResF, type ResRow, type RowV } from '@/lib/domain/resultForm';

type Upd = (fn: (f: ResF) => ResF) => void;

function Row({ rw, v, upd, onLapAdded }: { rw: ResRow; v: RowV; upd: Upd; onLapAdded: (id: string) => void }) {
  const st = rw.st,
    K = KINDS[rw.k],
    key = rw.key,
    tg = stepTgt(st);
  const fld = (k: 'd' | 'm' | 's' | 'h' | 'x') => ({ id: 'ln-' + key + '-' + k, value: v[k] || '', onChange: (e: { target: { value: string } }) => upd((f) => setRow(f, key, { [k]: e.target.value })) });
  const lapF = (i: number, l: LapV, k: keyof LapV) => ({ id: 'lp-' + key + '-' + i + '-' + k, value: l[k] || '', onChange: (e: { target: { value: string } }) => upd((f) => setLap(f, key, i, { [k]: e.target.value })) });
  const note = v.skip ? null : rowNote(rw, v);
  const laps = v.laps || [];
  return (
    <div className={'lrow' + (v.skip ? ' off' : '')} style={{ '--kc2': K.c } as CSSProperties}>
      <div className="lhd">
        <div>
          <b>{rowLabel(rw)}</b>
          <small>Plan: {rowPlan(st)}</small>
        </div>
        <button className="chip s" data-a="ln-skip" data-k={key} aria-pressed={!!v.skip} onClick={() => upd((f) => lnSkip(f, key))}>
          No la hice
        </button>
      </div>
      {!v.skip ? (
        <>
          <div className="g2">
            <div className="field">
              <label htmlFor={'ln-' + key + '-d'}>Distancia (km)</label>
              <input className="in" inputMode="decimal" placeholder={st.dist! > 0 ? fmt(st.dist, 2) : ''} {...fld('d')} />
            </div>
            <div className="field">
              <span className="lab">Tiempo (min : s)</span>
              <div className="row">
                <input className="in" inputMode="numeric" placeholder={phMin(st)} aria-label="minutos" {...fld('m')} />
                <span className="u">:</span>
                <input className="in" inputMode="numeric" placeholder={phSec(st)} aria-label="segundos" {...fld('s')} />
              </div>
            </div>
          </div>
          <div className="g2">
            <div className="field">
              <label htmlFor={'ln-' + key + '-h'}>FC prom. (opcional)</label>
              <input className="in" inputMode="numeric" {...fld('h')} />
            </div>
            <div className="field">
              <label htmlFor={'ln-' + key + '-x'}>FC máx. (opcional)</label>
              <input className="in" inputMode="numeric" {...fld('x')} />
            </div>
          </div>
          <div className={'lres' + (note && note.bad ? ' bad' : '')} id={'lr-' + key} aria-live="polite">
            {note ? note.txt : ''}
          </div>
          {rw.avgN ? (
            <p className="hint" style={{ marginTop: 6 }}>
              Para cargar parciales por km, elegí «Cargar una por una» arriba.
            </p>
          ) : (
            <div className="lapsec">
              {laps.length ? (
                <>
                  <div className="lab" style={{ margin: '10px 0 6px' }}>
                    Parciales por km{tg ? ' · objetivo ' + tg : ''}
                  </div>
                  <div className="laph">
                    <span>km</span>
                    <span>min</span>
                    <span>s</span>
                    <span>FC</span>
                    <span>máx</span>
                    <span></span>
                  </div>
                  {laps.map((l, i) => (
                    <div className="lap" key={i}>
                      <input className="in" inputMode="decimal" aria-label={'distancia del parcial ' + (i + 1)} {...lapF(i, l, 'd')} />
                      <input className="in" inputMode="numeric" aria-label={'minutos del parcial ' + (i + 1)} {...lapF(i, l, 'm')} />
                      <input className="in" inputMode="numeric" aria-label={'segundos del parcial ' + (i + 1)} {...lapF(i, l, 's')} />
                      <input className="in" inputMode="numeric" aria-label={'FC promedio del parcial ' + (i + 1)} {...lapF(i, l, 'h')} />
                      <input className="in" inputMode="numeric" aria-label={'FC máxima del parcial ' + (i + 1)} {...lapF(i, l, 'x')} />
                      <button className="x" data-a="lp-del" data-k={key} data-i={i} aria-label={'Quitar parcial ' + (i + 1)} onClick={() => upd((f) => lpDel(f, key, i))}>
                        ×
                      </button>
                    </div>
                  ))}
                </>
              ) : null}
              <button
                className="addp"
                style={{ width: '100%' }}
                data-a="lp-add"
                data-k={key}
                onClick={() => {
                  upd((f) => lpAdd(f, key));
                  onLapAdded('lp-' + key + '-' + laps.length + '-m');
                }}
              >
                + Parcial por km
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

/** onLapAdded recibe el id del campo de minutos del parcial nuevo, para enfocarlo cuando aparezca */
export function StageRows({ f, upd, onLapAdded }: { f: ResF; upd: Upd; onLapAdded: (id: string) => void }) {
  const rows = resRows(f.plan, f.gm);
  return (
    <>
      {rows.map((rw, n) => {
        const g = f.plan!.steps![rw.gi],
          head = (n === 0 || rows[n - 1].gi !== rw.gi) && g.k === 'rep';
        return (
          <Fragment key={rw.key}>
            {head ? (
              <div className="ghd">
                <b>{g.n} repeticiones</b>
                <button className="chip s" data-a="gm-toggle" data-gi={rw.gi} onClick={() => upd((q) => gmToggle(q, rw.gi))}>
                  {f.gm[rw.gi] === 'avg' ? 'Cargar una por una' : 'Cargar el promedio'}
                </button>
              </div>
            ) : null}
            <Row rw={rw} v={f.vals[rw.key] || {}} upd={upd} onLapAdded={onLapAdded} />
          </Fragment>
        );
      })}
    </>
  );
}
