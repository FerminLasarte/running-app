'use client';
/* Resultado por etapa, con parciales por km: una tarjeta por etapa que dice en el momento cómo te fue contra el plan
   o qué falta (rowNote en lib/domain/resultForm.ts). */
import { Fragment } from 'react';
import { Plus, X } from '@phosphor-icons/react';
import { KINDS, stepTgt } from '@/lib/domain/stages';
import { fmt } from '@/lib/domain/util';
import { gmToggle, lnSkip, lpAdd, lpDel, phMin, phSec, resRows, rowLabel, rowNote, rowPlan, setLap, setRow, type LapV, type ResF, type ResRow, type RowV } from '@/lib/domain/resultForm';
import { Button } from '@/components/pista/controls';
import { Field, Input, MsInput, UnitInput } from '@/components/pista/fields';
import { cssVars, cx } from '@/components/pista/util';

type Upd = (fn: (f: ResF) => ResF) => void;

function Row({ rw, v, upd, onLapAdded }: { rw: ResRow; v: RowV; upd: Upd; onLapAdded: (id: string) => void }) {
  const st = rw.st,
    key = rw.key,
    id = (k: string) => 'ln-' + key + '-' + k,
    tg = stepTgt(st);
  const fld = (k: 'd' | 'h' | 'x') => ({ id: id(k), value: v[k] || '', onChange: (e: { target: { value: string } }) => upd((f) => setRow(f, key, { [k]: e.target.value })) });
  const lapF = (i: number, l: LapV, k: keyof LapV, label: string) => ({
    id: 'lp-' + key + '-' + i + '-' + k,
    'aria-label': label + ' del parcial ' + (i + 1),
    value: l[k] || '',
    onChange: (e: { target: { value: string } }) => upd((f) => setLap(f, key, i, { [k]: e.target.value })),
  });
  const note = v.skip ? null : rowNote(rw, v);
  const laps = v.laps || [];
  return (
    <div className={cx('p-lrow', v.skip && 'off')} style={cssVars({ '--kc': KINDS[rw.k].c })}>
      <div className="p-lrow-h">
        <div>
          <b>{rowLabel(rw)}</b>
          <small>Plan: {rowPlan(st)}</small>
        </div>
        <Button size="sm" variant="ghost" aria-pressed={!!v.skip} onClick={() => upd((f) => lnSkip(f, key))}>
          {v.skip ? 'La hice' : 'No la hice'}
        </Button>
      </div>
      {!v.skip ? (
        <>
          <div className="p-dr-g2">
            <Field id={id('d')} label="Distancia">
              <UnitInput unit="km" placeholder={st.dist! > 0 ? fmt(st.dist, 2) : ''} {...fld('d')} />
            </Field>
            <Field id={id('t')} label="Tiempo" group>
              <MsInput id={id('t')} ph={{ m: phMin(st), s: phSec(st) }} value={{ m: v.m || '', s: v.s || '' }} onChange={(t) => upd((f) => setRow(f, key, t))} />
            </Field>
            <Field id={id('h')} label="FC media">
              <UnitInput unit="lpm" inputMode="numeric" placeholder="opcional" {...fld('h')} />
            </Field>
            <Field id={id('x')} label="FC máxima">
              <UnitInput unit="lpm" inputMode="numeric" placeholder="opcional" {...fld('x')} />
            </Field>
          </div>
          <p className={cx('p-lres', note?.bad && 'bad')} aria-live="polite">
            {note ? note.txt : ''}
          </p>
          {rw.avgN ? (
            <p className="p-dr-hint">Para cargar parciales por km, elegí «Una por una» arriba.</p>
          ) : (
            <>
              {laps.length ? (
                <div className="p-laps-t" role="group" aria-label={'Parciales por km' + (tg ? ', objetivo ' + tg : '')}>
                  <div className="p-lap h" aria-hidden="true">
                    <span>km</span>
                    <span>min</span>
                    <span>s</span>
                    <span>FC</span>
                    <span>máx</span>
                    <span />
                  </div>
                  {laps.map((l, i) => (
                    <div className="p-lap" key={i}>
                      <Input inputMode="decimal" {...lapF(i, l, 'd', 'distancia')} />
                      <Input inputMode="numeric" {...lapF(i, l, 'm', 'minutos')} />
                      <Input inputMode="numeric" {...lapF(i, l, 's', 'segundos')} />
                      <Input inputMode="numeric" {...lapF(i, l, 'h', 'FC media')} />
                      <Input inputMode="numeric" {...lapF(i, l, 'x', 'FC máxima')} />
                      <button type="button" className="ib" aria-label={'Quitar el parcial ' + (i + 1)} onClick={() => upd((f) => lpDel(f, key, i))}>
                        <X aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <Button
                size="sm"
                icon={Plus}
                className="add"
                onClick={() => {
                  upd((f) => lpAdd(f, key));
                  onLapAdded('lp-' + key + '-' + laps.length + '-m');
                }}
              >
                Parcial por km
              </Button>
            </>
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
              <div className="p-ghd">
                <b>{g.n} repeticiones</b>
                <Button size="sm" variant="ghost" onClick={() => upd((q) => gmToggle(q, rw.gi))}>
                  {f.gm[rw.gi] === 'avg' ? 'Una por una' : 'Cargar el promedio'}
                </Button>
              </div>
            ) : null}
            <Row rw={rw} v={f.vals[rw.key] || {}} upd={upd} onLapAdded={onLapAdded} />
          </Fragment>
        );
      })}
    </>
  );
}
