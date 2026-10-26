'use client';
/* Mover una sesión de día (en la Semana se arrastra; este panel queda para cuando hay que avisar algo, o desde el
   detalle): el día nuevo, el motivo y, si ese día ya tiene otra, si se intercambian. Avisa con moveAdvice. */
import { useState } from 'react';
import { useS } from '@/lib/store';
import { TYPES } from '@/lib/domain/config';
import { planSummary } from '@/lib/domain/stats';
import { addDays, cap, dateLabel, sod, todayS, ymd } from '@/lib/domain/util';
import { MV_REASONS, applyMove, canMove, moveAdvice, mvShort, occupiedOn, toastMoveUndo } from '@/lib/domain/week';
import { blockDemo } from '@/lib/data/actions';
import { closeSheet } from '@/lib/sheets';
import { Choices, Segmented } from '@/components/pista/controls';
import { Field, Input } from '@/components/pista/fields';
import { Advice, PanelActions, PanelFrame, PanelSection } from './PanelFrame';

export default function MovePanel({ id, preset }: { id: string; preset?: string }) {
  const st = useS();
  const s = st.sessions.find((x) => x.id === id);
  /* el día de origen queda fijo al abrir */
  const [from] = useState(() => (s && s.plan ? s.plan.date : ''));
  const [date, setDate] = useState<string | null>(preset || null);
  const [reason, setReason] = useState('');
  const [swap, setSwap] = useState(false);
  const [err, setErr] = useState('');

  if (!canMove(s)) return <PanelFrame title="Mover de día">{null}</PanelFrame>;

  const t = sod(new Date()),
    tS = todayS(),
    days: string[] = [];
  for (let i = 0; i < 8; i++) {
    const d = ymd(addDays(t, i));
    if (d !== s.plan.date) days.push(d);
  }
  const lab = (d: string) => (d === tS ? 'Hoy' : d === ymd(addDays(t, 1)) ? 'Mañana' : d === ymd(addDays(t, 2)) ? 'Pasado mañana' : mvShort(d));
  const pickDay = (d: string | null) => {
    setDate(d);
    setSwap(false);
    setErr('');
  };

  const occ = date ? occupiedOn(date, s.id) : [];
  const adv = date ? moveAdvice(s, date, swap ? occ.map((x) => x.id) : []) : [];
  if (date && swap && occ.length) occ.forEach((o) => moveAdvice(o, from, [s.id]).forEach((a) => adv.push(TYPES[o.type].label + ': ' + a)));

  const save = () => {
    if (blockDemo()) return;
    const d = date;
    if (!d) return setErr('Elegí un día.');
    if (d === from) return setErr('Es el mismo día que ya tenía.');
    const list = [{ id: s.id, date: d, reason }];
    if (swap) occupiedOn(d, s.id).forEach((o) => list.push({ id: o.id, date: from, reason: 'Intercambio con ' + TYPES[s.type].label.toLowerCase() }));
    const U = applyMove(list);
    closeSheet();
    toastMoveUndo(TYPES[s.type].label + ' movida al ' + dateLabel(d) + (list.length > 1 ? ' (intercambiada)' : ''), U);
  };

  return (
    <PanelFrame
      eyebrow={TYPES[s.type].label + ' · ' + cap(dateLabel(s.plan.date)) + ' · ' + planSummary(s.plan)}
      title="Mover de día"
      onSubmit={save}
      err={err || null}
      foot={<PanelActions label={date ? 'Mover al ' + dateLabel(date) : 'Elegí un día'} disabled={!date} onSave={save} />}
    >
      <PanelSection no="01" title="¿Para cuándo?">
        <Choices label="Día" value={date && days.includes(date) ? date : null} onChange={pickDay} options={days.map((d) => ({ value: d, label: lab(d) }))} />
        <div style={{ marginTop: 14 }}>
          <Field id="mv-date" label="U otra fecha">
            <Input id="mv-date" type="date" value={date || ''} onChange={(e) => pickDay(e.target.value || null)} />
          </Field>
        </div>
        {date && occ.length ? (
          <div className="p-fld" style={{ marginTop: 16 }}>
            <span className="p-flab">
              El {dateLabel(date)} ya tenés {occ.map((x) => TYPES[x.type].label.toLowerCase() + ' (' + planSummary(x.plan) + ')').join(', ')}
            </span>
            <Segmented
              label="Qué hacemos con esa"
              value={swap ? 'swap' : 'both'}
              onChange={(v) => setSwap(v === 'swap')}
              options={[
                { value: 'swap', label: 'Intercambiar: pasarla al ' + mvShort(from) },
                { value: 'both', label: 'Dejar las dos' },
              ]}
            />
          </div>
        ) : null}
        {date ? (
          adv.length ? (
            <Advice>
              {adv.map((a, i) => (
                <p key={i}>{a}</p>
              ))}
            </Advice>
          ) : (
            <Advice ok>Bien: no quedan dos sesiones fuertes seguidas.</Advice>
          )
        ) : null}
      </PanelSection>
      <PanelSection no="02" title="Motivo">
        <Choices toggle label="Motivo (opcional)" value={reason || null} onChange={(v) => setReason(v || '')} options={MV_REASONS.map((r) => ({ value: r, label: r }))} />
      </PanelSection>
    </PanelFrame>
  );
}
