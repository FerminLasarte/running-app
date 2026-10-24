'use client';
/* Un componente que viaja en su propio archivo de JS. `preload()` lo baja antes de que haga falta (en un rato libre
   después de arrancar, así también queda guardado para abrir sin señal); cuando ya está, se dibuja de una, sin pasar
   por el «cargando» y sin cortar las animaciones de entrada. */
import { Suspense, lazy, type ComponentType, type ReactNode } from 'react';

// las pestañas y las hojas tienen props distintas; acá se manejan como un mapa genérico
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComp = ComponentType<any>;

export function preloadable(load: () => Promise<{ default: AnyComp }>, fallback: ReactNode = null) {
  let Ready: AnyComp | null = null;
  let p: Promise<void> | null = null;
  const preload = () =>
    (p ??= load().then((m) => {
      Ready = m.default;
    }));
  const Lazy = lazy(() => preload().then(() => ({ default: Ready! })));
  function Comp(props: Record<string, unknown>) {
    if (Ready) return <Ready {...props} />;
    return (
      <Suspense fallback={fallback}>
        <Lazy {...props} />
      </Suspense>
    );
  }
  return Object.assign(Comp, { preload });
}
