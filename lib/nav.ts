/* Navegación entre páginas desde código que no es un componente (acciones, hojas, atajos). El shell le pasa el
   router de Next al arrancar; `then` corre cuando la página nueva ya se dibujó (por ejemplo, para bajar a una parte). */

type Push = (href: string) => void;

let push: Push = (href) => window.location.assign(href);
let pending: (() => void) | null = null;

export function setRouter(p: Push) {
  push = p;
}

export function navigate(href: string, then?: () => void) {
  pending = then || null;
  if (window.location.pathname === href) runPending();
  else push(href);
}

/** después de que React dibuje lo nuevo */
export const afterPaint = (fn: () => void) => requestAnimationFrame(() => requestAnimationFrame(fn));

/** el shell la llama cuando cambia la página */
export function runPending() {
  const fn = pending;
  pending = null;
  if (fn) afterPaint(fn);
}

export const sessionHref = (id: string) => '/sesion/' + encodeURIComponent(id);
export const goSession = (id: string) => navigate(sessionHref(id));
