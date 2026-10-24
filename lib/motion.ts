/** «Reducir movimiento» del sistema: sin animaciones largas ni números que cuentan. */
export const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
