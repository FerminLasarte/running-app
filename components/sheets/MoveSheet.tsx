'use client';
/* Mover una sesión de día: elegís el día nuevo, el motivo y, si ese día ya tiene otra, si se intercambian. */
import { useState } from 'react';
import { SheetFrame } from './SheetFrame';
import { useS } from '@/lib/store';
import { TYPES } from '@/lib/domain/config';
import { planSummary } from '@/lib/domain/stats';
import { addDays, cap, dateLabel, sod, ymd } from '@/lib/domain/util';
import { MV_REASONS, applyMove, canMove, moveAdvice, mvShort, occupiedOn, toastMoveUndo } from '@/lib/domain/week';
import { blockDemo } from '@/lib/data/actions';
import { closeSheet } from '@/lib/sheets';

export default function MoveSheet({ id, preset }: { id: string; preset?: string }) {
  const st = useS();
  const s = st.sessions.find((x) => x.id === id);
  /* el día de origen queda fijo al abrir, como en el original */
  const [from] = useState(() => (s && s.plan ? s.plan.date : ''));
  const [date, setDate] = useState<string | null>(preset || null);
  const [reason, setReason] = useState('');
  const [swap, setSwap] = useState(false);
  const [err, setErr] = useState('');

  if (!canMove(s)) return <SheetFrame title="Mover de día">{null}</SheetFrame>;

  const t = sod(new Date()),
    tS = ymd(t),
    days: string[] = [];
  for (let i = 0; i < 8; i++) {
    const d = ymd(addDays(t, i));
    if (d !== s.plan.date) days.push(d);
  }
  const lab = (d: string) => (d === tS ? 'Hoy' : d === ymd(addDays(t, 1)) ? 'Mañana' : d === ymd(addDays(t, 2)) ? 'Pasado mañana' : mvShort(d));

  const occ = date ? occupiedOn(date, s.id) : [];
  const adv = date ? moveAdvice(s, date, swap ? occ.map((x) => x.id) : []) : [];
  if (date && swap && occ.length) occ.forEach((o) => moveAdvice(o, from, [s.id]).forEach((a) => adv.push(TYPES[o.type].label + ': ' + a)));

  const save = () => {
    if (blockDemo()) return;
    const d = date;
    if (!d) {
      setErr('Elegí un día.');
      return;
    }
    if (d === from) {
      setErr('Es el mismo día que ya tenía.');
      return;
    }
    const list = [{ id: s.id, date: d, reason }];
    if (swap) occupiedOn(d, s.id).forEach((o) => list.push({ id: o.id, date: from, reason: 'Intercambio con ' + TYPES[s.type].label.toLowerCase() }));
    const U = applyMove(list);
    closeSheet();
    toastMoveUndo(TYPES[s.type].label + ' movida al ' + dateLabel(d) + (list.length > 1 ? ' (intercambiada)' : ''), U);
  };

  return (
    <SheetFrame
      title="Mover de día"
      foot={
        <button className="btn pri blk" data-a="mv-save" id="mv-save" disabled={!date} onClick={save}>
          {date ? 'Mover al ' + dateLabel(date) : 'Elegí un día'}
        </button>
      }
    >
      <div className="ref-plan">
        <b>
          {TYPES[s.type].label} · {cap(dateLabel(s.plan.date))}
        </b>
        {planSummary(s.plan)}
      </div>
      <div className="field">
        <span className="lab">¿Para cuándo?</span>
        <div className="chips">
          {days.map((d) => (
            <button
              key={d}
              className="chip"
              data-a="mv-day"
              data-v={d}
              aria-pressed={date === d}
              onClick={() => {
                setDate(d);
                setSwap(false);
                setErr('');
              }}
            >
              {lab(d)}
            </button>
          ))}
        </div>
        <label htmlFor="mv-date" className="hint" style={{ marginTop: 8 }}>
          U otra fecha
        </label>
        <input
          className="in"
          type="date"
          id="mv-date"
          value={date || ''}
          onChange={(e) => {
            setDate(e.target.value || null);
            setSwap(false);
          }}
        />
      </div>
      <div className="field">
        <span className="lab">Motivo (opcional)</span>
        <div className="chips">
          {MV_REASONS.map((r) => (
            <button key={r} className="chip s" data-a="mv-reason" data-v={r} aria-pressed={reason === r} onClick={() => setReason(reason === r ? '' : r)}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div id="mv-info">
        {date && occ.length ? (
          <>
            <div className="lv-box" style={{ margin: '0 0 12px' }}>
              El {dateLabel(date)} ya tenés <b>{occ.map((x) => TYPES[x.type].label + ' (' + planSummary(x.plan) + ')').join(', ')}</b>.
            </div>
            <div className="field">
              <span className="lab">¿Qué hacemos con esa?</span>
              <div className="seg">
                <button className="chip" data-a="mv-swap" data-v="1" aria-pressed={swap} onClick={() => setSwap(true)}>
                  Intercambiar: pasarla al {mvShort(from)}
                </button>
                <button className="chip" data-a="mv-swap" data-v="0" aria-pressed={!swap} onClick={() => setSwap(false)}>
                  Dejar las dos ese día
                </button>
              </div>
            </div>
          </>
        ) : null}
        {adv.length ? (
          <ul className="rv" style={{ margin: '0 0 6px' }}>
            {adv.map((a, i) => (
              <li key={i} className="warn">
                {a}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="err" id="mv-err" role="alert">
        {err}
      </div>
    </SheetFrame>
  );
}
