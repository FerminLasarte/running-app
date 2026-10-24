/* Fila de deriva cardíaca en la tabla plan vs. real (`two`: tabla de dos columnas de datos fusionadas). */
import type { Result } from '@/lib/domain/types';
import { decBand } from '@/lib/domain/dec';
import { fmt } from '@/lib/domain/util';

export function DecRow({ r, mode }: { r: Result; mode: 1 | 2 }) {
  if (!r.dec || r.dec.p == null) return null;
  const p = r.dec.p,
    v = fmt(p, 1) + '% · ' + decBand({ ...r.dec, p }).t;
  return mode === 2 ? (
    <tr>
      <td>Deriva cardíaca</td>
      <td colSpan={2}>{v}</td>
    </tr>
  ) : (
    <tr>
      <td>Deriva cardíaca</td>
      <td>–</td>
      <td>{v}</td>
    </tr>
  );
}
