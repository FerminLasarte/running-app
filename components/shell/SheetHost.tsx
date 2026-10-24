'use client';
/* Contenedor de la hoja abierta: fondo, animación de entrada y salida, arrastre hacia abajo para cerrar (celu),
   tocar afuera para cerrar y la confirmación si hay cambios sin guardar. */
import { useEffect, useRef } from 'react';
import { useApp, setUi } from '@/lib/store';
import { closeSheet, requestClose } from '@/lib/sheets';
import { buzz } from '@/lib/data/actions';
import { SHEETS } from '@/components/sheets/registry';

export function SheetHost() {
  const sheet = useApp((s) => s.sheet);
  const closing = useApp((s) => !!s.ui.sheetClosing);
  const confirm = useApp((s) => !!s.ui.sheetConfirm);
  const shRef = useRef<HTMLDivElement>(null);
  const sinRef = useRef<HTMLDivElement>(null);
  const ret = useRef<Element | null>(null);
  const open = !!sheet;

  /* al abrir: guardo el foco y bloqueo el scroll de atrás; al cerrar, lo devuelvo */
  useEffect(() => {
    if (!open) return;
    ret.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    const sc = document.getElementById('sclose');
    sc?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = '';
      const r = ret.current as HTMLElement | null;
      ret.current = null;
      if (r && r.isConnected && r.focus)
        try {
          r.focus({ preventScroll: true });
        } catch {
          /* sin foco */
        }
    };
  }, [open]);

  /* cada hoja nueva arranca arriba */
  useEffect(() => {
    const b = document.getElementById('sbody');
    if (b) b.scrollTop = 0;
    const sin = sinRef.current;
    if (sin) {
      sin.classList.remove('drag', 'snap');
      sin.style.transform = '';
    }
    if (shRef.current) shRef.current.style.backgroundColor = '';
  }, [sheet?.key]);

  /* en el celular la hoja se arrastra hacia abajo desde arriba para cerrarla */
  useEffect(() => {
    const sh = shRef.current,
      sin = sinRef.current;
    if (!sh || !sin) return;
    let y0: number | null = null,
      t0 = 0,
      dy = 0,
      pid = -1,
      passed = false;
    const down = (e: PointerEvent) => {
      const head = (e.target as Element).closest('.shead');
      if (!head || window.innerWidth >= 900 || (e.target as Element).closest('button') || e.button > 0) return;
      y0 = e.clientY;
      t0 = performance.now();
      dy = 0;
      pid = e.pointerId;
      passed = false;
      try {
        (head as HTMLElement).setPointerCapture(pid);
      } catch {
        /* sin captura */
      }
      sin.classList.remove('snap');
      sin.classList.add('drag');
    };
    const move = (e: PointerEvent) => {
      if (y0 == null || e.pointerId !== pid) return;
      const raw = e.clientY - y0;
      dy = raw < 0 ? raw / 4 : raw;
      sin.style.transform = 'translateY(' + dy + 'px)';
      sh.style.backgroundColor = 'rgba(3,6,10,' + 0.5 * Math.max(0, 1 - dy / 500) + ')';
      if (!passed && dy > 120) {
        passed = true;
        buzz(6);
      }
      if (passed && dy < 120) passed = false;
    };
    const end = (e: PointerEvent) => {
      if (y0 == null || e.pointerId !== pid) return;
      y0 = null;
      sin.classList.remove('drag');
      const v = dy / Math.max(1, performance.now() - t0);
      if (dy > 120 || (dy > 40 && v > 0.6)) {
        requestClose();
        if (useApp.getState().ui.sheetConfirm) {
          sin.classList.add('snap');
          sin.style.transform = '';
          sh.style.backgroundColor = '';
        } else {
          sin.style.transition = 'transform .26s var(--ease-in)';
          sin.style.transform = 'translateY(105%)';
          setTimeout(() => {
            sin.style.transition = '';
          }, 300);
        }
      } else {
        sin.classList.add('snap');
        sin.style.transform = '';
        sh.style.backgroundColor = '';
      }
    };
    sin.addEventListener('pointerdown', down);
    sin.addEventListener('pointermove', move);
    sin.addEventListener('pointerup', end);
    sin.addEventListener('pointercancel', end);
    return () => {
      sin.removeEventListener('pointerdown', down);
      sin.removeEventListener('pointermove', move);
      sin.removeEventListener('pointerup', end);
      sin.removeEventListener('pointercancel', end);
    };
  }, [open]);

  const Comp = sheet ? SHEETS[sheet.kind] : null;
  return (
    <div
      ref={shRef}
      id="sheet"
      className={'sheet' + (closing ? ' closing' : '')}
      hidden={!sheet}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stitle"
      onClick={(e) => {
        if (e.target === shRef.current) requestClose();
      }}
    >
      <div className="sin" ref={sinRef}>
        {Comp && sheet ? <Comp key={sheet.key} {...sheet.props} /> : null}
        {confirm ? (
          <div className="sconfirm" role="alertdialog">
            <b>¿Descartar lo que cargaste?</b>
            <p>Tenés cambios sin guardar en este formulario.</p>
            <div>
              <button className="btn" autoFocus onClick={() => setUi('sheetConfirm', false)}>
                Seguir editando
              </button>
              <button className="btn dng" onClick={() => closeSheet()}>
                Descartar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
