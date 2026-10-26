/* Paneles (se abren desde la derecha; en el celu, a pantalla completa): components/shell/PanelHost.tsx los muestra.
   Uno solo abierto a la vez. Los nombres vienen de cuando eran hojas que subían desde abajo. */
import { useEffect } from 'react';
import { reduceMotion } from './motion';
import { S, setS, setUi } from './store';

let dirty = false;

/** Abre el panel registrado como `kind` en components/panels/registry.tsx. Reemplaza al que esté abierto. */
export function openSheet(kind: string, props: Record<string, unknown> = {}) {
  dirty = false;
  setUi('sheetConfirm', false);
  setUi('sheetClosing', false);
  setS({ sheet: { kind, props, key: Date.now() + Math.random() } });
}

/** Cierra sin preguntar (después de guardar, por ejemplo). */
export function closeSheet() {
  if (!S.sheet) return;
  dirty = false;
  setUi('sheetConfirm', false);
  if (reduceMotion()) {
    setS({ sheet: null });
    return;
  }
  const k = S.sheet.key;
  setUi('sheetClosing', true);
  setTimeout(() => {
    if (S.sheet && S.sheet.key === k) setS({ sheet: null });
    setUi('sheetClosing', false);
  }, 300);
}

/** Cerrar a pedido del usuario (×, Esc, «Cancelar», tocar afuera): si hay cambios sin guardar, pregunta antes. */
export function requestClose() {
  if (!S.sheet) return;
  if (dirty) {
    setUi('sheetConfirm', true);
    return;
  }
  closeSheet();
}

/** Desde un formulario: avisa si tiene cambios sin guardar (para preguntar antes de cerrar). */
export function useSheetDirty(d: boolean) {
  useEffect(() => {
    dirty = d;
  }, [d]);
  useEffect(
    () => () => {
      dirty = false;
    },
    [],
  );
}
