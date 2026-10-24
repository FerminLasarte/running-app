'use client';
/* La app depende de la fecha de hoy, del tema y de los datos del usuario: se dibuja solo en el navegador.
   El servidor entrega un esqueleto liviano que se ve mientras carga. El shell viene en el mismo pedido que la
   página (no en uno aparte después de arrancar): así el primer dibujo no espera una vuelta más a la red. */
import { useSyncExternalStore } from 'react';
import AppShell from './AppShell';

const never = () => () => {};

export default function ClientApp() {
  const browser = useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
  if (browser) return <AppShell />;
  return (
    <div id="app">
      <main id="view">
        <div className="skel" />
        <div className="skel" />
      </main>
    </div>
  );
}
