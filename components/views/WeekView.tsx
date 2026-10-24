'use client';
/* Semana (la pestaña de inicio): de un vistazo, la semana con su tira de 7 días, la próxima sesión, pendientes,
   el día por día (con arrastrar y soltar para mover sesiones) y la revisión de la semana. */
import { useState, type CSSProperties, type DragEvent } from 'react';
import { S, useS } from '@/lib/store';
import type { Session } from '@/lib/domain/types';
import { TYPES, easyActive } from '@/lib/domain/config';
import { planKmOf, planSummary, sdate } from '@/lib/domain/stats';
import { WD, addDays, cap, clamp, dShort, dateLabel, dayDiff, fmt, mondayOf, pd, sod, sum, ymd } from '@/lib/domain/util';
import { applyMove, canMove, moveAdvice, nextSession, occupiedOn, pendingSessions, toastMoveUndo, weekSessions } from '@/lib/domain/week';
import { PHASES, blockPlan, blockWeekOf, longRace } from '@/lib/domain/blocks';
import { blockDemo, buzz, demoOn, saveCfg, toast, weekGo } from '@/lib/data/actions';
import { openSheet } from '@/lib/sheets';
import { Medallero } from '@/components/race/Medallero';
import { RecalNote } from '@/components/race/RecalNote';
import { ExpandedPlan } from '@/components/detail/ExpandedPlan';
import { Glance } from '@/components/week/Glance';
import { LastRaceNote } from '@/components/week/LastRaceNote';
import { MovedNote } from '@/components/week/MovedNote';
import { PendCard, pendCardShown } from '@/components/week/PendCard';
import { SessChip } from '@/components/week/SessChip';
import { WeekReview } from '@/components/week/WeekReview';
import { WeekStrip } from '@/components/week/WeekStrip';

function easyOff() {
  if (blockDemo()) return;
  saveCfg({ ...S.cfg, easy: null });
  toast('Modo suave terminado');
}

/* soltar una sesión en otro día: si hay algo que avisar (el día ocupado, dos fuertes seguidas…), abre la hoja de
   mover con ese día elegido; si no, la mueve directo con «Deshacer» */
function dropOn(id: string, date: string) {
  const s = S.sessions.find((x) => x.id === id);
  if (!canMove(s) || date === s.plan.date || blockDemo()) return;
  const occ = occupiedOn(date, id);
  if (occ.length || moveAdvice(s, date, []).length) {
    openSheet('move', { id, preset: date });
    return;
  }
  const U = applyMove([{ id, date }]);
  buzz(10);
  toastMoveUndo(TYPES[s.type].label + ' movida al ' + dateLabel(date), U);
}

function NextCard({ nxt, easyOn }: { nxt: Session; easyOn: boolean }) {
  const today = sod(new Date());
  const nd = dayDiff(today, pd(sdate(nxt))),
    when = nd === 0 ? 'Hoy' : nd === 1 ? 'Mañana' : 'En ' + nd + ' días';
  const km = planKmOf(nxt),
    p = nxt.plan!;
  return (
    <section className="card nx-card" style={{ '--tc': TYPES[nxt.type].t } as CSSProperties}>
      <div className="eyebrow">Próxima sesión · {when}</div>
      <div className="nx-h">
        <span className="dot" style={{ background: TYPES[nxt.type].t }}></span>
        <div className="h3" style={{ margin: 0 }}>
          {TYPES[nxt.type].label}
        </div>
        <span className="mut" style={{ fontSize: 'var(--fs-sm)' }}>
          {cap(dateLabel(sdate(nxt)))}
          {km ? ' · ' + fmt(km, 1) + ' km' : ''}
        </span>
      </div>
      {p.steps && p.steps.length ? <ExpandedPlan p={p} /> : <p>{planSummary(p)}</p>}
      {p.notes ? (
        <p className="sub" style={{ marginTop: 8 }}>
          {p.notes}
        </p>
      ) : null}
      <RecalNote p={p} />
      <MovedNote p={p} />
      <div className="nx-acts">
        <button className="btn sm" data-a="detail" data-id={nxt.id} onClick={() => openSheet('detail', { id: nxt.id })}>
          Ver detalle
        </button>
        <button className="btn sm" data-a="mv-open" data-id={nxt.id} onClick={() => openSheet('move', { id: nxt.id })}>
          Mover de día
        </button>
        {easyOn ? null : (
          <button className="btn sm txt" data-a="easyOpen" onClick={() => openSheet('easy')}>
            No me siento al 100%
          </button>
        )}
      </div>
    </section>
  );
}

export default function WeekView() {
  const st = useS();
  /* arrastrar y soltar en el calendario (computadora) */
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const today = sod(new Date()),
    tS = ymd(today);
  const mon = addDays(mondayOf(today), st.weekOff * 7),
    sun = addDays(mon, 6);
  const wk = weekSessions(mon);
  const doneKm = sum(wk.filter((s) => s.result).map((s) => s.result!.distKm || 0));
  const planKm = sum(wk.map(planKmOf));
  const doneN = wk.filter((s) => s.result).length;
  const easyOn = !!(st.cfg.easy && easyActive(tS));

  /* la semana: navegación, tira de 7 días y la acción principal */
  const pct = planKm ? clamp((doneKm / planKm) * 100, 0, 100) : clamp((doneN / st.cfg.weeklyGoal) * 100, 0, 100);
  const bp = blockPlan(longRace()),
    bw = blockWeekOf(bp, mon);

  /* próxima sesión y pendientes */
  const nxt = nextSession(tS);
  const starter = !st.sessions.length && !st.demo;
  const pend = pendingSessions(tS);
  const hasL = !!nxt || starter,
    hasR = pendCardShown(pend, st.demo);

  const endDrag = () => {
    setDrag(null);
    setOver(null);
  };
  const dragStart = (id: string) => (e: DragEvent<HTMLButtonElement>) => {
    setDrag(id);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', id);
    } catch {
      /* algunos navegadores no dejan */
    }
  };

  return (
    <>
      <Glance wk={wk} tS={tS} />
      {st.weekOff === 0 ? <Medallero /> : null}
      <LastRaceNote />
      {easyOn ? (
        <div className="banner" style={{ margin: '0 0 14px' }}>
          <span>
            <b>Modo «No me siento al 100%» hasta el {dShort(pd(st.cfg.easy!.until))}.</b> Bajá el volumen un 20–30% y corré por sensaciones.
          </span>
          <button className="btn sm" data-a="easyOff" onClick={easyOff}>
            Terminar
          </button>
        </div>
      ) : null}
      <section className="card wk-card" id="wk-card">
        <div className="weekhead">
          <button className="ibtn" data-a="wk" data-d="-1" aria-label="Semana anterior" onClick={() => weekGo(-1)}>
            ‹
          </button>
          <div>
            <b>
              {dShort(mon)} al {dShort(sun)}
            </b>
            <small>
              {fmt(doneKm, 1) +
                (planKm ? ' de ' + fmt(planKm, 1) : '') +
                ' km · ' +
                doneN +
                ' de ' +
                st.cfg.weeklyGoal +
                ' salidas' +
                (bw && bp
                  ? ' · ' +
                    (bp.loaded
                      ? 'semana ' + bw.n + ' de ' + bp.N + ' · ' + PHASES[bw.ph].n.toLowerCase()
                      : PHASES[bw.ph].n.toLowerCase() + (bw.deload ? ' (liviana)' : ''))
                  : '')}
            </small>
            <div className="pbar">
              <i style={{ width: pct.toFixed(0) + '%' }}></i>
            </div>
          </div>
          <button className="ibtn" data-a="wk" data-d="1" aria-label="Semana siguiente" onClick={() => weekGo(1)}>
            ›
          </button>
        </div>
        <WeekStrip mon={mon} wk={wk} tS={tS} />
        <p className="ws-leg">
          <span>
            <i className="ws-b done"></i>hecha
          </span>
          <span>
            <i className="ws-b plan"></i>planificada
          </span>
          <span>
            <i className="ws-b miss"></i>no hecha
          </span>
        </p>
        <div className="wk-acts">
          <button className="btn pri" data-a="result" onClick={() => openSheet('result', { id: null })}>
            Registrar resultado
          </button>
          <button className="btn" data-a="plan" onClick={() => openSheet('plan', {})}>
            Planificar
          </button>
        </div>
        <div className="wk-links">
          <button className="btn txt" data-a="weekPlan" onClick={() => openSheet('weekPlan', { mon: ymd(mon) })}>
            Planificar la semana
          </button>
          {st.weekOff !== 0 ? (
            <button className="btn txt" data-a="wk" data-d="0" onClick={() => weekGo(0)}>
              Volver a esta semana
            </button>
          ) : null}
        </div>
      </section>
      <div className={'wk-top' + (hasL && hasR ? '' : ' one')}>
        <div className="wk-l">
          {nxt ? <NextCard nxt={nxt} easyOn={easyOn} /> : null}
          {starter ? (
            <section className="card">
              <div className="h3">Empezá acá</div>
              <p>
                1. Planificá tu próxima sesión: subí una captura de tu reloj o armá las etapas (calentamiento, parte principal, enfriamiento).
                <br />
                2. Después de correr, cargá el resultado y te doy un puntaje de 0 a 100 con la explicación.
              </p>
              <div style={{ marginTop: 12 }}>
                <button className="btn blk" data-a="demoOn" onClick={demoOn}>
                  Ver la app con datos de ejemplo
                </button>
              </div>
            </section>
          ) : null}
        </div>
        <div className="wk-r">
          <PendCard pend={pend} />
        </div>
      </div>
      {/* día por día: los días vacíos ocupan una línea */}
      <h2 className="sec-h">Día por día</h2>
      <ul className="cal">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const d = addDays(mon, i),
            ds = ymd(d);
          const ss = wk.filter((s) => sdate(s) === ds);
          return (
            <li
              key={ds}
              className={'day' + (ds === tS ? ' today' : '') + (ss.length ? '' : ' empty') + (drag && over === ds ? ' drop-ok' : '')}
              data-date={ds}
              onDragOver={(e) => {
                if (!drag) return;
                e.preventDefault();
                if (over !== ds) setOver(ds);
              }}
              onDrop={(e) => {
                if (!drag) return;
                e.preventDefault();
                const id = drag;
                endDrag();
                dropOn(id, ds);
              }}
            >
              <div className="dl">
                <b>{WD[i]}</b>
                <span>{d.getDate()}</span>
              </div>
              <div className="ds">
                {ss.map((s) => (
                  <SessChip key={s.id} s={s} dragging={drag === s.id} onDragStart={dragStart(s.id)} onDragEnd={endDrag} />
                ))}
                {ss.length ? null : (
                  <button className="addp" data-a="plan" data-date={ds} onClick={() => openSheet('plan', { date: ds })}>
                    + Planificar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <WeekReview mon={mon} />
    </>
  );
}
