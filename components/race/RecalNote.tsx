/* Aviso de ritmos recalibrados en una sesión planificada (recalNote, línea 3569 del original). */
import type { Plan } from '@/lib/domain/types';
import { stepsBrief } from '@/lib/domain/stages';
import { dateLabel } from '@/lib/domain/util';

export function RecalNote({ p }: { p: Plan | null | undefined }) {
  if (!p || !p.recal) return null;
  return (
    <p className="hint" style={{ marginTop: 8 }}>
      Ritmos recalibrados el {dateLabel(p.recal.at)} con tu {String(p.recal.src).toLowerCase()}. Antes: {stepsBrief(p.recal.prev)}.
    </p>
  );
}
