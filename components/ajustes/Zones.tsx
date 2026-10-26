'use client';
/* Zonas de FC: una barra con los cuatro cortes, que se arrastran o se mueven con las flechas (Mayúscula o Re Pág de a
   5), y abajo cada zona con el número donde arranca para escribirlo. Cada zona arranca donde termina la anterior y la Z5
   llega a la FC máxima. Por % de la FC máxima hasta que movés algo; ahí pasan a ser tuyas. Se guarda al soltar, al
   dejar de tocar las flechas o al salir del número. */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useS } from '@/lib/store';
import { toast } from '@/lib/data/actions';
import { ZN, zoneRange } from '@/lib/domain/config';
import { edgeRange, moveEdge, zoneEdges, zonesOf } from '@/lib/domain/settings';
import { num } from '@/lib/domain/util';
import { cssVars, cx } from '@/components/pista/util';
import { saveZones } from './actions';

const IDX = [0, 1, 2, 3, 4];
/** cuánto espera después de la última flecha para guardar */
const KEY_WAIT = 800;

/** dónde arranca una zona, para escribirlo: muestra el valor de la barra hasta que lo tocás */
function Start({ k, E, onSet }: { k: number; E: number[]; onSet: (k: number, v: string) => void }) {
  const [txt, setTxt] = useState<string | null>(null);
  const done = () => {
    if (txt != null) onSet(k, txt);
    setTxt(null);
  };
  return (
    <input
      className="p-in num aj-zin"
      inputMode="numeric"
      aria-label={'Dónde arranca la Z' + (k + 1) + ', en lpm'}
      value={txt ?? String(E[k])}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={done}
      onKeyDown={(e) => {
        if (e.key === 'Enter') done();
        else if (e.key === 'Escape' && txt != null) {
          e.stopPropagation();
          setTxt(null);
        }
      }}
    />
  );
}

export function Zones() {
  const { cfg } = useS();
  /* los bordes guardados (por % o a mano) y, mientras se mueve un corte, los de la barra */
  const saved = zoneEdges(IDX.map(zoneRange));
  const [live, setLive] = useState<number[] | null>(null);
  const E = live || saved;
  const liveRef = useRef<number[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const drag = useRef<number | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const show = (e: number[] | null) => {
    liveRef.current = e;
    setLive(e);
  };
  const commit = () => {
    clearTimeout(timer.current);
    const e = liveRef.current;
    show(null);
    if (e && e.some((v, k) => v !== saved[k])) saveZones(e);
  };
  const lo = E[0],
    hi = E[5],
    pct = (v: number) => ((v - lo) / (hi - lo)) * 100;

  const onDown = (i: number) => (e: PointerEvent) => {
    drag.current = i;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    const i = drag.current,
      b = bar.current?.getBoundingClientRect();
    if (i == null || !b) return;
    show(moveEdge(liveRef.current || saved, i, lo + ((e.clientX - b.left) / b.width) * (hi - lo)));
  };
  const onUp = () => {
    if (drag.current == null) return;
    drag.current = null;
    commit();
  };
  const onKey = (i: number) => (e: KeyboardEvent) => {
    const cur = liveRef.current || saved,
      [a, b] = edgeRange(cur, i),
      step = e.shiftKey ? 5 : 1;
    const to: Record<string, number> = { ArrowLeft: cur[i] - step, ArrowDown: cur[i] - step, ArrowRight: cur[i] + step, ArrowUp: cur[i] + step, PageDown: cur[i] - 5, PageUp: cur[i] + 5, Home: a, End: b };
    if (!(e.key in to)) return;
    e.preventDefault();
    show(moveEdge(cur, i, to[e.key]));
    clearTimeout(timer.current);
    timer.current = setTimeout(commit, KEY_WAIT);
  };
  /** el número escrito: si no entra entre las zonas de al lado, avisa y vuelve */
  const onSet = (k: number, v: string) => {
    const x = num(v),
      [a, b] = edgeRange(saved, k);
    if (x === saved[k]) return;
    if (x == null || isNaN(x) || x < a || x > b) {
      toast('La Z' + (k + 1) + ' tiene que arrancar entre ' + a + ' y ' + b + ' lpm.', 5000);
      return;
    }
    saveZones(moveEdge(saved, k, x));
  };

  /* lo guardado se muestra tal cual (por %, la Z1 termina donde arranca la Z2); lo que se está moviendo, pegado */
  const Z = live ? zonesOf(live) : IDX.map(zoneRange),
    ticks: number[] = [],
    up: boolean[] = [];
  /* el número de un corte pegado al anterior sube un renglón, para que no se pisen */
  for (let i = 1; i <= 4; i++) up[i] = i > 1 && !up[i - 1] && pct(E[i]) - pct(E[i - 1]) < 6;
  for (let v = Math.ceil((lo + 1) / 10) * 10; v < hi; v += 10) ticks.push(v);
  return (
    <div className="aj-zed">
      <div className={cx('aj-zbar', up.some(Boolean) && 'tall')} ref={bar} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {IDX.map((k) => (
          <span key={k} className={cx('aj-zseg', k === 0 && 'lt')} style={cssVars({ '--zc': `var(--z${k + 1})`, left: pct(E[k]) + '%', width: pct(k < 4 ? E[k + 1] : hi) - pct(E[k]) + '%' })} aria-hidden="true">
            Z{k + 1}
          </span>
        ))}
        {[1, 2, 3, 4].map((i) => {
          const [a, b] = edgeRange(E, i);
          return (
            <span
              key={i}
              className={cx('aj-zhd', up[i] && 'up')}
              style={{ left: pct(E[i]) + '%' }}
              role="slider"
              tabIndex={0}
              aria-label={'Corte entre la Z' + i + ' y la Z' + (i + 1)}
              aria-valuemin={a}
              aria-valuemax={b}
              aria-valuenow={E[i]}
              aria-valuetext={'La Z' + (i + 1) + ' arranca en ' + E[i] + ' lpm'}
              onPointerDown={onDown(i)}
              onKeyDown={onKey(i)}
              onBlur={() => timer.current && liveRef.current && commit()}
            >
              <span>{E[i]}</span>
            </span>
          );
        })}
      </div>
      <div className="aj-zax" aria-hidden="true">
        {ticks.map((v) => (
          <span key={v} style={{ left: pct(v) + '%' }}>
            {v}
          </span>
        ))}
      </div>
      <div className="aj-ztab">
        {IDX.map((k) => (
          <div key={k} style={cssVars({ '--zc': `var(--z${k + 1})` })}>
            <b>Z{k + 1}</b>
            <span className="aj-zr">
              <Start k={k} E={E} onSet={onSet} />
              <span className="disp">a {Z[k][1]}</span>
            </span>
            <small>{ZN[k][1]}</small>
          </div>
        ))}
      </div>
      <p className="aj-foot">
        {cfg.zones ? 'Son las tuyas: «Recalcular zonas» vuelve a las del % de tu FC máxima.' : 'Por % de tu FC máxima (50, 60, 70, 80 y 90%). Si movés un corte, pasan a ser tuyas.'} Usá las que te da tu entrenador o tu reloj: la app las usa para leer capturas y en
        las tarjetas de intensidad; cada sesión se evalúa con su propio rango planificado.
      </p>
    </div>
  );
}
