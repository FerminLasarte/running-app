'use client';
/* Vitrina: los trofeos por categoría, con el escudo de su metal (bronce, plata, oro o platino). Los que faltan van
   punteados, con cuánto llevás; los que están por caer, en tartán. «Nuevo» marca lo que ganaste desde la última vez que
   miraste. Son casi 90: la vitrina tiene un alto fijo y baja por dentro, con el nombre de la categoría
   siempre arriba. El filtro (todos, ganados, por ganar) va en la URL: `?vitrina=ganados`. */
import { useEffect, useState } from 'react';
import { useS } from '@/lib/store';
import { markTrophiesSeen, trophies, trophyNote, trophyProg, trophyTier, vitGroups, type Trophy, type VitFilter } from '@/lib/domain/trophies';
import { Segmented } from '@/components/pista/controls';
import { Laps } from '@/components/pista/meters';
import { Panel } from '@/components/pista/structure';
import { Shield, TIER_NAME } from '@/components/pista/sport';
import { cssVars, cx } from '@/components/pista/util';
import { LO_PARTS, openTrophy, trophyIcon } from './util';

export const VIT_IDS: readonly VitFilter[] = ['todos', 'ganados', 'faltan'];

function Tile({ t, isNew }: { t: Trophy; isNew: boolean }) {
  const p = trophyProg(t),
    note = trophyNote(t),
    tier = trophyTier(t);
  return (
    <li>
      <button
        type="button"
        className={cx('lo-tro', !t.got && 'lock', isNew && 'new', p != null && p >= 0.85 && 'close')}
        aria-label={t.name + (t.got ? ', ' + TIER_NAME[tier] + ', ganado el ' + note : ', por ganar' + (note ? ', ' + note : '')) + (isNew ? ', nuevo' : '')}
        onClick={() => openTrophy(t.id)}
      >
        <Shield tier={tier} got={t.got} icon={trophyIcon(t)} />
        <b>{t.name}</b>
        {!t.got && p != null ? <Laps value={p} className="lo-pg" /> : null}
        {note ? <small>{note}</small> : null}
      </button>
    </li>
  );
}

export function Vitrina({ f, onF, i }: { f: VitFilter; onF: (f: VitFilter) => void; i: number }) {
  const S = useS();
  /* lo que ya habías visto al entrar: «Nuevo» queda mientras mirás la vitrina */
  const [seen] = useState(() => (Array.isArray(S.cfg.seenTrophies) ? new Set(S.cfg.seenTrophies) : null));
  useEffect(() => {
    markTrophiesSeen();
  });
  const T = trophies(),
    nGot = T.filter((t) => t.got).length,
    G = vitGroups(T, f);
  return (
    <Panel
      id={LO_PARTS.vit}
      title="Vitrina"
      sub={nGot + ' de ' + T.length}
      actions={
        <Segmented
          label="Filtrar trofeos"
          value={f}
          onChange={onF}
          options={[
            { value: 'todos', label: 'Todos', n: T.length },
            { value: 'ganados', label: 'Ganados', n: nGot },
            { value: 'faltan', label: 'Por ganar', n: T.length - nGot },
          ]}
        />
      }
      className="p-c8 p-rise lo-vit-p"
      style={cssVars({ '--i': i })}
      flush
    >
      {G.length ? (
        <div className="lo-vit-b">
          {G.map((g) => (
            <section key={g.cat} className="lo-vit-g" aria-labelledby={'lo-vg-' + g.cat}>
              <h3 id={'lo-vg-' + g.cat}>
                {g.name}
                <span>
                  {g.got} de {g.all}
                </span>
              </h3>
              <ul className="lo-vit">
                {g.items.map((t) => (
                  <Tile key={t.id} t={t} isNew={!!seen && t.got && !seen.has(t.id)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="lo-none">{f === 'ganados' ? 'Todavía no ganaste trofeos: la primera salida de 5 km ya da uno.' : 'Ganaste todos. Por ahora.'}</p>
      )}
    </Panel>
  );
}
