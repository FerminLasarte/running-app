'use client';
/* La medalla de una carrera de cerca: la del evento, grande, con el tiempo, el ritmo y el objetivo, y si fue tu mejor
   marca. Se abre desde el medallero de Carreras, la vitrina de Logros y ⌘K. */
import '@/app/styles/screens/carreras.css';
import { usePathname } from 'next/navigation';
import { useS } from '@/lib/store';
import { closeSheet, requestClose } from '@/lib/sheets';
import { editRace } from '@/lib/data/actions';
import { navigate } from '@/lib/nav';
import { racePr } from '@/lib/domain/race';
import { raceTheme } from '@/lib/domain/raceTheme';
import { raceDateLabel } from '@/lib/domain/week';
import { cap, fmtDur, fmtPace } from '@/lib/domain/util';
import { Button, Delta, Pr } from '@/components/pista/controls';
import { Kpis } from '@/components/pista/structure';
import { RaceMedalSvg } from '@/components/carreras/RaceMedalSvg';
import { kmLabel } from '@/components/carreras/util';
import { PanelFrame } from './PanelFrame';

export default function RaceMedalPanel({ id }: { id: string }) {
  const { cfg } = useS();
  const here = usePathname() === '/carreras';
  const r = cfg.races.find((q) => q.id === id);
  if (!r) return <PanelFrame title="Medalla">{null}</PanelFrame>;
  const t = raceTheme(r),
    rs = r.resultSec || 0,
    pr = racePr(r),
    ok = r.targetSec > 0 && rs > 0 && rs <= r.targetSec;
  const foot = (
    <>
      {!here ? (
        <Button
          variant="ghost"
          arrow
          onClick={() => {
            closeSheet();
            navigate('/carreras', () => document.getElementById('car-medallero')?.scrollIntoView({ block: 'start' }));
          }}
        >
          Ver el medallero
        </Button>
      ) : null}
      <Button variant="pri" autoFocus onClick={requestClose}>
        Listo
      </Button>
    </>
  );
  return (
    <PanelFrame eyebrow={(t.n ? t.n + ' · ' : '') + cap(raceDateLabel(r)) + (r.place ? ' · ' + r.place : '')} title={r.name} foot={foot}>
      <div className="car-mp">
        <div className="car-mp-med">
          <RaceMedalSvg r={r} />
        </div>
        {pr || ok ? (
          <p className="car-mp-tags">
            {pr ? (
              <>
                <Pr /> Tu mejor marca en la distancia
              </>
            ) : null}
            {ok ? <span>Objetivo cumplido</span> : null}
          </p>
        ) : null}
        {rs ? (
          <Kpis
            items={[
              { label: 'Tiempo', value: fmtDur(rs) },
              { label: 'Ritmo', value: fmtPace(rs / r.km), unit: '/km', note: kmLabel(r.km) + ' km' },
              ...(r.targetSec
                ? [
                    {
                      label: 'Objetivo',
                      value: fmtDur(r.targetSec),
                      note: (
                        <>
                          <Delta sec={rs - r.targetSec} /> {rs <= r.targetSec ? 'mejor' : 'arriba'}
                        </>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        ) : (
          <div className="car-mp-none">
            <p className="p-dr-p">Todavía no cargaste tu tiempo en esta carrera.</p>
            <Button size="sm" onClick={() => editRace(r.id)}>
              Cargar mi tiempo
            </Button>
          </div>
        )}
      </div>
    </PanelFrame>
  );
}
