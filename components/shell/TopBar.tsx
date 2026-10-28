'use client';
/* Barra de arriba, fija: dónde estás (en Semana, la semana que ves), buscar (la paleta ⌘K), el estado del guardado y
   de Strava, el tema y «Registrar». En el celu también lleva a Ajustes, que en la compu está abajo en la barra lateral. */
import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useShallow } from 'zustand/react/shallow';
import { CaretLeft, CaretRight, MagnifyingGlass, Moon, Plus, Sun } from '@phosphor-icons/react';
import { useApp } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import { weekGo } from '@/lib/data/actions';
import { nextRace, TYPES } from '@/lib/domain/config';
import { sdate } from '@/lib/domain/stats';
import { addDays, dateLabel, dShort, isoWeek, mondayOf } from '@/lib/domain/util';
import { toggleTheme } from '@/lib/theme';
import { Avatar } from './Rail';
import { useStravaStatus } from './useStravaStatus';
import { openPalette } from './Palette';
import { NAV, sectionHref, type SectionDef } from './sections';

function WeekCrumb() {
  const off = useApp((s) => s.weekOff);
  const mon = addDays(mondayOf(new Date()), off * 7);
  return (
    <>
      <div className="wk">
        <button className="ib" type="button" aria-label="Semana anterior" onClick={() => weekGo(-1)}>
          <CaretLeft aria-hidden="true" />
        </button>
        {/* en el celu se ve «S44»; «Semana 44» queda para los lectores de pantalla */}
        <b>
          <span className="wk-full">Semana {isoWeek(mon)}</span>
          <span className="wk-short" aria-hidden="true">
            S{isoWeek(mon)}
          </span>{' '}
          <span className="wk-range">
            · {dShort(mon)} – {dShort(addDays(mon, 6))}
          </span>
        </b>
        <button className="ib" type="button" aria-label="Semana siguiente" onClick={() => weekGo(1)}>
          <CaretRight aria-hidden="true" />
        </button>
      </div>
      {off !== 0 ? (
        <button className="tb-btn ghost" type="button" onClick={() => weekGo(0)}>
          Hoy
        </button>
      ) : null}
    </>
  );
}

const REG = NAV.find((s) => s.id === 'registro')!;

function SessionCrumb({ id }: { id: string }) {
  const s = useApp((st) => st.sessions.find((x) => x.id === id));
  return (
    <>
      {/* vuelve al Registro como lo dejaste */}
      <Link href={sectionHref(REG)}>Registro</Link>
      <span className="sep">/</span>
      <span className="end">{s ? TYPES[s.type].label + ' · ' + dateLabel(sdate(s)) : 'Sesión'}</span>
    </>
  );
}

function Crumbs({ section, pathname }: { section: SectionDef | null; pathname: string }) {
  /* la próxima carrera sale de la configuración: que se redibuje si cambia */
  useApp((s) => s.cfg.races);
  if (!section) {
    if (pathname.startsWith('/sesion/')) return <SessionCrumb id={decodeURIComponent(pathname.split('/')[2] || '')} />;
    /* la página de las piezas sueltas (solo en desarrollo) */
    return pathname === '/sistema' ? <span>Sistema de diseño</span> : null;
  }
  if (section.id === 'semana') return <WeekCrumb />;
  if (pathname === '/logros/vitrina')
    return (
      <>
        <Link href="/logros">Logros</Link>
        <span className="sep">/</span>
        <span className="end">Vitrina</span>
      </>
    );
  /* al lado: la próxima carrera en Carreras, la ciudad en el Mapa */
  const sub = section.id === 'carreras' ? nextRace()?.name : section.id === 'mapa' ? 'Ciudad de Buenos Aires' : null;
  return (
    <>
      <span>{section.label}</span>
      {sub ? (
        <>
          <span className="sep">/</span>
          <span className="mut">{sub}</span>
        </>
      ) : null}
    </>
  );
}

/* guardado: solo se ve si hay algo que avisar o si estás en la nube y está todo bien */
function SaveState() {
  const S = useApp(useShallow((s) => ({ mode: s.mode, saving: s.saving, cloudLost: s.cloudLost, nf: Object.keys(s.failed).length })));
  /* probando sin cuenta: lo dice el aviso de arriba */
  if (S.mode === 'boot' || S.mode === 'guest') return null;
  const [t, c] = S.cloudLost
    ? ['Sin conexión', 'bad']
    : S.nf
      ? ['Sin guardar', 'bad']
      : S.saving > 0
        ? ['Guardando…', 'warn']
        : S.mode === 'cloud'
          ? ['Guardado', '']
          : ['Solo en este navegador', 'warn'];
  return (
    <span className={'sync ' + c} role="status">
      <i className="pulse" aria-hidden="true" />
      <span>{t}</span>
    </span>
  );
}

/* Strava: si está conectado, un punto verde; si no, el atajo para conectarlo. Sin cuenta (modo local), nada */
function StravaState() {
  const st = useStravaStatus();
  if (!st || st.configured === false) return null;
  return st.connected ? (
    <span className="sync" title={st.athlete ? 'Conectado como ' + st.athlete : 'Strava conectado'}>
      <i className="pulse" aria-hidden="true" />
      <span>Strava</span>
    </span>
  ) : (
    <Link className="sync warn" href="/ajustes">
      <i className="pulse" aria-hidden="true" />
      <span>Conectar Strava</span>
    </Link>
  );
}

const darkNow = () => document.documentElement.getAttribute('data-theme') === 'dark';

const onThemeAttr = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
};

function ThemeButton() {
  /* también cambia si cambia el del sistema: lo leo del atributo que pone el script del tema */
  const dark = useSyncExternalStore(onThemeAttr, darkNow, () => false);
  return (
    <button className="ib" type="button" aria-label={dark ? 'Pasar a tema claro' : 'Pasar a tema oscuro'} onClick={toggleTheme}>
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  );
}

export function TopBar({ section, pathname }: { section: SectionDef | null; pathname: string }) {
  return (
    <header className="top">
      <div className="crumbs">
        <Crumbs section={section} pathname={pathname} />
      </div>
      <div className="spacer" />
      <button className="tb-search" type="button" aria-label="Buscar sesiones, carreras o una acción" aria-keyshortcuts="Meta+K Control+K" onClick={openPalette}>
        <MagnifyingGlass aria-hidden="true" />
        <span>Buscar sesiones, carreras…</span>
        <kbd aria-hidden="true">⌘K</kbd>
      </button>
      <SaveState />
      <StravaState />
      <ThemeButton />
      <button className="tb-btn pri" type="button" onClick={() => openSheet('result', { id: null })}>
        <Plus weight="bold" aria-hidden="true" />
        <span className="tb-btn-t">Registrar</span>
        <kbd>R</kbd>
      </button>
      <Link className="me-s" href="/ajustes" aria-label="Ajustes y cuenta" aria-current={section?.id === 'ajustes' ? 'page' : undefined}>
        <Avatar />
      </Link>
    </header>
  );
}
