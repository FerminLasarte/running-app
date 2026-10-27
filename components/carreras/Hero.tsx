'use client';
/* El estadio de Carreras: la próxima con su reloj de largada (en días de calendario, como el dorsal de Semana), el
   objetivo, lo que darías hoy (lo mismo que Análisis → «Si corrieras hoy»), tu mejor marca en la distancia y, al
   costado, la pulsera de ritmos del escenario elegido. */
import { MapPin, Ruler } from '@phosphor-icons/react';
import type { Race } from '@/lib/domain/types';
import { racePaceSec } from '@/lib/domain/config';
import { lvPace, lvTimeAt } from '@/lib/domain/level';
import { bestAt, MARK_DISTS } from '@/lib/domain/marks';
import { bandRows, raceClock, type RaceScen, type RaceStrategy } from '@/lib/domain/race';
import { dayLong, fmtDur, fmtPace, pd } from '@/lib/domain/util';
import { Countdown, PaceBand } from '@/components/pista/sport';
import { BrandTitle, Stadium } from '@/components/pista/structure';
import { Chip } from '@/components/pista/controls';
import { fitWords } from '@/components/pista/util';
import { bandProps, gapTxt, kmLabel } from './util';

/** cómo se llama la distancia en tus marcas («10K», «media maratón»); si no es una de esas, los km */
function distName(km: number) {
  const n = MARK_DISTS.find((q) => Math.abs(q[0] - km) / km < 0.02)?.[1];
  return n ? n.charAt(0).toLowerCase() + n.slice(1) : kmLabel(km) + ' km';
}

function Goal({ race }: { race: Race }) {
  const lv = lvPace(),
    today = lv ? lvTimeAt(lv, race.km) : null,
    best = bestAt(race.km),
    gap = today != null && race.targetSec ? today - race.targetSec : null;
  return (
    <div className="car-goal">
      <div>
        <span className="lbl">Objetivo</span>
        <span className="disp">{race.targetSec ? (race.lt ? '<' : '') + fmtDur(race.targetSec) : '–'}</span>
        <small>{race.targetSec ? fmtPace(racePaceSec(race)) + ' /km' : 'Sin objetivo cargado'}</small>
      </div>
      <div>
        <span className="lbl">Hoy darías</span>
        <span className="disp">{today != null ? fmtDur(today) : '–'}</span>
        <small className={gap != null && gap > 0 ? 'warn' : undefined}>
          {gap == null ? (today != null ? fmtPace(today / race.km) + ' /km' : 'Falta un test, series o tempo') : gap > 0 ? gapTxt(gap) + ' arriba del objetivo' : gapTxt(-gap) + ' de margen'}
        </small>
      </div>
      <div>
        <span className="lbl">Tu mejor {distName(race.km)}</span>
        <span className="disp">{best ? fmtDur(best.sec) : '–'}</span>
        <small>{best ? best.src : 'Todavía no hay una marca'}</small>
      </div>
    </div>
  );
}

export function Hero({ race, sel, st }: { race: Race; sel: RaceScen | null; st: RaceStrategy | null }) {
  const day = dayLong(pd(race.date)) + (race.time ? ' · ' + race.time : '');
  const rows = st ? bandRows(st.splits, race.km > 21.2 ? 5 : 1) : null;
  return (
    <Stadium
      className="p-c12 p-rise car-hero"
      sideWidth={260}
      side={sel && st && rows ? <PaceBand {...bandProps(race, sel, st, rows)} /> : undefined}
    >
      <div className="p-st-top">
        <Chip color="var(--acc)" solid>
          Próxima carrera
        </Chip>
        <span className="lbl">{day}</span>
      </div>
      <BrandTitle className="car-name" style={fitWords(race.name)}>
        {race.name}
      </BrandTitle>
      <div className="car-meta">
        {race.place ? (
          <span>
            <MapPin aria-hidden="true" />
            {race.place}
          </span>
        ) : null}
        <span>
          <Ruler aria-hidden="true" />
          {kmLabel(race.km)} km
        </span>
      </div>
      <Countdown parts={(now) => raceClock(race, now)} />
      <Goal race={race} />
    </Stadium>
  );
}
