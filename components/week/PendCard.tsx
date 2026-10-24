'use client';
/* Pendientes: sesiones planificadas sin cargar + corridas nuevas de Strava, en una sola tarjeta */
import type { Session } from '@/lib/domain/types';
import { TYPES } from '@/lib/domain/config';
import { planSummary, sdate } from '@/lib/domain/stats';
import { dateLabel, fmt } from '@/lib/domain/util';
import { SVW0, svGo, svwLoad, type SvwState } from '@/lib/domain/week';
import { saveSession } from '@/lib/data/actions';
import { openSheet } from '@/lib/sheets';
import { useS, useUi } from '@/lib/store';

/* ¿se muestra la tarjeta? (la parte de Strava no aparece en el modo ejemplo) */
const pendCardShown = (pend: Session[], demo: boolean) => pend.length > 0 || !demo;

/* la parte de Strava (fuera del modo ejemplo: la tarjeta de arriba ya lo filtra) */
function SvwCard() {
  const st = useS();
  const [M] = useUi<SvwState>('svw', SVW0);
  const linked = new Set(st.sessions.filter((x) => x.result && x.result.sid).map((x) => String(x.result!.sid)));
  const list = (M.list || []).filter((a) => !linked.has(a.id));
  return (
    <>
      <div className="eyebrow">Desde Strava</div>
      <p className="sub" style={{ marginTop: 2 }}>
        Tus corridas nuevas se cargan con un toque: distancia, tiempo, FC y parciales. Vos solo marcás cómo te sentiste.
      </p>
      {list.length ? (
        <div style={{ marginTop: 8 }}>
          {list.map((a) => (
            <div key={a.id} className="svw-r">
              <span>
                <b>{dateLabel(a.date)}</b> · {fmt(a.km, 1)} km · {String(a.name).slice(0, 30)}
              </span>
              <button className="btn sm" data-a="sv-go" data-id={a.id} disabled={M.busy} onClick={() => svGo(a.id)}>
                Cargar
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {M.busy && !list.length ? (
        <>
          <div className="skel" style={{ height: 44, margin: '10px 0 0', borderRadius: 12 }}></div>
          <div className="skel" style={{ height: 44, margin: '8px 0 0', borderRadius: 12 }}></div>
        </>
      ) : null}
      <button className="btn blk" style={{ marginTop: 10 }} data-a="svw-load" disabled={M.busy} onClick={() => svwLoad()}>
        {M.busy ? 'Buscando…' : M.list ? 'Buscar de nuevo' : 'Buscar corridas en Strava'}
      </button>
      <p className="hint" role="status" style={{ marginTop: 8 }}>
        {M.busy ? 'Conectando con Strava…' : M.msg || ''}
      </p>
    </>
  );
}

export function PendCard({ pend }: { pend: Session[] }) {
  const st = useS();
  if (!pendCardShown(pend, st.demo)) return null;
  return (
    <section className="card" id="pend-card">
      <div className="h3">Pendientes</div>
      {pend.length ? (
        <>
          {pend.slice(-3).map((s) => (
            <div key={s.id} style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="dot" style={{ background: TYPES[s.type].t }}></span>
                <b>{TYPES[s.type].label}</b>
                <span className="mut" style={{ fontSize: 14 }}>
                  {dateLabel(sdate(s))} · {planSummary(s.plan)}
                </span>
              </div>
              <div className="pend-acts">
                <button className="btn sm pri" data-a="result" data-id={s.id} onClick={() => openSheet('result', { id: s.id })}>
                  Cargar resultado
                </button>
                <button className="btn sm" data-a="mv-open" data-id={s.id} onClick={() => openSheet('move', { id: s.id })}>
                  Mover de día
                </button>
                <button className="btn sm" data-a="miss" data-id={s.id} onClick={() => saveSession({ ...s, missed: true })}>
                  No lo hice
                </button>
              </div>
            </div>
          ))}
          {pend.length > 3 ? (
            <p className="hint" style={{ marginTop: 8 }}>
              Y {pend.length - 3} más anteriores.
            </p>
          ) : null}
        </>
      ) : (
        <p className="sub" style={{ marginTop: 2 }}>
          No tenés sesiones planificadas sin cargar.
        </p>
      )}
      {!st.demo ? (
        <>
          <div className="lane"></div>
          <SvwCard />
        </>
      ) : null}
    </section>
  );
}
