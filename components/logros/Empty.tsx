'use client';
/* Sin salidas cargadas (boceto «Primera vez»): arrancás en el nivel 1 y la primera salida ya suma. */
import { Medal, Plus } from '@phosphor-icons/react';
import { useS } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import { demoOn } from '@/lib/data/actions';
import { XP_TITLES, xpFor } from '@/lib/domain/xp';
import { nf } from '@/lib/domain/util';
import { Button } from '@/components/pista/controls';
import { BrandTitle, Panel } from '@/components/pista/structure';

export function Empty() {
  const { demo } = useS();
  return (
    <Panel className="p-c12 p-rise lo-empty">
      <Medal className="ic" aria-hidden="true" />
      <BrandTitle as="h2">Logros</BrandTitle>
      <p>Arrancás en el nivel 1, «{XP_TITLES[0][1]}». La primera salida ya suma experiencia y tu primer trofeo.</p>
      <div className="lo-rowb">
        <span className="mono">0 XP</span>
        <span>{nf(xpFor(2))} para el nivel 2</span>
      </div>
      <div className="lo-acts">
        <Button size="sm" icon={Plus} iconWeight="bold" onClick={() => openSheet('result', { id: null })}>
          Registrar la primera
        </Button>
        {demo ? null : (
          <Button size="sm" variant="ghost" onClick={demoOn}>
            Ver con datos de ejemplo
          </Button>
        )}
      </div>
    </Panel>
  );
}
