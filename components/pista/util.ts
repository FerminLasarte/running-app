/* Ayudas chicas de las piezas «Pista», sin interfaz: sirven en el servidor y en el navegador. */
import type { CSSProperties } from 'react';
import type { SessionType } from '@/lib/domain/types';

/** variables CSS en `style` (--tc, --n…) */
export const cssVars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
/** el color de un tipo de sesión (tokens --t-*) */
export const typeColor = (t: SessionType) => `var(--t-${t})`;
