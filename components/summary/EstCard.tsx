/* Tu 10K estimado, sesión a sesión (línea 4389 del original). */
import { ChartCard, LineChart, TableTv } from '@/components/charts';
import { refRace } from '@/lib/domain/config';
import { dateLabel, fmtDur, pd, todayS } from '@/lib/domain/util';
import { lvCandAll, type LvCand } from '@/lib/domain/level';

export function EstCard() {
  const C = lvCandAll(false).filter((c) => c.k !== 'tempo');
  if (!C.length) return null;
  const by: Record<string, LvCand> = {};
  C.forEach((c) => {
    if (!by[c.date] || c.sec < by[c.date].sec) by[c.date] = c;
  });
  const L = Object.keys(by)
    .sort()
    .map((k) => by[k]);
  const pts = L.map((c) => ({ t: pd(c.date).getTime(), v: c.sec, read: dateLabel(c.date) + ' · 10K estimado ' + fmtDur(c.sec) + ' desde ' + c.txt.replace(/^tu |^tus /, '') }));
  const r = refRace();
  return (
    <ChartCard
      title="Tu 10K estimado"
      sub="Desde cada sesión de series o test. Más arriba es más rápido."
      chart={
        <LineChart
          id="est"
          pts={pts}
          o={{ invert: true, yFmt: fmtDur, minPad: 30, aria: '10K estimado por sesión', ref: r && r.km === 10 && r.date >= todayS() ? r.targetSec : null, refLabel: r ? 'objetivo ' + fmtDur(r.targetSec) : '' }}
        />
      }
      table={<TableTv head={['Sesión', '10K estimado']} rows={pts.map((p) => [p.read.split(' · ')[0], fmtDur(p.v)])} />}
    />
  );
}
