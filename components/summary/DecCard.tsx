'use client';
/* Deriva cardíaca en los fondos, con el cálculo en lote desde Strava (línea 5779 del original). */
import { S, useUi } from '@/lib/store';
import { ChartCard, LineChart, TableTv } from '@/components/charts';
import { TYPES } from '@/lib/domain/config';
import { DEC_UI0, decBackfill, decBand, decEligible, decLine, type DecUi } from '@/lib/domain/dec';
import type { DoneSession } from '@/lib/domain/stats';
import { dateLabel, fmt, pd, sum } from '@/lib/domain/util';

export function DecCard() {
  const sessions = S.sessions;
  const [M] = useUi<DecUi>('dec', DEC_UI0);
  const L = (sessions.filter((q) => q.result && q.result.dec && q.result.dec.p != null) as DoneSession[]).sort((a, b) => a.result.date.localeCompare(b.result.date));
  const pend = sessions.filter((q) => decEligible(q) && !q.result.dec).length;
  const pts = L.map((q) => ({ t: pd(q.result.date).getTime(), v: q.result.dec!.p!, read: dateLabel(q.result.date) + ' · ' + TYPES[q.type].label + ': deriva ' + decLine(q.result.dec!) }));
  let txt = 'Menos de 5% es buena resistencia aeróbica. Más abajo es mejor.';
  if (L.length >= 3) {
    const rec = L.slice(-3),
      av = sum(rec.map((q) => q.result.dec!.p!)) / rec.length,
      bd = decBand({ p: av });
    txt += ' Últimos ' + rec.length + ' fondos: ' + fmt(av, 1) + '% (' + bd.t.toLowerCase() + ').';
  }
  return (
    <ChartCard
      title="Deriva cardíaca en los fondos"
      sub={txt}
      chart={<LineChart id="dec" pts={pts} o={{ ref: 5, refLabel: '5%', yFmt: (v) => fmt(v, 0) + '%', minPad: 1, aria: 'Deriva cardíaca por fondo' }} />}
      table={<TableTv head={['Sesión', 'Deriva']} rows={pts.map((p) => [p.read.split(':')[0], fmt(p.v, 1) + '%'])} />}
      more="La deriva compara tu eficiencia (velocidad por latido) en la primera y la segunda mitad del fondo, sin los primeros 10 minutos. Menos de 5% indica buena resistencia aeróbica; entre 5 y 10% es moderada; arriba de 10% es alta. El calor, la deshidratación o ir cansado la suben."
    >
      <button className="btn blk" style={{ marginTop: 12 }} data-a="dec-run" disabled={M.busy} onClick={() => void decBackfill()}>
        {M.busy ? 'Calculando…' : pend ? 'Calcular ' + pend + ' fondo' + (pend === 1 ? '' : 's') + ' con Strava' : 'Actualizar con Strava'}
      </button>
      <p className="hint" id="dec-note" role="status" style={{ marginTop: 8 }}>
        {M.msg || ''}
      </p>
    </ChartCard>
  );
}
