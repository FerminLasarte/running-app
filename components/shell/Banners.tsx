'use client';
/* Avisos de arriba de la página, en una línea: probando sin cuenta, datos de ejemplo, sin conexión con la cuenta, cambios
   sin guardar en la nube o que se guarda solo en este navegador. El estado de guardado va en la barra de arriba. */
import { useShallow } from 'zustand/react/shallow';
import { useApp } from '@/lib/store';
import { demoOff, goSignup, retryFailed } from '@/lib/data/actions';
import { endGuest } from '@/lib/guest';
import { Button } from '@/components/pista/controls';

export function Banners() {
  const S = useApp(useShallow((s) => ({ demo: s.demo, mode: s.mode, loaded: s.loaded, cloudLost: s.cloudLost, failed: s.failed })));
  const nf = Object.keys(S.failed).length;
  return (
    <>
      {S.mode === 'guest' ? (
        <div className="bnr-i guest">
          <span>
            <b>Estás probando Lane One con datos de ejemplo.</b> Creá tu cuenta para guardar lo tuyo.
          </span>
          <Button size="sm" variant="ghost" onClick={endGuest}>
            Salir
          </Button>
          <Button size="sm" variant="acc" onClick={goSignup}>
            Crear cuenta
          </Button>
        </div>
      ) : S.demo ? (
        <div className="bnr-i">
          <span>
            <b>Datos de ejemplo.</b> Nada de esto se guarda.
          </span>
          <Button size="sm" onClick={demoOff}>
            Salir
          </Button>
        </div>
      ) : null}
      {S.cloudLost ? (
        <div className="bnr-i bad" role="status">
          <span>
            <b>Sin conexión con tu cuenta.</b> {nf ? nf + (nf === 1 ? ' cambio queda' : ' cambios quedan') + ' en este navegador y lo' : 'Lo que cargues queda en este navegador y lo'} subo solo cuando vuelva. Si vas a
            cerrar, exportá un respaldo.
          </span>
        </div>
      ) : nf ? (
        <div className="bnr-i bad" role="status">
          <span>
            <b>Hay cambios sin guardar en la nube.</b> Siguen en este navegador; los reintento solo cada 20 segundos.
          </span>
          <Button size="sm" onClick={retryFailed}>
            Reintentar ya
          </Button>
        </div>
      ) : S.mode === 'local' && !S.demo && S.loaded ? (
        <div className="bnr-i">
          <span>
            <b>Se guarda solo en este navegador.</b> Hacé un respaldo seguido (Ajustes → Cuenta y datos).
          </span>
        </div>
      ) : null}
    </>
  );
}

