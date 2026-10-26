'use client';
/* Encabezado de las pantallas viejas (líneas 2204–2274 del original): saludo y «hoy» en Semana; título y una línea
   con lo más importante en las demás. Se va con cada pantalla rehecha. El estado de guardado va en la barra de
   arriba; los avisos (ejemplo, sin conexión, sin guardar), aparte, en #bnr, en una línea. */
import { useEffect, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useApp, useS } from '@/lib/store';
import { TYPES, upcomingRaces } from '@/lib/domain/config';
import { doneList, monthNow, planKmOf, sdate } from '@/lib/domain/stats';
import { nextSession } from '@/lib/domain/week';
import { xpState } from '@/lib/domain/xp';
import { DF_LONG, WD, addDays, cap, daysTo, dShort, fmt, fmtDur, pd, sod, sum, todayS, ymd } from '@/lib/domain/util';
import { demoOff, retryFailed } from '@/lib/data/actions';
import type { Section, SectionDef } from './sections';

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
function SectionSub({ t }: { t: Section }): ReactNode {
  const S = useS();
  if (!S.loaded) return null;
  const d = doneList(),
    k = (v: number) => fmt(v, v < 100 ? 1 : 0);
  if (t === 'analisis') {
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
  if (t === 'registro') {
    if (!d.length) return <>Acá va a quedar cada salida que cargues</>;
    return (
      <>
        <b>{d.length}</b> {d.length === 1 ? 'sesión' : 'sesiones'} · <b>{fmt(sum(d.map((x) => x.result.distKm)), 0)} km</b> desde {dShort(pd(d[0].result.date))}
      </>
    );
  }
  if (t === 'carreras') {
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
  if (t === 'mapa') {
    if (!S.routes.length) return <>Traé tus recorridos de Strava</>;
    return (
      <>
        <b>{S.routes.length}</b> recorridos · <b>{fmt(sum(S.routes.map((r) => r.km || 0)), 0)} km</b> trazados
      </>
    );
  }
  if (t === 'logros') {
    if (!d.length) return <>Cargá tu primera salida para empezar a sumar</>;
    const X = xpState();
    return (
      <>
        Nivel <b>{X.L}</b> · {X.title} · {Math.round(X.f * 100)}% al siguiente
      </>
    );
  }
  if (t === 'ajustes') return <>Perfil, carreras, zapatillas y respaldo</>;
  return null;
}

/* el saludo cambia con la franja horaria: si la app queda abierta, se actualiza solo */
function useMinute() {
  const [, set] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => set((t) => t + 1), 60000);
    return () => clearInterval(iv);
  }, []);
}

export function Header({ section }: { section: SectionDef }) {
  const S = useS();
  useMinute();
  const week = section.id === 'semana';
  return (
    <div className="topbar">
      <div className="hd-tx">
        {week ? <span className="eyebrow">{cap(DF_LONG.format(new Date()))}</span> : null}
        <h1>{week ? greeting(S.cfg.name) : section.label}</h1>
        {S.loaded ? <p className="hd-sub">{week ? <TodayLine /> : <SectionSub t={section.id} />}</p> : null}
      </div>
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
            <b>Se guarda solo en este navegador.</b> Hacé un respaldo seguido (Ajustes → Cuenta y datos).
          </span>
        </div>
      ) : null}
    </>
  );
}

