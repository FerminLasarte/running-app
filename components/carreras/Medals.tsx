'use client';
/* Medallero: las carreras que ya corriste, de la más nueva a la más vieja, cada una con su medalla (la cinta con los
   colores del evento) y PR si fue tu mejor marca en la distancia. Tocar una abre su panel; la que todavía no tiene
   tiempo lo pide. Desde acá se abre el test de nivel y se agrega una carrera. */
import { Plus } from '@phosphor-icons/react';
import { useS } from '@/lib/store';
import { addRace, buzz, editRace } from '@/lib/data/actions';
import { openSheet } from '@/lib/sheets';
import type { Race } from '@/lib/domain/types';
import { pastRaces } from '@/lib/domain/config';
import { racePr } from '@/lib/domain/race';
import { raceTheme } from '@/lib/domain/raceTheme';
import { dShort, fmtDur, fmtPace, pd } from '@/lib/domain/util';
import { Button } from '@/components/pista/controls';
import { Panel } from '@/components/pista/structure';
import { Medal } from '@/components/pista/sport';
import { cssVars, typeColor } from '@/components/pista/util';
import { medalDist } from './RaceMedalSvg';

/** abre la medalla de una carrera de cerca */
export function openRaceMedal(id: string) {
  openSheet('raceMedal', { id });
  buzz(6);
}
export const openLevel = () => openSheet('level');

/** la cinta: los colores del evento si es uno conocido; si no, el de la distancia (de suave a fuerte) */
export const medalColor = (r: Race) => {
  const t = raceTheme(r);
  if (t.k !== 'gen') return t.r1;
  return r.km <= 5.5 ? typeColor('regen') : r.km <= 10.5 ? 'var(--acc)' : r.km <= 16 ? typeColor('tempo') : r.km <= 21.2 ? typeColor('fondo') : typeColor('test');
};

function Item({ r }: { r: Race }) {
  const rs = r.resultSec || 0,
    when = dShort(pd(r.date)) + ' ' + r.date.slice(0, 4),
    ok = r.targetSec > 0 && rs > 0 && rs <= r.targetSec;
  return (
    <li className="car-medal">
      <Medal
        dist={medalDist(r)}
        color={medalColor(r)}
        name={r.name}
        time={rs ? fmtDur(rs) : <span className="car-notime">Sin tiempo</span>}
        pr={racePr(r)}
        note={rs ? when + ' · ' + fmtPace(rs / r.km) + ' /km' + (ok ? ' · objetivo cumplido' : '') : when}
      />
      {rs ? (
        <button type="button" className="car-medal-go" aria-label={'Ver la medalla de ' + r.name} onClick={() => openRaceMedal(r.id)} />
      ) : (
        <Button size="sm" onClick={() => editRace(r.id)}>
          Cargar tiempo
        </Button>
      )}
    </li>
  );
}

export function Medals({ i }: { i: number }) {
  useS();
  const P = pastRaces(),
    years = new Set(P.map((r) => r.date.slice(0, 4)));
  return (
    <Panel
      id="car-medallero"
      className="p-c12 p-rise"
      style={cssVars({ '--i': i })}
      title="Medallero"
      sub={P.length ? P.length + (P.length === 1 ? ' carrera' : ' carreras') + (years.size === 1 ? ' en ' + [...years][0] : '') : undefined}
      flush
      actions={
        <>
          <Button size="sm" variant="ghost" arrow onClick={openLevel}>
            Test de nivel
          </Button>
          <Button size="sm" icon={Plus} onClick={() => addRace()}>
            Agregar carrera
          </Button>
        </>
      }
    >
      {P.length ? (
        <ul className="car-medals">
          {P.map((r) => (
            <Item key={r.id} r={r} />
          ))}
        </ul>
      ) : (
        <p className="p-panel-b car-note">Cuando corras tu primera carrera y cargues tu tiempo, su medalla queda colgada acá.</p>
      )}
    </Panel>
  );
}
