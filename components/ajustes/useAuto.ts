'use client';
/* Borrador de unos campos que se guarda solo, como en la pantalla vieja: lo escrito se guarda al salir del campo o con
   Enter (`edit`), y lo que se elige (una fecha, una distancia, un interruptor) en el acto (`now`). Cuando cambia lo
   guardado, el borrador vuelve a salir de ahí. */
import { useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';

/** los casilleros de un tiempo (h:m:s) a los que pertenece un campo */
const hmsOf = (n: EventTarget | null) => (n instanceof Element ? n.closest('.p-hms') : null);

export function useAuto<D>(src: unknown, make: () => D, save: (d: D) => void) {
  const [draft, setDraft] = useState(make);
  const [base, setBase] = useState(src);
  if (base !== src) {
    setBase(src);
    setDraft(make());
  }
  const dirty = useRef(false);
  const edit = (fn: (d: D) => D) => {
    dirty.current = true;
    setDraft(fn);
  };
  const now = (fn: (d: D) => D) => {
    const n = fn(draft);
    dirty.current = false;
    setDraft(n);
    save(n);
  };
  const flush = () => {
    if (!dirty.current) return;
    dirty.current = false;
    save(draft);
  };
  /** para el contenedor de los campos: guarda al irse de un campo (no al pasar entre los casilleros de un tiempo) */
  const bind = {
    onBlur: (e: FocusEvent) => {
      const g = hmsOf(e.target);
      if (!g || g !== hmsOf(e.relatedTarget)) flush();
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') flush();
    },
  };
  return { draft, edit, now, bind };
}
