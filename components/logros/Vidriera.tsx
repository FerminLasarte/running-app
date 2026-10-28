'use client';
/* La vidriera de Logros: un estante chico con los últimos que ganaste y los que están por caer, y «Ver la vitrina» para
   ver todos (la página /logros/vitrina). */
import { trophies, vitCount, vitShowcase } from '@/lib/domain/trophies';
import { Button } from '@/components/pista/controls';
import { Panel } from '@/components/pista/structure';
import { cssVars } from '@/components/pista/util';
import { Shelf, useSeenTrophies } from './Shelf';
import { LO_PARTS } from './util';

export function Vidriera({ i }: { i: number }) {
  const isNew = useSeenTrophies();
  const T = trophies(),
    C = vitCount(T),
    /* tres por estante: con cuatro, las leyendas de los trofeos quedaban casi pegadas entre sí */
    { last, near } = vitShowcase(T, 3);
  return (
    <Panel
      id={LO_PARTS.vit}
      title="Vitrina"
      sub={C.got + ' de ' + C.all}
      actions={
        <Button size="sm" href="/logros/vitrina" arrow>
          Ver la vitrina
        </Button>
      }
      className="p-c8 p-rise lo-vid"
      style={cssVars({ '--i': i })}
      flush
    >
      <div className="lo-vid-z">
        {last.length ? <Shelf name="Últimos ganados" wall="Últimos ganados" items={last} isNew={isNew} /> : null}
        {near.length ? <Shelf name="Por caer" wall="Por caer" items={near} isNew={isNew} /> : null}
      </div>
    </Panel>
  );
}
