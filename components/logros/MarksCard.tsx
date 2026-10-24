'use client';
/* Mejores marcas: tiempos de carreras y tests, más récords de volumen. */
import { openSheet } from '@/lib/sheets';
import { bestMarks } from '@/lib/domain/marks';

export default function MarksCard() {
  const M = bestMarks();
  if (!M.length) return null;
  return (
    <section className="card">
      <div className="h3">Mejores marcas</div>
      <div className="sub">Tiempos de tus carreras y tests (llevados a la distancia exacta) y tus récords de volumen.</div>
      <div className="pr-grid">
        {M.map((m) => {
          const inner = (
            <>
              <span className="kl">{m.n}</span>
              <b className="big">{m.v}</b>
              <small>{m.x}</small>
            </>
          );
          return m.id ? (
            <button key={m.n} className="pr-it" data-a="detail" data-id={m.id} onClick={() => openSheet('detail', { id: m.id })}>
              {inner}
            </button>
          ) : (
            <div key={m.n} className="pr-it">
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
