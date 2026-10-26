'use client';
/* La tabla del Registro: por fecha va agrupada por mes, con los totales de cada mes; ordenada por otra columna, de
   corrido. Planificadas y no hechas van en la misma tabla, en gris. Se dibujan de a LG_PAGE filas. */
import { useMemo, useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import type { Session } from '@/lib/domain/types';
import { LG_PAGE, LG_SORTS, lgHm, lgTotals, type LgInfo, type LgSortKey } from '@/lib/domain/log';
import { DF_MY, cap, fmt, pd, plural } from '@/lib/domain/util';
import { sessionHref } from '@/lib/nav';
import { Button } from '@/components/pista/controls';
import { Table, type Col, type Group } from '@/components/pista/structure';
import { SESSION_COLS_FULL, sessionLabel } from '@/components/pista/session';
import type { RegFilters } from './filters';

/* las columnas que ordenan, con su clave de orden */
const SORT_OF: Record<string, LgSortKey> = { d: 'date', km: 'km', tm: 'time', p: 'pace', hr: 'hr', f: 'feel', sc: 'score' };
const COLS: Col<Session>[] = SESSION_COLS_FULL.map((c) => (SORT_OF[c.key] ? { ...c, sort: SORT_OF[c.key] } : c));

const monthName = (m: string) => cap(DF_MY.format(pd(m + '-15')).replace(' de ', ' '));

function MonthHead({ m, rows }: { m: string; rows: LgInfo[] }) {
  const T = lgTotals(rows),
    plan = rows.filter((q) => q.st === 'plan').length,
    miss = T.n - T.done - plan;
  const rest = [plan ? plural(plan, 'planificada', 'planificadas') : '', miss ? plural(miss, 'no hecha', 'no hechas') : ''].filter(Boolean).join(' · ');
  return (
    <>
      <b>{monthName(m)}</b>
      <span>
        {T.done ? (
          <>
            <span className="mono">{T.done}</span> {T.done === 1 ? 'sesión' : 'sesiones'} · <span className="mono">{fmt(T.km, 1)}</span> km · <span className="mono">{lgHm(T.t)}</span> h
          </>
        ) : null}
        {T.done && rest ? ' · ' : null}
        {rest}
      </span>
    </>
  );
}

export function LogTable({ rows, f, set }: { rows: LgInfo[]; f: RegFilters; set: (patch: Partial<RegFilters>) => void }) {
  /* cuántas se ven: vuelve a la primera tanda cuando cambia lo que se muestra */
  const [n, setN] = useState(LG_PAGE);
  const [seen, setSeen] = useState(rows);
  if (rows !== seen) {
    setSeen(rows);
    setN(LG_PAGE);
  }

  /* los totales de cada mes son de todas sus filas, no solo de las que se ven */
  const byMonth = useMemo(() => {
    const m = new Map<string, LgInfo[]>();
    for (const q of rows) {
      const k = q.d.slice(0, 7);
      const l = m.get(k);
      if (l) l.push(q);
      else m.set(k, [q]);
    }
    return m;
  }, [rows]);

  const shown = rows.slice(0, n);
  const list: (Session | Group)[] = [];
  let cur = '';
  for (const q of shown) {
    const k = q.d.slice(0, 7);
    if (f.sort === 'date' && k !== cur) list.push({ key: (cur = k), group: <MonthHead m={k} rows={byMonth.get(k)!} /> });
    list.push(q.s);
  }
  const rest = rows.length - shown.length,
    next = Math.min(rest, LG_PAGE);
  return (
    <>
      <Table
        cols={COLS}
        rows={list}
        rowKey={(s) => s.id}
        href={(s) => sessionHref(s.id)}
        goLabel={sessionLabel}
        dim={(s) => !s.result}
        sort={{ by: f.sort, dir: f.dir, onSort: (k) => (k === f.sort ? set({ dir: f.dir === 1 ? -1 : 1 }) : set({ sort: k as LgSortKey, dir: LG_SORTS[k as LgSortKey][2] })) }}
        label="Todas las sesiones"
      />
      {rest ? (
        <div className="reg-more">
          <Button size="sm" variant="ghost" onClick={() => setN(n + LG_PAGE)}>
            {'Ver ' + plural(next, 'sesión más', 'sesiones más') + (next < rest ? ' (quedan ' + rest + ')' : '')}
            <CaretDown aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </>
  );
}
