/* Zapatillas activas con sus km (línea 3435 del original). */
import { activeShoes } from '@/lib/domain/config';
import { goShoes } from '@/lib/data/actions';
import { ShoeMeter } from './ShoeMeter';

export function ShoesCard() {
  const A = activeShoes();
  if (!A.length)
    return (
      <section className="card">
        <div className="h3">Zapatillas</div>
        <p>Cargá tus zapatillas y te llevo los km de cada par, con aviso cuando se acercan al momento de cambiarlas.</p>
        <button className="btn sm" style={{ marginTop: 10 }} data-a="goShoes" onClick={goShoes}>
          Cargar zapatillas
        </button>
      </section>
    );
  return (
    <section className="card">
      <div className="h3">Zapatillas</div>
      <div className="sub">Km de cada par: lo que tenían al cargarlas más las salidas que hiciste con ellas.</div>
      {A.map((z) => (
        <div key={z.id} style={{ marginTop: 12 }}>
          <b>{z.name}</b>
          {z.main ? (
            <>
              {' '}
              <span className="mut" style={{ fontSize: 13 }}>
                · principal
              </span>
            </>
          ) : null}
          <ShoeMeter z={z} />
        </div>
      ))}
      <p className="hint" style={{ marginTop: 10 }}>
        Muchas zapatillas de running rinden entre 500 y 800 km; el límite lo elegís vos en Ajustes.
      </p>
    </section>
  );
}
