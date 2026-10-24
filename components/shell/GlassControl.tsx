'use client';
/* Transparencia del vidrio, como el control que trajo iOS 27: de más legible (opaco) a más transparente. */
import { useState } from 'react';

const KEY = 'rr_glass';

export function GlassControl() {
  /* la app se dibuja solo en el navegador: puedo leer el valor actual al montar */
  const [v, setV] = useState(() => {
    const cur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--glass-t'));
    return isFinite(cur) ? cur : 0.5;
  });
  const set = (n: number) => {
    setV(n);
    document.documentElement.style.setProperty('--glass-t', String(n));
    try {
      localStorage.setItem(KEY, String(n));
    } catch {
      /* sin almacenamiento */
    }
  };
  return (
    <div className="gl-ctl">
      <label htmlFor="st-glass">Transparencia del vidrio</label>
      <input id="st-glass" type="range" min={0} max={1} step={0.05} value={v} onChange={(e) => set(+e.target.value)} />
      <div className="gl-ends">
        <span>Más legible</span>
        <span>Más transparente</span>
      </div>
    </div>
  );
}
