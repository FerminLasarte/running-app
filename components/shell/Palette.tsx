'use client';
/* Paleta ⌘K: un solo buscador para acciones, secciones, sesiones, carreras, trofeos y desafíos. Sin texto muestra las acciones, las
   secciones y lo reciente; al escribir agrupa los resultados y marca lo que coincide (sin importar tildes). Se maneja
   entera con el teclado: ↑ ↓ para moverse, ↵ para abrir, Esc para cerrar. Estilos en
   app/styles/components/palette.css; el índice y la búsqueda, en lib/domain/palette.ts. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  Bandaids,
  CalendarPlus,
  CircleHalf,
  DownloadSimple,
  FlagCheckered,
  Gauge,
  ListChecks,
  MagnifyingGlass,
  Medal,
  Plus,
  Printer,
  SquaresFour,
  Target,
  Trophy,
  type Icon,
} from '@phosphor-icons/react';
import { S, setUi, useApp } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import { navigate, goSession } from '@/lib/nav';
import { doExport } from '@/lib/data/backup';
import { TYPES, TYPE_KEYS, easyActive, nextRace } from '@/lib/domain/config';
import { longRace } from '@/lib/domain/blocks';
import { LG_INIT, lgRows } from '@/lib/domain/log';
import { openRecal } from '@/lib/domain/recal';
import { palIndex, palMark, palSearch, type PalItem } from '@/lib/domain/palette';
import { baseMapReady, loadBaseMap, mapBarrios, mapRoutes, onBaseMap } from '@/lib/domain/geo';
import { addDays, fmt, mondayOf, todayS, ymd } from '@/lib/domain/util';
import { CAT_N, trophies, trophyNote, trophyTier } from '@/lib/domain/trophies';
import { chView } from '@/lib/domain/challenges';
import { goLogros } from '@/lib/data/actions';
import { stravaSync } from '@/lib/strava/sync';
import { toggleTheme } from '@/lib/theme';
import { briefOf } from '@/components/pista/session';
import { cssVars, cx, typeColor } from '@/components/pista/util';
import { registroHref } from '@/components/registro/filters';
import { AN_TABS } from '@/components/analisis/period';
import { PRINT_BTN_ID } from '@/components/carreras/PrintBand';
import { mapaHref } from '@/components/mapa/params';
import { TIER_NAME } from '@/components/pista/sport';
import { LO_PARTS, openTrophy, trophyIcon } from '@/components/logros/util';
import { SECTIONS } from './sections';
import { useStravaStatus } from './useStravaStatus';

export const openPalette = () => setUi('palette', true);
export const closePalette = () => setUi('palette', false);

/** una fila: `done` marca las sesiones hechas (las recientes, sin buscar nada) */
type Row = PalItem & { icon?: Icon; color?: string; k?: string; done?: boolean; run: () => void };

function Mark({ t, q }: { t: string; q: string }) {
  return (
    <>
      {palMark(t, q).map((p, i) => (p.m ? <mark key={i}>{p.t}</mark> : p.t))}
    </>
  );
}

/* las pestañas de Análisis: se buscan por su nombre o por lo que muestran */
const AN_ICON = SECTIONS.find((s) => s.id === 'analisis')!.Icon;
const AN_ROWS: Row[] = AN_TABS.map((t) => ({ g: 'Análisis', key: 'an:' + t.value, t: t.label, sub: 'En Análisis', more: t.more, icon: AN_ICON, run: () => navigate(t.path) }));

/* las partes de Carreras: se buscan por su nombre o por lo que tienen, y llevan hasta ahí */
const CAR_ICON = SECTIONS.find((s) => s.id === 'carreras')!.Icon;
const toCarreras = (id: string) => () => navigate('/carreras', () => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
const CAR_PARTS: { id: string; t: string; more: string; when?: () => boolean }[] = [
  { id: 'car-plan', t: 'Plan por bloques', more: 'semanas fases base desarrollo específico puesta a punto km planificados tirada larga', when: () => !!longRace() },
  { id: 'car-estrategia', t: 'Estrategia y pulsera', more: 'tramos ritmos parciales pace band meta realista seguro frecuencia cardíaca', when: () => !!nextRace() },
  { id: 'car-dia', t: 'Para el día', more: 'lista pendientes kit horario largada corral checklist', when: () => !!nextRace() },
  { id: 'car-medallero', t: 'Medallero', more: 'medallas carreras corridas tiempos marcas pr' },
];

/* las partes de Logros, y tus trofeos y desafíos: llevan a su lugar o abren el trofeo */
const LO_ICON = SECTIONS.find((s) => s.id === 'logros')!.Icon;
const LO_ROWS: Row[] = (
  [
    [LO_PARTS.road, 'Camino de títulos', 'nivel títulos experiencia xp cómo se gana'],
    [LO_PARTS.vit, 'Vitrina', 'trofeos colección bronce plata oro platino ganados por ganar'],
    [LO_PARTS.ch, 'Desafíos', 'metas con fecha sugeridos'],
    [LO_PARTS.pod, 'Podio', 'mejores sesiones ranking distancia puntaje ritmo'],
    [LO_PARTS.att, 'Atributos', 'ficha del jugador media velocidad resistencia constancia disciplina exploración'],
  ] as const
).map(([id, t, more]) => ({ g: 'Logros', key: id, t, sub: 'En Logros', more, icon: LO_ICON, run: () => goLogros(id) }));

/* el Mapa: tus barrios (con el mapa de la Ciudad ya bajado) y traer recorridos nuevos */
const MAP_ICON = SECTIONS.find((s) => s.id === 'mapa')!.Icon;

function PaletteBox() {
  const [q, setQ] = useState('');
  const [act, setAct] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const strava = useStravaStatus();
  const sessions = useApp((s) => s.sessions);
  const races = useApp((s) => s.cfg.races);
  const routes = useApp((s) => s.routes);
  const cfg = useApp((s) => s.cfg);
  /* los barrios salen del mapa de la Ciudad (~530 KB): con recorridos, se baja al abrir la paleta, una sola vez */
  const baseReady = useSyncExternalStore(onBaseMap, baseMapReady, () => false);
  useEffect(() => {
    if (routes.length) void loadBaseMap();
  }, [routes]);

  /* lo que se puede hacer, siempre a mano */
  const fixed = useMemo<Row[]>(() => {
    const a = (key: string, t: string, icon: Icon, run: () => void, k?: string): Row => ({ g: 'Acciones', key, t, icon, run, k });
    return [
      a('a:r', 'Registrar resultado', Plus, () => openSheet('result', { id: null }), 'R'),
      ...(strava && strava.connected
        ? [a('a:sv', 'Traer la salida de Strava', ArrowsClockwise, () => openSheet('result', { id: null, svLoad: true })), a('a:rt', 'Traer recorridos nuevos al mapa', MAP_ICON, () => navigate('/mapa', () => void stravaSync()))]
        : []),
      a('a:p', 'Planificar una sesión', CalendarPlus, () => openSheet('plan', {}), 'P'),
      a('a:w', 'Planificar la semana', SquaresFour, () => openSheet('weekPlan', { mon: ymd(mondayOf(addDays(new Date(), 1))) })),
      a('a:t', 'Cambiar entre claro y oscuro', CircleHalf, toggleTheme),
      ...(easyActive(todayS()) ? [] : [a('a:e', 'No me siento al 100%', Bandaids, () => openSheet('easy'))]),
      a('a:rc', 'Recalibrar ritmos', Gauge, () => openRecal()),
      a('a:lv', 'Test de nivel', ListChecks, () => openSheet('level')),
      a('a:ch', 'Nuevo desafío', Trophy, () => openSheet('challenge')),
      a('a:x', 'Exportar respaldo', DownloadSimple, () => doExport('json')),
      ...SECTIONS.map((s, i): Row => ({ g: 'Ir a', key: 'n:' + s.id, t: s.label, icon: s.Icon, run: () => navigate(s.href), k: i < 6 ? String(i + 1) : undefined })),
    ];
  }, [strava]);
  /* sesiones y carreras: el índice se arma de nuevo si cambian */
  const index = useMemo(() => {
    const ix = palIndex(briefOf);
    return {
      sessions: ix.sessions.map((x): Row => ({ g: x.g, key: x.key, t: x.t, sub: x.sub, more: x.more, color: typeColor(x.type), done: !!x.s.result, run: () => goSession(x.s.id) })),
      races: ix.races.map((x): Row => ({ g: x.g, key: x.key, t: x.t, sub: x.sub, more: x.more, icon: x.past ? Medal : FlagCheckered, run: () => (x.past && x.r.resultSec ? openSheet('raceMedal', { id: x.r.id }) : navigate('/carreras')) })),
      carreras: [
        ...(nextRace() ? [{ g: 'Acciones', key: 'a:pb', t: 'Imprimir la pulsera', sub: 'De la próxima carrera', more: 'pace band ritmos', icon: Printer, run: () => navigate('/carreras', () => document.getElementById(PRINT_BTN_ID)?.click()) } as Row] : []),
        ...CAR_PARTS.filter((x) => !x.when || x.when()).map((x): Row => ({ g: 'Carreras', key: x.id, t: x.t, sub: 'En Carreras', more: x.more, icon: CAR_ICON, run: toCarreras(x.id) })),
      ],
      /* el Registro filtrado por cada tipo que tenés */
      registro: TYPE_KEYS.filter((k) => sessions.some((s) => s.type === k)).map(
        (k): Row => ({ g: 'Registro', key: 'reg:' + k, t: TYPES[k].label, sub: 'Todas las de este tipo, en el Registro', color: typeColor(k), run: () => navigate(registroHref({ tipo: k })) }),
      ),
    };
    // el índice lee el estado: se rearma cuando cambian las sesiones o las carreras
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, races]);
  /* tus trofeos y desafíos: salen de las sesiones, los recorridos y la configuración */
  const logros = useMemo<Row[]>(
    () => [
      ...trophies().map(
        (t): Row => ({
          g: 'Trofeos',
          key: 'tr:' + t.id,
          t: t.name,
          sub: (t.got ? 'Ganado el ' + trophyNote(t) + ' · ' + TIER_NAME[trophyTier(t)] : 'Por ganar' + (trophyNote(t) ? ' · ' + trophyNote(t) : '')),
          more: 'trofeo ' + (CAT_N[t.cat] || ''),
          icon: trophyIcon(t),
          run: () => openTrophy(t.id),
        }),
      ),
      ...(cfg.challenges || []).map((c): Row => ({ g: 'Desafíos', key: 'ch:' + c.id, t: c.name, sub: chView(c).lbl, more: 'desafío meta', icon: Target, run: () => goLogros(LO_PARTS.ch) })),
    ],
    // los trofeos leen el estado: se rearman cuando cambian las sesiones, los recorridos o la configuración
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, routes, cfg],
  );
  /* tus barrios, de todos tus recorridos: llevan al Mapa con el barrio resaltado */
  const barrios = useMemo<Row[]>(
    () =>
      (mapBarrios(mapRoutes('todo'), 'todo')?.list || []).map((e) => ({
        g: 'Mapa',
        key: 'bz:' + e.b.n,
        t: e.b.n,
        sub: 'Barrio · ' + fmt(e.km, e.km < 10 ? 1 : 0) + ' km en el Mapa',
        more: 'barrio recorridos mapa',
        icon: MAP_ICON,
        run: () => navigate(mapaHref(e.b.n)),
      })),
    // mapBarrios lee los recorridos del estado; se rearma cuando cambian o cuando termina de bajar el mapa
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routes, baseReady],
  );

  const list = useMemo<Row[]>(() => {
    const q0 = q.trim();
    if (!q0) return [...fixed, ...index.sessions.filter((x) => x.done).slice(0, 3).map((x) => ({ ...x, g: 'Recientes' }))];
    const found = palSearch([...fixed, ...AN_ROWS, ...index.carreras, ...LO_ROWS, ...logros, ...barrios, ...index.sessions, ...index.races, ...index.registro], q);
    /* la paleta muestra pocas sesiones: al final, todas las que encuentra el Registro con lo mismo */
    const n = lgRows({ ...LG_INIT, q: q0, st: 'all' }).length;
    if (!n) return found;
    return [...found, { g: 'Registro', key: 'reg:q', t: 'Buscar «' + q0 + '» en el Registro', sub: n + (n === 1 ? ' sesión' : ' sesiones'), icon: MagnifyingGlass, run: () => navigate(registroHref({ q: q0 })) }];
    /* lgRows lee las sesiones del estado: cuando cambian, cambia `index` y se vuelve a buscar */
  }, [q, fixed, index, logros, barrios]);
  const cur = Math.min(act, Math.max(0, list.length - 1));

  useEffect(() => {
    listRef.current?.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
  }, [cur, list]);

  const run = (x: Row | undefined) => {
    if (!x) return;
    closePalette();
    x.run();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.length) setAct((cur + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(list[cur]);
    } else if (e.key === 'Tab') e.preventDefault();
  };

  let g: string | null = null;
  return (
    <div className="p-cmdk" role="dialog" aria-modal="true" aria-label="Buscar">
      <div className="p-ck-in">
        <MagnifyingGlass aria-hidden="true" />
        <input
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="p-ck-l"
          aria-activedescendant={list[cur] ? 'p-ck-' + cur : undefined}
          aria-autocomplete="list"
          aria-label="Buscá sesiones, carreras o una acción"
          placeholder="Buscá sesiones, carreras o una acción…"
          autoComplete="off"
          spellCheck={false}
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setAct(0);
          }}
          onKeyDown={onKeyDown}
        />
        <kbd aria-hidden="true">Esc</kbd>
      </div>
      <div className="p-ck-l" id="p-ck-l" role="listbox" aria-label="Resultados" ref={listRef}>
        {list.length ? (
          list.map((x, i) => {
            const head = x.g !== g ? (g = x.g) : null;
            return (
              <div key={x.key} role="presentation">
                {head ? (
                  <div className="p-ck-g lbl" role="presentation">
                    {head}
                  </div>
                ) : null}
                <button
                  type="button"
                  tabIndex={-1}
                  id={'p-ck-' + i}
                  role="option"
                  aria-selected={i === cur}
                  className={cx('p-ck-i', i === cur && 'on')}
                  onMouseMove={() => i !== cur && setAct(i)}
                  onClick={() => run(x)}
                >
                  {x.color ? <span className="sq" style={cssVars({ '--tc': x.color })} aria-hidden="true" /> : x.icon ? <x.icon aria-hidden="true" /> : <span />}
                  <span className="t">
                    <Mark t={x.t} q={q} />
                    {x.sub ? (
                      <small>
                        <Mark t={x.sub} q={q} />
                      </small>
                    ) : null}
                  </span>
                  {x.k ? <kbd>{x.k}</kbd> : x.g === 'Ir a' ? <span /> : <ArrowRight className="go" aria-hidden="true" />}
                </button>
              </div>
            );
          })
        ) : (
          <div className="p-ck-e" role="status">
            <b>Nada con «{q.trim()}»</b>
            Probá con un tipo de sesión, una carrera o una sección: «fondo», «palermo», «mapa».
          </div>
        )}
      </div>
      <div className="p-ck-f" aria-hidden="true">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd>moverse
        </span>
        <span>
          <kbd>↵</kbd>abrir
        </span>
        <span>
          <kbd>Esc</kbd>cerrar
        </span>
        <span className="brand-t">
          Pista<em>.</em>
        </span>
      </div>
    </div>
  );
}

/** la paleta abierta, sobre todo lo demás; al cerrarse el foco vuelve a donde estaba */
export function Palette() {
  const open = useApp((s) => !!s.ui.palette);
  const ret = useRef<Element | null>(null);
  useEffect(() => {
    if (!open) return;
    ret.current = document.activeElement;
    return () => {
      const r = ret.current as HTMLElement | null;
      ret.current = null;
      /* si lo elegido abrió un panel, el foco ya está ahí */
      if (r && r.isConnected && !S.sheet) r.focus({ preventScroll: true });
    };
  }, [open]);
  if (!open) return null;
  return (
    <>
      <div className="p-scrim ck" aria-hidden="true" onClick={closePalette} />
      <PaletteBox />
    </>
  );
}
