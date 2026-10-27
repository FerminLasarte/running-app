/* Movimiento de la portada: lo marcado con `data-reveal` aparece al entrar en pantalla (y recién ahí corren las
   animaciones de sus piezas: la pista se dibuja, las barras crecen). Sin JS o con «reducir movimiento», todo se ve
   desde el principio. */
import { useEffect, type RefObject } from 'react';
import { reduceMotion } from '@/lib/motion';

export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el || reduceMotion() || !('IntersectionObserver' in window)) return;
    el.classList.add('js');
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('in');
          io.unobserve(e.target);
        }),
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
    );
    el.querySelectorAll('[data-reveal]').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [root]);
}
