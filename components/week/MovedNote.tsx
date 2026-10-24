/* «Movida desde el …»: en la próxima sesión y en el detalle. */
import type { Plan } from '@/lib/domain/types';
import { dateLabel } from '@/lib/domain/util';

export function MovedNote({ p }: { p: Plan | null | undefined }) {
  if (!(p && p.moved)) return null;
  return (
    <p className="hint" style={{ marginTop: 8 }}>
      Movida desde el {dateLabel(p.moved.from)}
      {p.moved.reason ? ' · ' + p.moved.reason.toLowerCase() : ''}.
    </p>
  );
}
