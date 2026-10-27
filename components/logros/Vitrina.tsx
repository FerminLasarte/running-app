'use client';
/* La vitrina (boceto design/bocetos/vitrina.html, /logros/vitrina): un estante por categoría, como la vitrina de un
   club, con copas para las marcas, medallas colgadas para las carreras y escudos para lo demás. Arriba, cuántos tenés
   de cada metal y el filtro (todos, ganados, por ganar), que va en la URL: `?filtro=ganados`. Los secretos van al
   final y se ven siempre: los que faltan, como cajas cerradas. */
import '@/app/styles/screens/logros.css';
import { useS } from '@/lib/store';
import { vitShelfId } from '@/lib/data/actions';
import { doneList } from '@/lib/domain/stats';
import { trophies, trophyTier, vitCount, vitGroups, type VitFilter } from '@/lib/domain/trophies';
import { Segmented } from '@/components/pista/controls';
import { PageHead } from '@/components/pista/structure';
import { TIER_C, TIER_NAME } from '@/components/pista/sport';
import { cssVars } from '@/components/pista/util';
import { useParam } from '@/components/shell/useParam';
import { Empty } from './Empty';
import { Shelf, useSeenTrophies } from './Shelf';

export const VIT_IDS: readonly VitFilter[] = ['todos', 'ganados', 'faltan'];

export default function Vitrina() {
  useS();
  const [f, setF] = useParam<VitFilter>('filtro', VIT_IDS, 'todos');
  const isNew = useSeenTrophies();
  if (!doneList().length)
    return (
      <div className="p-grid lo">
        <Empty />
      </div>
    );
  const T = trophies(),
    C = vitCount(T),
    G = vitGroups(T, f),
    metals = TIER_NAME.map((_, k) => T.filter((t) => t.got && trophyTier(t) === k).length);
  return (
    <div className="lo lo-vit">
      <PageHead
        eyebrow="Logros · tus trofeos"
        title="Vitrina"
        actions={
          <div className="lo-vh-r">
            <ul className="lo-tally" aria-label="Ganados por metal">
              {metals.map((n, k) => (
                <li key={k} className={n ? undefined : 'z'}>
                  <i className="lo-coin" style={cssVars({ '--c': TIER_C[k] })} aria-hidden="true" />
                  <span>
                    <span className="disp">{n}</span>
                    <small>{TIER_NAME[k]}</small>
                  </span>
                </li>
              ))}
            </ul>
            <Segmented
              label="Filtrar trofeos"
              value={f}
              onChange={setF}
              fill
              options={[
                { value: 'todos', label: 'Todos', n: C.all },
                { value: 'ganados', label: 'Ganados', n: C.got },
                { value: 'faltan', label: 'Por ganar', n: C.all - C.got },
              ]}
            />
          </div>
        }
      >
        <b>
          {C.got} de {C.all}
        </b>{' '}
        trofeos en su lugar. Los que faltan esperan en el estante, con lo que llevás; los que están por caer, brillan.
      </PageHead>
      {G.length ? (
        <div className="lo-case">
          {G.map((g) => (
            <Shelf
              key={g.cat}
              id={vitShelfId(g.cat)}
              name={g.name}
              plaque={[g.got, g.all]}
              items={g.items}
              locked={g.locked}
              isNew={isNew}
              hang={g.cat === 'race'}
              note={
                g.locked ? (
                  <>
                    {g.locked === 1 ? 'Queda ' : 'Quedan '}
                    <b>{g.locked}</b> por descubrir
                  </>
                ) : null
              }
            />
          ))}
        </div>
      ) : (
        <p className="lo-none">{f === 'ganados' ? 'Todavía no ganaste trofeos: la primera salida de 5 km ya da uno.' : 'Ganaste todos. Por ahora.'}</p>
      )}
    </div>
  );
}
