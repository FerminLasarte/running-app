'use client';
/* Estructura de la app: barra lateral (compu), barra de pestañas flotante (celu), encabezado, vista, hojas y avisos.
   Reemplaza al render() del original: React redibuja; acá quedan los efectos que el original hacía después. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ComponentType } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { S, setS, useApp, useS, TAB_ORDER, type Tab } from '@/lib/store';
import { requestClose } from '@/lib/sheets';
import { setNotifier, boot } from '@/lib/data/sync';
import { draftRestore } from '@/lib/data/draft';
import { buzz, goChar, goRace, goTab, toast, weekGo } from '@/lib/data/actions';
import { nextRace } from '@/lib/domain/config';
import { doneList } from '@/lib/domain/stats';
import { xpState } from '@/lib/domain/xp';
import { daysTo, todayS } from '@/lib/domain/util';
import WeekView from '@/components/views/WeekView';
import { preloadable } from '@/components/ui/preloadable';
import { preloadSheets } from '@/components/sheets/registry';
import { Banners, Header, SettingsButton, TAB_C } from './Header';
import { SheetHost } from './SheetHost';
import { Toast } from './Toast';
import CelebrateHost from '@/components/logros/CelebrateHost';
import { pillInit } from './pill';
import { TABS, TITLES } from './tabs';

/* Semana viene con la app; las demás pestañas viajan cada una en su archivo y se bajan solas al rato de arrancar */
const skel = (
  <>
    <div className="skel" />
    <div className="skel" />
  </>
);
const LAZY = {
  sum: preloadable(() => import('@/components/views/SummaryView'), skel),
  log: preloadable(() => import('@/components/views/LogView'), skel),
  lv: preloadable(() => import('@/components/views/RaceView'), skel),
  map: preloadable(() => import('@/components/views/MapView'), skel),
  top: preloadable(() => import('@/components/views/LogrosView'), skel),
  set: preloadable(() => import('@/components/views/SettingsView'), skel),
};
const VIEWS: Record<Tab, ComponentType> = { week: WeekView, ...LAZY };
/* en un rato libre: el resto de las pestañas y las hojas (así también quedan guardadas para abrir sin señal) */
const preloadAll = () => Promise.all([...Object.values(LAZY).map((c) => c.preload()), preloadSheets()]).catch(() => {});

const LOGO = (
  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="b" cx="12" cy="13.5" r="8.5" />
    <rect className="f" x="9.8" y="1.6" width="4.4" height="3.2" rx="1.4" />
    <path className="f" d="M12 5a8.5 8.5 0 0 1 0 17z" />
    <circle className="h" cx="12" cy="13.5" r="2.6" />
  </svg>
);

/* tu foto, si la cargaste en Ajustes, reemplaza al logo de la app */
function Logo() {
  const av = useApp((s) => s.cfg.avatar);
  return (
    <span className={'mk-logo' + (av ? ' has-av' : '')}>
      {av ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="av-img" src={av} alt="Tu foto" />
      ) : (
        LOGO
      )}
    </span>
  );
}

function TabButtons() {
  const tab = useApp((s) => s.tab);
  return (
    <>
      {TABS.map((t) => (
        <button key={t.v} className="tab" data-a="tab" data-v={t.v} aria-current={tab === t.v ? 'page' : undefined} onClick={() => goTab(t.v)}>
          <svg className="ic ph" viewBox="0 0 256 256" aria-hidden="true" dangerouslySetInnerHTML={{ __html: t.svg }} />
          {t.label}
        </button>
      ))}
    </>
  );
}

function SideFoot() {
  const S = useS();
  if (!S.loaded) return null;
  const hasRuns = doneList().length > 0,
    X = hasRuns ? xpState() : null,
    r = nextRace();
  return (
    <>
      {X ? (
        <button className="sf-lv" onClick={goChar}>
          <span className="sf-n">{X.L}</span>
          <span className="sf-t">
            <b>{X.title}</b>
            <small>
              Nivel {X.L} · {Math.round(X.f * 100)}% al siguiente
            </small>
            <i>
              <em style={{ width: Math.round(X.f * 100) + '%' }} />
            </i>
          </span>
        </button>
      ) : null}
      {r ? (
        <button className="sf-race" onClick={() => goRace('race')}>
          <span>{r.name}</span>
          <b>{daysTo(r.date) === 0 ? 'Hoy' : daysTo(r.date) + ' días'}</b>
        </button>
      ) : null}
    </>
  );
}

/* celu: el título grande se va con la página; al bajar queda esta barra fina con el título chico, como en iOS */
function NavBar() {
  const tab = useApp((s) => s.tab);
  return (
    <div id="nbar">
      <b>{TITLES[tab]}</b>
      <SettingsButton />
    </div>
  );
}

export default function AppShell() {
  /* el shell solo depende de la pantalla en la que estás: cada vista y cada pieza se suscriben a lo suyo */
  const S0 = useApp(useShallow((s) => ({ tab: s.tab, logSub: s.ui.logSub, cSub: s.ui.cSub, sumSub: s.sumSub, loaded: s.loaded, demo: s.demo })));
  const [, setTick] = useState(0);
  const viewRef = useRef<HTMLElement>(null);
  /* «play»: animaciones de entrada solo al entrar a una pantalla (pestaña o subpestaña nueva) */
  const screenKey = S0.tab + '|' + String(S0.logSub ?? '') + '|' + String(S0.cSub ?? '') + '|' + S0.sumSub;
  const [play, setPlay] = useState(false);
  const lastKey = useRef<string | null>(null);

  /* arranque: datos, gestos de la gota y atajos */
  useEffect(() => {
    setNotifier(toast);
    boot();
    /* que la app instalada abra sin señal (public/sw.js); en desarrollo no, para no pelear con la recarga en vivo */
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const off = pillInit();
    const pre = setTimeout(preloadAll, 1200);
    /* si la app queda abierta y pasa la medianoche, «hoy» cambia en todas las vistas (el saludo tiene su propio reloj) */
    let day = todayS();
    const iv = setInterval(() => {
      if (todayS() === day) return;
      day = todayS();
      setTick((t) => t + 1);
    }, 60000);
    const onScroll = () => {
      /* primero las medidas, después las clases: así no se recalcula el layout dos veces */
      const h = document.querySelector('#hdr h1'),
        nb = document.getElementById('nbar');
      const mini = !!(h && nb && nb.offsetHeight && h.getBoundingClientRect().bottom < nb.getBoundingClientRect().bottom);
      document.body.classList.toggle('scrolled', window.scrollY > 24);
      document.body.classList.toggle('hd-mini', mini);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const st = S;
      const map = st.ui.map as { fs?: boolean } | undefined;
      if (map && map.fs && st.tab === 'map' && !st.sheet) {
        setS({ ui: { ...st.ui, map: { ...map, fs: false } } });
        return;
      }
      if (st.ui.celebrate) {
        setS({ ui: { ...st.ui, celebrate: null } });
        return;
      }
      if (st.ui.sheetConfirm) {
        setS({ ui: { ...st.ui, sheetConfirm: false } });
        return;
      }
      if (st.sheet) requestClose();
    };
    /* atajos en la compu: 1 a 7 cambian de pestaña, ← → cambian de semana («/» busca en Registro: está en LogView) */
    const keys = (e: KeyboardEvent) => {
      const map = S.ui.map as { fs?: boolean } | undefined;
      if (e.ctrlKey || e.metaKey || e.altKey || S.sheet || (map && map.fs)) return;
      const tg = e.target as HTMLElement | null,
        typing = tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName));
      if (typing) return;
      if (/^[1-7]$/.test(e.key)) {
        e.preventDefault();
        goTab(TAB_ORDER[+e.key - 1]);
        return;
      }
      if (S.tab === 'week' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        weekGo(e.key === 'ArrowLeft' ? -1 : 1);
        return;
      }
    };
    /* deslizar de costado sobre la semana cambia de semana (celular) */
    let x0: number | null = null,
      y0 = 0,
      t0 = 0;
    const ts = (e: TouchEvent) => {
      const w = (e.target as Element).closest?.('#wk-card,.cal');
      if (!w || S.tab !== 'week' || e.touches.length > 1) {
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
    document.addEventListener('keydown', esc);
    document.addEventListener('keydown', keys);
    document.addEventListener('touchstart', ts, { passive: true });
    document.addEventListener('touchend', te, { passive: true });
    return () => {
      off();
      clearTimeout(pre);
      clearInterval(iv);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('keydown', esc);
      document.removeEventListener('keydown', keys);
      document.removeEventListener('touchstart', ts);
      document.removeEventListener('touchend', te);
    };
  }, []);

  /* pantalla nueva: animaciones de entrada (tarjetas que suben en cascada, gráficos que se dibujan) */
  useLayoutEffect(() => {
    if (!S0.loaded) return;
    if (lastKey.current === screenKey) return;
    lastKey.current = screenKey;
    setPlay(true);
    const v = viewRef.current;
    if (v)
      v.querySelectorAll<HTMLElement>('.hero,.hero2,.raceband,.card,.kpi,.day,.item').forEach((el, i) => {
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

  const View = VIEWS[S0.tab];
  /* las piezas se suscriben solas: cuando el shell se redibuja (por ejemplo, para prender o apagar la animación de
     entrada) reuso los mismos elementos y React no las vuelve a dibujar */
  const parts = useMemo(
    () => ({ logo: <Logo />, tabs: <TabButtons />, foot: <SideFoot />, header: <Header />, banners: <Banners />, nav: <NavBar />, sheet: <SheetHost />, toast: <Toast />, cel: <CelebrateHost /> }),
    [],
  );
  const viewEl = useMemo(() => (S0.loaded ? <View /> : skel), [S0.loaded, View]);
  /* en la barra de abajo no va Ajustes (está arriba, en el engranaje): la gota se mueve entre las otras seis */
  const vis = TABS.filter((t) => t.v !== 'set').length;
  return (
    <>
      <aside className="side" aria-label="Navegación principal">
        <div className="brand">
          {parts.logo}
          <div>
            <b>My Running App</b>
            <span>Registro y progreso</span>
          </div>
        </div>
        <nav className="sidenav">
          {parts.tabs}
        </nav>
        <div className="side-foot">
          {parts.foot}
        </div>
      </aside>
      <div id="app">
        <header id="hdr" className={play ? 'ph-in' : ''}>
          {parts.header}
        </header>
        <div id="bnr">
          {parts.banners}
        </div>
        <main id="view" ref={viewRef} className={play ? 'play' : ''} style={{ '--sc': TAB_C[S0.tab] || 'var(--accent)' } as CSSProperties}>
          {viewEl}
        </main>
      </div>
      {parts.nav}
      <nav className="tabs" aria-label="Secciones">
        <div className="tabs-in" style={{ '--tn': vis } as CSSProperties}>
          {parts.tabs}
        </div>
      </nav>
      {parts.sheet}
      {parts.toast}
      {parts.cel}
    </>
  );
}
