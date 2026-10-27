/* La tarjeta que flota abajo a la izquierda del mapa: la salida elegida (tipo, fecha, distancia, tiempo, ritmo y el link
   a la sesión) o, sin salida, qué estás viendo: el barrio resaltado o cómo se lee el mapa (con la escala de las zonas
   pintadas si están prendidas). */
import { X } from '@phosphor-icons/react';
import { TYPE_KEYS, TYPES } from '@/lib/domain/config';
import { mapBarrios, mapCells, routeSess } from '@/lib/domain/geo';
import type { Route, SessionType } from '@/lib/domain/types';
import { cap, dateLabel, fmt, fmtDur, fmtPace, plural } from '@/lib/domain/util';
import { sessionHref } from '@/lib/nav';
import { Button, Chip } from '@/components/pista/controls';
import { Key } from '@/components/pista/charts';
import { BrandTitle } from '@/components/pista/structure';
import { typeColor } from '@/components/pista/util';
import type { MapOpts } from './draw';

export function Card({ o, L, onClose }: { o: MapOpts; L: Route[]; onClose: () => void }) {
  /* solo una salida del período: la que el mapa dibuja */
  const r = o.sel ? L.find((x) => x.id === o.sel) : null;
  if (r) {
    const s = routeSess(r),
      pace = r.km > 0 && r.tsec > 0 ? fmtPace(r.tsec / r.km) : '';
    return (
      <section className="mapa-card" aria-live="polite" aria-label="Salida elegida">
        <button type="button" className="mapa-x" aria-label="Cerrar" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
        <div className="p-st-top">
          {s ? <Chip type={s.type} solid /> : null}
          <span className="lbl">{cap(dateLabel(r.date))}</span>
        </div>
        <BrandTitle as="h3">{r.name || 'Salida'}</BrandTitle>
        <div className="mapa-nums">
          <div>
            <span className="lbl">Distancia</span>
            <span className="disp">
              {fmt(r.km, 2)}
              <span className="p-u">km</span>
            </span>
          </div>
          {r.tsec ? (
            <div>
              <span className="lbl">Tiempo</span>
              <span className="disp">{fmtDur(r.tsec)}</span>
            </div>
          ) : null}
          {pace ? (
            <div>
              <span className="lbl">Ritmo</span>
              <span className="disp">
                {pace}
                <span className="p-u">/km</span>
              </span>
            </div>
          ) : null}
        </div>
        {s ? (
          <div className="mapa-acts">
            <Button href={sessionHref(s.id)} variant="on-dark" size="sm" arrow>
              Ver la sesión
            </Button>
          </div>
        ) : null}
      </section>
    );
  }
  /* sin salida elegida: el barrio, la leyenda de los tipos o cómo se pinta */
  const bz = o.hb ? mapBarrios(L, o.period).list.find((e) => e.b.n === o.hb) : null;
  /* la escala de las zonas pintadas: de 1 a las veces que más pasaste por una misma cuadrícula */
  const zmax = o.zones && L.length ? mapCells(L, o.period).max : 0;
  const seen = new Set<SessionType>();
  if (o.color === 'type')
    L.forEach((q) => {
      const s = routeSess(q);
      if (s) seen.add(s.type);
    });
  return (
    <section className="mapa-card" aria-live="polite" aria-label="Qué estás viendo">
      <span className="lbl">{o.hb ? 'Tu barrio' : o.color === 'type' ? 'Color por tipo de sesión' : 'Tus recorridos'}</span>
      <BrandTitle as="h3">{o.hb || 'Tocá un recorrido'}</BrandTitle>
      {o.hb ? (
        <p className="mapa-cn">{bz ? plural(bz.n, 'salida', 'salidas') + ' pasaron por acá: ' + fmt(bz.km, bz.km < 10 ? 1 : 0) + ' km en el período.' : 'En este período no pasaste por acá.'}</p>
      ) : o.color === 'type' ? (
        <div className="mapa-keys">
          {TYPE_KEYS.filter((k) => seen.has(k)).map((k) => (
            <Key key={k} color={typeColor(k)} kind="sq">
              {TYPES[k].label}
            </Key>
          ))}
        </div>
      ) : (
        <>
          <p className="mapa-cn">Cuanto más pasás por una calle, más fuerte se pinta.</p>
          {zmax > 1 ? (
            <div className="mapa-zl">
              <small>1 vez</small>
              <i aria-hidden="true" />
              <small>{zmax} veces</small>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
