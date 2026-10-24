'use client';
/* Pestaña Mapa: tus recorridos de Strava sobre el mapa de la Ciudad (viewMap y las acciones map* del original,
   líneas 4821–4848 y 6152–6167). */
import { useEffect, useRef, useSyncExternalStore } from 'react';
import MapCanvas, { type MapApi } from '@/components/map/MapCanvas';
import { BarriosCard } from '@/components/map/BarriosCard';
import { MapInfo } from '@/components/map/MapInfo';
import { MapLayers } from '@/components/map/MapLayers';
import { MonthSpark } from '@/components/map/MonthSpark';
import { CountUp } from '@/components/ui/CountUp';
import { SumTile } from '@/components/ui/glance';
import { MAP_PERIODS, baRings, barrioCount, barrioFit, baseMapReady, mapBarrios, mapCells, mapFit, mapRoutes, mapUiInit, onBaseMap, setMapUi, type MapUi } from '@/lib/domain/geo';
import { dShort, fmt, pd, sum } from '@/lib/domain/util';
import { S, useS, useUi } from '@/lib/store';
import { stravaLast, stravaSync } from '@/lib/strava/sync';

/* ¿pantalla táctil? (en el celular el mapa no se arrastra dentro de la página) */
const COARSE = '(pointer:coarse)';
const subCoarse = (f: () => void) => {
  const m = window.matchMedia(COARSE);
  m.addEventListener('change', f);
  return () => m.removeEventListener('change', f);
};
const isCoarse = () => window.matchMedia(COARSE).matches;

const Ic = ({ d }: { d: string[] | string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {(Array.isArray(d) ? d : [d]).map((p) => (
      <path key={p} d={p} />
    ))}
  </svg>
);

export default function MapView() {
  const st = useS();
  const [M, setMap] = useUi<MapUi>('map', mapUiInit());
  const baseReady = useSyncExternalStore(onBaseMap, baseMapReady, () => false);
  const coarse = useSyncExternalStore(subCoarse, isCoarse, () => false);
  const api = useRef<MapApi>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const locked = !M.fs && coarse;

  /* pantalla completa: escondo las pestañas (clase en body, como el original) */
  useEffect(() => {
    document.body.classList.toggle('mapfs', M.fs);
    return () => document.body.classList.remove('mapfs');
  }, [M.fs]);
  /* al salir de la pestaña se sale de pantalla completa */
  useEffect(
    () => () => {
      if (S.ui.map && (S.ui.map as MapUi).fs) setMapUi({ fs: false });
    },
    [],
  );
  /* Escape sale de pantalla completa (si no hay una hoja abierta) */
  useEffect(() => {
    if (!M.fs) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || S.sheet) return;
      e.stopPropagation();
      setMapUi({ fs: false });
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [M.fs]);

  const L = mapRoutes(M.period);
  const lastT = stravaLast(),
    last = lastT ? 'actualizado el ' + dShort(new Date(lastT)) : '';
  const cc = L.length ? mapCells(L, M.period) : { m: new Map<string, number>(), max: 1 },
    bz = mapBarrios(L, M.period),
    nb = barrioCount();
  const km = sum(L.map((r) => r.km || 0)),
    area = cc.m.size * 0.04,
    nB = bz ? bz.list.length : 0;

  /* ---- acciones (A.map* del original) ---- */
  const period = (v: string) => setMap({ period: v, view: null, sel: null, hb: null, replay: true });
  const fit = () => {
    const d = api.current?.dims();
    if (d) setMap({ hb: null, view: mapFit(mapRoutes(M.period), d[0], d[1], true) });
  };
  const color = (c: MapUi['color']) => {
    setMap({ color: c });
    try {
      localStorage.setItem('rr_map_color', c);
    } catch {
      /* sin localStorage */
    }
  };
  const barrio = (n: string) => {
    const hb = M.hb === n ? null : n;
    const b = hb ? baRings().find((q) => q.n === n) : null,
      d = api.current?.dims();
    setMap(b && d ? { hb, view: barrioFit(b, d[0], d[1]) } : { hb });
    const w = wrapRef.current?.querySelector('#mapw');
    if (w && !M.fs) {
      const r = w.getBoundingClientRect();
      if (r.top < 60 || r.top > innerHeight * 0.5) window.scrollBy({ top: r.top - 70, behavior: 'smooth' });
    }
  };

  const syncBtn = M.syncing ? 'Actualizando…' : st.routes.length ? 'Actualizar' : 'Traer de Strava';
  return (
    <div className="map-grid" ref={wrapRef}>
      <MapCanvas ref={api} M={M} locked={locked} baseReady={baseReady} routes={st.routes} sessions={st.sessions}>
        <div className="mp-top glass">
          {MAP_PERIODS.map((p) => (
            <button key={p[0]} data-a="mapperiod" data-v={p[0]} aria-pressed={M.period === p[0]} onClick={() => period(p[0])}>
              {p[1]}
            </button>
          ))}
        </div>
        <div className="mp-ctl">
          <div className="mp-grp glass">
            <button data-a="mapfs" aria-label={M.fs ? 'Salir de pantalla completa' : 'Pantalla completa'} aria-pressed={!!M.fs} onClick={() => setMap({ fs: !M.fs, lay: false })}>
              <Ic d={M.fs ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'} />
            </button>
            <button data-a="maplay" aria-label="Capas" aria-pressed={!!M.lay} onClick={() => setMap({ lay: !M.lay })}>
              <Ic d={['M12 3 3 8l9 5 9-5z', 'm3 13 9 5 9-5']} />
            </button>
          </div>
          <div className="mp-grp glass">
            <button data-a="mapzoom" data-v="1.6" aria-label="Acercar" onClick={() => api.current?.zoom(1.6)}>
              <Ic d="M12 5v14M5 12h14" />
            </button>
            <button data-a="mapzoom" data-v="0.625" aria-label="Alejar" onClick={() => api.current?.zoom(0.625)}>
              <Ic d="M5 12h14" />
            </button>
            <button data-a="mapfit" aria-label="Ver todos los recorridos" onClick={fit}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            </button>
          </div>
        </div>
        {M.lay ? <MapLayers M={M} onColor={color} onZones={() => setMap({ zones: !M.zones })} onBase={() => setMap({ base: !M.base })} /> : null}
        <div id="mapinfo" className="mp-info" aria-live="polite">
          <MapInfo M={M} routes={st.routes} L={L} locked={locked} onUnsel={() => setMap({ sel: null })} />
        </div>
      </MapCanvas>
      <div className="map-side">
        <div className="glance sum-gl map-gl">
          <SumTile
            ic="route"
            c="var(--accent)"
            t="Recorridos"
            v={
              <span className="gl-v">
                <CountUp v={L.length} />
              </span>
            }
            viz={<MonthSpark L={L} f={() => 1} c="var(--accent)" />}
            sub={L.length ? 'Último: ' + dShort(pd(L[L.length - 1].date)) : ''}
          />
          <SumTile
            ic="next"
            c="var(--info)"
            t="Km trazados"
            v={
              <span className="gl-v">
                <CountUp v={Math.round(km)} d={0} />
                <small>km</small>
              </span>
            }
            viz={<MonthSpark L={L} f={(r) => r.km || 0} c="var(--info)" />}
            sub={L.length ? 'Promedio ' + fmt(km / L.length, 1) + ' km' : ''}
          />
          <SumTile
            ic="area"
            c="var(--good)"
            t="Zona cubierta"
            v={
              <span className="gl-v">
                <CountUp v={Math.round(area * 10) / 10} d={1} />
                <small>km²</small>
              </span>
            }
            sub="Cuadrículas de 200 m"
          />
          <SumTile
            ic="pin"
            c="var(--t4)"
            t="Barrios"
            v={
              <span className="gl-v">
                <CountUp v={nB} />
                <small>de {nb}</small>
              </span>
            }
            viz={
              <span className="bz-bar">
                <i style={{ width: Math.round((nB / nb) * 100) + '%' }} />
              </span>
            }
            sub="Barrios de la Ciudad que pisaste"
          />
        </div>
        <BarriosCard bz={bz} hasRoutes={!!st.routes.length} hb={M.hb} onPick={barrio} />
        <section className="card sv-row">
          <div className="sv-t">
            <b>Strava</b>
            <span>{st.routes.length ? st.routes.length + ' recorridos' + (last ? ' · ' + last : '') : 'Traé tus carreras para ver por dónde corriste.'}</span>
          </div>
          <button className={'btn sm' + (st.routes.length ? '' : ' pri')} data-a="mapsync" disabled={M.syncing} onClick={() => void stravaSync()}>
            {syncBtn}
          </button>
          <p id="mapmsg" className="hint" role="status">
            {M.msg || ''}
          </p>
        </section>
      </div>
    </div>
  );
}
