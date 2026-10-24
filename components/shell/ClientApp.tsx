'use client';
/* La app depende de la fecha de hoy, del tema y de los datos del usuario: se dibuja solo en el navegador.
   El servidor entrega un esqueleto liviano que se ve mientras carga. */
import dynamic from 'next/dynamic';

const AppShell = dynamic(() => import('./AppShell'), {
  ssr: false,
  loading: () => (
    <div id="app">
      <main id="view">
        <div className="skel" />
        <div className="skel" />
      </main>
    </div>
  ),
});

export default function ClientApp() {
  return <AppShell />;
}
