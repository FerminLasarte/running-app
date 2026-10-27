'use client';
/* Zapatillas: cada par con su vida útil (las mismas cuentas que Análisis → Zapatillas) y «Editar», que abre los
   campos en la misma fila. Desde cuándo y hasta cuándo las usaste salen de tus salidas; «Carreras», de usarlas solo en
   tests y carreras. */
import { Plus, Sneaker } from '@phosphor-icons/react';
import { useS } from '@/lib/store';
import { AJ_PARTS, ajId, ajNameId, setAjEdit } from '@/lib/data/actions';
import type { Shoe } from '@/lib/domain/types';
import { SHOE_NEAR, shoeLife, shoeUse } from '@/lib/domain/shoes';
import { applyShoe, shoeDraft, shoeErrs, type ShoeDraft } from '@/lib/domain/settings';
import { monthOf, nf, pd } from '@/lib/domain/util';
import { Button, Chip } from '@/components/pista/controls';
import { Field, Input, UnitInput } from '@/components/pista/fields';
import { Laps } from '@/components/pista/meters';
import { Panel } from '@/components/pista/structure';
import { cssVars, cx } from '@/components/pista/util';
import { addBtnId, closeEdit, commitCfg, editBtnId, shoeAdd, shoeMain, shoeRet } from './actions';
import { useAuto } from './useAuto';

/** «Desde junio · le quedan 188 km de vida útil», o cuándo las retiraste */
function shoeNote(z: Shoe) {
  const u = shoeUse(z);
  if (z.retired) return u ? 'Retiradas en ' + monthOf(pd(u.last)) : 'Retiradas';
  const L = shoeLife(z),
    life = L.left > 0 ? 'le quedan ' + nf(L.left) + ' km de vida útil' : 'pasaron el límite por ' + nf(-L.left) + ' km';
  return (u ? (u.race ? 'Solo para tests y carreras' : 'Desde ' + monthOf(pd(u.first))) : 'Sin salidas todavía') + ' · ' + life;
}

function ShoeEdit({ z }: { z: Shoe }) {
  const p = ajId('z', z.id);
  const { draft: d, edit, bind } = useAuto(
    z,
    () => shoeDraft(z),
    (v) => commitCfg((c) => applyShoe(c.shoes.find((x) => x.id === z.id)!, v)),
  );
  const err = shoeErrs(d);
  const set = (patch: Partial<ShoeDraft>) => (x: ShoeDraft) => ({ ...x, ...patch });
  return (
    <div className="aj-ed" {...bind}>
      <div className="aj-ed-g">
        <Field id={ajNameId('z', z.id)} label="Nombre">
          <Input id={ajNameId('z', z.id)} value={d.name} maxLength={40} onChange={(e) => edit(set({ name: e.target.value }))} />
        </Field>
        <Field id={p + '-start'} label="Km que ya tenían" error={err.start}>
          <UnitInput id={p + '-start'} unit="km" invalid={!!err.start} value={d.start} onChange={(e) => edit(set({ start: e.target.value }))} />
        </Field>
        <Field id={p + '-lim'} label="Cambiarlas a los" error={err.lim}>
          <UnitInput id={p + '-lim'} unit="km" inputMode="numeric" invalid={!!err.lim} value={d.lim} onChange={(e) => edit(set({ lim: e.target.value }))} />
        </Field>
      </div>
      <div className="aj-ed-f">
        {z.retired || z.main ? null : (
          <Button size="sm" variant="ghost" onClick={() => shoeMain(z.id)}>
            Usarlas como principales
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => shoeRet(z.id)}>
          {z.retired ? 'Volver a usar' : 'Retirarlas'}
        </Button>
        <Button size="sm" onClick={() => closeEdit('z', z.id)}>
          Listo
        </Button>
      </div>
    </div>
  );
}

export function Shoes({ i }: { i: number }) {
  const { cfg, ui } = useS();
  const open = ui.ajEdit as string | null | undefined;
  return (
    <Panel
      id={AJ_PARTS.shoes}
      title="Zapatillas"
      sub="La principal se elige sola al cargar"
      actions={
        <Button size="sm" icon={Plus} id={addBtnId('z')} onClick={shoeAdd}>
          Agregar
        </Button>
      }
      className="aj-set p-rise"
      style={cssVars({ '--i': i })}
    >
      {cfg.shoes.length ? (
        <ul className="aj-list">
          {cfg.shoes.map((z) => {
            const on = open === 'z:' + z.id,
              L = shoeLife(z),
              f = L.km / z.limitKm,
              u = shoeUse(z);
            return (
              <li key={z.id} className={cx('aj-li', z.retired && 'ret')}>
                <span className="aj-ic">
                  <Sneaker weight={z.retired ? 'regular' : 'fill'} aria-hidden="true" />
                </span>
                <span className="aj-nm">
                  <b>
                    {z.name}
                    {z.main && !z.retired ? <Chip color="var(--ink)">Principal</Chip> : u?.race && !z.retired ? <Chip color="var(--acc)">Carreras</Chip> : null}
                  </b>
                  <small>{shoeNote(z)}</small>
                  <Laps value={f} n={20} soft warnFrom={z.retired ? undefined : Math.round(SHOE_NEAR * 20)} label={nf(L.km) + ' de ' + nf(z.limitKm) + ' km'} className="aj-meter" />
                </span>
                <span className="disp">
                  {nf(L.km)}
                  <small>de {nf(z.limitKm)} km</small>
                </span>
                <span className="aj-li-b">
                  {z.retired && !on ? (
                    <Button size="sm" variant="ghost" onClick={() => shoeRet(z.id)}>
                      Volver a usar
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" id={editBtnId('z', z.id)} aria-expanded={on} onClick={() => setAjEdit(on ? null : 'z:' + z.id)}>
                    {on ? 'Cerrar' : 'Editar'}
                  </Button>
                </span>
                {on ? <ShoeEdit z={z} /> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="aj-none">Cargá tus zapatillas para llevar sus km y saber cuándo cambiarlas.</p>
      )}
    </Panel>
  );
}
