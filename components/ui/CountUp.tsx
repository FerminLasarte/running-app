'use client';
/* Número que cuenta desde 0 al aparecer (el `cuN` del original). Respeta «reducir movimiento». */
import { useEffect, useRef, useState } from 'react';
import { clamp, fmt } from '@/lib/domain/util';
import { reduceMotion } from '@/lib/motion';

/* los números que aparecen juntos arrancan escalonados, 40 ms uno de otro */
let order = 0;
let resetQueued = false;
const nextOrder = () => {
  if (!resetQueued && typeof window !== 'undefined') {
    resetQueued = true;
    requestAnimationFrame(() => {
      order = 0;
      resetQueued = false;
    });
  }
  return order++;
};

const zero = (d: number) => (0).toFixed(d).replace('.', ',');
/* sin animación si está pedido o si la página no se ve (en segundo plano los cuadros no corren) */
const canAnimate = () => typeof document !== 'undefined' && !reduceMotion() && document.visibilityState === 'visible';

export function CountUp({ v, d = 0 }: { v: number; d?: number }) {
  const fin = fmt(v, d);
  /* arranca en 0 solo la primera vez que aparece: si el valor cambia después, se muestra directo */
  const [txt, setTxt] = useState<string | null>(() => (isFinite(v) && canAnimate() ? zero(d) : null));
  const started = useRef(txt != null);

  useEffect(() => {
    if (!started.current) return;
    started.current = false;
    const t0 = performance.now() + 120 + nextOrder() * 40,
      dur = 1000;
    let raf = 0;
    const tick = (now: number) => {
      const k = clamp((now - t0) / dur, 0, 1),
        e = 1 - Math.pow(1 - k, 3);
      if (k >= 1) {
        setTxt(null);
        return;
      }
      setTxt((v * e).toFixed(d).replace('.', ','));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setTxt(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span className="cu" data-v={v} data-d={d}>
      {txt ?? fin}
    </span>
  );
}
