'use client';
/* Traer el resultado desde Strava, dentro del formulario (paintStrava). */
import { dateLabel, fmt } from '@/lib/domain/util';
import type { SvState } from '@/lib/domain/resultForm';

export function StravaBox({ sv, onLoad, onPick }: { sv: SvState; onLoad: () => void; onPick: (id: string) => void }) {
  return (
    <div className="sv-box">
      <div className="sv-h">
        <b>Traer de Strava</b>
        <span>Completo distancia, tiempo, FC y parciales por vos.</span>
      </div>
      {sv.list && sv.list.length ? (
        <div className="chips" style={{ marginTop: 10 }}>
          {sv.list.map((a) => (
            <button key={a.id} className="chip s" data-a="sv-pick" data-id={a.id} aria-pressed={sv.pick === a.id} disabled={sv.busy} onClick={() => onPick(a.id)}>
              {dateLabel(a.date) + ' · ' + fmt(a.km, 1) + ' km · ' + String(a.name).slice(0, 24)}
            </button>
          ))}
        </div>
      ) : null}
      <button className="btn blk sv-btn" style={{ marginTop: 12 }} data-a="sv-load" disabled={sv.busy} onClick={onLoad}>
        {sv.busy ? 'Leyendo Strava…' : sv.list ? 'Actualizar lista' : 'Traer de Strava'}
      </button>
      <p className="hint" id="rf-sv-note" role="status" style={{ marginTop: 8 }}>
        {sv.msg}
      </p>
    </div>
  );
}
