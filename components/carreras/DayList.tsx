'use client';
/* Para el día: los pendientes de las semanas previas y del día (con la hora, si cargaste la de largada), agrupados por
   cuándo tocan, y el consejo de calor y agua al pie del día de la carrera. Los que tildás se guardan en
   cfg.rcs[carrera]; el test y las zapatillas se chequean solos. Sin hora de largada, el aviso para cargarla. */
import { Check } from '@phosphor-icons/react';
import { S, useS } from '@/lib/store';
import { blockDemo, editRace, saveCfg } from '@/lib/data/actions';
import type { Race } from '@/lib/domain/types';
import { raceDayList, type RcRow } from '@/lib/domain/race';
import { cleanObj, daysTo } from '@/lib/domain/util';
import { Button, Tag } from '@/components/pista/controls';
import { Panel } from '@/components/pista/structure';
import { cssVars, cx } from '@/components/pista/util';

const RC_GROUPS: [number, string][] = [
  [28, 'Cuatro semanas antes'],
  [14, 'Dos semanas antes'],
  [7, 'Una semana antes'],
  [5, 'Cinco días antes'],
  [3, 'Tres días antes'],
  [2, 'Dos días antes'],
  [1, 'El día antes'],
  [0, 'El día de la carrera'],
];

function toggleCheck(raceId: string, item: string, on: boolean) {
  if (blockDemo()) return;
  const c = cleanObj(S.cfg);
  c.rcs = c.rcs || {};
  const m = (c.rcs[raceId] = (c.rcs[raceId] as Record<string, number>) || {}) as Record<string, number>;
  if (on) m[item] = 1;
  else delete m[item];
  saveCfg(c);
}

function Row({ x, race, rc, days }: { x: RcRow; race: Race; rc: Record<string, number>; days: number }) {
  const ok = x.auto ? x.auto.ok : !!rc[x.id],
    due = !ok && days <= x.d;
  const aside = x.auto?.warn ? <Tag warn>{x.note}</Tag> : x.note ? <small>{x.note}</small> : null;
  if (x.auto)
    return (
      <li className={cx(ok && 'ok')}>
        <span className="bx" aria-hidden="true">
          <Check weight="bold" />
        </span>
        <span>
          {x.t}
          <span className="p-sr">{ok ? ', listo (sale de tus datos)' : ', falta (sale de tus datos)'}</span>
          {due ? <b className="due">Ya toca</b> : null}
        </span>
        {aside}
      </li>
    );
  return (
    <li className={cx(ok && 'ok')}>
      <label>
        <input type="checkbox" checked={ok} onChange={(e) => toggleCheck(race.id, x.id, e.target.checked)} />
        <span className="bx" aria-hidden="true">
          <Check weight="bold" />
        </span>
        <span>
          {x.t}
          {due ? <b className="due">Ya toca</b> : null}
        </span>
      </label>
      {aside}
    </li>
  );
}

export function DayList({ race }: { race: Race }) {
  const { cfg } = useS();
  const L = raceDayList(race),
    rc = ((cfg.rcs || {})[race.id] || {}) as Record<string, number>,
    days = daysTo(race.date),
    done = L.filter((x) => (x.auto ? x.auto.ok : rc[x.id])).length;
  const G = RC_GROUPS.map(([d, n]) => ({ d, n, it: L.filter((x) => x.d === d) })).filter((g) => g.it.length);
  /* a la vista, lo que ya toca y lo que viene después; el resto, plegado */
  const cut = Math.min(G.length, G.findIndex((g) => g.d < days) + 1 || G.length),
    group = (g: (typeof G)[number]) => (
      <section key={g.d}>
        <h3 className="lbl">{g.n}</h3>
        <ul className="car-check">
          {g.it.map((x) => (
            <Row key={x.id} x={x} race={race} rc={rc} days={days} />
          ))}
        </ul>
        {g.d === 0 ? (
          <p className="car-note">
            {race.time ? 'Mirá el pronóstico para las ' + race.time + '. ' : ''}Si hay calor o humedad, sumá unos segundos por km desde el principio, no cuando ya se complicó. Tomá agua en los puestos aunque no tengas sed.
          </p>
        ) : null}
      </section>
    );
  const rest = G.slice(cut);
  return (
    <Panel id="car-dia" className="p-c5 p-rise car-day" style={cssVars({ '--i': 3 })} title="Para el día" sub={done + ' de ' + L.length + ' listos'}>
      {G.slice(0, cut).map(group)}
      {rest.length ? (
        <details className="car-more car-later">
          <summary>
            Después: {rest.reduce((a, g) => a + g.it.length, 0)} más, hasta el día de la carrera
          </summary>
          {rest.map(group)}
        </details>
      ) : null}
      {race.time ? null : (
        <>
          <p className="car-note">Cargá la hora de largada en Ajustes y te armo el horario del día.</p>
          <div className="car-acts">
            <Button size="sm" onClick={() => editRace(race.id, 'time')}>
              Cargar la hora
            </Button>
          </div>
        </>
      )}
      <p className="car-foot">Esta guía es general. Para la semana previa y el volumen, seguí lo que te indique tu entrenador.</p>
    </Panel>
  );
}
