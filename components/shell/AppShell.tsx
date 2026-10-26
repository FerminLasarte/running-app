'use client';
/* Estructura de la app: barra lateral (abajo en el celu), barra de arriba, la página, hojas y avisos.
   La app depende de la fecha de hoy, del tema y de los datos guardados en el navegador: se dibuja solo ahí
   (use(browser())); el servidor manda el esqueleto del layout. Mientras una pantalla no se rehace, adentro va la
   vieja con su encabezado. */
import { use, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { browser } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import { S, setS, useApp } from '@/lib/store';
import { setNotifier, boot } from '@/lib/data/sync';
import { draftRestore } from '@/lib/data/draft';
import { buzz, toast, weekGo } from '@/lib/data/actions';
import { runPending, setRouter } from '@/lib/nav';
import { todayS } from '@/lib/domain/util';
import { preloadSheets } from '@/components/sheets/registry';
import CelebrateHost from '@/components/logros/CelebrateHost';
import { Banners, Header } from './Header';
import { SheetHost } from './SheetHost';
import { Toast } from './Toast';
import { Rail } from './Rail';
import { TopBar } from './TopBar';
import { sectionOf } from './sections';
import { useShortcuts } from './useShortcuts';

const Skel = () => (
  <>
    <div className="skel" />
    <div className="skel" />
  </>
);

export default function AppShell({ children }: { children: ReactNode }) {
  use(browser('La app depende de la fecha, el tema y los datos guardados en este navegador.'));
  const router = useRouter();
  const pathname = usePathname();
  const section = sectionOf(pathname);
  const S0 = useApp(useShallow((s) => ({ logSub: s.ui.logSub, cSub: s.ui.cSub, sumSub: s.sumSub, loaded: s.loaded, demo: s.demo })));
  const [, setTick] = useState(0);
  const viewRef = useRef<HTMLElement>(null);
  useShortcuts();

  /* arranque: datos y avisos */
  useEffect(() => {
    setNotifier(toast);
    boot();
    /* que la app instalada abra sin señal (public/sw.js); en desarrollo no, para no pelear con la recarga en vivo */
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    /* las hojas, en un rato libre (así también quedan guardadas para abrir sin señal) */
    const pre = setTimeout(() => preloadSheets().catch(() => {}), 1200);
    /* si la app queda abierta y pasa la medianoche, «hoy» cambia en todas las vistas (el saludo tiene su propio reloj) */
    let day = todayS();
    const iv = setInterval(() => {
      if (todayS() === day) return;
      day = todayS();
      setTick((t) => t + 1);
    }, 60000);
    /* deslizar de costado sobre la semana cambia de semana (celular) */
    let x0: number | null = null,
      y0 = 0,
      t0 = 0;
    const ts = (e: TouchEvent) => {
      const w = (e.target as Element).closest?.('#wk-card,.cal');
      if (!w || e.touches.length > 1) {
        x0 = null;
        return;
      }
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      t0 = Date.now();
    };
    const te = (e: TouchEvent) => {
      if (x0 == null) return;
      const t = e.changedTouches[0],
        dx = t.clientX - x0,
        dy = t.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - t0 < 700) {
        weekGo(dx < 0 ? 1 : -1);
        buzz(6);
      }
    };
    document.addEventListener('touchstart', ts, { passive: true });
    document.addEventListener('touchend', te, { passive: true });
    return () => {
      clearTimeout(pre);
      clearInterval(iv);
      document.removeEventListener('touchstart', ts);
      document.removeEventListener('touchend', te);
    };
  }, []);

  /* las acciones navegan con el router de Next */
  useEffect(() => setRouter(router.push), [router]);

  /* página nueva: lo que una acción pidió hacer al llegar (bajar a una parte); fuera de Semana, la semana vuelve a
     la actual, como antes al cambiar de pestaña */
  useEffect(() => {
    runPending();
    if (pathname !== '/semana' && S.weekOff) setS({ weekOff: 0 });
  }, [pathname]);

  /* «play»: animaciones de entrada solo al entrar a una pantalla (página o subpestaña nueva) */
  const screenKey = pathname + '|' + String(S0.logSub ?? '') + '|' + String(S0.cSub ?? '') + '|' + S0.sumSub;
  const [play, setPlay] = useState(false);
  const lastKey = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!S0.loaded) return;
    if (lastKey.current === screenKey) return;
    lastKey.current = screenKey;
    setPlay(true);
    const v = viewRef.current;
    if (v)
      v.querySelectorAll<HTMLElement>('.hero,.hero2,.card,.kpi,.day,.item').forEach((el, i) => {
        el.classList.add('rise');
        el.style.setProperty('--i', String(Math.min(i, 12)));
      });
    const t = setTimeout(() => setPlay(false), 1800);
    return () => clearTimeout(t);
  }, [screenKey, S0.loaded]);

  /* con los datos cargados: si quedó un formulario a medio cargar (por ejemplo al volver de la app del reloj), lo reabro */
  const draftTried = useRef(false);
  useEffect(() => {
    if (!S0.loaded || S0.demo || draftTried.current) return;
    draftTried.current = true;
    draftRestore();
  }, [S0.loaded, S0.demo]);

  /* las piezas se suscriben solas: cuando el shell se redibuja (por ejemplo, para prender o apagar la animación de
     entrada) reuso los mismos elementos y React no las vuelve a dibujar */
  const parts = useMemo(
    () => ({ rail: <Rail section={section} />, top: <TopBar section={section} pathname={pathname} />, banners: <Banners />, layers: [<SheetHost key="s" />, <Toast key="t" />, <CelebrateHost key="c" />] }),
    [section, pathname],
  );
  const header = useMemo(() => (section && S0.loaded ? <Header section={section} /> : null), [section, S0.loaded]);
  return (
    <div className="app">
      {parts.rail}
      <div className="main">
        {parts.top}
        <div className="page">
          {section ? <header id="hdr">{header}</header> : null}
          <div id="bnr">{parts.banners}</div>
          <main id="view" ref={viewRef} className={play ? 'play' : ''} style={{ '--sc': section?.c || 'var(--accent)' } as CSSProperties}>
            {S0.loaded ? children : <Skel />}
          </main>
        </div>
      </div>
      {parts.layers}
    </div>
  );
}
