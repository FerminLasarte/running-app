'use client';
/* Carreras: una sola página que baja. El estadio con la próxima (reloj de largada, objetivo, «Hoy darías», tu mejor
   marca y la pulsera de ritmos), el plan por bloques de la próxima media o maratón, la estrategia por tramos, la lista
   para el día y el medallero. Sin carrera por delante, el estado vacío con las distancias y el medallero.
   El escenario de la pulsera (meta, realista, seguro) va en la URL: `?ritmo=meta`. */
import '@/app/styles/screens/carreras.css';
import { useS } from '@/lib/store';
import { nextRace } from '@/lib/domain/config';
import { longRace } from '@/lib/domain/blocks';
import { raceScen, raceStrategy, type RaceScen } from '@/lib/domain/race';
import { useParam } from '@/components/shell/useParam';
import { Hero } from './Hero';
import { BlocksPanel } from './BlocksPanel';
import { Strategy } from './Strategy';
import { DayList } from './DayList';
import { Medals } from './Medals';
import { Empty } from './Empty';

const SCEN_IDS: readonly RaceScen['id'][] = ['meta', 'real', 'seg'];

export default function Carreras() {
  const { cfg } = useS();
  const [rid, setRid] = useParam('ritmo', SCEN_IDS, 'real');
  const race = nextRace(),
    long = longRace();
  if (!race)
    return (
      <div className="p-grid car">
        <Empty />
        {long ? <BlocksPanel race={long} other /> : null}
        <Medals i={2} />
      </div>
    );
  /* el escenario elegido; si no está (sin objetivo o sin estimación), el realista o el primero */
  const sc = raceScen(race),
    sel = sc.find((x) => x.id === rid) || sc.find((x) => x.id === 'real') || sc[0] || null,
    st = sel ? raceStrategy(race, sel.sec, cfg.hrMax) : null;
  return (
    <div className="p-grid car">
      <Hero race={race} sel={sel} st={st} />
      {long ? <BlocksPanel race={long} other={long.id !== race.id} /> : null}
      <Strategy race={race} sc={sc} sel={sel} st={st} onPick={setRid} />
      <DayList race={race} />
      <Medals i={4} />
    </div>
  );
}
