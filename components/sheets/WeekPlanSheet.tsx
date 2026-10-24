'use client';
/* Planificar la semana entera: qué hacer cada día, con la plantilla del tipo o copiando la semana anterior. */
import { useState, type CSSProperties } from 'react';
import { SheetFrame } from './SheetFrame';
import { S } from '@/lib/store';
import type { Plan, Session, SessionType } from '@/lib/domain/types';
import { TYPES, TYPE_KEYS } from '@/lib/domain/config';
import { cleanSteps, stepsBrief } from '@/lib/domain/stages';
import { planSummary, sdate } from '@/lib/domain/stats';
import { WD, addDays, cleanObj, dShort, dateLabel, newId, pd, todayS, ymd } from '@/lib/domain/util';
import { planFromSteps } from '@/lib/domain/week';
import { template } from '@/lib/domain/planForm';
import { blockDemo, saveSession, toast } from '@/lib/data/actions';
import { closeSheet } from '@/lib/sheets';

interface WpDay {
  i: number;
  date: string;
  have: Session[];
  prev: Session | null;
}

/** mon: el lunes de la semana, 'AAAA-MM-DD' */
export default function WeekPlanSheet({ mon: monS }: { mon: string }) {
  /* los días se arman al abrir y quedan fijos mientras la hoja está abierta */
  const [days] = useState<WpDay[]>(() => {
    const mon = pd(monS),
      prevMon = addDays(mon, -7);
    return [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = ymd(addDays(mon, i)),
        d0 = ymd(addDays(prevMon, i));
      return { i, date: d, have: S.sessions.filter((s) => sdate(s) === d), prev: S.sessions.find((s) => s.plan && s.plan.date === d0) || null };
    });
  });
  const [pick, setPick] = useState<(SessionType | null)[]>(() => days.map(() => null));
  const mon = pd(monS),
    tS = todayS(),
    nPrev = days.filter((x) => x.prev && !x.have.length && x.date >= tS).length,
    n = pick.filter(Boolean).length;

  const setOne = (i: number, v: SessionType | null) => setPick((p) => p.map((x, j) => (j === i ? v : x)));
  const copyPrev = () =>
    setPick((p) => p.map((x, j) => (days[j].prev && !days[j].have.length && days[j].date >= tS ? days[j].prev!.type : x)));
  const save = () => {
    if (blockDemo()) return;
    const made: Session[] = [];
    days.forEach((x) => {
      const type = pick[x.i];
      if (!type) return;
      let p: Plan;
      if (x.prev && x.prev.type === type) {
        p = { ...cleanObj(x.prev.plan!), date: x.date, type };
        if (p.steps) {
          const st = cleanSteps(p.steps);
          if (st.length) p = planFromSteps(x.date, type, st, p.notes);
        }
      } else p = planFromSteps(x.date, type, template(type), '');
      const now = Date.now();
      made.push({ id: newId(), created: now, updated: now, type, plan: p, result: null, missed: false });
    });
    made.forEach((s) => saveSession(s));
    closeSheet();
    toast(made.length === 1 ? 'Creé 1 sesión' : 'Creé ' + made.length + ' sesiones');
  };

  return (
    <SheetFrame
      title="Planificar la semana"
      foot={
        <button className="btn pri blk" data-a="wp-save" id="wp-save" disabled={!n} onClick={save}>
          {n ? 'Crear ' + n + (n === 1 ? ' sesión' : ' sesiones') : 'Elegí al menos un día'}
        </button>
      }
    >
      <p className="sub">
        Semana del {dShort(mon)} al {dShort(addDays(mon, 6))}. Elegí qué hacer cada día. Las sesiones nuevas salen con la plantilla del tipo (o copiadas de la
        semana anterior) y después podés editar cada una.
      </p>
      {nPrev ? (
        <button className="btn blk" style={{ margin: '14px 0 4px' }} data-a="wp-copy" onClick={copyPrev}>
          Copiar la semana anterior ({nPrev}
          {nPrev === 1 ? ' sesión' : ' sesiones'})
        </button>
      ) : (
        <p className="hint" style={{ marginTop: 10 }}>
          La semana anterior no tiene sesiones planificadas para copiar en los días libres que quedan.
        </p>
      )}
      <div id="wp-rows" style={{ marginTop: 12 }}>
        {days.map((x) => {
          const d = pd(x.date),
            pk = pick[x.i],
            same = pk && x.prev && x.prev.type === pk;
          return (
            <div key={x.date} className="lrow" style={{ '--kc2': pk ? TYPES[pk].t : 'var(--base)' } as CSSProperties}>
              <div className="lhd">
                <div>
                  <b>
                    {WD[x.i]} {d.getDate()}
                  </b>
                  <small>
                    {(x.date < tS ? 'Ya pasó · ' : '') +
                      (x.have.length ? 'Ya tenés: ' + x.have.map((s) => TYPES[s.type].label).join(', ') : x.prev ? 'La semana pasada: ' + TYPES[x.prev.type].label : 'Libre')}
                  </small>
                </div>
              </div>
              <div className="chips">
                <button className="chip s" data-a="wp-pick" data-i={x.i} data-v="" aria-pressed={!pk} onClick={() => setOne(x.i, null)}>
                  Nada
                </button>
                {TYPE_KEYS.map((k) => (
                  <button key={k} className="chip s" data-a="wp-pick" data-i={x.i} data-v={k} aria-pressed={pk === k} onClick={() => setOne(x.i, k)}>
                    <span className="dot" style={{ background: TYPES[k].t }}></span>
                    {TYPES[k].label}
                  </button>
                ))}
              </div>
              {pk ? (
                <p className="hint" style={{ marginTop: 8 }}>
                  {same ? 'Copio el plan del ' + dateLabel(x.prev!.plan!.date) + ': ' + planSummary(x.prev!.plan) : 'Plantilla: ' + stepsBrief(template(pk))}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </SheetFrame>
  );
}
