'use client';
/* Una dirección que no existe (boceto design/bocetos/easter-eggs.html, #404), fuera del shell como el login: la pista
   vista desde arriba, con seis andariveles numerados y «404» pintado en el tartán. El corredor del 4 se abre y se va
   de la pista, y la estela punteada se descubre detrás de él; con «reducir movimiento», ya está afuera. Abajo,
   «Te saliste del andarivel.», la vuelta (a la semana si podés entrar a la app; si no, a la portada) y la dirección
   que se escribió. La página es estática: si podés entrar se mira en el navegador, con la sesión o la cookie de
   invitado. */
import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { reduceMotion } from '@/lib/motion';
import { hasGuestCookie } from '@/lib/guest';
import { supabaseConfigured } from '@/lib/supabase/env';
import { supabaseBrowser } from '@/lib/supabase/client';
import { BrandMark } from '@/components/shell/BrandMark';
import { Button } from '@/components/pista/controls';
import { BrandTitle } from '@/components/pista/structure';

/* andariveles de 44 entre dos bordes de 12: el 4 va por el medio de su carril (y 166) */
const LANES = Array.from({ length: 7 }, (_, k) => 12 + k * 44);
const PATH = 'M 132 166 C 230 166 280 160 320 124 S 374 34 396 2';
const noSub = () => () => {};

function OffLane() {
  /* el corredor arranca en la salida; si el sistema pide no moverse, se lo pone directo afuera */
  const still = useSyncExternalStore(noSub, reduceMotion, () => false);
  return (
    <div className="nf-track" aria-hidden="true">
      <svg viewBox="0 0 1200 288" preserveAspectRatio="xMinYMid slice">
        <defs>
          <mask id="nf-reveal" maskUnits="userSpaceOnUse" x="0" y="-40" width="1200" height="340">
            <path className={still ? undefined : 'nf-draw'} d={PATH} fill="none" stroke="#fff" strokeWidth="12" pathLength={100} />
          </mask>
        </defs>
        <rect width="1200" height="288" className="nf-tartan" />
        <rect width="1200" height="12" className="nf-curb" />
        <rect y="276" width="1200" height="12" className="nf-curb" />
        {LANES.map((y) => (
          <line key={y} className="nf-lane" x1="0" x2="1200" y1={y} y2={y} />
        ))}
        {[1, 2, 3, 4, 5, 6].map((k) => (
          <text key={k} className="nf-num" x="92" y={12 + (k - 1) * 44 + 33}>
            {k}
          </text>
        ))}
        <text className="nf-404" x="600" y="214">
          404
        </text>
        <path className="nf-trail" d={PATH} mask="url(#nf-reveal)" />
        {still ? (
          <circle className="nf-runner" r="9" cx="396" cy="2" />
        ) : (
          <circle className="nf-runner" r="9" cx="0" cy="0">
            <animateMotion dur="2.2s" begin="0.3s" fill="freeze" path={PATH} keyTimes="0;1" keySplines=".2 0 0 1" calcMode="spline" />
          </circle>
        )}
      </svg>
    </div>
  );
}

/** si puede volver a la app: con sesión, probando sin cuenta o en modo local (sin Supabase) */
async function canEnter() {
  if (!supabaseConfigured() || hasGuestCookie()) return true;
  const { data } = await supabaseBrowser().auth.getSession();
  return !!data.session;
}

export function NotFound() {
  const path = usePathname();
  /* null mientras se mira: los botones esperan para no cambiar enfrente tuyo */
  const [back, setBack] = useState<boolean | null>(null);
  useEffect(() => {
    let on = true;
    canEnter().then(
      (v) => on && setBack(v),
      () => on && setBack(false),
    );
    return () => {
      on = false;
    };
  }, []);
  return (
    <main className="nf">
      <Link className="brand nf-brand" href={back ? '/semana' : '/'}>
        <BrandMark />
        <span>
          <b>Lane One</b>
        </span>
      </Link>
      <div className="nf-mid">
        <OffLane />
        <div className="nf-txt">
          <div className="lbl">Error 404 · esta página no existe</div>
          <BrandTitle>
            Te saliste del
            <br />
            andarivel
          </BrandTitle>
          <p>
            La dirección que buscás no existe: capaz se escribió mal o la página se mudó.
            {back ? <b> Tu semana sigue donde la dejaste.</b> : null}
          </p>
          <div className={'nf-acts' + (back == null ? ' wait' : '')}>
            {back ? (
              <Button variant="pri" size="lg" href="/semana" arrow>
                Volver a tu semana
              </Button>
            ) : (
              <>
                <Button variant="pri" size="lg" href="/" arrow>
                  Ir a la portada
                </Button>
                <Button variant="ghost" size="lg" href="/login">
                  Entrar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="nf-foot">
        <span>{path}</span>
        <span>Andarivel 4 · descalificado</span>
      </div>
    </main>
  );
}
