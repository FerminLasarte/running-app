'use client';
/* Registro: todas las sesiones. Los totales de lo que estás viendo → los filtros (tipo con su cantidad, búsqueda con
   «/», estado y período, todos en la URL) → la tabla agrupada por mes, con planificadas y no hechas en la misma tabla.
   Arriba, exportar lo que estás viendo y traer la salida de Strava. Sin sesiones, el estado vacío del boceto. */
import '@/app/styles/screens/registro.css';
import { useMemo } from 'react';
import { ArrowsClockwise, DownloadSimple, Plus, Rows } from '@phosphor-icons/react';
import type { SessionType } from '@/lib/domain/types';
import { useApp } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import { doExport } from '@/lib/data/backup';
import { LG_INIT, LG_PERIODS, lgCsv, lgFrom, lgHm, lgRows, lgScoreAvg, lgTotals, type LgInfo } from '@/lib/domain/log';
import { fmt, fmtPace, nf, todayS } from '@/lib/domain/util';
import { Button } from '@/components/pista/controls';
import { EmptyPanel, Kpis, PageHead, Panel } from '@/components/pista/structure';
import { cssVars } from '@/components/pista/util';
import { useStravaStatus } from '@/components/shell/useStravaStatus';
import { REG_INIT, useRegFilters, type RegFilters } from './filters';
import { FilterBar } from './FilterBar';
import { LogTable } from './LogTable';

function Totals({ rows, f }: { rows: LgInfo[]; f: RegFilters }) {
  const T = lgTotals(rows),
    sc = lgScoreAvg(rows);
  return (
    <div className="reg-tot p-rise" style={cssVars({ '--i': 1 })}>
      <Kpis
        items={[
          {
            label: f.per === 'todo' ? 'Todo el registro' : LG_PERIODS.find((p) => p[0] === f.per)![1],
            value: nf(T.n),
            unit: T.n === 1 ? 'sesión' : 'sesiones',
            note: T.n > T.done ? T.done + ' hechas' : undefined,
          },
          { label: 'Distancia', value: T.km >= 100 ? nf(T.km) : fmt(T.km, 1), unit: 'km' },
          { label: 'Tiempo', value: lgHm(T.t), unit: 'h' },
          { label: 'Ritmo medio', value: fmtPace(T.p), unit: T.p ? '/km' : undefined },
          { label: 'Puntaje medio', value: sc == null ? '–' : Math.round(sc) },
        ]}
      />
    </div>
  );
}

/** sin ninguna sesión (y sin datos de ejemplo): qué va a aparecer acá y cómo empezar */
function Empty() {
  return (
    <EmptyPanel
      icon={Rows}
      title="Registro"
      text="Acá van a quedar todas tus salidas, con su estructura, su puntaje y la deriva. Vas a poder buscarlas, filtrarlas y exportarlas."
      className="reg-empty"
      style={cssVars({ '--i': 1 })}
    >
      <div className="reg-ghost" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <Button size="sm" icon={Plus} iconWeight="bold" onClick={() => openSheet('result', { id: null })}>
        Registrar la primera
      </Button>
    </EmptyPanel>
  );
}

/** los filtros no dejan ninguna */
function NoMatch({ set }: { set: (patch: Partial<RegFilters>) => void }) {
  return (
    <div className="reg-none" role="status">
      <b>Nada por acá</b>
      <p>No hay sesiones que coincidan. Probá con otro tipo o borrá la búsqueda.</p>
      <Button size="sm" onClick={() => set({ tipo: REG_INIT.tipo, q: REG_INIT.q, estado: REG_INIT.estado, per: REG_INIT.per })}>
        Ver todas
      </Button>
    </div>
  );
}

export default function Registro() {
  const sessions = useApp((s) => s.sessions);
  const strava = useStravaStatus();
  /* probando sin cuenta no se ofrece exportar */
  const guest = useApp((s) => s.mode === 'guest');
  const [f, set] = useRegFilters();

  /* todo menos el tipo: de acá salen la cantidad de cada tipo y, filtrando el tipo, las filas */
  const base = useMemo(() => {
    const from = lgFrom(f.per),
      R = lgRows({ ...LG_INIT, q: f.q, type: 'all', st: f.estado, sort: f.sort, dir: f.dir });
    return from ? R.filter((q) => q.d >= from) : R;
    // lgRows lee las sesiones del estado: se recalcula cuando cambian
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, f.q, f.estado, f.per, f.sort, f.dir]);
  const rows = useMemo(() => (f.tipo === 'all' ? base : base.filter((q) => q.s.type === f.tipo)), [base, f.tipo]);
  const counts = useMemo(() => {
    const c: Partial<Record<SessionType, number>> = {};
    for (const q of base) c[q.s.type] = (c[q.s.type] || 0) + 1;
    return c;
  }, [base]);

  if (!sessions.length)
    return (
      <div className="reg">
        <PageHead eyebrow="Todas tus sesiones" title="Registro" />
        <Empty />
      </div>
    );
  return (
    <div className="reg">
      <PageHead
        eyebrow="Todas tus sesiones"
        title="Registro"
        actions={
          <>
            {guest ? null : (
              <Button icon={DownloadSimple} title="Exportar lo que estás viendo" onClick={() => doExport('csv', { text: lgCsv(rows), name: 'registro-' + todayS() + '.csv' })}>
                Exportar CSV
              </Button>
            )}
            {strava?.connected ? (
              <Button icon={ArrowsClockwise} onClick={() => openSheet('result', { id: null, svLoad: true })}>
                Traer de Strava
              </Button>
            ) : null}
          </>
        }
      />
      <Totals rows={rows} f={f} />
      <FilterBar f={f} set={set} counts={counts} all={base.length} />
      <Panel className="tw p-rise" style={cssVars({ '--i': 3 })} flush>
        {rows.length ? <LogTable rows={rows} f={f} set={set} /> : <NoMatch set={set} />}
      </Panel>
    </div>
  );
}
