'use client';
/* Ranking: mejores marcas y todas las sesiones hechas ordenadas por el criterio que elijas (viewTop del original). */
import { useEffect } from 'react';
import { setS, useS } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import { demoOn } from '@/lib/data/actions';
import { TYPES, TYPE_KEYS } from '@/lib/domain/config';
import { SORTS } from '@/lib/domain/marks';
import { bandOf, scoreSession } from '@/lib/domain/score';
import { resSummary, type DoneSession } from '@/lib/domain/stats';
import { dateLabel } from '@/lib/domain/util';
import MarksCard from './MarksCard';

export default function TopList() {
  const S = useS();
  const all = S.sessions.filter((s) => s.result) as DoneSession[];
  /* si nunca elegiste orden y no hay puntajes, arranca por fecha */
  const toDate = S.topSort === 'score' && !S.topPicked && !all.some((s) => SORTS.score.f(s) != null);
  useEffect(() => {
    if (toDate) setS({ topSort: 'date' });
  }, [toDate]);

  if (!all.length)
    return (
      <>
        <MarksCard />
        <section className="card">
          <p>Cuando cargues resultados, acá los vas a poder ordenar por puntaje, distancia, ritmo, frecuencia cardíaca o fecha.</p>
          {S.demo ? null : (
            <div style={{ marginTop: 12 }}>
              <button className="btn blk" data-a="demoOn" onClick={demoOn}>
                Ver con datos de ejemplo
              </button>
            </div>
          )}
        </section>
      </>
    );
  const topSort = toDate ? 'date' : SORTS[S.topSort] ? S.topSort : 'date';
  const sk = SORTS[topSort];
  const ctrl = (
    <div className="ctrl">
      <div className="chips">
        {['all', ...TYPE_KEYS].map((k) => (
          <button key={k} className="chip s" data-a="topType" data-v={k} aria-pressed={S.topType === k} onClick={() => setS({ topType: k })}>
            {k === 'all' ? 'Todos' : TYPES[k as keyof typeof TYPES].label}
          </button>
        ))}
      </div>
      <div className="chips">
        {Object.keys(SORTS).map((k) => (
          <button key={k} className="chip s" data-a="topSort" data-v={k} aria-pressed={topSort === k} onClick={() => setS({ topSort: k, topPicked: true, topDir: 'a' })}>
            {SORTS[k].l}
          </button>
        ))}
      </div>
      <button className="btn sm" data-a="topDir" onClick={() => setS({ topDir: S.topDir === 'a' ? 'b' : 'a' })}>
        {(S.topDir === 'a' ? sk.a : sk.b) + ' ⇅'}
      </button>
    </div>
  );
  const list0 = all.filter((s) => S.topType === 'all' || s.type === S.topType).map((s) => ({ s, v: sk.f(s) }));
  const have = list0.filter((x): x is { s: DoneSession; v: number } => x.v != null),
    none = list0.filter((x) => x.v == null);
  const asc = (sk.inv && S.topDir === 'a') || (!sk.inv && S.topDir === 'b');
  have.sort((p, q) => (asc ? p.v - q.v : q.v - p.v));
  const list = [...have, ...none];
  return (
    <>
      <MarksCard />
      {ctrl}
      {!list.length ? (
        <p className="mut">No hay sesiones de este tipo todavía.</p>
      ) : (
        <div className="toplist">
          {list.map((x, i) => {
            const s = x.s,
              sc = scoreSession(s),
              T = TYPES[s.type];
            const pill = sc && sc.score != null ? <span className={'pill b-' + bandOf(sc.score).k}>{sc.score}</span> : <span className="tag">Sin puntaje</span>;
            return (
              <button key={s.id} className="item" data-a="detail" data-id={s.id} onClick={() => openSheet('detail', { id: s.id })}>
                <span className="rank">{i + 1}</span>
                <span className="im">
                  <b>
                    <span className="dot" style={{ background: T.t }}></span>
                    {T.label} · {dateLabel(s.result.date)}
                  </b>
                  <small>{resSummary(s.result) + (s.result.feel ? ' · sensación ' + s.result.feel + '/10' : '')}</small>
                </span>
                {pill}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
