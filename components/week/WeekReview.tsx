'use client';
/* Revisión de la semana: números contra la anterior y una lista corta de lo que conviene mirar. */
import type { ReactNode } from 'react';
import { TYPES } from '@/lib/domain/config';
import { sdate, weekStats } from '@/lib/domain/stats';
import { addDays, dateLabel, fmt, fmtDur, fmtPace, todayS, ymd } from '@/lib/domain/util';

/** diferencia contra la semana anterior */
function Dlt({ v, prev, unit, dec = 0, goodUp }: { v: number | null; prev: number | null | undefined; unit: string; dec?: number; goodUp?: boolean }) {
  if (prev == null || !(prev > 0) || v == null) return null;
  const d = v - prev;
  if (Math.abs(d) < Math.pow(10, -dec) / 2) return <span className="dlt">igual que la anterior</span>;
  return (
    <span className={'dlt ' + (d > 0 === !!goodUp ? 'up' : 'dn')}>
      {(d > 0 ? '+' : '−') + fmt(Math.abs(d), dec) + unit + ' vs. anterior'}
    </span>
  );
}

export function WeekReview({ mon }: { mon: Date }) {
  const a = weekStats(mon),
    b = weekStats(addDays(mon, -7));
  if (!a.n) return null;
  const cur = ymd(addDays(mon, 6)) >= todayS(),
    L: { t: ReactNode; w?: boolean }[] = [];
  const add = (t: ReactNode, w?: boolean) => L.push({ t, w });
  if (a.planned > 0) {
    add(
      <>
        Cumpliste{' '}
        <b>
          {a.doneOfPlanned} de {a.planned}
        </b>{' '}
        sesiones planificadas.
        {(a.pend ? ' ' + a.pend + (a.pend === 1 ? ' está' : ' están') + ' sin cargar.' : '') +
          (a.missed ? ' ' + a.missed + ' marcada' + (a.missed === 1 ? '' : 's') + ' como no hecha' + (a.missed === 1 ? '' : 's') + '.' : '') +
          (cur ? ' La semana sigue en curso.' : '')}
      </>,
      !cur && a.doneOfPlanned < a.planned,
    );
  }
  if (a.km > 0 && b.km > 0) {
    const pc = (a.km / b.km - 1) * 100;
    if (cur)
      add(
        <>
          Llevás <b>{fmt(a.km, 1)} km</b> contra {fmt(b.km, 1)} km de la semana anterior completa.
        </>,
      );
    else if (pc > 30)
      add(
        <>
          Subiste un <b>{Math.round(pc)}%</b> los km respecto a la semana anterior. Es una subida fuerte: cuidá la próxima.
        </>,
        true,
      );
    else if (pc < -30)
      add(
        <>
          Bajaste un <b>{Math.round(-pc)}%</b> los km. Está bien si fue una semana liviana a propósito.
        </>,
      );
    else add('Kilómetros parecidos a la semana anterior (' + (pc >= 0 ? '+' : '−') + Math.round(Math.abs(pc)) + '%).');
  }
  if (a.frN > 0)
    add(
      <>
        <b>
          {a.frOk} de {a.frN}
        </b>{' '}
        {a.frN === 1 ? 'fondo o regenerativo estuvo' : 'fondos o regenerativos estuvieron'} dentro del rango de FC.
      </>,
      a.frOk < a.frN,
    );
  if (a.mainPace) {
    const d = b.mainPace ? Math.round(a.mainPace - b.mainPace) : null;
    add(
      <>
        Ritmo en series y tempos: <b>{fmtPace(a.mainPace)}/km</b>
        {d == null
          ? '.'
          : Math.abs(d) <= 1
            ? ', igual que la semana anterior.'
            : ', ' + Math.abs(d) + ' s/km ' + (d < 0 ? 'más rápido' : 'más lento') + ' que la semana anterior.'}
      </>,
    );
  }
  if (a.feel != null)
    add(
      <>
        Sensación media: <b>{fmt(a.feel, 1)}/10</b>.
        {a.pain ? ' Anotaste molestias en ' + a.pain + (a.pain === 1 ? ' sesión' : ' sesiones') + ': prestale atención.' : ''}
      </>,
      a.pain > 0,
    );
  const low = a.sc.slice().sort((p, q) => p.r.score - q.r.score)[0];
  if (low && low.r.score < 75 && a.sc.length > 1)
    add(
      <>
        La que más costó: <b>{TYPES[low.s.type].label}</b> del {dateLabel(sdate(low.s))} ({low.r.score} puntos). {low.r.summary || ''}
      </>,
    );
  /* la semana en curso no se compara contra la anterior: todavía no terminó */
  const bd: Partial<typeof b> = cur ? {} : b,
    pk = a.planKm > 0 ? 'de ' + fmt(a.planKm, 1) + ' plan' : '';
  return (
    <section className="card rv-card">
      <div className="eyebrow">Revisión de la semana · {cur ? 'en curso' : 'cerrada'}</div>
      <div className="kpis" style={{ margin: '12px 0 0' }}>
        <div className="kpi">
          <span className="kl">Kilómetros</span>
          <span className="big">
            {fmt(a.km, 1)}
            <small>km</small>
          </span>
          <span className="ks">
            {pk}
            {pk && bd.km ? ' · ' : ''}
            <Dlt v={a.km} prev={bd.km} unit=" km" dec={1} goodUp />
          </span>
        </div>
        <div className="kpi">
          <span className="kl">Sesiones</span>
          <span className="big">
            {a.done}
            <small>{a.planned ? 'de ' + a.planned : ''}</small>
          </span>
          <span className="ks">
            <Dlt v={a.done} prev={bd.done} unit="" dec={0} goodUp />
          </span>
        </div>
        <div className="kpi">
          <span className="kl">Puntaje medio</span>
          <span className="big">{a.score != null ? fmt(a.score, 0) : '–'}</span>
          <span className="ks">{a.score != null ? <Dlt v={a.score} prev={bd.score} unit="" dec={0} goodUp /> : null}</span>
        </div>
        <div className="kpi">
          <span className="kl">Tiempo corriendo</span>
          <span className="big" style={{ fontSize: 44 }}>
            {a.time ? fmtDur(a.time) : '–'}
          </span>
          <span className="ks">{a.time && bd.time ? <Dlt v={a.time / 60} prev={bd.time / 60} unit=" min" dec={0} goodUp /> : null}</span>
        </div>
      </div>
      {L.length ? (
        <ul className="rv">
          {L.map((x, i) => (
            <li key={i} className={x.w ? 'warn' : undefined}>
              {x.t}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
