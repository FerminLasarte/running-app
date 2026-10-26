/* Subpestañas de Resumen, Carrera y Logros: un control segmentado.
   Cada opción es una pestaña accesible (role="tab" + aria-selected); aria-pressed queda porque el CSS del
   original marca la elegida con él. */
import type { ReactNode } from 'react';

export function SubTabs({ label, value, items, onPick, act }: { label: string; value: string; items: [string, ReactNode][]; onPick: (v: string) => void; act: string }) {
  return (
    <div className="seg subtabs" role="tablist" aria-label={label}>
      {items.map(([v, t]) => (
        // eslint-disable-next-line jsx-a11y/role-supports-aria-props
        <button key={v} className="chip" role="tab" aria-selected={v === value} aria-pressed={v === value} data-a={act} data-v={v} onClick={() => onPick(v)}>
          {t}
        </button>
      ))}
    </div>
  );
}
