'use client';
/* Análisis → Zapatillas: la principal en grande con su vida útil, cuándo llega al límite (antes o después de la próxima
   carrera) y sus km por mes; las demás con los tests que hiciste con ellas; y para qué usás cada par. Los km son los de
   shoeKm, los mismos de Ajustes y del panel de carga. */
import { Sneaker } from '@phosphor-icons/react';
import { useS } from '@/lib/store';
import type { SessionType, Shoe } from '@/lib/domain/types';
import { TYPES, activeShoes, mainShoe, nextRace } from '@/lib/domain/config';
import { anFrom } from '@/lib/domain/analysis';
import { bestMarks } from '@/lib/domain/marks';
import { SHOE_NEAR, SHOE_WKS, shoeLife, shoeMonths, shoeRuns, shoeUse } from '@/lib/domain/shoes';
import { kmByType } from '@/lib/domain/stats';
import { DF_M, cap, dateLabel, dayDiff, fmt, fmtDur, nf, pd, sum } from '@/lib/domain/util';
import { goShoes } from '@/lib/data/actions';
import { sessionHref } from '@/lib/nav';
import { Button, Chip, Pr, Tag } from '@/components/pista/controls';
import { BrandTitle, MarkList, Panel } from '@/components/pista/structure';
import { Laps, ShareBars } from '@/components/pista/meters';
import { MiniBars } from '@/components/pista/charts';
import { cssVars, typeColor } from '@/components/pista/util';
import { periodLabel, useAnPeriod } from './period';
import { monthOf, plural } from './util';

const STACK: SessionType[] = ['regen', 'fondo', 'tempo', 'series', 'test'];

/** «a principios de diciembre» */
function whenTxt(date: string) {
  const d = pd(date),
    p = d.getDate() <= 10 ? 'principios' : d.getDate() <= 20 ? 'mediados' : 'fines';
  return 'a ' + p + ' de ' + monthOf(d);
}

/** cuánto le queda, cuándo llega al límite y si es antes o después de la próxima carrera */
function lifeNote(z: Shoe) {
  const L = shoeLife(z),
    race = nextRace();
  if (L.left <= 0) return <>Ya pasaron los {nf(z.limitKm)} km que elegiste como límite. Si sentís las piernas más cargadas después de correr, es hora de cambiarlas.</>;
  if (!L.date) return <>En las últimas {SHOE_WKS} semanas no las usaste: no sé cuándo llegan al límite.</>;
  const head = (
    <>
      Con lo que las usás (unos {fmt(L.perWk, 0)} km por semana), llegan a {nf(z.limitKm)} km {whenTxt(L.date)}
    </>
  );
  if (!race) return <>{head}.</>;
  const dd = dayDiff(pd(race.date), pd(L.date));
  return (
    <>
      {head}:{' '}
      <b>
        {dd < 0 ? (dd > -15 ? 'justo antes' : 'antes') : dd < 15 ? 'justo después' : 'después'} del {race.name}
      </b>
      .{dd < 0 ? ' Conviene tener otras para ese día, ya probadas en algún fondo.' : ''}
    </>
  );
}

/** «Desde junio · 92 salidas» */
function sinceTxt(z: Shoe) {
  const u = shoeUse(z);
  return u ? 'Desde ' + monthOf(pd(u.first)) + ' · ' + plural(u.n, 'salida', 'salidas') : 'Sin salidas todavía';
}

function MainShoe({ z, label, from, per }: { z: Shoe; label: string; from: string; per: string }) {
  const L = shoeLife(z),
    f = L.km / z.limitKm,
    M = shoeMonths(z, from);
  return (
    <Panel className="p-c7 p-rise an-shoe" style={cssVars({ '--i': 2 })}>
      <div className="p-st-top">
        <Chip color="var(--ink)" solid>
          {label}
        </Chip>
        <span className="lbl">{sinceTxt(z)}</span>
      </div>
      <BrandTitle as="h2" className="an-shoe-n">
        {z.name}
      </BrandTitle>
      <div className="an-shoe-km">
        <span className="disp">
          {nf(L.km)}
          <span className="p-u">de {nf(z.limitKm)} km</span>
        </span>
        {L.left <= 0 ? <Tag warn>Pasó el límite</Tag> : <Tag warn={f >= SHOE_NEAR}>Quedan {nf(L.left)} km</Tag>}
      </div>
      <Laps value={f} n={40} h={18} gap={3} soft warnFrom={Math.round(SHOE_NEAR * 40)} label={nf(L.km) + ' de ' + nf(z.limitKm) + ' km'} />
      <p className="an-note">{lifeNote(z)}</p>
      <div className="an-sh">
        <h3>Km por mes</h3>
        <span className="lbl">{per}</span>
      </div>
      <MiniBars
        height={150}
        label={'Kilómetros por mes con ' + z.name}
        items={M.map((m) => ({ key: m.m.toISOString(), label: cap(DF_M.format(m.m).replace('.', '')) + ' · ' + nf(m.km), v: m.km, cur: m.cur }))}
      />
    </Panel>
  );
}

function OtherShoe({ z, i }: { z: Shoe; i: number }) {
  const L = shoeLife(z),
    f = L.km / z.limitKm,
    R = shoeRuns(z),
    tests = R.filter((s) => s.type === 'test').slice(-3).reverse(),
    prIds = new Set(bestMarks().map((m) => m.id)),
    bt = kmByType(R),
    top = STACK.slice().sort((a, b) => (bt[b] || 0) - (bt[a] || 0))[0];
  return (
    <Panel className="p-rise an-shoe" style={cssVars({ '--i': 3 + i })}>
      <div className="p-st-top">
        {tests.length ? (
          <Chip color="var(--acc)" solid>
            Carreras
          </Chip>
        ) : R.length ? (
          <Chip type={top} solid />
        ) : null}
        <span className="lbl">{sinceTxt(z)}</span>
      </div>
      <BrandTitle as="h2" className="an-shoe-n sm">
        {z.name}
      </BrandTitle>
      <div className="an-shoe-km">
        <span className="disp">
          {nf(L.km)}
          <span className="p-u">de {nf(z.limitKm)} km</span>
        </span>
        {L.left <= 0 ? <Tag warn>Pasó el límite</Tag> : f >= SHOE_NEAR ? <Tag warn>Quedan {nf(L.left)} km</Tag> : null}
      </div>
      <Laps value={f} n={20} h={10} soft warnFrom={Math.round(SHOE_NEAR * 20)} label={nf(L.km) + ' de ' + nf(z.limitKm) + ' km'} />
      {tests.length ? (
        <div className="an-shoe-marks">
          <MarkList
            label={'Tests con ' + z.name}
            items={tests.map((s) => ({
              key: s.id,
              label: TYPES.test.label + ' · ' + fmt(s.result.distKm, 1) + ' km',
              sub: dateLabel(s.result.date),
              value: (
                <>
                  {fmtDur(s.result.timeSec)}
                  {prIds.has(s.id) ? <Pr /> : null}
                </>
              ),
              href: sessionHref(s.id),
            }))}
          />
        </div>
      ) : null}
    </Panel>
  );
}

/** para qué usás cada par: sus km del período, por tipo */
function UsePanel({ A, from, label, i }: { A: Shoe[]; from: string; label: string; i: number }) {
  const rows = A.map((z) => {
    const R = shoeRuns(z).filter((s) => s.result.date >= from),
      bt = kmByType(R);
    return { z, bt, km: sum(Object.values(bt)) };
  }).filter((r) => r.km > 0);
  const tot = sum(rows.map((r) => r.km));
  return (
    <Panel className="p-rise" style={cssVars({ '--i': i })} title="Para qué las usás" sub={label}>
      {rows.length ? (
        <>
          <ShareBars
            label="Kilómetros de cada par por tipo de sesión"
            items={rows
              .sort((a, b) => b.km - a.km)
              .map((r) => ({
                key: r.z.id,
                label: <span className="an-clip">{r.z.name}</span>,
                v: r.km,
                parts: STACK.map((t) => ({ v: r.bt[t] || 0, c: typeColor(t) })),
                value: nf(r.km) + ' km',
                pct: Math.round((r.km / tot) * 100) + '%',
              }))}
          />
          <p className="an-foot">
            Cada barra, en los colores de los tipos de sesión:{' '}
            {STACK.filter((t) => rows.some((r) => (r.bt[t] || 0) > 0))
              .map((t) => TYPES[t].label.toLowerCase())
              .join(', ')}
            . Las salidas sin zapatillas cargadas no cuentan.
          </p>
        </>
      ) : (
        <p className="an-note">En este período no hay salidas con zapatillas cargadas. Elegilas al registrar cada salida.</p>
      )}
    </Panel>
  );
}

function Empty() {
  return (
    <Panel className="p-c12 an-empty p-rise" style={cssVars({ '--i': 2 })}>
      <Sneaker className="ic" aria-hidden="true" />
      <BrandTitle as="h2">Zapatillas</BrandTitle>
      <p>Cargá tus zapatillas y te llevo los km de cada par, cuándo llegan al límite y para qué las usás. Muchas rinden entre 500 y 800 km; el límite lo elegís vos.</p>
      <Button size="sm" onClick={goShoes}>
        Cargar zapatillas
      </Button>
    </Panel>
  );
}

export default function Zapatillas() {
  useS();
  const [per] = useAnPeriod(),
    from = anFrom(per),
    A = activeShoes();
  if (!A.length)
    return (
      <div className="p-grid">
        <Empty />
      </div>
    );
  /* la principal; si no marcaste ninguna, la que más usás */
  const m = mainShoe(),
    big = m || A.slice().sort((a, b) => shoeLife(b).perWk - shoeLife(a).perWk)[0],
    rest = A.filter((z) => z !== big),
    label = periodLabel(per);
  return (
    <div className="p-grid">
      <MainShoe z={big} label={m ? 'Principal' : 'La que más usás'} from={from} per={label} />
      <div className="p-c5 an-side">
        {rest.map((z, i) => (
          <OtherShoe key={z.id} z={z} i={i} />
        ))}
        <UsePanel A={A} from={from} label={label} i={3 + rest.length} />
      </div>
    </div>
  );
}
