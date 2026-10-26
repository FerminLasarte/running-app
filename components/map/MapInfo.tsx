/* Lo que flota abajo del mapa: la salida elegida o la leyenda (mapInfoHtml, línea 4729 del original). */
import type { CSSProperties } from 'react';
import { TYPES, TYPE_KEYS } from '@/lib/domain/config';
import { mapCells, routeSess, type MapUi } from '@/lib/domain/geo';
import type { Route, SessionType } from '@/lib/domain/types';
import { cap, dateLabel, fmt, fmtDur, fmtPace } from '@/lib/domain/util';
import { goSession } from '@/lib/nav';

export function MapInfo({ M, routes, L, locked, onUnsel }: { M: MapUi; routes: Route[]; L: Route[]; locked: boolean; onUnsel: () => void }) {
  if (!routes.length)
    return (
      <div className="mp-leg glass">
        <span>Todavía no hay recorridos. Traelos desde Strava, abajo.</span>
      </div>
    );
  const r = M.sel ? routes.find((x) => x.id === M.sel) : null;
  if (r) {
    const s = routeSess(r),
      ty = s ? TYPES[s.type] : null,
      c = ty ? ty.t : 'var(--accent)';
    const pace = r.km > 0 && r.tsec > 0 ? fmtPace(r.tsec / r.km) : '';
    return (
      <div className="mp-card glass" style={{ '--rc': c } as CSSProperties}>
        <div className="mp-ct">
          <span className="mp-k">
            <i />
            {cap(dateLabel(r.date))}
            {ty ? ' · ' + ty.label : ''}
          </span>
          <b>{r.name || 'Carrera'}</b>
          <span className="mp-st">
            <span>
              <b>{fmt(r.km, 2)}</b> km
            </span>
            {r.tsec ? (
              <span>
                <b>{fmtDur(r.tsec)}</b>
              </span>
            ) : null}
            {pace ? (
              <span>
                <b>{pace}</b> /km
              </span>
            ) : null}
          </span>
        </div>
        <div className="mp-ca">
          {s ? (
            <button className="btn sm" data-a="detail" data-id={s.id} onClick={() => goSession(s.id)}>
              Ver sesión
            </button>
          ) : null}
          <button className="mp-x" data-a="mapunsel" aria-label="Cerrar" onClick={onUnsel}>
            ×
          </button>
        </div>
      </div>
    );
  }
  const tip = locked ? 'Tocá un recorrido · ⤢ para explorar' : 'Tocá un recorrido para ver cuándo fue';
  if (M.color === 'type') {
    const seen = new Set<SessionType>();
    L.forEach((q) => {
      const s = routeSess(q);
      if (s) seen.add(s.type);
    });
    return (
      <div className="mp-leg glass">
        <span className="mp-tl">
          {TYPE_KEYS.filter((k) => seen.has(k)).map((k) => (
            <span key={k}>
              <i style={{ background: TYPES[k].t }} />
              {TYPES[k].label.split(' ')[0]}
            </span>
          ))}
        </span>
        <small>{tip}</small>
      </div>
    );
  }
  if (M.zones && L.length) {
    const cc = mapCells(L, M.period);
    return (
      <div className="mp-leg glass">
        <span className="mp-gr">
          <small>1 vez</small>
          <i />
          <small>{cc.max} veces</small>
        </span>
        <small>{tip}</small>
      </div>
    );
  }
  return (
    <div className="mp-leg glass">
      <small>{tip}</small>
    </div>
  );
}
