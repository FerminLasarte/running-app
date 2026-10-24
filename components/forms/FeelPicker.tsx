'use client';
/* ¿Cómo te sentiste? De 1 a 10, de rojo a verde, con una palabra. */
import type { CSSProperties } from 'react';
import { FEEL_C, FEEL_T } from '@/lib/domain/resultForm';

const NS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function FeelPicker({ feel, onPick }: { feel: number | null; onPick: (n: number) => void }) {
  return (
    <>
      <div className="feel2" role="group" aria-label="Sensación de 1 a 10">
        {NS.map((n) => (
          <button key={n} data-a="rf-feel" data-v={n} aria-label={n + ' de 10'} aria-pressed={feel === n} style={{ '--fc': FEEL_C(n) } as CSSProperties} onClick={() => onPick(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="feel-cap">
        <span>Muy mal</span>
        <b id="rf-feel-tx" style={{ color: feel ? FEEL_C(feel) : undefined }}>
          {feel ? feel + ' · ' + FEEL_T(feel) : 'Tocá un número'}
        </b>
        <span>Excelente</span>
      </div>
    </>
  );
}
