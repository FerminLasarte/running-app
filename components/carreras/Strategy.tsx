'use client';
/* Estrategia: el escenario (meta, realista o seguro, en la URL), los tramos con su ritmo y su FC de control, de dónde
   sale el ritmo realista, y la pulsera para imprimir o copiar. */
import { useCallback, useState } from 'react';
import { Copy, Printer } from '@phosphor-icons/react';
import type { Race } from '@/lib/domain/types';
import { isLong } from '@/lib/domain/config';
import type { RaceLeg, RaceScen, RaceStrategy, TrainEst } from '@/lib/domain/race';
import { dShort, dateLabel, fmtDur, fmtPace, pd } from '@/lib/domain/util';
import { editRace, toast } from '@/lib/data/actions';
import { Button, Segmented } from '@/components/pista/controls';
import { Panel } from '@/components/pista/structure';
import { cssVars, typeColor } from '@/components/pista/util';
import { PRINT_BTN_ID, PrintBand } from './PrintBand';
import { kmLabel } from './util';

/* de suave a fuerte, como los tipos de sesión */
const LEG_C = [typeColor('fondo'), typeColor('tempo'), typeColor('series'), typeColor('test')];

const legName = (l: RaceLeg) => 'Km ' + l.from + (l.to > l.from ? ' – ' + kmLabel(l.to) : '');
const hrTxt = (l: RaceLeg) => (!l.hr ? 'FC libre' : l.hr[0] == null ? 'FC hasta ' + l.hr[1] : 'FC ' + l.hr[0] + '–' + l.hr[1]);

function copyPlan(race: Race, sel: RaceScen, st: RaceStrategy) {
  let prev = 0,
    cum = 0;
  const txt =
    race.name +
    ' · ' +
    fmtDur(sel.sec) +
    ' (' +
    sel.n +
    ')\n' +
    st.splits
      .map((r) => {
        const len = r.km - prev;
        prev = r.km;
        cum += r.sec;
        return 'Km ' + kmLabel(r.km) + ': ' + fmtPace(r.sec / len) + ' · ' + fmtDur(cum);
      })
      .join('\n');
  try {
    navigator.clipboard.writeText(txt).then(
      () => toast('Plan copiado'),
      () => toast('No pude copiar. Sacale una captura a la pulsera.'),
    );
  } catch {
    toast('No pude copiar. Sacale una captura a la pulsera.');
  }
}

const KN = { series: 'Series', tempo: 'Tempo', test: 'Test' } as const;
/** de dónde sale el ritmo realista cuando lo dan los entrenamientos, con las sesiones en un desplegable */
function RealFrom({ te, race }: { te: TrainEst; race: Race }) {
  const wk = Math.round(-te.slope * 7);
  return (
    <>
      <p className="car-foot">
        Uso tus {te.C.length}
        {te.C.length === 1 ? ' sesión' : ' sesiones'} de calidad desde el {dShort(pd(te.from))}. Hoy tu nivel equivale a <b>{fmtDur(te.cur)}</b>
        {wk > 0 ? (
          <>
            {' '}
            y venís mejorando unos <b>{wk} s por semana</b>
          </>
        ) : wk < 0 ? (
          '; en las últimas semanas no venís mejorando'
        ) : (
          ''
        )}
        . Para el {dShort(pd(race.date))} proyecto <b>{fmtDur(te.proj)}</b>
        {te.capped ? ' (tu tendencia da más, pero la limito a una mejora prudente de 3% por mes)' : ''}.
      </p>
      <details className="car-more">
        <summary>Ver las sesiones</summary>
        <table className="p-tbl">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Sesión</th>
              <th className="r">{race.name} equivalente</th>
            </tr>
          </thead>
          <tbody>
            {te.C.slice()
              .reverse()
              .map((c, i) => (
                <tr key={i}>
                  <td>{dateLabel(c.date)}</td>
                  <td>{KN[c.k]}</td>
                  <td className="r">{fmtDur(te.conv(c.s10))}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="car-foot">Las series dan tiempos más rápidos y los tempos más lentos: por eso la tendencia se mide entre sesiones del mismo tipo y el nivel de hoy combina los dos. Las repeticiones de menos de 400 m no cuentan.</p>
      </details>
    </>
  );
}

export function Strategy({ race, sc, sel, st, onPick }: { race: Race; sc: RaceScen[]; sel: RaceScen | null; st: RaceStrategy | null; onPick: (id: RaceScen['id']) => void }) {
  const [printing, setPrinting] = useState(false);
  const done = useCallback(() => setPrinting(false), []);
  const long = isLong(race);
  if (!sel || !st)
    return (
      <Panel id="car-estrategia" className="p-c7 p-rise" style={cssVars({ '--i': 2 })} title="Estrategia">
        <p className="car-note">Cargá un tiempo objetivo para esta carrera en Ajustes, o registrá un test, y acá armo los tramos y la pulsera de ritmos.</p>
        <div className="car-acts">
          <Button size="sm" onClick={() => editRace(race.id)}>
            Cargar el objetivo
          </Button>
        </div>
      </Panel>
    );
  return (
    <Panel id="car-estrategia" className="p-c7 p-rise" style={cssVars({ '--i': 2 })} title="Estrategia" sub="Salir controlado, cerrar fuerte">
      {sc.length > 1 ? (
        <div className="car-scen">
          <Segmented label="Plan para" value={sel.id} onChange={onPick} options={sc.map((x) => ({ value: x.id, label: x.n + ' · ' + fmtDur(x.sec) }))} />
        </div>
      ) : null}
      <div className="car-legs" style={cssVars({ '--cols': st.legs.map((l) => `minmax(0, ${Math.max(l.to - l.from + 1, race.km * 0.15).toFixed(2)}fr)`).join(' ') })}>
        {st.legs.map((l, i) => (
          <div key={l.from} style={cssVars({ '--sc': LEG_C[i] })}>
            <span className="lbl">{legName(l)}</span>
            <span className="disp">{fmtPace(l.pace)}</span>
            <small>{l.x}</small>
            <small className="hr">{hrTxt(l)}</small>
          </div>
        ))}
      </div>
      <p className="car-note">
        {sel.x} Parciales parejos o en negativo: si cada tramo sale como está, llegás en <b>{fmtDur(st.total)}</b>. La pulsera de arriba se imprime en tamaño real.
      </p>
      {sel.te ? <RealFrom te={sel.te} race={race} /> : null}
      <p className="car-foot">
        La FC es orientativa: si el ritmo y la FC no coinciden, mandá la FC en los primeros km y el ritmo después.
        {long ? ' Es normal que la FC suba sola al final aunque mantengas el ritmo (deriva): desde el 30, mandá el ritmo. Tomá un gel o carbohidratos cada 30 a 45 minutos desde el km 8 a 10, como lo hayas practicado en las tiradas largas, y agua en los puestos.' : ''}
      </p>
      <div className="car-acts">
        <Button id={PRINT_BTN_ID} icon={Printer} onClick={() => setPrinting(true)}>
          Imprimir pulsera
        </Button>
        <Button variant="ghost" icon={Copy} onClick={() => copyPlan(race, sel, st)}>
          Copiar plan
        </Button>
      </div>
      {printing ? <PrintBand race={race} sel={sel} st={st} onDone={done} /> : null}
    </Panel>
  );
}
