'use client';
/* Un estante de la vitrina: el fondo con la luz de arriba, la repisa laqueada con su placa («Distancia total · 1 de 6»)
   y las piezas paradas encima (o colgadas de la barra, las medallas), con el nombre y la fecha o lo que llevás abajo.
   Las que faltan son siluetas; las que están por caer, en tartán y con un brillo. Lo usan la vitrina y la vidriera de
   Logros. Las piezas aparecen al llegar al estante, salvo con «reducir movimiento». */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useS } from '@/lib/store';
import { reduceMotion } from '@/lib/motion';
import { markTrophiesSeen, trophyNote, trophyProg, trophyTier, type Trophy } from '@/lib/domain/trophies';
import { Laps } from '@/components/pista/meters';
import { SecretBox, TIER_NAME } from '@/components/pista/sport';
import { cssVars, cx } from '@/components/pista/util';
import { TrophyPiece } from './Piece';
import { openTrophy, trophyKind } from './util';

/** lo que ya habías visto al entrar: «Nuevo» queda mientras mirás. Al dibujar, lo ganado queda como visto */
export function useSeenTrophies() {
  const S = useS();
  const [seen] = useState(() => (Array.isArray(S.cfg.seenTrophies) ? new Set(S.cfg.seenTrophies) : null));
  useEffect(() => {
    markTrophiesSeen();
  });
  return (t: Trophy) => !!seen && t.got && !seen.has(t.id);
}

/** si el estante ya entró en pantalla (sin IntersectionObserver o con «reducir movimiento», desde el principio) */
function useArrived() {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(() => typeof window === 'undefined' || reduceMotion() || !('IntersectionObserver' in window));
  useEffect(() => {
    const el = ref.current;
    if (on || !el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setOn(true);
        io.disconnect();
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [on]);
  return [ref, on] as const;
}

function Item({ t, isNew, j, short }: { t: Trophy; isNew: boolean; j: number; short: boolean }) {
  const p = trophyProg(t),
    note = trophyNote(t),
    tier = trophyTier(t);
  return (
    <li style={cssVars({ '--j': j })}>
      <button
        type="button"
        className={cx('lo-vo', !t.got && 'lock', p != null && p >= 0.85 && 'close')}
        aria-label={t.name + (t.got ? ', ' + TIER_NAME[tier] + ', ganado el ' + note : ', por ganar' + (note ? ', ' + note : '')) + (isNew ? ', nuevo' : '')}
        onClick={() => openTrophy(t.id)}
      >
        <span className="pc">
          <TrophyPiece t={t} />
          {isNew ? <span className="nw">Nuevo</span> : null}
        </span>
        <span className="tx">
          {/* en la copa no repito la distancia si ya la dice la placa del estante */}
          <b>{short && trophyKind(t) === 'cup' ? t.name.replace(/ en .+$/, '') : t.name}</b>
          {!t.got && p != null ? <Laps value={p} className="lo-pg" /> : null}
          {note ? <small>{note}</small> : null}
        </span>
      </button>
    </li>
  );
}

export function Shelf({
  id,
  name,
  plaque,
  items,
  locked = 0,
  isNew,
  hang,
  wall,
  note,
}: {
  id?: string;
  /** para leerlo en voz alta; la placa lo muestra si hay `plaque` */
  name: string;
  /** cuántos ganaste de cuántos («2 de 5»); sin esto no hay placa (la vidriera) */
  plaque?: [number, number];
  items: Trophy[];
  /** secretos sin descubrir: cajas cerradas */
  locked?: number;
  isNew: (t: Trophy) => boolean;
  /** las medallas cuelgan de una barra */
  hang?: boolean;
  /** el título chico arriba, contra el fondo (la vidriera) */
  wall?: string;
  /** a la derecha de la repisa («Quedan 3 por descubrir») */
  note?: ReactNode;
}) {
  const [ref, on] = useArrived(),
    n = items.length + locked;
  return (
    <section
      ref={ref}
      id={id}
      className={cx('lo-vs', hang && 'hang', n >= 6 && 'wide', plaque && plaque[1] > 0 && plaque[0] === plaque[1] && 'done', on ? 'in' : 'pre')}
      aria-label={plaque ? undefined : name}
      aria-labelledby={plaque && id ? id + '-h' : undefined}
    >
      <div className="lo-vs-x">
        <ul className="lo-vs-row">
          {items.map((t, j) => (
            <Item key={t.id} t={t} isNew={isNew(t)} j={j} short={!!plaque} />
          ))}
          {Array.from({ length: locked }, (_, j) => (
            <li key={'box' + j} style={cssVars({ '--j': items.length + j })}>
              <span className="lo-vo box" role="img" aria-label="Secreto sin descubrir">
                <span className="pc">
                  <SecretBox />
                </span>
                <span className="tx" aria-hidden="true">
                  <b>Secreto</b>
                  <small>Sin pistas</small>
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <span className="lo-vs-led" aria-hidden="true" />
      <span className="lo-vs-glass" aria-hidden="true" />
      <span className="lo-vs-fade" aria-hidden="true" />
      {wall ? (
        <span className="lo-vs-wall" aria-hidden="true">
          {wall}
        </span>
      ) : null}
      {plaque ? (
        <h3 className="lo-vs-pl" id={id ? id + '-h' : undefined}>
          <b>{name}</b>
          <span>
            {plaque[0]} de {plaque[1]}
          </span>
        </h3>
      ) : null}
      {note ? <p className="lo-vs-note">{note}</p> : null}
    </section>
  );
}
