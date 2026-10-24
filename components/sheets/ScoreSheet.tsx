'use client';
/* Puntaje de una sesión (showScore): al guardar un resultado (`fresh`) o desde el detalle. */
import { useApp } from '@/lib/store';
import { openSheet, requestClose } from '@/lib/sheets';
import { easyActive } from '@/lib/domain/config';
import { todayS } from '@/lib/domain/util';
import { openRecal } from '@/lib/domain/recal';
import { ScoreHtml } from '@/components/detail/ScoreHtml';
import { SheetFrame } from './SheetFrame';

export default function ScoreSheet({ id, fresh = false }: { id: string; fresh?: boolean }) {
  const s = useApp((st) => st.sessions.find((x) => x.id === id));
  const title = fresh ? 'Tu puntaje' : 'Detalle';
  if (!s || !s.result) return <SheetFrame title={title}>{null}</SheetFrame>;
  const r = s.result;
  const recal = fresh && s.type === 'test' && r.distKm >= 3;
  const foot = (
    <>
      {recal ? (
        <button className="btn pri blk" data-a="recal" onClick={() => openRecal(s.id)}>
          Recalibrar mis ritmos con este test
        </button>
      ) : null}
      {fresh && r.pain && !easyActive(todayS()) ? (
        <button className="btn blk" data-a="easyOpen" onClick={() => openSheet('easy')}>
          Activar modo «No me siento al 100%»
        </button>
      ) : null}
      <button className={recal ? 'btn blk' : 'btn pri blk'} data-a="close" onClick={requestClose}>
        Listo
      </button>
    </>
  );
  return (
    <SheetFrame title={title} foot={foot}>
      <ScoreHtml s={s} />
    </SheetFrame>
  );
}
