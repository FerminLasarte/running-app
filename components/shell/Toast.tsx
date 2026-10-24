'use client';
/* Aviso flotante de abajo, con botón opcional (por ejemplo «Deshacer»). */
import { useEffect, useState } from 'react';
import { useApp, setS } from '@/lib/store';
import { reduceMotion } from '@/lib/motion';

export function Toast() {
  const t = useApp((s) => s.toast);
  /* clave del aviso que se está yendo (animación de salida) */
  const [outKey, setOutKey] = useState<number | null>(null);
  const out = !!t && outKey === t.key;

  useEffect(() => {
    if (!t) return;
    let h: ReturnType<typeof setTimeout>;
    const hide = setTimeout(() => {
      if (reduceMotion()) return setS({ toast: null });
      setOutKey(t.key);
      h = setTimeout(() => setS({ toast: null }), 220);
    }, t.ms);
    return () => {
      clearTimeout(hide);
      clearTimeout(h);
    };
  }, [t]);

  return (
    <div id="toast" className={'toast' + (out ? ' out' : '')} role="status" hidden={!t}>
      {t?.msg}
      {t?.action ? (
        <>
          {' '}
          <button
            className="toast-btn"
            onClick={() => {
              const run = t.action!.run;
              setS({ toast: null });
              run();
            }}
          >
            {t.action.label}
          </button>
        </>
      ) : null}
    </div>
  );
}
