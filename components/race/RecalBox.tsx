'use client';
/* Recalibrar después de cada test o carrera, y deshacer la última (recalBox, líneas 3562–3568 del original). */
import { useS } from '@/lib/store';
import { openRecal, rcSources, recalUndoTap } from '@/lib/domain/recal';
import { dateLabel } from '@/lib/domain/util';

export function RecalBox() {
  const { cfg } = useS();
  const last = (cfg.recals || []).slice(-1)[0],
    src = rcSources(),
    n = last ? Number(last.n) : 0;
  return (
    <div className="lv-box" style={{ marginTop: 12 }}>
      {last ? (
        <>
          Última recalibración: <b>{dateLabel(last.at)}</b> con tu {String(last.src).toLowerCase()} ({n + (n === 1 ? ' sesión' : ' sesiones')}).
        </>
      ) : (
        'Después de cada test o carrera podés recalibrar los ritmos de las sesiones que vienen.'
      )}
      <div className="acts" style={{ marginTop: 10 }}>
        {src.length ? (
          <button className="btn sm pri" data-a="recal" onClick={() => openRecal(null)}>
            Recalibrar ritmos
          </button>
        ) : (
          <button className="btn sm" disabled>
            Falta un test
          </button>
        )}
        {last ? (
          <button className="btn sm" data-a="recal-undo" onClick={recalUndoTap}>
            Deshacer la última
          </button>
        ) : null}
      </div>
    </div>
  );
}
