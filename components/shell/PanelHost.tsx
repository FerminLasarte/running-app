'use client';
/* El panel abierto (uno por vez): el fondo que oscurece, la entrada desde la derecha, el foco atrapado adentro mientras
   está abierto y la confirmación si hay cambios sin guardar. En el celu ocupa toda la pantalla. Los paneles están en
   components/panels/registry.tsx y se abren con openSheet (lib/sheets.ts). */
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { useApp, setUi } from '@/lib/store';
import { closeSheet, requestClose, sheetOpener } from '@/lib/sheets';
import { PANELS } from '@/components/panels/registry';
import { PANEL_BODY_ID, PANEL_TITLE_ID } from '@/components/panels/PanelFrame';
import { Button } from '@/components/pista/controls';
import { cx } from '@/components/pista/util';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function PanelHost() {
  const sheet = useApp((s) => s.sheet);
  const closing = useApp((s) => !!s.ui.sheetClosing);
  const confirm = useApp((s) => !!s.ui.sheetConfirm);
  const dr = useRef<HTMLElement>(null);
  const ret = useRef<Element | null>(null);
  const open = !!sheet;

  /* al abrir: guardo el foco y bloqueo el scroll de atrás; al cerrar, lo devuelvo. El bloqueo va en <html>: base.css
     le pone overflow-x: clip, así que el overflow del body no pasa a la ventana y el body se vuelve su propia caja de
     scroll; la barra lateral y la de arriba (sticky) se quedan arriba del todo y, con la página bajada, desaparecen */
  useEffect(() => {
    if (!open) return;
    ret.current = sheetOpener() || document.activeElement;
    const html = document.documentElement;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = '';
      const r = ret.current as HTMLElement | null;
      ret.current = null;
      if (r && r.isConnected && r.focus) r.focus({ preventScroll: true });
    };
  }, [open]);

  /* cada panel nuevo arranca arriba; el foco va a lo que el panel marcó con autoFocus o, si no, a la × */
  useEffect(() => {
    if (!sheet) return;
    const b = document.getElementById(PANEL_BODY_ID);
    if (b) b.scrollTop = 0;
    const t = setTimeout(() => {
      const d = dr.current;
      if (d && !d.contains(document.activeElement)) d.querySelector<HTMLElement>('[data-close]')?.focus({ preventScroll: true });
    }, 80);
    return () => clearTimeout(t);
  }, [sheet]);

  /* Tab no se escapa del panel */
  const trap = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !dr.current) return;
    const f = [...dr.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const a = document.activeElement,
      first = f[0],
      last = f[f.length - 1];
    if (e.shiftKey && (a === first || !dr.current.contains(a))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && a === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!sheet) return null;
  const Comp = PANELS[sheet.kind];
  return (
    <>
      <div className={cx('p-scrim', closing && 'out')} aria-hidden="true" onClick={requestClose} />
      <aside ref={dr} className={cx('p-drawer', closing && 'out')} role="dialog" aria-modal="true" aria-labelledby={PANEL_TITLE_ID} onKeyDown={trap}>
        {Comp ? <Comp key={sheet.key} {...sheet.props} /> : null}
        {confirm ? (
          <div className="p-dr-confirm" role="alertdialog" aria-labelledby="p-dr-cf-t" aria-describedby="p-dr-cf-d">
            <b id="p-dr-cf-t">¿Descartar lo que cargaste?</b>
            <p id="p-dr-cf-d">Tenés cambios sin guardar en este panel.</p>
            <div>
              <Button autoFocus onClick={() => setUi('sheetConfirm', false)}>
                Seguir editando
              </Button>
              <Button className="dng" onClick={() => closeSheet()}>
                Descartar
              </Button>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
