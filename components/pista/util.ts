/* Ayudas chicas de las piezas «Pista», sin interfaz: sirven en el servidor y en el navegador. */
import type { CSSProperties } from 'react';
import type { PhaseKey, SessionType } from '@/lib/domain/types';

/** variables CSS en `style` (--tc, --n…) */
export const cssVars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
/** el color de un tipo de sesión (tokens --t-*) */
export const typeColor = (t: SessionType) => `var(--t-${t})`;
/** color de cada fase del plan por bloques: el del tipo de sesión que la marca */
export const PHASE_C: Record<PhaseKey, string> = { base: typeColor('fondo'), dev: typeColor('tempo'), spec: typeColor('series'), taper: typeColor('test') };
/** un título de marca que se achica si su palabra más larga no entra en la columna: `--w` en em, para
    `font-size: min(…, 100cqi / var(--w))` dentro de un contenedor con `container-type: inline-size` */
export const fitWords = (...words: string[]) => cssVars({ '--w': Math.max(...words.flatMap((w) => w.split(/\s+/)).map((w) => w.length)) * 0.5 });
