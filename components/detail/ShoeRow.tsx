/* Fila de zapatillas en la tabla plan vs. real. */
import type { Result } from '@/lib/domain/types';
import { shoeById } from '@/lib/domain/config';

export function ShoeRow({ r, two }: { r: Result; two: boolean }) {
  const z = r.shoe ? shoeById(r.shoe) : null;
  if (!z) return null;
  return two ? (
    <tr>
      <td>Zapatillas</td>
      <td colSpan={2}>{z.name}</td>
    </tr>
  ) : (
    <tr>
      <td>Zapatillas</td>
      <td>–</td>
      <td>{z.name}</td>
    </tr>
  );
}
