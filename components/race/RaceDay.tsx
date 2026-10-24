'use client';
/* Día de carrera: cuenta regresiva, plan de ritmos, el día hora por hora y la lista de pendientes
   (viewRaceDay, líneas 3125–3165 del original; acciones rsel, rcopy y rck). */
import type { CSSProperties } from 'react';
import { S, setUi, useApp, useS } from '@/lib/store';
import { blockDemo, goRaces, saveCfg, toast } from '@/lib/data/actions';
import type { Race } from '@/lib/domain/types';
import { isLong } from '@/lib/domain/config';
import { racePhases, raceScen, raceSplits, rcItems, type RaceScen } from '@/lib/domain/race';
import { cleanObj, dayDiff, fmt, fmtDur, fmtPace, pad, pd, sod } from '@/lib/domain/util';
import { raceDateLabel } from '@/lib/domain/week';
import { CountUp } from '@/components/ui/CountUp';
import { TrainEst } from './TrainEst';

const cssVars = (o: Record<string, string>) => o as CSSProperties;
const RC_GROUPS: [number, string][] = [
  [28, 'Cuatro semanas antes'],
  [14, 'Dos semanas antes'],
  [7, 'Una semana antes'],
  [5, 'Cinco días antes'],
  [3, 'Tres días antes'],
  [2, 'Dos días antes'],
  [1, 'El día antes'],
  [0, 'El día de la carrera'],
];

/** el escenario elegido: el que tocaste, o el realista, o el primero */
const pickScen = (sc: RaceScen[], rsel: string | undefined) => sc.find((x) => x.id === rsel) || sc.find((x) => x.id === 'real') || sc[0];

function copyPlan(race: Race, sel: RaceScen) {
  const sp = raceSplits(sel.sec, race.km);
  const txt = race.name + ' · ' + fmtDur(sel.sec) + ' (' + sel.n + ')\n' + sp.map((r) => 'Km ' + fmt(r.km, r.km % 1 ? 2 : 0) + ': ' + fmtPace(r.pace) + ' · ' + fmtDur(r.cum)).join('\n');
  try {
    navigator.clipboard.writeText(txt).then(
      () => toast('Plan copiado'),
      () => toast('No pude copiar. Sacale una captura a la tabla.'),
    );
  } catch {
    toast('No pude copiar. Sacale una captura a la tabla.');
  }
}

function toggleCheck(raceId: string, item: string, on: boolean) {
  if (blockDemo()) return;
  const c = cleanObj(S.cfg);
  c.rcs = c.rcs || {};
  const m = (c.rcs[raceId] = (c.rcs[raceId] as Record<string, number>) || {}) as Record<string, number>;
  if (on) m[item] = 1;
  else delete m[item];
  saveCfg(c);
}

export function RaceDay({ race }: { race: Race }) {
  const { cfg } = useS();
  const rsel = useApp((st) => st.ui.rsel as string | undefined);
  const days = dayDiff(sod(new Date()), pd(race.date)),
    long = isLong(race),
    K = race.km,
    ph = racePhases(K);
  const T = race.time || '',
    tm = T.split(':'),
    t0 = +tm[0] * 60 + +tm[1];
  const hh = (m: number) => {
    m = ((m % 1440) + 1440) % 1440;
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  };
  const sc = raceScen(race),
    sel = pickScen(sc, rsel);
  const hm = cfg.hrMax,
    z = (f: number) => Math.round(hm * f),
    rc = ((cfg.rcs || {})[race.id] || {}) as Record<string, number>,
    w = Math.floor(days / 7);
  const goRacesBtn = (
    <button className="btn sm" style={{ marginTop: 10 }} data-a="goRaces" onClick={goRaces}>
      Ir a mis carreras
    </button>
  );
  const fuel = long ? <div className="lv-box">Tomá un gel o carbohidratos cada 30 a 45 minutos desde el km 8 a 10, como lo hayas practicado en las tiradas largas, y agua en los puestos.</div> : null;
  const I = rcItems(race),
    done = I.filter((x) => rc[x[2]]).length;

  let plan;
  if (!sel)
    plan = (
      <section className="card">
        <div className="h3">Plan de ritmos</div>
        <p>Cargá un tiempo objetivo para esta carrera en Ajustes, o registrá un test, y acá armo el plan de ritmos.</p>
        {goRacesBtn}
      </section>
    );
  else {
    const sp = raceSplits(sel.sec, K),
      mx = Math.max(...sp.map((q) => q.pace)),
      mn = Math.min(...sp.map((q) => q.pace));
    const half = Math.round(K / 2),
      rows = K > 21.2 ? sp.filter((r, i) => r.km % 5 === 0 || i === sp.length - 1 || r.km === 21) : sp;
    const teScen = sc.find((x) => x.te);
    plan = (
      <section className="card">
        <div className="h3">Plan de ritmos</div>
        <div className="sub">
          Elegí cuánto querés correr.{' '}
          {long ? 'En un maratón lo que más paga es la salida pareja: los primeros km apenas más lentos y nada de apurar antes del km 30.' : 'Salís un poco más lento, sostenés el ritmo en el medio y apretás al final.'}
        </div>
        <div className="seg" style={{ marginTop: 12 }}>
          {sc.map((x) => (
            <button key={x.id} className="chip" aria-pressed={x.id === sel.id} data-a="rsel" onClick={() => setUi('rsel', x.id)}>
              {x.n} · {fmtDur(x.sec)}
            </button>
          ))}
        </div>
        <p className="sub" style={{ marginTop: 8 }}>
          {sel.x} Ritmo medio: <b>{fmtPace(sel.sec / K)}/km</b>.{K > 21.2 ? ' La tabla muestra cada 5 km.' : ''}
        </p>
        {teScen && teScen.te ? <TrainEst te={teScen.te} race={race} /> : null}
        <div className="tw">
          <table className="zt rc-sp">
            <thead>
              <tr>
                <th>Km</th>
                <th>Ritmo</th>
                <th>
                  <span className="sr">Intensidad</span>
                </th>
                <th>Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const c = r.km <= ph.a ? 'var(--info)' : r.km <= ph.b ? 'var(--c1)' : 'var(--crit)';
                return (
                  <tr key={r.km} className={r.km === half || r.km === sp[sp.length - 1].km ? 'hl' : undefined}>
                    <td>{fmt(r.km, r.km % 1 ? 2 : 0)}</td>
                    <td>{fmtPace(r.pace)}</td>
                    <td className="rc-b">
                      <div className="meter sm" style={cssVars({ '--bc': c })}>
                        <i style={{ width: Math.round(45 + (55 * (mx - r.pace)) / (mx - mn || 1)) + '%' }}></i>
                      </div>
                    </td>
                    <td>{fmtDur(r.cum)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="rc-ph">
          <span>
            <i style={{ background: 'var(--info)' }}></i>Km 1 a {ph.a}: controlá
          </span>
          <span>
            <i style={{ background: 'var(--c1)' }}></i>Km {ph.a + 1} a {ph.b}: sostené
          </span>
          <span>
            <i style={{ background: 'var(--crit)' }}></i>Km {ph.b + 1} al final: {long ? 'si quedan piernas, apretá' : 'apretá'}
          </span>
        </div>
        <div className="lv-box">
          <b>Frecuencia cardíaca como control (orientativo):</b>{' '}
          {K <= 10.5
            ? 'km 1 a ' + ph.a + ' hasta unos ' + z(0.87) + ' lpm (si estás más alto, aflojá); km ' + (ph.a + 1) + ' a ' + ph.b + ' entre ' + z(0.88) + ' y ' + z(0.92) + ' lpm; desde el km ' + (ph.b + 1) + ', lo que tengas.'
            : K <= 21.2
              ? 'km 1 a ' + ph.a + ' hasta unos ' + z(0.85) + ' lpm; km ' + (ph.a + 1) + ' a ' + ph.b + ' entre ' + z(0.85) + ' y ' + z(0.89) + ' lpm; desde el km ' + (ph.b + 1) + ', lo que tengas.'
              : 'los primeros 10 km hasta unos ' + z(0.8) + ' lpm; del 10 al 30, entre ' + z(0.8) + ' y ' + z(0.86) + ' lpm. Es normal que la FC suba sola al final aunque mantengas el ritmo (deriva): desde el 30, mandá el ritmo.'}{' '}
          Si el ritmo y la FC no coinciden, mandá la FC en los primeros km y el ritmo después.
        </div>
        <button className="btn" style={{ marginTop: 12 }} data-a="rcopy" onClick={() => copyPlan(race, sel)}>
          Copiar plan de ritmos
        </button>
      </section>
    );
  }

  const timeline: [number, string][] = [
    [long ? -210 : -285, long ? 'Desayuno o comida rica en carbohidratos, conocida.' : 'Última comida liviana y conocida.'],
    [-150, 'Agua en pequeños sorbos. Nada nuevo.'],
    [-75, 'Llegá al lugar, retirá lo que falte y andá al baño.'],
    [-40, long ? 'Entrada en calor corta: 5 a 10 minutos de trote muy suave y movilidad. El maratón se encarga del resto.' : 'Entrada en calor: 10 minutos de trote muy suave, movilidad y 4 aceleraciones de 15 a 20 segundos.'],
    [-10, 'Al corral. Respirá y mantené el plan de los primeros ' + ph.a + ' km.'],
    [0, 'Largada.'],
  ];

  return (
    <>
      <section className="card">
        <div className="eyebrow">
          Día de carrera · {race.name} · {raceDateLabel(race)}
          {T ? ' · ' + T : ''}
          {race.place ? ' · ' + race.place : ''}
        </div>
        <div className="rc-c">
          <div className="big">
            {days === 0 ? 'Hoy' : <CountUp v={days} />}
            <small>{days === 0 ? 'es la carrera' : days === 1 ? 'día' : 'días'}</small>
          </div>
          <div className="lv-s">
            {days > 1 ? (
              <>
                Son <b>{w + (w === 1 ? ' semana' : ' semanas') + (days % 7 ? ' y ' + (days % 7) + (days % 7 === 1 ? ' día' : ' días') : '')}</b>.{' '}
              </>
            ) : null}
            Tu plan de ritmos y la lista de pendientes están abajo.
          </div>
        </div>
      </section>
      <div className="grid2" style={{ alignItems: 'start' }}>
        {plan}
        {T ? (
          <section className="card">
            <div className="h3">El día, hora por hora</div>
            <ul className="rc-tl">
              {timeline.map((e) => (
                <li key={e[0]}>
                  <time>{hh(t0 + e[0])}</time>
                  <span>{e[1]}</span>
                </li>
              ))}
            </ul>
            <div className="lv-box">Mirá el pronóstico para esa hora. Si hay calor o humedad, sumá unos segundos por km desde el principio, no cuando ya se complicó. Tomá agua en los puestos aunque no tengas sed.</div>
            {fuel}
          </section>
        ) : (
          <section className="card">
            <div className="h3">El día, hora por hora</div>
            <p>Cargá la hora de largada en Ajustes y te armo el horario del día.</p>
            {goRacesBtn}
            {fuel}
          </section>
        )}
      </div>
      <section className="card">
        <div className="h3">Lista de pendientes</div>
        <div className="sub">
          {done} de {I.length} hechos. Lo que ya toca hacer aparece marcado.
        </div>
        {RC_GROUPS.map((g) => {
          const it = I.filter((x) => x[0] === g[0]);
          if (!it.length) return null;
          return [
            <div key={'h' + g[0]} className="rc-gh">
              {g[1]}
            </div>,
            <ul key={'l' + g[0]} className="rc-ck">
              {it.map((x) => (
                <li key={x[2]}>
                  <label>
                    <input type="checkbox" data-a="rck" data-r={race.id} data-v={x[2]} checked={!!rc[x[2]]} onChange={(e) => toggleCheck(race.id, x[2], e.target.checked)} />
                    <span>
                      {x[1]}
                      {days <= x[0] && !rc[x[2]] ? <b className="due">Ya toca</b> : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>,
          ];
        })}
        <p className="sub" style={{ marginTop: 12 }}>
          Esta guía es general. Para la semana previa y el volumen, seguí lo que te indique tu entrenador.
        </p>
      </section>
    </>
  );
}
