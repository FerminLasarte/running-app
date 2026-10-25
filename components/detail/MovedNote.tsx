/* «Movida desde el …»: en la próxima sesión y en el detalle. `className` para las pantallas nuevas (sin, el estilo
   viejo). */
import type { Plan } from '@/lib/domain/types';
import { dateLabel } from '@/lib/domain/util';

export function MovedNote({ p, className }: { p: Plan | null | undefined; className?: string }) {
  if (!(p && p.moved)) return null;
  return (
    <p className={className || 'hint'} style={className ? undefined : { marginTop: 8 }}>
      Movida desde el {dateLabel(p.moved.from)}
      {p.moved.reason ? ' · ' + p.moved.reason.toLowerCase() : ''}.
    </p>
  );
}
