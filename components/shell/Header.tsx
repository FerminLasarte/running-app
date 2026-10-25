'use client';
/* Encabezado de cada pestaña (líneas 2204–2274 del original): saludo y «hoy» en Semana; título y una línea con lo
   más importante en las demás. Es un título grande que se va con la página; al bajar queda la barra fina (NavBar).
   Los avisos (ejemplo, sin conexión, sin guardar) van aparte, en #bnr, en una línea. */
import { useEffect, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useApp, useS, type Tab } from '@/lib/store';
import { TYPES, upcomingRaces } from '@/lib/domain/config';
import { doneList, monthNow, planKmOf, sdate } from '@/lib/domain/stats';
import { nextSession } from '@/lib/domain/week';
import { xpState } from '@/lib/domain/xp';
import { DF_LONG, WD, addDays, cap, daysTo, dShort, fmt, fmtDur, pd, sod, sum, todayS, ymd } from '@/lib/domain/util';
import { demoOff, goTab, retryFailed } from '@/lib/data/actions';
import { toggleTheme } from '@/lib/theme';
import { TITLES } from './tabs';

export const TAB_C: Record<Tab, string> = { week: 'var(--t2)', sum: 'var(--info)', log: 'var(--t3)', lv: 'var(--accent)', map: 'var(--t5)', top: 'var(--warn)', set: 'var(--ink2)' };

/* saludo según la hora: mañana de 6 a 12, tarde de 12 a 19, noche de 19 a 6 */
export function greeting(name?: string) {
  const h = new Date().getHours(),
    n = name || 'Agus';
  return (h >= 6 && h < 12 ? 'Buenos días' : h >= 12 && h < 19 ? 'Buenas tardes' : 'Buenas noches') + ', ' + n + '!';
}

/* una línea con lo de hoy, debajo del saludo (corta a propósito: tiene que entrar en una línea en el celu) */
function TodayLine() {
  const S = useS();
  const tS = todayS(),
    td = S.sessions.filter((x) => sdate(x) === tS);
  const done = td.filter((x) => x.result),
    km = sum(done.map((x) => x.result!.distKm || 0));
  if (done.length)
    return (
      <>
        Hoy corriste <b>{fmt(km, 1)} km</b>. ¡Bien hecho!
      </>
    );
  const p = td.find((x) => x.plan && !x.missed);
  if (p)
    return (
      <>
        Hoy toca <b style={{ color: TYPES[p.type].t }}>{TYPES[p.type].label.toLowerCase()}</b>
        {planKmOf(p) ? ' · ' + fmt(planKmOf(p), 1) + ' km' : ''}
      </>
    );
  const nx = nextSession(ymd(addDays(sod(new Date()), 1)));
  if (!nx) return <>Hoy es día de descanso</>;
  const nd = daysTo(sdate(nx)),
    d = pd(sdate(nx));
  return (
    <>
      Descanso hoy · <b style={{ color: TYPES[nx.type].t }}>{TYPES[nx.type].label.toLowerCase()}</b> {nd === 1 ? 'mañana' : 'el ' + WD[(d.getDay() + 6) % 7].toLowerCase() + ' ' + d.getDate()}
    </>
  );
}

/* una línea con lo más importante de cada sección, para que el encabezado diga algo */
function TabSub({ t }: { t: Tab }): ReactNode {
  const S = useS();
  if (!S.loaded) return null;
  const d = doneList(),
    k = (v: number) => fmt(v, v < 100 ? 1 : 0);
  if (t === 'sum') {
    const { km, count } = monthNow();
    const mn = cap(new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(new Date()));
    return count ? (
      <>
        {mn}: <b>{k(km)} km</b> en {count}
        {count === 1 ? ' salida' : ' salidas'}
      </>
    ) : (
      <>{mn}: todavía sin salidas</>
    );
  }
  if (t === 'log') {
    if (!d.length) return <>Acá va a quedar cada salida que cargues</>;
    return (
      <>
        <b>{d.length}</b> {d.length === 1 ? 'sesión' : 'sesiones'} · <b>{fmt(sum(d.map((x) => x.result.distKm)), 0)} km</b> desde {dShort(pd(d[0].result.date))}
      </>
    );
  }
  if (t === 'lv') {
    const r = upcomingRaces()[0];
    if (!r) return <>Cargá tu próxima carrera para armar el plan</>;
    const n = daysTo(r.date);
    return (
      <>
        <b>{r.name}</b> {n === 0 ? 'es hoy' : n === 1 ? 'es mañana' : 'en ' + n + ' días'}
        {r.targetSec > 0 ? ' · objetivo ' + (r.lt ? '< ' : '') + fmtDur(r.targetSec) : ''}
      </>
    );
  }
  if (t === 'map') {
    if (!S.routes.length) return <>Traé tus recorridos de Strava</>;
    return (
      <>
        <b>{S.routes.length}</b> recorridos · <b>{fmt(sum(S.routes.map((r) => r.km || 0)), 0)} km</b> trazados
      </>
    );
  }
  if (t === 'top') {
    if (!d.length) return <>Cargá tu primera salida para empezar a sumar</>;
    const X = xpState();
    return (
      <>
        Nivel <b>{X.L}</b> · {X.title} · {Math.round(X.f * 100)}% al siguiente
      </>
    );
  }
  if (t === 'set') return <>Perfil, carreras, zapatillas y respaldo</>;
  return null;
}

export function SaveState() {
  const S = useApp(useShallow((s) => ({ mode: s.mode, saving: s.saving, cloudLost: s.cloudLost, failed: s.failed })));
  let t = 'Solo en este navegador',
    c = 'warn';
  if (S.mode === 'cloud') {
    t = 'Guardado';
    c = '';
  }
  if (S.saving > 0) {
    t = 'Guardando…';
    c = 'warn';
  }
  if (S.cloudLost) {
    t = 'Sin conexión';
    c = 'bad';
  }
  if (Object.keys(S.failed).length) {
    t = S.cloudLost ? 'Sin conexión' : 'Sin guardar';
    c = 'bad';
  }
  return (
    <span id="savest" className={'save ' + c}>
      {t}
    </span>
  );
}

export function ThemeButton() {
  return (
    <button className="themebtn" aria-label="Cambiar entre tema claro y oscuro" onClick={toggleTheme}>
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
      </svg>
    </button>
  );
}
export const SettingsGlyph = () => (
  <svg viewBox="0 0 24 24">
    <path d="M4 7h9M19 7h1M4 17h1M11 17h9" />
    <circle cx="16" cy="7" r="2.5" />
    <circle cx="8" cy="17" r="2.5" />
  </svg>
);

/** Ajustes: en el celu es el botón redondo de arriba a la derecha; si cargaste tu foto, es tu foto. */
export function SettingsButton() {
  const tab = useApp((s) => s.tab),
    av = useApp((s) => s.cfg.avatar);
  return (
    <button className={'themebtn setbtn' + (av ? ' has-av' : '')} aria-label="Ajustes" aria-current={tab === 'set' ? 'page' : undefined} onClick={() => goTab('set')}>
      {av ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="av-img" src={av} alt="" />
      ) : (
        <SettingsGlyph />
      )}
    </button>
  );
}

function HeaderRight() {
  return (
    <div className="tb-r">
      <SaveState />
      <SettingsButton />
      <ThemeButton />
    </div>
  );
}

/* el saludo cambia con la franja horaria: si la app queda abierta, se actualiza solo */
function useMinute() {
  const [, set] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => set((t) => t + 1), 60000);
    return () => clearInterval(iv);
  }, []);
}

export function Header() {
  const S = useS();
  useMinute();
  const week = S.tab === 'week';
  return (
    <div className="topbar">
      <div className="hd-tx">
        {week ? <span className="eyebrow">{cap(DF_LONG.format(new Date()))}</span> : null}
        <h1>{week ? greeting(S.cfg.name) : TITLES[S.tab]}</h1>
        {S.loaded ? <p className="hd-sub">{week ? <TodayLine /> : <TabSub t={S.tab} />}</p> : null}
      </div>
      <HeaderRight />
    </div>
  );
}

export function Banners() {
  const S = useApp(useShallow((s) => ({ demo: s.demo, mode: s.mode, loaded: s.loaded, cloudLost: s.cloudLost, failed: s.failed })));
  const nf = Object.keys(S.failed).length;
  return (
    <>
      {S.demo ? (
        <div className="banner">
          <span>
            <b>Datos de ejemplo.</b> Nada de esto se guarda.
          </span>
          <button className="btn sm" onClick={demoOff}>
            Salir
          </button>
        </div>
      ) : null}
      {S.cloudLost ? (
        <div className="banner bad" role="status">
          <span>
            <b>Sin conexión con tu cuenta.</b> {nf ? nf + (nf === 1 ? ' cambio queda' : ' cambios quedan') + ' en este navegador y lo' : 'Lo que cargues queda en este navegador y lo'} subo solo cuando vuelva. Si vas a
            cerrar, exportá un respaldo.
          </span>
        </div>
      ) : nf ? (
        <div className="banner bad" role="status">
          <span>
            <b>Hay cambios sin guardar en la nube.</b> Siguen en este navegador; los reintento solo cada 20 segundos.
          </span>
          <button className="btn sm" onClick={retryFailed}>
            Reintentar ya
          </button>
        </div>
      ) : S.mode === 'local' && !S.demo && S.loaded ? (
        <div className="banner">
          <span>
            <b>Se guarda solo en este navegador.</b> Hacé un respaldo seguido (Ajustes → Respaldo).
          </span>
        </div>
      ) : null}
    </>
  );
}

