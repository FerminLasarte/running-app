'use client';
/* Carreras: la lista con la próxima en tartán, el objetivo o tu tiempo, y «Editar», que abre los campos en la misma
   fila. Se guardan solos; la que ya pasó pide tu tiempo en vez del objetivo y el inicio del plan. */
import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { useS } from '@/lib/store';
import { AJ_PARTS, addRace, ajNameId, setAjEdit } from '@/lib/data/actions';
import type { Race } from '@/lib/domain/types';
import { RACE_PRESETS, nextRace, pastRaces, upcomingRaces } from '@/lib/domain/config';
import { applyRace, raceDraft, raceErrs, type RaceDraft } from '@/lib/domain/settings';
import { raceDateLabel } from '@/lib/domain/week';
import { fmt, fmtDur, todayS } from '@/lib/domain/util';
import { Button, Choices, Switch } from '@/components/pista/controls';
import { Field, HmsInput, Input, UnitInput } from '@/components/pista/fields';
import { Panel } from '@/components/pista/structure';
import { cssVars, cx } from '@/components/pista/util';
import { medalDist } from '@/components/carreras/RaceMedalSvg';
import { addBtnId, closeEdit, commitCfg, editBtnId, raceDel } from './actions';
import { useAuto } from './useAuto';

const isPast = (r: Race) => r.date < todayS();
const presetOf = (km: number) => RACE_PRESETS.find((q) => Math.abs(km - q[0]) < 0.01)?.[1] || null;

function RaceEdit({ r }: { r: Race }) {
  const past = isPast(r),
    p = 'aj-r-' + r.id;
  const { draft: d, edit, now, bind } = useAuto(
    r,
    () => raceDraft(r),
    (v) => commitCfg((c) => applyRace(c.races.find((x) => x.id === r.id)!, v, past)),
  );
  const [del, setDel] = useState(false);
  const err = raceErrs(d, past);
  const set = (patch: Partial<RaceDraft>) => (x: RaceDraft) => ({ ...x, ...patch });
  return (
    <div className="aj-ed" {...bind}>
      <div className="aj-ed-g">
        <Field id={ajNameId('r', r.id)} label="Nombre">
          <Input id={ajNameId('r', r.id)} value={d.name} maxLength={40} onChange={(e) => edit(set({ name: e.target.value }))} />
        </Field>
        <Field id={p + '-km'} label="Distancia" error={err.km}>
          <UnitInput id={p + '-km'} unit="km" invalid={!!err.km} value={d.km} onChange={(e) => edit(set({ km: e.target.value }))} />
        </Field>
        <div className="aj-ed-w">
          <Choices
            label="Distancias de siempre"
            value={presetOf(r.km)}
            onChange={(v) => {
              const q = RACE_PRESETS.find((x) => x[1] === v);
              if (q) now(set({ km: fmt(q[0], 4) }));
            }}
            options={RACE_PRESETS.map((q) => ({ value: q[1], label: q[1] }))}
          />
        </div>
        <Field id={p + '-date'} label="Fecha">
          <Input id={p + '-date'} type="date" value={d.date} onChange={(e) => now(set({ date: e.target.value }))} />
        </Field>
        <Field id={p + '-time'} label="Hora de largada">
          <Input id={p + '-time'} type="time" value={d.time} onChange={(e) => now(set({ time: e.target.value }))} />
        </Field>
        <Field id={p + '-place'} label="Lugar" help="Opcional. Va con la fecha en Carreras.">
          <Input id={p + '-place'} hasHelp value={d.place} maxLength={60} onChange={(e) => edit(set({ place: e.target.value }))} />
        </Field>
        {past ? (
          <Field id={p + '-res'} label="Tu tiempo" group error={err.res} help="Queda como marca en el medallero de Carreras.">
            <HmsInput id={p + '-res'} invalid={!!err.res} value={d.res} onChange={(h) => edit(set({ res: h }))} />
          </Field>
        ) : (
          <>
            <Field id={p + '-tgt'} label="Tiempo objetivo" group error={err.tgt} help="Opcional.">
              <HmsInput id={p + '-tgt'} invalid={!!err.tgt} value={d.tgt} onChange={(h) => edit(set({ tgt: h }))} />
            </Field>
            <Field id={p + '-start'} label="Inicio del plan" help="Opcional. Desde ahí arranca el plan por bloques.">
              <Input id={p + '-start'} type="date" hasHelp value={d.start} onChange={(e) => now(set({ start: e.target.value }))} />
            </Field>
            <div className="aj-ed-w">
              <Switch checked={d.lt} onChange={(v) => now(set({ lt: v }))} label="El objetivo es bajar de ese tiempo" desc="Los ritmos se redondean hacia abajo." />
            </div>
          </>
        )}
      </div>
      <div className="aj-ed-f">
        {del ? (
          <span className="aj-del" role="group" aria-label="Confirmar">
            <span>¿Borrar «{r.name}»?</span>
            <Button size="sm" className="dng" autoFocus onClick={() => raceDel(r.id)}>
              Sí, borrar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDel(false)}>
              No
            </Button>
          </span>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setDel(true)}>
            Borrar carrera
          </Button>
        )}
        <Button size="sm" onClick={() => closeEdit('r', r.id)}>
          Listo
        </Button>
      </div>
    </div>
  );
}

export function Races({ i }: { i: number }) {
  const { ui } = useS();
  const open = ui.ajEdit as string | null | undefined,
    nx = nextRace(),
    /* las que vienen, de la más cercana a la más lejana, y después las que ya fueron, de la última para atrás */
    list = [...upcomingRaces(), ...pastRaces()];
  return (
    <Panel
      id={AJ_PARTS.races}
      title="Carreras"
      sub="La app trabaja con la próxima"
      actions={
        <Button size="sm" icon={Plus} id={addBtnId('r')} onClick={() => addRace()}>
          Agregar carrera
        </Button>
      }
      className="aj-set p-rise"
      style={cssVars({ '--i': i })}
    >
      {list.length ? (
        <ul className="aj-list">
          {list.map((r) => {
            const past = isPast(r),
              on = open === 'r:' + r.id,
              t = past ? r.resultSec : r.targetSec;
            return (
              <li key={r.id} className={cx('aj-li', past && 'past')}>
                <span className={cx('aj-ic', nx?.id === r.id && 'next')}>{medalDist(r)}</span>
                <span className="aj-nm">
                  <b>{r.name}</b>
                  <small>{[raceDateLabel(r), r.time, r.place, past ? 'terminada' : nx?.id === r.id ? 'la próxima' : ''].filter(Boolean).join(' · ')}</small>
                </span>
                <span className="disp">
                  {t ? fmtDur(t) : '–'}
                  <small>{past ? (t ? 'tu tiempo' : 'sin tu tiempo') : t ? 'objetivo' : 'sin objetivo'}</small>
                </span>
                <Button size="sm" variant="ghost" id={editBtnId('r', r.id)} aria-expanded={on} onClick={() => setAjEdit(on ? null : 'r:' + r.id)}>
                  {on ? 'Cerrar' : 'Editar'}
                </Button>
                {on ? <RaceEdit r={r} /> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="aj-none">Todavía no cargaste ninguna. Con tu próxima carrera se arman el plan, la cuenta regresiva y los ritmos.</p>
      )}
    </Panel>
  );
}
