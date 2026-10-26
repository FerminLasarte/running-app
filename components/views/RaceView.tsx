'use client';
/* Pestaña Carrera: Día de carrera, Plan por bloques y Test de nivel (viewTest, líneas 3281–3287 del original). */
import type { ReactNode } from 'react';
import { setUi, useApp, useS } from '@/lib/store';
import { goRaces } from '@/lib/data/actions';
import { nextRace } from '@/lib/domain/config';
import { blockPlan, longRace } from '@/lib/domain/blocks';
import { daysTo } from '@/lib/domain/util';
import { RaceDay } from '@/components/race/RaceDay';
import { PastRacesCard } from '@/components/race/PastRacesCard';
import { Blocks } from '@/components/race/Blocks';
import { Level } from '@/components/race/Level';
import { SubTabs } from '@/components/ui/SubTabs';

const csub = (v: string) => {
  setUi('cSub', v);
};

export default function RaceView() {
  useS();
  const cSub = useApp((st) => st.ui.cSub as string | undefined);
  const race = nextRace(),
    days = race ? daysTo(race.date) : -1,
    lr = longRace(),
    hasBlocks = !!blockPlan(lr);
  let sub = cSub || (race && days <= 60 ? 'race' : hasBlocks ? 'plan' : 'lv');
  if (sub === 'plan' && !hasBlocks) sub = 'race';
  return (
    <>
      <SubTabs
        label="Secciones de carrera"
        value={sub}
        items={[
          [
            'race',
            race ? (
              <>
                Día de carrera<span className="st-x"> · {race.name}</span>
              </>
            ) : (
              'Día de carrera'
            ),
          ],
          ...(hasBlocks
            ? ([
                [
                  'plan',
                  <>
                    Plan<span className="st-x"> · {lr ? lr.name : ''}</span>
                  </>,
                ],
              ] as [string, ReactNode][])
            : []),
          ['lv', 'Test de nivel'],
        ]}
        onPick={csub}
        act="csub"
      />
      {sub === 'race' ? (
        <>
          {race ? (
            <RaceDay race={race} />
          ) : (
            <section className="card">
              <div className="h3">No tenés una próxima carrera</div>
              <p>Agregá tu próximo objetivo y acá aparece el plan de ritmos y la lista de pendientes.</p>
              <button className="btn sm pri" style={{ marginTop: 12 }} data-a="goRaces" onClick={goRaces}>
                Agregar carrera
              </button>
            </section>
          )}
          <PastRacesCard />
        </>
      ) : sub === 'plan' ? (
        <Blocks race={lr} />
      ) : (
        <Level />
      )}
    </>
  );
}
