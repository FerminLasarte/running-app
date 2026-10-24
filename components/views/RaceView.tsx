'use client';
/* Pestaña Carrera: Día de carrera, Plan por bloques y Test de nivel (viewTest, líneas 3281–3287 del original). */
import { setS, setUi, useApp, useS } from '@/lib/store';
import { goRaces } from '@/lib/data/actions';
import { nextRace } from '@/lib/domain/config';
import { blockPlan, longRace } from '@/lib/domain/blocks';
import { dayDiff, pd, sod } from '@/lib/domain/util';
import { RaceDay } from '@/components/race/RaceDay';
import { PastRacesCard } from '@/components/race/PastRacesCard';
import { Blocks } from '@/components/race/Blocks';
import { Level } from '@/components/race/Level';

const csub = (v: string) => {
  setUi('cSub', v);
  setS({ lastTab: null });
};

export default function RaceView() {
  useS();
  const cSub = useApp((st) => st.ui.cSub as string | undefined);
  const race = nextRace(),
    days = race ? dayDiff(sod(new Date()), pd(race.date)) : -1,
    lr = longRace(),
    hasBlocks = !!blockPlan(lr);
  let sub = cSub || (race && days <= 60 ? 'race' : hasBlocks ? 'plan' : 'lv');
  if (sub === 'plan' && !hasBlocks) sub = 'race';
  return (
    <>
      <div className="seg subtabs" role="tablist">
        <button className="chip" aria-pressed={sub === 'race'} data-a="csub" data-v="race" onClick={() => csub('race')}>
          {race ? (
            <>
              Día de carrera<span className="st-x"> · {race.name}</span>
            </>
          ) : (
            'Día de carrera'
          )}
        </button>
        {hasBlocks ? (
          <button className="chip" aria-pressed={sub === 'plan'} data-a="csub" data-v="plan" onClick={() => csub('plan')}>
            Plan<span className="st-x"> · {lr ? lr.name : ''}</span>
          </button>
        ) : null}
        <button className="chip" aria-pressed={sub === 'lv'} data-a="csub" data-v="lv" onClick={() => csub('lv')}>
          Test de nivel
        </button>
      </div>
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
