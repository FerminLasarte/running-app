'use client';
/* Registro: todas las sesiones como base de datos (viewLog / lgList / lgRow del original).
   El buscador queda fuera de la lista: al tipear solo se vuelve a dibujar la lista y no pierde el foco. */
import { Fragment, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { S, useS, useUi } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import { blockDemo, toast } from '@/lib/data/actions';
import { TYPES, TYPE_KEYS } from '@/lib/domain/config';
import { bandOf } from '@/lib/domain/score';
import { LG_INIT, LG_PAGE, LG_SORTS, LG_SORT_KEYS, LG_ST, lgCsv, lgHours, lgRows, lgSt, lgTotals, type LgInfo, type LgSortKey, type LgState } from '@/lib/domain/log';
import { planSummary } from '@/lib/domain/stats';
import { cap, DF_MY, fmt, fmtDur, fmtPace, pd, todayS, WD } from '@/lib/domain/util';

const HD: Record<string, string> = { km: 'Km', time: 'Tiempo', pace: 'Ritmo', hr: 'FC', feel: 'Sens.', score: 'Puntaje' };

/* descarga un archivo de texto (en la web no está el `downloads` de claude.ai) */
function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCsv(L: LgState) {
  if (blockDemo()) return;
  if (!S.sessions.length) {
    toast('Todavía no hay datos para exportar.');
    return;
  }
  download(lgCsv(L), 'registro-' + todayS() + '.csv');
  toast('Archivo listo');
}

function LgRow({ q }: { q: LgInfo }) {
  const x = q.s,
    T = TYPES[x.type],
    d = pd(q.d),
    r = x.result;
  const pill =
    q.sc != null ? (
      <span className={'pill b-' + bandOf(q.sc).k}>{q.sc}</span>
    ) : q.st === 'plan' ? (
      <span className="tag">{q.d < todayS() ? 'Falta cargar' : 'Pendiente'}</span>
    ) : q.st === 'miss' ? (
      <span className="tag">No hecha</span>
    ) : (
      <span className="mut">–</span>
    );
  const kmH: ReactNode =
    q.km > 0 ? (
      <>
        {fmt(q.km, q.km < 10 ? 2 : 1)}
        <small>km</small>
      </>
    ) : (
      '–'
    );
  const sub = r ? [fmtDur(q.t), q.p ? fmtPace(q.p) + '/km' : '', q.hr ? 'FC ' + q.hr : ''].filter(Boolean).join(' · ') : x.plan ? planSummary(x.plan) : '';
  return (
    <button className={'lg-r ' + q.st} style={{ '--tc': T.t } as CSSProperties} data-a="detail" data-id={x.id} onClick={() => openSheet('detail', { id: x.id })}>
      <span className="lg-d">
        <b>{d.getDate()}</b>
        <small>{WD[(d.getDay() + 6) % 7]}</small>
      </span>
      <span className="lg-t">
        <b>
          {T.label}
          {r && r.pain ? (
            <>
              {' '}
              <i className="lg-pain" title="Con molestia">
                •
              </i>
            </>
          ) : null}
        </b>
        <span className="lg-sub">{sub}</span>
        {q.txt ? <small>{q.txt}</small> : null}
      </span>
      <span className="lg-k">
        <span className="km">{kmH}</span>
        {pill}
      </span>
      <span className="lg-c km">{kmH}</span>
      <span className="lg-c">{q.t ? fmtDur(q.t) : '–'}</span>
      <span className="lg-c">{q.p ? fmtPace(q.p) : '–'}</span>
      <span className="lg-c">{q.hr || '–'}</span>
      <span className="lg-c">{q.feel || '–'}</span>
      <span className="lg-c sc">{pill}</span>
    </button>
  );
}

function LgList({ L, set }: { L: LgState; set: (p: Partial<LgState>) => void }) {
  const R = lgRows(L),
    T = lgTotals(R);
  const tot = (
    <div className="lg-sum">
      <span>
        <b>{T.n}</b> {T.n === 1 ? 'sesión' : 'sesiones'}
      </span>
      {T.done ? (
        <>
          <span>
            <b>{fmt(T.km, 1)}</b> km
          </span>
          <span>
            <b>{lgHours(T.t)}</b> corriendo
          </span>
          {T.p ? (
            <span>
              ritmo medio <b>{fmtPace(T.p)}/km</b>
            </span>
          ) : null}
          {T.hr ? (
            <span>
              FC media <b>{Math.round(T.hr)}</b>
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
  if (!R.length)
    return (
      <>
        {tot}
        <section className="card">
          <p className="mut">
            No hay sesiones con esos filtros.{L.q ? ' Probá con otra búsqueda.' : ''}
          </p>
        </section>
      </>
    );
  const sortBy = (k: LgSortKey) => (L.sort === k ? set({ dir: L.dir === 1 ? -1 : 1, n: LG_PAGE }) : set({ sort: k, dir: LG_SORTS[k][2], n: LG_PAGE }));
  const hd = (
    <div className="lg-hd">
      <span></span>
      <span>Sesión</span>
      {(['km', 'time', 'pace', 'hr', 'feel', 'score'] as LgSortKey[]).map((k) => (
        <button key={k} data-a="lg-sort" data-v={k} className={L.sort === k ? 'on' : ''} onClick={() => sortBy(k)}>
          {HD[k] + (L.sort === k ? (L.dir < 0 ? ' ↓' : ' ↑') : '')}
        </button>
      ))}
    </div>
  );
  const V = R.slice(0, L.n);
  let body: ReactNode;
  if (L.sort === 'date') {
    /* por mes, con los totales de cada mes (calculados sobre todas las filas filtradas, no solo las visibles) */
    const by: Record<string, LgInfo[]> = {};
    R.forEach((q) => {
      const m = q.d.slice(0, 7);
      (by[m] = by[m] || []).push(q);
    });
    const seen: string[] = [];
    V.forEach((q) => {
      const m = q.d.slice(0, 7);
      if (seen.indexOf(m) < 0) seen.push(m);
    });
    body = seen.map((m) => {
      const MT = lgTotals(by[m]),
        rows = V.filter((q) => q.d.slice(0, 7) === m);
      return (
        <Fragment key={m}>
          <div className="lg-m">
            <b>{cap(DF_MY.format(pd(m + '-15')))}</b>
            <small>{MT.n + ' ' + (MT.n === 1 ? 'sesión' : 'sesiones') + (MT.done ? ' · ' + fmt(MT.km, 1) + ' km · ' + lgHours(MT.t) : '')}</small>
          </div>
          <div className="lg-list">
            {hd}
            {rows.map((q) => (
              <LgRow key={q.s.id} q={q} />
            ))}
          </div>
        </Fragment>
      );
    });
  } else
    body = (
      <div className="lg-list">
        {hd}
        {V.map((q) => (
          <LgRow key={q.s.id} q={q} />
        ))}
      </div>
    );
  return (
    <>
      {tot}
      {body}
      {R.length > L.n ? (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button className="btn" data-a="lg-more" onClick={() => set({ n: L.n + LG_PAGE })}>
            Ver más ({R.length - L.n} más)
          </button>
        </div>
      ) : null}
    </>
  );
}

export default function LogView() {
  const st = useS();
  const [L, set] = useUi<LgState>('lg', LG_INIT);
  const qRef = useRef<HTMLInputElement>(null);

  /* atajo en la compu: «/» busca en el Registro */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || S.sheet) return;
      const tg = e.target as HTMLElement | null;
      if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
      if (qRef.current) {
        e.preventDefault();
        qRef.current.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!st.sessions.length)
    return (
      <section className="card">
        <div className="h3">Todavía no hay sesiones</div>
        <p>Cuando planifiques o cargues tu primera salida, acá vas a tener la lista completa para buscar, filtrar y exportar.</p>
      </section>
    );
  const cnt = (k: string) => st.sessions.filter((x) => k === 'all' || lgSt(x) === k).length;
  const used = TYPE_KEYS.filter((k) => st.sessions.some((x) => x.type === k));
  /* fila 1: buscar + ordenar + exportar · fila 2: estado y tipos (en la compu, cada fila en una línea) */
  return (
    <>
      <section className="card lg-tools">
        <div className="lg-row1">
          <div className="lg-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M20 20l-4.2-4.2" />
            </svg>
            <input ref={qRef} className="in" type="search" id="lg-q" placeholder="Buscar en notas, mes, clima…" value={L.q} aria-label="Buscar sesiones" autoComplete="off" onChange={(e) => set({ q: e.target.value, n: LG_PAGE })} />
          </div>
          <div className="lg-sort">
            <label className="lg-selw">
              <span className="sr">Ordenar por</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5" />
              </svg>
              <select
                id="lg-sort"
                value={L.sort}
                onChange={(e) => {
                  const k = e.target.value as LgSortKey;
                  set({ sort: k, dir: LG_SORTS[k][2], n: LG_PAGE });
                }}
              >
                {LG_SORT_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {LG_SORTS[k][0]}
                  </option>
                ))}
              </select>
            </label>
            <button className="ibtn lg-dir" data-a="lg-dir" aria-label={L.dir < 0 ? 'De mayor a menor' : 'De menor a mayor'} onClick={() => set({ dir: L.dir === 1 ? -1 : 1 })}>
              {L.dir < 0 ? '↓' : '↑'}
            </button>
            <button className="btn sm lg-exp" data-a="lg-csv" title="Exportar lo que estás viendo" onClick={() => exportCsv(L)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14" />
              </svg>
              CSV
            </button>
          </div>
        </div>
        <div className="lg-row2">
          <div className="seg subtabs lg-st" role="tablist" aria-label="Estado">
            {LG_ST.map((q) => (
              <button key={q[0]} className="chip" data-a="lg-st" data-v={q[0]} aria-pressed={L.st === q[0]} title={cnt(q[0]) + ' sesiones'} onClick={() => set({ st: q[0], n: LG_PAGE })}>
                {q[1]}
              </button>
            ))}
          </div>
          <div className="chips lg-types">
            <button className="chip s" data-a="lg-type" data-v="all" aria-pressed={L.type === 'all'} onClick={() => set({ type: 'all', n: LG_PAGE })}>
              Todos
            </button>
            {used.map((k) => (
              <button key={k} className="chip s" data-a="lg-type" data-v={k} aria-pressed={L.type === k} style={{ '--tc': TYPES[k].t } as CSSProperties} onClick={() => set({ type: k, n: LG_PAGE })}>
                <i className="lg-dot"></i>
                {TYPES[k].label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <div id="lg-out">
        <LgList L={L} set={set} />
      </div>
    </>
  );
}
