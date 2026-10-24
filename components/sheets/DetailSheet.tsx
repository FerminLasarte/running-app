'use client';
/* Detalle de una sesión (openDetail): ficha, puntaje, plan vs. real, repeticiones y parciales de Strava. */
import { useState } from 'react';
import { useApp } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import type { Session } from '@/lib/domain/types';
import { TYPES, zoneOf } from '@/lib/domain/config';
import { planSummary, sdate } from '@/lib/domain/stats';
import { dateLabel, fmt, fmtDur, fmtPace } from '@/lib/domain/util';
import { canMove } from '@/lib/domain/week';
import { SheetFrame } from './SheetFrame';
import { DelConfirm } from './DelConfirm';
import { FactHero } from '@/components/detail/FactHero';
import { ScoreMini } from '@/components/detail/ScoreMini';
import { StageBars } from '@/components/detail/StageBars';
import { StagesTable } from '@/components/detail/StagesTable';
import { DecRow } from '@/components/detail/DecRow';
import { ShoeRow } from '@/components/detail/ShoeRow';
import { RepCard } from '@/components/detail/RepCard';
import { DtLaps } from '@/components/detail/DtLaps';
import { ExpandedPlan } from '@/components/detail/ExpandedPlan';
import { RecalNote } from '@/components/race/RecalNote';
import { MovedNote } from '@/components/week/MovedNote';

function Body({ s }: { s: Session }) {
  const p = s.plan,
    r = s.result;
  if (!r)
    return (
      <div className="scorebox">
        <div className="eyebrow">{s.missed ? 'No lo hiciste' : 'Pendiente'}</div>
        <div className="big" style={{ fontSize: 40, marginTop: 4 }}>
          {TYPES[s.type].label}
        </div>
        <p className="sub">
          {dateLabel(sdate(s))}
          {p && p.steps ? '' : ' · ' + planSummary(p)}
        </p>
        {p && p.steps ? (
          <div style={{ marginTop: 10 }}>
            <ExpandedPlan p={p} />
          </div>
        ) : null}
        {p && p.notes ? <p className="note">{p.notes}</p> : null}
        <RecalNote p={p} />
        <MovedNote p={p} />
      </div>
    );
  return (
    <>
      <FactHero s={s} />
      <ScoreMini s={s} />
      {r.stages && p && p.steps ? (
        <>
          <StageBars s={s} />
          <details className="tv tbl">
            <summary>Plan vs. real por etapa</summary>
            <StagesTable s={s} />
            <table className="cmp">
              <tbody>
                <tr>
                  <td>Total</td>
                  <td colSpan={2}>{fmt(r.distKm, 2) + ' km · ' + fmtDur(r.timeSec) + (r.hrAvg ? ' · FC prom. ' + r.hrAvg : '') + (r.hrMax ? ' · máx. ' + r.hrMax : '')}</td>
                </tr>
                <tr>
                  <td>Ritmo parte principal</td>
                  <td colSpan={2}>{r.mainPaceSec ? fmtPace(r.mainPaceSec) + '/km' : '–'}</td>
                </tr>
                <DecRow r={r} mode={2} />
                {r.feel ? (
                  <tr>
                    <td>Sensación</td>
                    <td colSpan={2}>{r.feel}/10</td>
                  </tr>
                ) : null}
                <tr>
                  <td>Molestia</td>
                  <td colSpan={2}>{r.pain ? 'Sí' : 'No'}</td>
                </tr>
                {r.weather ? (
                  <tr>
                    <td>Clima</td>
                    <td colSpan={2}>{r.weather}</td>
                  </tr>
                ) : null}
                <ShoeRow r={r} two={true} />
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <details className="tv tbl">
          <summary>Plan vs. real</summary>
          <table className="cmp">
            <thead>
              <tr>
                <th></th>
                <th>Plan</th>
                <th>Real</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Distancia</td>
                <td>{p && p.distKm ? fmt(p.distKm, 2) + ' km' : '–'}</td>
                <td>{fmt(r.distKm, 2)} km</td>
              </tr>
              <tr>
                <td>Duración</td>
                <td>{p && p.durMin ? fmt(p.durMin, 0) + ' min' : '–'}</td>
                <td>{fmtDur(r.timeSec)}</td>
              </tr>
              <tr>
                <td>Ritmo</td>
                <td>{p && p.paceSec ? fmtPace(p.paceSec) + '/km' : '–'}</td>
                <td>{fmtPace(r.paceSec)}/km</td>
              </tr>
              <tr>
                <td>FC prom.</td>
                <td>{p && p.hrMin ? p.hrMin + '–' + p.hrMax : '–'}</td>
                <td>{r.hrAvg ? r.hrAvg + ' (' + zoneOf(r.hrAvg) + ')' : '–'}</td>
              </tr>
              <tr>
                <td>FC máx.</td>
                <td>–</td>
                <td>{r.hrMax || '–'}</td>
              </tr>
              <DecRow r={r} mode={1} />
              {r.feel ? (
                <tr>
                  <td>Sensación</td>
                  <td>–</td>
                  <td>{r.feel}/10</td>
                </tr>
              ) : null}
              <tr>
                <td>Molestia</td>
                <td>–</td>
                <td>{r.pain ? 'Sí' : 'No'}</td>
              </tr>
              {r.weather ? (
                <tr>
                  <td>Clima</td>
                  <td>–</td>
                  <td>{r.weather}</td>
                </tr>
              ) : null}
              <ShoeRow r={r} two={false} />
            </tbody>
          </table>
        </details>
      )}
      {r.notes ? (
        <div className="fact-n">
          <span className="kl">Notas</span>
          <p>{r.notes}</p>
        </div>
      ) : null}
      <RepCard s={s} />
      <div className="h3" style={{ marginTop: 16 }}>
        Vuelta por vuelta
      </div>
      <DtLaps id={s.id} />
    </>
  );
}

export default function DetailSheet({ id }: { id: string }) {
  const live = useApp((st) => st.sessions.find((x) => x.id === id));
  // al borrarla, la hoja se sigue viendo con la última versión mientras se cierra
  const [last, setLast] = useState(live);
  if (live && live !== last) setLast(live);
  const s = live || last;
  const [askDel, setAskDel] = useState(false);
  if (!s) return <SheetFrame title="Detalle">{null}</SheetFrame>;
  const p = s.plan,
    r = s.result;

  /* una acción principal si falta cargar; el resto en una fila chica y eliminar como ícono */
  const foot = askDel ? (
    <DelConfirm id={s.id} />
  ) : (
    <>
      {!r && !s.missed ? (
        <button className="btn pri blk" data-a="result" onClick={() => openSheet('result', { id: s.id })}>
          Cargar resultado
        </button>
      ) : null}
      <div className="sf-row">
        {canMove(s) ? (
          <button className="btn" data-a="mv-open" onClick={() => openSheet('move', { id: s.id })}>
            {s.missed ? 'Pasar a otro día' : 'Mover de día'}
          </button>
        ) : null}
        {r ? (
          <button className="btn" data-a="result" onClick={() => openSheet('result', { id: s.id })}>
            Editar resultado
          </button>
        ) : null}
        {p ? (
          <button className="btn" data-a="plan-edit" onClick={() => openSheet('plan', { id: s.id })}>
            Editar plan
          </button>
        ) : null}
        <button className="ibtn dng" data-a="del-ask" aria-label="Eliminar sesión" title="Eliminar sesión" onClick={() => setAskDel(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
          </svg>
        </button>
      </div>
    </>
  );

  return (
    <SheetFrame title={TYPES[s.type].label + ' · ' + dateLabel(sdate(s))} foot={foot}>
      <Body s={s} />
    </SheetFrame>
  );
}
