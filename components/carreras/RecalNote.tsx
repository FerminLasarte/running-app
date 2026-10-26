/* Aviso de ritmos recalibrados en una sesión planificada (recalNote, línea 3569 del original). `className` para las
   pantallas nuevas (sin, el estilo viejo). */
import type { Plan } from '@/lib/domain/types';
import { stepsBrief } from '@/lib/domain/stages';
import { dateLabel } from '@/lib/domain/util';

export function RecalNote({ p, className }: { p: Plan | null | undefined; className?: string }) {
  if (!p || !p.recal) return null;
  return (
    <p className={className || 'hint'} style={className ? undefined : { marginTop: 8 }}>
      Ritmos recalibrados el {dateLabel(p.recal.at)} con tu {String(p.recal.src).toLowerCase()}. Antes: {stepsBrief(p.recal.prev)}.
    </p>
  );
}
