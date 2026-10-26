'use client';
/* La pulsera que se imprime: km por km (también en el maratón) y en tamaño real, 5 cm de ancho con filas de 5 mm. Se
   cuelga del body solo mientras se imprime, para que quede sola en la hoja (carreras.css esconde todo lo demás) y para
   que imprimir otra pantalla no la arrastre. */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Race } from '@/lib/domain/types';
import type { RaceScen, RaceStrategy } from '@/lib/domain/race';
import { afterPaint } from '@/lib/nav';
import { PaceBand } from '@/components/pista/sport';
import { bandProps } from './util';

/** el botón de imprimir: la paleta lo toca después de llevarte a Carreras */
export const PRINT_BTN_ID = 'car-print-btn';

export function PrintBand({ race, sel, st, onDone }: { race: Race; sel: RaceScen; st: RaceStrategy; onDone: () => void }) {
  useEffect(() => {
    /* si el efecto se desarma antes de dibujar (React en desarrollo lo corre dos veces), no se imprime dos veces */
    let on = true;
    window.addEventListener('afterprint', onDone);
    afterPaint(() => on && window.print());
    return () => {
      on = false;
      window.removeEventListener('afterprint', onDone);
    };
  }, [onDone]);
  return createPortal(
    <div className="car-print" aria-hidden="true">
      <PaceBand {...bandProps(race, sel, st, st.splits)} />
    </div>,
    document.body,
  );
}
