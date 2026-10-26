'use client';
/* Resumen: de un vistazo, preparación para la carrera y los gráficos por sub-pestaña (líneas 2608–2662 del original). */
import type { ReactNode } from 'react';
import { setS, useS } from '@/lib/store';
import { demoOn } from '@/lib/data/actions';
import { TYPES, TYPE_KEYS, isType, nextRace, racePaceSec, refRace } from '@/lib/domain/config';
import { keyPace } from '@/lib/domain/score';
import { doneList, effPoints, kmBetween, monthSeries, streakInfo, typeParts, typeRead, weekSeries, monthNow } from '@/lib/domain/stats';
import type { SessionType } from '@/lib/domain/types';
import { DF_M, DF_MY, addDays, cap, dShort, dateLabel, fmt, fmtPace, mondayOf, pd, sod, sum, ymd } from '@/lib/domain/util';
import { CountUp } from '@/components/ui/CountUp';
import { Spark, SumTile } from '@/components/ui/glance';
import { BarChart, ChartCard, Legend, LineChart, TableTv, type BarItem } from '@/components/charts';
import { ReadyCard } from '@/components/summary/ReadyCard';
import { PredictCard } from '@/components/summary/PredictCard';
import { LoadCard } from '@/components/summary/LoadCard';
import { FormCard } from '@/components/summary/FormCard';
import { HrPaceCard } from '@/components/summary/HrPaceCard';
import { IntensityCard } from '@/components/summary/IntensityCard';
import { ZonesCard } from '@/components/summary/ZonesCard';
import { EstCard } from '@/components/summary/EstCard';
import { DecCard } from '@/components/summary/DecCard';
import { ShoesCard } from '@/components/summary/ShoesCard';
import { SubTabs } from '@/components/ui/SubTabs';

type Sub = 'vol' | 'ritmo' | 'forma';
const SUBS: [Sub, string][] = [
  ['vol', 'Volumen'],
  ['ritmo', 'Ritmo'],
  ['forma', 'Forma y carga'],
];

function goSub(v: Sub) {
  setS({ sumSub: v });
  try {
    localStorage.setItem('rr_sumsub', v);
  } catch {
    /* sin almacenamiento */
  }
}

/* «Kilómetros por semana / por mes» llevan la leyenda de los tipos usados y la tabla */
function KmChart({ id, title, sub, items, unit, keys }: { id: string; title: string; sub: string; items: BarItem[]; unit: string; keys: SessionType[] }) {
  return (
    <ChartCard
      title={title}
      sub={sub}
      chart={<BarChart id={id} items={items} unit={unit} after={<Legend keys={keys} />} />}
      table={<TableTv head={[id === 'wk' ? 'Semana' : 'Mes', 'Km']} rows={items.map((i) => [i.read.split(':')[0], fmt(i.value, 1)])} />}
    />
  );
}

export default function SummaryView() {
  const st0 = useS();
  const d = doneList();
  if (!d.length)
    return (
      <section className="card">
        <div className="h3">Todavía no hay entrenamientos</div>
        <p>Cuando cargues tu primer resultado vas a ver acá tus kilómetros, el ritmo, la racha y los gráficos.</p>
        {st0.demo ? null : (
          <div style={{ marginTop: 12 }}>
            <button className="btn blk" data-a="demoOn" onClick={demoOn}>
              Ver con datos de ejemplo
            </button>
          </div>
        )}
      </section>
    );
  const today = sod(new Date()),
    tS = ymd(today),
    wkKm = kmBetween(mondayOf(today), today);
  const { km: mKm, count: mN } = monthNow();
  const st = streakInfo(),
    totKm = sum(d.map((s) => s.result.distKm));
  /* de un vistazo: una idea por tarjeta, con un mini gráfico donde suma */
  const wkDays = [0, 1, 2, 3, 4, 5, 6].map((k) => {
    const dd = ymd(addDays(mondayOf(today), k));
    return { v: sum(d.filter((x) => x.result.date === dd).map((x) => x.result.distKm)), cur: dd === tS, fut: dd > tS };
  });
  const M6 = monthSeries(6).map((m) => ({ v: m.km, cur: m.cur }));
  const W8 = weekSeries(8).map((w) => ({ v: w.km, cur: w.cur }));
  const sub: Sub = SUBS.some((q) => q[0] === st0.sumSub) ? (st0.sumSub as Sub) : 'vol';

  /* solo se arman los gráficos de la sub-pestaña abierta */
  let cards: ReactNode;
  if (sub === 'vol') {
    const usedT = TYPE_KEYS.filter((k) => d.some((s) => s.type === k));
    const wItems: BarItem[] = weekSeries(12).map((w) => ({
      label: w.start.getDate() + '/' + (w.start.getMonth() + 1),
      value: Math.round(w.km * 10) / 10,
      cur: w.cur,
      parts: typeParts(w.bt),
      read: 'Semana del ' + dShort(w.start) + ' al ' + dShort(w.end) + ': ' + fmt(w.km, 1) + ' km en ' + w.count + ' ' + (w.count === 1 ? 'sesión' : 'sesiones') + typeRead(w.bt) + (w.cur ? ' · en curso' : ''),
    }));
    const mItems: BarItem[] = monthSeries(12).map((m) => ({
      label: cap(DF_M.format(m.m).replace(/\./g, '')),
      value: Math.round(m.km * 10) / 10,
      cur: m.cur,
      parts: typeParts(m.bt),
      read: cap(DF_MY.format(m.m)) + ': ' + fmt(m.km, 1) + ' km en ' + m.count + ' ' + (m.count === 1 ? 'sesión' : 'sesiones') + typeRead(m.bt) + (m.cur ? ' · mes en curso' : ''),
    }));
    cards = (
      <>
        <KmChart id="wk" title="Kilómetros por semana" sub="De lunes a domingo, por tipo de sesión. La más clara está en curso." items={wItems} unit="kilómetros por semana" keys={usedT} />
        <KmChart id="mo" title="Kilómetros por mes" sub="Por tipo de sesión. El mes más claro está en curso." items={mItems} unit="kilómetros por mes" keys={usedT} />
        <IntensityCard />
        <ShoesCard />
      </>
    );
  } else if (sub === 'ritmo') {
    /* sin tipo elegido, el más frecuente */
    const counts: Partial<Record<SessionType, number>> = {};
    d.forEach((s) => {
      counts[s.type] = (counts[s.type] || 0) + 1;
    });
    const paceType = st0.paceType || (Object.keys(counts) as SessionType[]).sort((a, b) => counts[b]! - counts[a]!)[0];
    const pt = paceType === 'all' ? d : d.filter((s) => s.type === paceType);
    const pPts = pt.map((s) => ({
      t: pd(s.result.date).getTime(),
      v: keyPace(s),
      c: TYPES[s.type].t,
      read: dateLabel(s.result.date) + ' · ' + TYPES[s.type].label + ': ' + fmtPace(keyPace(s)) + '/km' + (s.result.mainPaceSec ? ' en la parte principal' : '') + ' · ' + fmt(s.result.distKm, 1) + ' km',
    }));
    const nr = nextRace(),
      r10 = nr && nr.targetSec > 0 ? nr : refRace();
    const chips = (
      <div className="chips" style={{ margin: '10px 0 4px' }}>
        {['all' as const, ...TYPE_KEYS].map((k) => (
          <button key={k} className="chip s" data-a="paceType" data-v={k} aria-pressed={paceType === k} onClick={() => setS({ paceType: k })}>
            {k === 'all' ? 'Todos' : TYPES[k].label}
          </button>
        ))}
      </div>
    );
    cards = (
      <>
        <ChartCard
          title="Evolución del ritmo"
          sub="Más arriba es más rápido. Cada punto lleva el color de su tipo de sesión."
          extra={chips}
          chart={
            <LineChart
              key={paceType}
              id="pace"
              pts={pPts}
              o={{
                invert: true,
                yFmt: fmtPace,
                minPad: 5,
                color: paceType !== 'all' && isType(paceType) ? TYPES[paceType].t : null,
                aria: 'Ritmo promedio por sesión',
                ref: racePaceSec(r10),
                refLabel: 'objetivo ' + r10.name + ' ' + fmtPace(racePaceSec(r10)),
              }}
            />
          }
          table={<TableTv head={['Sesión', 'Ritmo']} rows={pPts.map((p) => [p.read.split(':')[0], fmtPace(p.v) + '/km'])} />}
        />
        <PredictCard />
        <EstCard />
        <ZonesCard />
      </>
    );
  } else {
    // eficiencia
    const eff = effPoints();
    const ePts = eff.map((e) => ({
      t: e.t,
      v: e.v,
      read:
        dateLabel(e.s.result.date) +
        ' · ' +
        TYPES[e.s.type].label +
        ': eficiencia ' +
        fmt(e.v, 2) +
        ' (' +
        fmtPace(e.s.result.paceSec) +
        '/km con ' +
        e.s.result.hrAvg +
        ' lpm)' +
        (e.s.result.weather === 'Calor' || e.s.result.weather === 'Mucho calor' ? ' · con calor' : ''),
    }));
    let etxt = 'Metros por latido en fondos y regenerativos. Más arriba es mejor.';
    if (eff.length >= 4) {
      const h2 = Math.floor(eff.length / 2),
        a = sum(eff.slice(0, h2).map((e) => e.v)) / h2,
        b = sum(eff.slice(-h2).map((e) => e.v)) / h2,
        pc = (b / a - 1) * 100;
      etxt += ' ' + (pc > 1.5 ? 'Venís mejorando: ' + fmt(pc, 1) + '% más eficiente.' : pc < -1.5 ? 'Bajó un ' + fmt(-pc, 1) + '%.' : 'Venís estable.');
    }
    cards = (
      <>
        <HrPaceCard />
        <FormCard />
        <LoadCard />
        <ChartCard
          title="Eficiencia aeróbica"
          sub={etxt}
          chart={<LineChart id="eff" pts={ePts} o={{ invert: false, yFmt: (v) => fmt(v, 2), minPad: 0.02, aria: 'Eficiencia aeróbica por sesión' }} />}
          table={<TableTv head={['Sesión', 'Eficiencia']} rows={ePts.map((p) => [p.read.split(':')[0], fmt(p.v, 2)])} />}
          more="Mide cuántos metros por minuto avanzás por cada latido. Si sube con el tiempo, tu corazón rinde mejor. Si baja, puede ser calor, cansancio o ritmos más exigentes. Usa solo fondos y regenerativos."
        />
        <DecCard />
      </>
    );
  }

  return (
    <>
      <div className="glance sum-gl">
        <SumTile
          ic="week"
          c="var(--accent)"
          t="Esta semana"
          v={
            <span className="gl-v">
              <CountUp v={Math.round(wkKm * 10) / 10} d={1} />
              <small>km</small>
            </span>
          }
          viz={<Spark a={wkDays} c="var(--accent)" />}
          sub="Lun a dom"
        />
        <SumTile
          ic="form"
          c="var(--info)"
          t="Este mes"
          v={
            <span className="gl-v">
              <CountUp v={Math.round(mKm * 10) / 10} d={1} />
              <small>km</small>
            </span>
          }
          viz={<Spark a={M6} c="var(--info)" />}
          sub={mN + (mN === 1 ? ' entrenamiento' : ' entrenamientos')}
        />
        <SumTile
          ic="pend"
          c="var(--t3)"
          t="Entrenamientos"
          v={
            <span className="gl-v">
              <CountUp v={d.length} />
            </span>
          }
          viz={<Spark a={W8} c="var(--t3)" />}
          sub={fmt(totKm, 0) + ' km en total'}
        />
        <SumTile
          ic="streak"
          c="var(--serious)"
          t="Racha"
          v={
            <span className="gl-v">
              <CountUp v={st.cur} />
              <small>{st.cur === 1 ? 'semana' : 'semanas'}</small>
            </span>
          }
          viz={
            <span className="gl-dots">
              {Array.from({ length: st.goal }, (_, k) => (
                <i key={k} className={k < st.thisWeek ? 'on' : ''}></i>
              ))}
            </span>
          }
          sub={st.thisWeek + ' de ' + st.goal + ' esta semana · mejor ' + st.best}
        />
      </div>
      <ReadyCard />
      <SubTabs label="Secciones del resumen" value={sub} items={SUBS} onPick={(v) => goSub(v as Sub)} act="sumSub" />
      <div className="grid2">{cards}</div>
    </>
  );
}
