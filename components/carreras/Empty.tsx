'use client';
/* Sin carrera por delante (boceto «Primera vez»): elegís la distancia y en Ajustes le ponés nombre y fecha. */
import { FlagCheckered } from '@phosphor-icons/react';
import { addRace } from '@/lib/data/actions';
import { RACE_PRESETS } from '@/lib/domain/config';
import { BrandTitle, Panel } from '@/components/pista/structure';
import { medalDist } from './RaceMedalSvg';

export function Empty() {
  return (
    <Panel className="p-c7 p-rise car-empty">
      <FlagCheckered className="ic" aria-hidden="true" />
      <BrandTitle as="h2">Carreras</BrandTitle>
      <p>¿Cuál es tu próxima? Elegí la distancia y después le ponés nombre y fecha. Con eso se arman la cuenta regresiva, la pulsera de ritmos y la lista para el día.</p>
      <div className="car-dists" role="group" aria-label="Distancia de tu próxima carrera">
        {RACE_PRESETS.map(([km, n]) => (
          <button key={n} type="button" onClick={() => addRace(km, n)}>
            {medalDist({ km })}
          </button>
        ))}
        <button type="button" onClick={() => addRace()}>
          Otra
        </button>
      </div>
    </Panel>
  );
}
