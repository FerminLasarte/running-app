'use client';
/* Cinta de datos de Semana: corre de punta a punta debajo de la barra de arriba (la pone el shell). Se frena al pasar
   el mouse; con «reducir movimiento» queda quieta y se corre de costado. Las dos vueltas son dibujo: los lectores de
   pantalla leen las frases una vez, de corrido. */
import '@/app/styles/screens/semana.css';
import { Fragment } from 'react';
import { useS } from '@/lib/store';
import { tickerItems, type TickerItem } from '@/lib/domain/ticker';

const Track = ({ items }: { items: TickerItem[] }) => (
  <div className="sem-tk" aria-hidden="true">
    {items.map((t, i) => (
      <span key={i}>
        <span>
          {t.pre}
          <b>{t.b}</b>
          {t.post}
        </span>
      </span>
    ))}
  </div>
);

export function Ticker() {
  useS();
  const items = tickerItems();
  if (!items.length) return null;
  return (
    /* con el foco del teclado se frena, como al pasar el mouse: la cinta no se mueve sin que se la pueda parar */
    <section className="sem-ticker" aria-label="Tus números de la semana" tabIndex={0}>
      <Track items={items} />
      <Track items={items} />
      <p className="p-sr">
        {items.map((t, i) => (
          <Fragment key={i}>
            {(t.pre || '') + t.b + (t.post || '')}.{' '}
          </Fragment>
        ))}
      </p>
    </section>
  );
}
