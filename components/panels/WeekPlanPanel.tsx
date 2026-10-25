'use client';
/* Planificar la semana entera, con el mismo patrón que planificar una sesión: qué hacer cada día, con la plantilla del
   tipo o copiando la semana anterior. Después se edita cada una. */
import { useState } from 'react';
import { Copy } from '@phosphor-icons/react';
import { S } from '@/lib/store';
import type { Plan, Session, SessionType } from '@/lib/domain/types';
import { TYPES, TYPE_KEYS } from '@/lib/domain/config';
import { cleanSteps, stepsBrief } from '@/lib/domain/stages';
import { planSummary, sdate } from '@/lib/domain/stats';
import { WD, addDays, cleanObj, dShort, dateLabel, isoWeek, newId, pd, todayS, ymd } from '@/lib/domain/util';
import { planFromSteps } from '@/lib/domain/week';
import { template } from '@/lib/domain/planForm';
import { blockDemo, saveSession, toast } from '@/lib/data/actions';
import { closeSheet, useSheetDirty } from '@/lib/sheets';
import { Button, Choices } from '@/components/pista/controls';
import { typeColor } from '@/components/pista/util';
import { PanelActions, PanelFrame, PanelSection } from './PanelFrame';

interface WpDay {
  i: number;
  date: string;
  have: Session[];
  prev: Session | null;
}

/** mon: el lunes de la semana, 'AAAA-MM-DD' */
export default function WeekPlanPanel({ mon: monS }: { mon: string }) {
  /* los días se arman al abrir y quedan fijos mientras el panel está abierto */
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
  useSheetDirty(n > 0);

  const setOne = (i: number, v: SessionType | null) => setPick((p) => p.map((x, j) => (j === i ? v : x)));
  const copyPrev = () => setPick((p) => p.map((x, j) => (days[j].prev && !days[j].have.length && days[j].date >= tS ? days[j].prev!.type : x)));
  const save = () => {
    if (!n || blockDemo()) return;
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
    <PanelFrame
      eyebrow={'Semana ' + isoWeek(mon) + ' · ' + dShort(mon) + ' – ' + dShort(addDays(mon, 6))}
      title="Planificar la semana"
      onSubmit={save}
      note={n ? n + (n === 1 ? ' sesión nueva' : ' sesiones nuevas') : 'Elegí al menos un día.'}
      foot={<PanelActions label={n ? 'Crear ' + n + (n === 1 ? ' sesión' : ' sesiones') : 'Crear sesiones'} disabled={!n} onSave={save} />}
    >
      <PanelSection no="01" title="Qué hacer cada día">
        <p className="p-dr-p">Las sesiones nuevas salen con la plantilla del tipo (o copiadas de la semana anterior) y después podés editar cada una.</p>
        {nPrev ? (
          <Button icon={Copy} style={{ marginTop: 12 }} onClick={copyPrev}>
            Copiar la semana anterior ({nPrev}
            {nPrev === 1 ? ' sesión' : ' sesiones'})
          </Button>
        ) : (
          <p className="p-dr-hint">La semana anterior no tiene sesiones planificadas para copiar en los días libres que quedan.</p>
        )}
      </PanelSection>
      <PanelSection title="Los siete días">
        {days.map((x) => {
          const d = pd(x.date),
            pk = pick[x.i],
            same = pk && x.prev && x.prev.type === pk;
          return (
            <div key={x.date} className="p-wday">
              <div className="d">
                <span className="lbl">{WD[x.i]}</span>
                <span className="disp">{d.getDate()}</span>
              </div>
              <div>
                <small>
                  {(x.date < tS ? 'Ya pasó · ' : '') +
                    (x.have.length ? 'Ya tenés: ' + x.have.map((s) => TYPES[s.type].label).join(', ') : x.prev ? 'La semana pasada: ' + TYPES[x.prev.type].label : 'Libre')}
                </small>
                <Choices
                  label={'Qué hacer el ' + dateLabel(x.date)}
                  value={pk || ''}
                  onChange={(v) => setOne(x.i, (v as SessionType) || null)}
                  options={[{ value: '', label: 'Nada' }, ...TYPE_KEYS.map((k) => ({ value: k, label: TYPES[k].label, color: typeColor(k) }))]}
                />
                {pk ? <p className="p-dr-hint">{same ? 'Copio el plan del ' + dateLabel(x.prev!.plan!.date) + ': ' + planSummary(x.prev!.plan) : 'Plantilla: ' + stepsBrief(template(pk))}</p> : null}
              </div>
            </div>
          );
        })}
      </PanelSection>
    </PanelFrame>
  );
}
