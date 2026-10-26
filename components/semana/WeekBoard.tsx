'use client';
/* La semana que estás mirando (← → o la barra de arriba): la pista con el volumen contra el plan y sus números, y los
   7 días. Una sesión sin hacer se arrastra a otro día; si hay algo que avisar se abre la hoja de mover con ese día. */
import { useState, type DragEvent } from 'react';
import Link from 'next/link';
import { Check, DotsSixVertical, MagicWand, Plus, X } from '@phosphor-icons/react';
import type { Session } from '@/lib/domain/types';
import { TYPES } from '@/lib/domain/config';
import { PHASES, blockPlan, blockWeekOf, longRace } from '@/lib/domain/blocks';
import { scoreSession } from '@/lib/domain/score';
import { sdate, streakInfo, weekStats } from '@/lib/domain/stats';
import { applyMove, canMove, moveAdvice, occupiedOn, toastMoveUndo, weekSessions, weekTotalKm } from '@/lib/domain/week';
import { WD, addDays, dateLabel, dShort, fmt, fmtPace, isoWeek, mondayOf, pad, todayS, ymd } from '@/lib/domain/util';
import { blockDemo, buzz, saveSession } from '@/lib/data/actions';
import { openSheet } from '@/lib/sheets';
import { sessionHref } from '@/lib/nav';
import { S, useApp } from '@/lib/store';
import { Button } from '@/components/pista/controls';
import { Panel } from '@/components/pista/structure';
import { Oval } from '@/components/pista/sport';
import { SessionBar, briefOf, kmOf } from '@/components/pista/session';
import { PHASE_C, cssVars, cx, typeColor } from '@/components/pista/util';

/* soltar una sesión en otro día: si hay algo que avisar (el día ocupado, dos fuertes seguidas…), abre la hoja de
   mover con ese día elegido; si no, la mueve directo con «Deshacer» */
function dropOn(id: string, date: string) {
  const s = S.sessions.find((x) => x.id === id);
  if (!canMove(s) || date === s.plan.date || blockDemo()) return;
  if (occupiedOn(date, id).length || moveAdvice(s, date, []).length) {
    openSheet('move', { id, preset: date });
    return;
  }
  const U = applyMove([{ id, date }]);
  buzz(10);
  toastMoveUndo(TYPES[s.type].label + ' movida al ' + dateLabel(date), U);
}

function missed(s: Session) {
  if (blockDemo()) return;
  saveSession({ ...s, missed: true });
}

/** horas y minutos: «4:09» */
const hm = (sec: number) => Math.floor(sec / 3600) + ':' + pad(Math.floor((sec % 3600) / 60));

function Phase({ mon }: { mon: Date }) {
  const bp = blockPlan(longRace()),
    bw = blockWeekOf(bp, mon);
  if (!bp || !bw) return null;
  const cur = ymd(mon);
  return (
    <div className="sem-phase hide-s">
      <b>
        Plan {bp.race.name} · {PHASES[bw.ph].n}, semana {bw.n} de {bp.N}
      </b>
      <div className="sem-cells" style={cssVars({ '--n': bp.N })} aria-hidden="true">
        {bp.weeks.map((w) => (
          <i key={w.n} className={ymd(w.mon) === cur ? 'cur' : ymd(w.mon) < cur ? 'on' : undefined} style={cssVars({ '--pc': PHASE_C[w.ph] })} />
        ))}
      </div>
    </div>
  );
}

/** una sesión en su día: el link al detalle cubre la tarjeta; abajo, lo que se puede hacer con ella */
function DaySession({ s, tS, dragging, onDragStart, onDragEnd }: { s: Session; tS: string; dragging: boolean; onDragStart: (e: DragEvent<HTMLDivElement>) => void; onDragEnd: () => void }) {
  const mv = canMove(s),
    r = s.result,
    km = kmOf(s),
    late = !r && !s.missed && sdate(s) < tS,
    pace = r ? fmtPace(r.mainPaceSec || r.paceSec) : s.plan?.paceSec ? fmtPace(s.plan.paceSec) : '',
    sc = r ? scoreSession(s)?.score : null;
  return (
    <div
      className={cx('sem-ses', !r && 'plan', s.missed && 'miss', dragging && 'drag')}
      style={cssVars({ '--tc': typeColor(s.type) })}
      draggable={mv || undefined}
      title={mv ? 'Arrastrala a otro día para moverla' : undefined}
      onDragStart={mv ? onDragStart : undefined}
      onDragEnd={mv ? onDragEnd : undefined}
    >
      <Link className="sem-ses-go" href={sessionHref(s.id)} draggable={false}>
        <b>{TYPES[s.type].label}</b>
        <span className="m">{briefOf(s) || (s.plan?.moved && !r ? 'Movida' : ' ')}</span>
      </Link>
      <span className="kp">
        <span>{km ? fmt(km, km % 1 ? 1 : 0) + ' km' : ''}</span>
        <span>{pace}</span>
      </span>
      <SessionBar s={s} height={18} />
      <div className={cx('sf', late && 'late')}>
        {r ? (
          sc != null ? (
            <>
              <span>Puntaje</span>
              <b>{sc}</b>
            </>
          ) : (
            <span>Hecha</span>
          )
        ) : s.missed ? (
          <span>No hecha</span>
        ) : late ? (
          <>
            <span>Falta cargar</span>
            <span className="sem-acts">
              <button type="button" className="sem-ib" aria-label={'Cargar el resultado de ' + TYPES[s.type].label.toLowerCase()} title="Cargar el resultado" onClick={() => openSheet('result', { id: s.id })}>
                <Check weight="bold" aria-hidden="true" />
              </button>
              <button type="button" className="sem-ib" aria-label={'No hice ' + TYPES[s.type].label.toLowerCase()} title="No lo hice" onClick={() => missed(s)}>
                <X weight="bold" aria-hidden="true" />
              </button>
            </span>
          </>
        ) : (
          <>
            <span>{s.plan?.moved ? 'Movida' : 'Planificada'}</span>
            <button type="button" className="sem-ib" aria-label={'Mover ' + TYPES[s.type].label.toLowerCase() + ' a otro día'} title="Mover de día" onClick={() => openSheet('move', { id: s.id })}>
              <DotsSixVertical weight="bold" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** `fresh`: primera vez; los días que pasaron no son descansos y todos quedan listos para planificar */
export function WeekBoard({ fresh }: { fresh?: boolean }) {
  const off = useApp((s) => s.weekOff);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const tS = todayS(),
    mon = addDays(mondayOf(new Date()), off * 7),
    wk = weekSessions(mon),
    a = weekStats(mon),
    live = wk.filter((s) => s.result || !s.missed),
    total = weekTotalKm(mon),
    maxKm = Math.max(1, ...wk.map(kmOf)),
    empty = !wk.length;

  const endDrag = () => {
    setDrag(null);
    setOver(null);
  };
  const dragStart = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    setDrag(id);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', id);
    } catch {
      /* algunos navegadores no dejan */
    }
  };

  return (
    <Panel
      className="p-c12 p-rise sem-week"
      style={cssVars({ '--i': 1 })}
      title={'Semana ' + isoWeek(mon)}
      sub={dShort(mon) + ' – ' + dShort(addDays(mon, 6))}
      flush
      actions={
        <>
          <Phase mon={mon} />
          <Button size="sm" icon={MagicWand} onClick={() => openSheet('weekPlan', { mon: ymd(mon) })}>
            Planificar semana
          </Button>
        </>
      }
    >
      <div className="sem-board">
        <div className="sem-wsum sem-swipe">
          <span className="lbl">Volumen de la semana</span>
          <Oval done={a.km} total={total}>
            {empty ? <span className="disp sem-zero">0</span> : undefined}
          </Oval>
          {empty ? (
            <p className="sem-note">{off === 0 ? 'La pista se va completando con cada salida.' : 'Nada cargado ni planificado esta semana.'}</p>
          ) : (
            <div className="sem-wstats">
              <div>
                <span className="lbl">Sesiones</span>
                <span className="disp">
                  {a.done}
                  <span className="p-u">de {live.length}</span>
                </span>
              </div>
              <div>
                <span className="lbl">Tiempo</span>
                <span className="disp">
                  {a.time ? hm(a.time) : '0:00'}
                  <span className="p-u">h</span>
                </span>
              </div>
              <div>
                <span className="lbl">Racha</span>
                <span className="disp">
                  {streakInfo().cur}
                  <span className="p-u">sem</span>
                </span>
              </div>
              <div>
                <span className="lbl">Puntaje</span>
                <span className="disp">{a.score != null ? Math.round(a.score) : '–'}</span>
              </div>
            </div>
          )}
        </div>
        <div className="sem-days">
          {WD.map((wd, k) => {
            const d = addDays(mon, k),
              ds = ymd(d),
              ss = wk.filter((s) => sdate(s) === ds).sort((x, y) => x.created - y.created),
              past = ds < tS;
            return (
              <div
                key={ds}
                className={cx('sem-day', ds === tS && 'today', !ss.length && 'empty', past && !fresh && 'past', drag && over === ds && 'over')}
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
                <div className="sem-day-h">
                  <span className="lbl">{ds === tS ? 'Hoy' : wd}</span>
                  <span className="disp">{d.getDate()}</span>
                </div>
                <div className="sem-day-b">
                  {ss.map((s) => (
                    <DaySession key={s.id} s={s} tS={tS} dragging={drag === s.id} onDragStart={dragStart(s.id)} onDragEnd={endDrag} />
                  ))}
                  {!ss.length && past && !fresh ? (
                    <div className="sem-rest">
                      <span>Descanso</span>
                    </div>
                  ) : null}
                  <button type="button" className="sem-add" aria-label={'Planificar el ' + dateLabel(ds)} onClick={() => openSheet('plan', { date: ds })}>
                    <Plus aria-hidden="true" />
                    Planificar
                  </button>
                </div>
                <div className="sem-vol" aria-hidden="true">
                  {ss
                    .filter((s) => !s.missed || s.result)
                    .map((s, j) => (
                      <i key={s.id} className={s.result ? undefined : 'p'} style={cssVars({ height: Math.max(8, (kmOf(s) / maxKm) * 100) + '%', '--tc': typeColor(s.type), '--j': k + j })} />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {drag ? (
        <p className="p-sr" aria-live="polite">
          Soltala en otro día para moverla.
        </p>
      ) : null}
    </Panel>
  );
}
