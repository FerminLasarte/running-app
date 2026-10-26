import { Suspense } from 'react';
import AppShell from '@/components/shell/AppShell';

/* Todas las secciones comparten el shell. Se dibuja en el navegador: el servidor manda este esqueleto. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="app">
          <div className="main">
            <div className="page">
              <div className="skel" />
              <div className="skel" />
            </div>
          </div>
        </div>
      }
    >
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
