'use client';
/* Mapa (boceto «Mapa»): pantalla completa, sin márgenes. A la izquierda, la ciudad de noche con tus recorridos; a la
   derecha, el período, los números, los km por mes, tus barrios, las capas y Strava. Sin recorridos, el estado vacío.
   Lo que se ve va en la URL (components/mapa/params.ts). */
import '@/app/styles/screens/mapa.css';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowsIn, ArrowsOut, FrameCorners, Minus, Play, Plus, Stop } from '@phosphor-icons/react';
import { useS, useUi } from '@/lib/store';
import { barrioFit, baRings, baseMapReady, mapRoutes, mapUiInit, onBaseMap, setMapUi, type MapPeriod, type MapUi } from '@/lib/domain/geo';
import type { Route } from '@/lib/domain/types';
import { dShort, pd, plural } from '@/lib/domain/util';
import MapaCanvas, { type MapApi } from './MapaCanvas';
import { useMapParams } from './params';
import { Card } from './Card';
import { Side } from './Side';
import { Empty } from './Empty';

/* ¿pantalla táctil? (en el celular el mapa no se arrastra dentro de la página) y ¿el mapa va apilado arriba de la
   columna (pantalla angosta)? Ahí la página hace scroll y la rueda no acerca sin ⌘ / Ctrl */
function media(q: string) {
  const sub = (f: () => void) => {
    const m = window.matchMedia(q);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  };
  return [sub, () => window.matchMedia(q).matches, () => false] as const;
}
const COARSE = media('(pointer:coarse)'),
  STACKED = media('(max-width: 900px)');

export default function Mapa() {
  const st = useS();
  const [M, setMap] = useUi<MapUi>('map', mapUiInit());
  const P = useMapParams(st.routes);
  const baseReady = useSyncExternalStore(onBaseMap, baseMapReady, () => false);
  const coarse = useSyncExternalStore(...COARSE),
    stacked = useSyncExternalStore(...STACKED);
  const api = useRef<MapApi>(null);
  /* «Repetir»: la salida que se está dibujando (null mientras arranca, false si no corre) */
  const [playing, setPlaying] = useState<Route | null | false>(false);
  const { o } = P;

  /* pantalla completa: el mapa tapa todo y la página no se mueve; al salir de Mapa, se sale */
  useEffect(() => {
    document.body.classList.toggle('mapa-fs', M.fs);
    return () => document.body.classList.remove('mapa-fs');
  }, [M.fs]);
  useEffect(() => () => setMapUi({ fs: false }), []);
  /* un barrio elegido (en la lista o con un link de la paleta) se encuadra */
  useEffect(() => {
    const b = o.hb && baseReady ? baRings().find((q) => q.n === o.hb) : null,
      d = api.current?.dims();
    if (b && d) setMapUi({ view: barrioFit(b, d[0], d[1]) });
  }, [o.hb, baseReady]);

  if (!st.routes.length) return <Empty msg={M.msg} syncing={M.syncing} />;

  const L = mapRoutes(o.period);
  const pick = (id: string | null) => {
    P.setSel(id);
    if (id) P.setHb(null);
  };
  const barrio = (n: string | null) => {
    P.setHb(n);
    if (!n) return;
    P.setSel(null);
    /* apilado (celu), la lista queda abajo del mapa: subo para que veas el barrio encendido */
    if (stacked && !M.fs) api.current?.reveal();
  };
  /* otro período: se suelta la salida y el barrio elegidos (el lienzo reencuadra solo) */
  const period = (p: MapPeriod) => {
    P.setPeriod(p);
    P.setSel(null);
    P.setHb(null);
  };
  const replay = () => {
    if (playing !== false) {
      api.current?.stop();
      return;
    }
    pick(null);
    P.setHb(null);
    setPlaying(null);
    api.current?.replay((r) => setPlaying(r || false));
  };
  const fsBtn = M.fs ? { t: 'Salir de pantalla completa', I: ArrowsIn } : { t: 'Pantalla completa', I: ArrowsOut };

  return (
    <div className="mapa">
      <MapaCanvas
        ref={api}
        o={o}
        view={M.view}
        fs={M.fs}
        locked={!M.fs && coarse}
        wheel={!stacked}
        baseReady={baseReady}
        routes={st.routes}
        sessions={st.sessions}
        onPick={pick}
        label={'Mapa de tus recorridos: ' + plural(L.length, 'salida', 'salidas') + '. Con el foco acá, las flechas lo mueven y + y − acercan y alejan.'}
      >
        <div className="mapa-top">
          <button type="button" className={'mapa-pill' + (playing !== false ? ' on' : '')} onClick={replay} aria-label={playing !== false ? 'Cortar' : 'Repetir: dibuja las salidas del período en orden'}>
            {playing !== false ? <Stop weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
            {playing ? dShort(pd(playing.date)) + ' ' + playing.date.slice(0, 4) : playing === null ? 'Repitiendo' : 'Repetir'}
          </button>
        </div>
        <div className="mapa-ctrl">
          <div className="mapa-grp">
            <button type="button" aria-label="Acercar" onClick={() => api.current?.zoom(1.6)}>
              <Plus aria-hidden="true" />
            </button>
            <button type="button" aria-label="Alejar" onClick={() => api.current?.zoom(0.625)}>
              <Minus aria-hidden="true" />
            </button>
          </div>
          <div className="mapa-grp">
            <button type="button" aria-label="Ver todos los recorridos" onClick={() => api.current?.fit()}>
              <FrameCorners aria-hidden="true" />
            </button>
            <button type="button" aria-label={fsBtn.t} aria-pressed={M.fs} onClick={() => setMap({ fs: !M.fs })}>
              <fsBtn.I aria-hidden="true" />
            </button>
          </div>
        </div>
        <Card o={o} L={L} onClose={() => pick(null)} />
      </MapaCanvas>
      <Side P={P} routes={st.routes} L={L} msg={M.msg} syncing={M.syncing} baseErr={M.baseErr} onPeriod={period} onBarrio={barrio} />
    </div>
  );
}
