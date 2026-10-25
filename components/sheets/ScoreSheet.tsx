'use client';
/* Puntaje de una sesión: se abre al guardar un resultado (`fresh`). El número, el desglose y las notas son los mismos
   que en el detalle de sesión; abajo, lo que conviene hacer ahora (recalibrar con un test, el modo suave si hubo
   molestia) y el link al detalle. */
import '@/app/styles/screens/sesion.css';
import { usePathname } from 'next/navigation';
import { Bandaids, Gauge } from '@phosphor-icons/react';
import { useApp } from '@/lib/store';
import { closeSheet, openSheet, requestClose } from '@/lib/sheets';
import { TYPES, easyActive } from '@/lib/domain/config';
import { scoreSession } from '@/lib/domain/score';
import { sdate } from '@/lib/domain/stats';
import { cap, dateLabel, todayS } from '@/lib/domain/util';
import { openRecal } from '@/lib/domain/recal';
import { goSession, sessionHref } from '@/lib/nav';
import { Button } from '@/components/pista/controls';
import { PanelFrame } from '@/components/panels/PanelFrame';
import { ScoreHead, ScoreParts } from '@/components/sesion/ScoreBreakdown';

export default function ScoreSheet({ id, fresh = false }: { id: string; fresh?: boolean }) {
  const s = useApp((st) => st.sessions.find((x) => x.id === id));
  const here = usePathname() === sessionHref(id);
  const title = fresh ? 'Tu puntaje' : 'Puntaje';
  if (!s || !s.result) return <PanelFrame title={title}>{null}</PanelFrame>;
  const r = s.result,
    sc = scoreSession(s);
  const recal = fresh && s.type === 'test' && r.distKm >= 3,
    easy = fresh && r.pain && !easyActive(todayS());
  const foot = (
    <>
      {!here ? (
        <Button
          variant="ghost"
          arrow
          onClick={() => {
            closeSheet();
            goSession(s.id);
          }}
        >
          Ver la sesión
        </Button>
      ) : null}
      <Button variant={recal || easy ? undefined : 'pri'} autoFocus onClick={requestClose}>
        Listo
      </Button>
    </>
  );
  return (
    <PanelFrame eyebrow={TYPES[s.type].label + ' · ' + cap(dateLabel(sdate(s)))} title={title} foot={foot}>
      <div className="ses-scp">
        {sc ? (
          <>
            <ScoreHead sc={sc} />
            <ScoreParts sc={sc} />
          </>
        ) : null}
        {recal || easy ? (
          <div className="ses-scp-next">
            {recal ? (
              <Button variant="pri" icon={Gauge} onClick={() => openRecal(s.id)}>
                Recalibrar mis ritmos con este test
              </Button>
            ) : null}
            {easy ? (
              <Button icon={Bandaids} onClick={() => openSheet('easy')}>
                Activar modo «No me siento al 100%»
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </PanelFrame>
  );
}
