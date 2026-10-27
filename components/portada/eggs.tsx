'use client';
/* Los easter eggs de la portada.
   - 42195: escribirlo en cualquier parte (o tocar cinco veces el dorsal, en el celu) pasa el estadio a modo maratón.
   - «¡Ya!»: tocar el «En sus marcas.» del cierre da la largada; la vuelta de tartán sale disparada y el cronómetro frena
     en 43,03, el récord mundial de los 400 m. */
import { useEffect, useRef, useState } from 'react';
import { reduceMotion } from '@/lib/motion';

const CODE = '42195';

/** modo maratón: se prende y se apaga con el mismo código, o con cinco toques seguidos (`tap`) */
export function useMarathon() {
  const [on, setOn] = useState(false);
  const taps = useRef<number[]>([]);
  useEffect(() => {
    let buf = '';
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if ((t instanceof Element && t.closest('input, textarea, [contenteditable]')) || e.metaKey || e.ctrlKey || e.altKey) return;
      buf = (buf + e.key).slice(-CODE.length);
      if (buf === CODE) {
        buf = '';
        setOn((v) => !v);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  const tap = () => {
    const now = Date.now();
    taps.current = taps.current.filter((t) => now - t < 2000).concat(now);
    if (taps.current.length >= 5) {
      taps.current = [];
      setOn((v) => !v);
    }
  };
  return [on, tap] as const;
}

type Gun = 'idle' | 'listos' | 'ya';
const WR = 43.03,
  SPRINT = 1400;
const clock = (s: number) => s.toFixed(2).replace('.', ',');

/** el título del cierre, que da la largada al tocarlo */
export function Largada() {
  const [st, setSt] = useState<Gun>('idle');
  const [t, setT] = useState(0);
  const h = useRef<HTMLHeadingElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    h.current?.closest('.po-end')?.classList.toggle('go', st === 'ya');
  }, [st]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function fire() {
    if (st !== 'idle') return;
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    setSt('listos');
    setT(0);
    later(() => {
      setSt('ya');
      if (reduceMotion()) return setT(WR);
      /* el reloj corre rápido y frena al llegar, como la vuelta */
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / SPRINT);
        setT(WR * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, 900);
    later(() => setSt('idle'), 900 + 4200);
  }

  return (
    <>
      <h2 ref={h} className="brand-t po-gun-h">
        <button type="button" className="po-gun" onClick={fire}>
          {st === 'idle' ? (
            <>
              En sus <br />
              marcas
            </>
          ) : st === 'listos' ? (
            'Listos'
          ) : (
            '¡Ya'
          )}
        </button>
        <em>{st === 'ya' ? '!' : '.'}</em>
      </h2>
      <p className={'po-clock' + (st === 'ya' ? ' on' : '')} aria-hidden="true">
        {st === 'ya' ? (
          <>
            <b>{clock(t)}</b>
            <small>400 m · récord mundial</small>
          </>
        ) : null}
      </p>
    </>
  );
}
