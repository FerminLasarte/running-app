'use client';
/* Piezas de deporte del rediseño «Pista» (estilos en app/styles/components/sport.css): la pista ovalada, el dorsal,
   la pulsera de ritmos, el escudo de trofeo, las piezas de la vitrina (copa, medalla colgada, escudo con pie y caja
   de secreto), la medalla, el reloj de cuenta regresiva y el cronógrafo. */
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { clamp, fmt, fmtDur, fmtPace, pad } from '@/lib/domain/util';
import { cssVars, cx } from './util';
import { Pr } from './controls';

/* ---- la pista: cuatro andariveles de tartán, llegada a cuadros y el progreso por el andarivel 1 ---- */
/* el andarivel 1 es un rectángulo redondeado (x, y, ancho, alto, radio); el SVG lo recorre desde arriba a la
   izquierda en el sentido del reloj y se espeja para que corra al revés, como en el atletismo */
const L1 = { x: 24.75, y: 24.75, w: 150.5, h: 66.5, r: 33.25 };
function lanePoint(f: number): [number, number] {
  const { x, y, w, h, r } = L1,
    s = w - 2 * r,
    c = Math.PI * r,
    d = clamp(f, 0, 1) * (2 * s + 2 * c);
  let px: number, py: number;
  if (d < s) [px, py] = [x + r + d, y];
  else if (d < s + c) {
    const t = (d - s) / r;
    [px, py] = [x + w - r + r * Math.sin(t), y + r - r * Math.cos(t)];
  } else if (d < 2 * s + c) [px, py] = [x + w - r - (d - s - c), y + h];
  else {
    const t = (d - 2 * s - c) / r;
    [px, py] = [x + r - r * Math.sin(t), y + r + r * Math.cos(t)];
  }
  return [200 - px, py];
}

/* el andarivel 1 en sentido antihorario desde la línea de llegada (arriba, x 58): el camino de las luces de ritmo */
const L1_PATH = `M58 ${L1.y} A${L1.r} ${L1.r} 0 0 0 58 ${L1.y + L1.h} L${L1.x + L1.w - L1.r} ${L1.y + L1.h} A${L1.r} ${L1.r} 0 0 0 ${L1.x + L1.w - L1.r} ${L1.y} Z`;
const LIGHTS = 7;
/** una vuelta de luces de ritmo por el andarivel 1: `sec` lo que tarda; mientras, en el medio corre el reloj.
    `onEnd` tiene que ser siempre la misma función */
export interface OvalLap {
  key: number;
  sec: number;
  onEnd: () => void;
}
/* las luces salen juntas de la línea de llegada y cada una arranca un sesentavo de vuelta después de la anterior:
   el grupo con su estela. Todas tardan `sec` en dar la vuelta; la última llega `LAG` después */
const GAP = 1 / 60,
  LAG = (LIGHTS - 1) * GAP;
const lightTimes = (i: number) => {
  const a = (i * GAP) / (1 + LAG),
    b = (i * GAP + 1) / (1 + LAG);
  return i ? { keyTimes: `0;${a};${b};1`, keyPoints: '0;0;1;1' } : { keyTimes: `0;${b};1`, keyPoints: '0;1;1' };
};
function LapClock({ lap, svg }: { lap: OvalLap; svg: RefObject<SVGSVGElement | null> }) {
  const [t, setT] = useState(0);
  const { key, sec, onEnd } = lap;
  /* antes de dibujar: si no, las luces se verían un instante en la esquina */
  useLayoutEffect(() => {
    svg.current?.querySelectorAll<SVGAnimationElement>('.p-oval-lights animateMotion').forEach((m) => m.beginElement());
  }, [key, svg]);
  useEffect(() => {
    const t0 = performance.now(),
      tick = setInterval(() => {
        const s = (performance.now() - t0) / 1000;
        setT(Math.min(sec, s));
        if (s >= sec * (1 + LAG)) {
          clearInterval(tick);
          onEnd();
        }
      }, 100);
    return () => clearInterval(tick);
  }, [key, sec, onEnd]);
  return (
    <div className="p-oval-lap">
      <span className="disp">
        {Math.floor(t / 60)}:{pad(Math.floor(t % 60))},{Math.floor((t * 10) % 10)}
      </span>
      <small>
        <b>{fmtPace((sec / 400) * 1000)}/km</b> · 400 m
      </small>
    </div>
  );
}

/** volumen de la semana contra el plan; `children` reemplaza el número del centro. Con `lap`, una vuelta de luces */
export function Oval({ done, total, unit = 'km', lap, children }: { done: number; total: number; unit?: string; lap?: OvalLap; children?: ReactNode }) {
  const svg = useRef<SVGSVGElement>(null);
  const chk = useId(),
    pct = total > 0 ? clamp((done / total) * 100, 0, 100) : 0,
    [rx, ry] = lanePoint(pct / 100);
  return (
    <div className="p-oval">
      <svg ref={svg} viewBox="0 0 200 116" role="img" aria-label={`${fmt(done)} de ${fmt(total)} ${unit}`}>
        <defs>
          <pattern id={chk} width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="#fff" />
            <rect width="2" height="2" fill="#141414" />
            <rect x="2" y="2" width="2" height="2" fill="#141414" />
          </pattern>
        </defs>
        <rect x="2" y="2" width="196" height="112" rx="56" fill="var(--track)" />
        {[1, 2, 3].map((k) => {
          const o = 2 + k * 6.5;
          return <rect key={k} x={o} y={o} width={200 - o * 2} height={116 - o * 2} rx={58 - o} fill="none" stroke="var(--surface)" strokeWidth=".7" opacity=".9" />;
        })}
        <rect x="28" y="28" width="144" height="60" rx="30" fill="var(--surface)" />
        <rect x="56" y="2" width="4" height="26" fill={`url(#${chk})`} />
        {pct > 0 ? (
          <>
            <rect className="prog" x={L1.x} y={L1.y} width={L1.w} height={L1.h} rx={L1.r} fill="none" stroke="var(--acc)" strokeWidth="3.2" strokeLinecap="round" pathLength={100} strokeDasharray={`${pct} 100`} transform="translate(200 0) scale(-1 1)" />
            <circle className="runner" cx={rx} cy={ry} r="4.2" fill="var(--surface)" stroke="var(--acc)" strokeWidth="2.4" />
          </>
        ) : null}
        {lap ? (
          <g className="p-oval-lights" key={lap.key}>
            {Array.from({ length: LIGHTS }, (_, i) => (
              <circle key={i} r={i ? 3 : 3.6} opacity={1 - i * 0.11}>
                <animateMotion dur={lap.sec * (1 + LAG) + 's'} begin="indefinite" fill="freeze" path={L1_PATH} calcMode="linear" {...lightTimes(i)} />
              </circle>
            ))}
          </g>
        ) : null}
      </svg>
      <div className="p-oval-c" aria-hidden="true">
        {lap ? <LapClock key={lap.key} lap={lap} svg={svg} /> : children ?? (
          <div>
            <span className="disp">{fmt(done)}</span>
            <small>
              de {fmt(total)} {unit}
            </small>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- dorsal ---- */
export interface BibStat {
  label: string;
  value: ReactNode;
}
/**
 * el número de carrera: arriba la banda (nombre y fecha), el número grande, los datos de la largada y el talón con
 * dos números. `notch`: el color de lo que hay detrás (los agujeros dejan ver el fondo); el estadio, por defecto.
 * `children` va debajo, derecho (el link al plan).
 */
export function Bib({ band, num, numLabel, meta, tear, notch, children }: { band: [ReactNode, ReactNode]; num: ReactNode; numLabel?: string; meta?: BibStat[]; tear: [BibStat, BibStat]; notch?: string; children?: ReactNode }) {
  return (
    <div className="p-bib-wrap" style={notch ? cssVars({ '--notch': notch }) : undefined}>
      <div className="p-bib">
        <span className="pin a" />
        <span className="pin b" />
        <span className="pin c" />
        <span className="pin d" />
        <div className="p-bib-band">
          <span>{band[0]}</span>
          <span>{band[1]}</span>
        </div>
        <div className="p-bib-main">
          <div className="p-bib-num">{num}</div>
          {numLabel ? <div className="p-bib-num-l">{numLabel}</div> : null}
          {meta?.length ? (
            <div className="p-bib-meta">
              {meta.map((m) => (
                <span key={m.label}>
                  {m.label} <b>{m.value}</b>
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="p-bib-tear">
          {tear.map((t) => (
            <div key={t.label}>
              <span className="lbl">{t.label}</span>
              <span className="disp">{t.value}</span>
            </div>
          ))}
        </div>
      </div>
      {children ? <div className="p-bib-link">{children}</div> : null}
    </div>
  );
}

/* ---- pulsera de ritmos ---- */
/**
 * parcial y acumulado por km. `splits`: segundos de cada fila. `breaks`: en qué fila empieza cada tramo de la estrategia
 * (los tramos se alternan con fondo más oscuro, empezando por el primero). `kms`: el km donde termina cada fila, si no
 * van de a uno (de a 5 en un maratón, o 21,1 al final de una media).
 */
export function PaceBand({
  title,
  sub,
  splits,
  breaks = [],
  kms,
  finish = 'Meta',
  className,
}: {
  title: ReactNode;
  sub?: ReactNode;
  splits: number[];
  breaks?: number[];
  kms?: number[];
  finish?: string;
  className?: string;
}) {
  const rows = splits.map((p, k) => ({ k, p, acc: splits.slice(0, k + 1).reduce((a, v) => a + v, 0), sh: breaks.filter((b) => b <= k).length % 2 === 0 })),
    total = rows.length ? rows[rows.length - 1].acc : 0;
  return (
    <div className={cx('p-band', className)}>
      <div className="p-band-h">
        <b>{title}</b>
        {sub ? <small>{sub}</small> : null}
      </div>
      <table>
        <thead>
          <tr>
            <th>Km</th>
            <th>Parcial</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k} className={r.sh ? 'sh' : undefined}>
              <td>{kms ? fmt(kms[r.k], kms[r.k] % 1 ? 1 : 0) : r.k + 1}</td>
              <td>{fmtDur(r.p)}</td>
              <td>{fmtDur(r.acc)}</td>
            </tr>
          ))}
          <tr className="fin">
            <td>{finish}</td>
            <td />
            <td>{fmtDur(total)}</td>
          </tr>
        </tbody>
      </table>
      <div className="p-band-f" aria-hidden="true">
        <i />
      </div>
    </div>
  );
}

/* ---- escudo de trofeo ---- */
export const TIER_C = ['#A8693A', '#8D949C', '#C3962A', '#8C7FCF'];
export const TIER_NAME = ['bronce', 'plata', 'oro', 'platino'];
/** bronce, plata, oro o platino (`tier` 0–3); sin ganar, punteado y con el ícono gris */
export function Shield({ tier, got, icon: I, size = 52 }: { tier: number; got: boolean; icon: Icon; size?: number }) {
  const c = TIER_C[clamp(tier, 0, 3)];
  return (
    <span className={cx('p-shield', !got && 'lock')} style={cssVars({ '--w': size + 'px' })} aria-hidden="true">
      <svg viewBox="0 0 52 58">
        <path d="M26 2 48 12v18c0 13-9 22-22 26C13 52 4 43 4 30V12z" fill={got ? c : 'none'} stroke={got ? c : 'var(--line-2)'} strokeWidth="2" strokeDasharray={got ? undefined : '3 3'} />
        {got ? <path d="M26 8 42 15v15c0 10-7 17-16 20C17 47 10 40 10 30V15z" fill="none" stroke="rgb(255 255 255 / .35)" strokeWidth="1" /> : null}
      </svg>
      <I className="ic" weight="fill" />
    </span>
  );
}

/* ---- piezas de la vitrina: el metal torneado, sobre un pie negro. Sin ganar, la silueta punteada (sport.css) ---- */
/* claro, medio, brillo y oscuro de cada metal (bronce, plata, oro, platino) */
const METAL = [
  ['#6A3714', '#B7713D', '#F0C29A'],
  ['#5A6169', '#A9B0B8', '#F4F6F8'],
  ['#7A5A0E', '#C9992A', '#FBE6A0'],
  ['#4A4288', '#8C7FCF', '#ECE7FF'],
];
/** los degradés del metal: `l` de costado (una pieza torneada) y `r` en círculo (una medalla) */
function MetalDefs({ id, tier }: { id: string; tier: number }) {
  const [d, m, h] = METAL[clamp(tier, 0, 3)];
  return (
    <defs>
      <linearGradient id={id + 'l'} x1="0" x2="1">
        <stop offset="0" stopColor={d} />
        <stop offset=".28" stopColor={m} />
        <stop offset=".46" stopColor={h} />
        <stop offset=".62" stopColor={m} />
        <stop offset="1" stopColor={d} />
      </linearGradient>
      <radialGradient id={id + 'r'} cx=".38" cy=".32" r=".75">
        <stop offset="0" stopColor={h} />
        <stop offset=".45" stopColor={m} />
        <stop offset="1" stopColor={d} />
      </radialGradient>
    </defs>
  );
}
type PieceProps = { tier: number; got: boolean; size?: number; className?: string };
const pieceCx = (kind: string, got: boolean, className?: string) => cx('p-tro', kind, !got && 'lock', className);

/** copa: para las marcas. La placa del pie dice el tiempo a bajar («25:00») o la distancia («21K») */
export function Cup({ tier, got, plate, size = 84, className }: PieceProps & { plate: string }) {
  const id = useId(),
    m = got ? `url(#${id}l)` : undefined,
    long = plate.length > 5;
  return (
    <span className={pieceCx('cup', got, className)} style={cssVars({ '--w': size + 'px' })} aria-hidden="true">
      <svg viewBox="0 0 80 124">
        {got ? <MetalDefs id={id} tier={tier} /> : null}
        <path className="h" d="M17 24H9c0 15 5 24 14 27M63 24h8c0 15-5 24-14 27" stroke={m} />
        <path className="m" d="M14 13h52v9c0 23-10 37-26 41-16-4-26-18-26-41z" fill={m} />
        <rect className="m" x="12" y="9" width="56" height="6" rx="1.5" fill={m} />
        {got ? <path d="M24 19c0 17 4 29 11 36" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="3" strokeLinecap="round" /> : null}
        <rect className="m" x="36" y="63" width="8" height="10" fill={m} />
        <ellipse className="m" cx="40" cy="74" rx="9" ry="3" fill={m} />
        <path className="m" d="M27 85h26l3 6H24z" fill={m} />
        <rect className="b" x="18" y="91" width="44" height="33" rx="2" />
        {got ? <rect className="bh" x="18" y="91" width="44" height="2" /> : null}
        <rect className="pl" x={long ? 21 : 24} y="100" width={long ? 38 : 32} height="14" rx="1" fill={m} />
        <text x="40" y="110.4" textAnchor="middle" style={{ font: `italic 800 ${long ? 8.4 : 9.6}px var(--f-disp)`, fontStretch: '72%' }}>
          {plate}
        </text>
      </svg>
    </span>
  );
}
/** medalla colgada: para las carreras. Cuelga de su cinta y lleva el número (cuántas carreras) */
export function HungMedal({ tier, got, num, color, size = 66, className }: PieceProps & { num: string; color?: string }) {
  const id = useId();
  return (
    <span className={pieceCx('medal', got, className)} style={cssVars({ '--w': size + 'px' })} aria-hidden="true">
      <svg viewBox="0 0 70 142">
        {got ? <MetalDefs id={id} tier={tier} /> : null}
        <path className="m" d="M13 0h16l11 84H28z" fill={got ? color : undefined} />
        <path className="m" d="M57 0H41L30 84h12z" fill={got ? color : undefined} />
        {got ? (
          <>
            <path d="M57 0H41L30 84h12z" fill="#000" opacity=".22" />
            <path d="M17 0h3l10 84h-3z" fill="#fff" opacity=".22" />
          </>
        ) : null}
        <rect className="m" x="28" y="80" width="14" height="9" rx="2" fill={got ? `url(#${id}l)` : undefined} />
        <circle className="m" cx="35" cy="112" r="27" fill={got ? `url(#${id}r)` : undefined} />
        {got ? <circle cx="35" cy="112" r="21" fill="none" stroke="#000" strokeOpacity=".22" strokeDasharray="2 2.4" /> : null}
        <text x="35" y={num.length > 1 ? 121 : 122} textAnchor="middle" style={{ font: `italic 900 ${num.length > 1 ? 24 : 28}px var(--f-disp)`, fontStretch: '62%' }}>
          {num}
        </text>
      </svg>
    </span>
  );
}
/** escudo con pie: para todo lo demás, con el ícono de la categoría */
export function StandShield({ tier, got, icon: I, size = 72, className }: PieceProps & { icon: Icon }) {
  const id = useId(),
    m = got ? `url(#${id}l)` : undefined;
  return (
    <span className={pieceCx('shield', got, className)} style={cssVars({ '--w': size + 'px' })} aria-hidden="true">
      <svg viewBox="0 0 64 104">
        {got ? <MetalDefs id={id} tier={tier} /> : null}
        <path className="m" d="M32 4 54 14v18c0 13-9 22-22 26C19 54 10 45 10 32V14z" fill={m} />
        {got ? (
          <>
            <path d="M32 10 48 17v15c0 10-7 17-16 20C23 49 16 42 16 32V17z" fill="none" stroke="#fff" strokeOpacity=".4" />
            <path d="M32 4 54 14v18c0 13-9 22-22 26" fill="#000" fillOpacity=".1" />
          </>
        ) : null}
        <rect className="m" x="28" y="60" width="8" height="14" fill={m} />
        <path className="m" d="M22 74h20l3 6H19z" fill={m} />
        <rect className="b" x="14" y="80" width="36" height="24" rx="2" />
        {got ? <rect className="bh" x="14" y="80" width="36" height="2" /> : null}
        {got ? <rect x="22" y="89" width="20" height="6" rx="1" fill={m} opacity=".9" /> : null}
      </svg>
      <I className="ic" weight="fill" />
    </span>
  );
}
/** caja cerrada con candado: un secreto que todavía no encontraste */
export function SecretBox({ size = 72, className }: { size?: number; className?: string }) {
  return (
    <span className={cx('p-tro', 'box', className)} style={cssVars({ '--w': size + 'px' })} aria-hidden="true">
      <svg viewBox="0 0 64 104">
        <rect className="bx" x="9" y="44" width="46" height="60" rx="2" />
        <rect className="lid" x="6" y="34" width="52" height="13" rx="2" />
        <rect x="9" y="47" width="46" height="2" fill="#000" opacity=".25" />
        <path className="lk" d="M25 66v-6a7 7 0 0 1 14 0v6" fill="none" strokeWidth="3.2" />
        <rect className="lkb" x="21" y="65" width="22" height="18" rx="2.5" />
        <circle className="bx" cx="32" cy="72" r="2.6" />
        <rect className="bx" x="31" y="73" width="2" height="5" />
      </svg>
    </span>
  );
}

/* ---- medalla ---- */
/** carrera terminada: la distancia en la medalla, la cinta del color de la carrera, PR si fue tu mejor marca */
export function Medal({ dist, color, name, time, pr, note }: { dist: string; color: string; name: ReactNode; time: ReactNode; pr?: boolean; note?: ReactNode }) {
  return (
    <div className="p-medal">
      <svg viewBox="0 0 56 72" aria-hidden="true">
        <path d="M15 0h10l6 24H21z" fill={color} />
        <path d="M41 0H31l-6 24h10z" fill={color} opacity=".65" />
        <circle cx="28" cy="48" r="21" fill="var(--sunk)" stroke="var(--ink)" strokeWidth="2" />
        <circle cx="28" cy="48" r="16" fill="none" stroke="var(--line-2)" strokeDasharray="2 2.6" />
        <text x="28" y="54" textAnchor="middle" style={{ font: 'italic 900 16px var(--f-disp)', fontStretch: '62%', fill: 'var(--ink)' }}>
          {dist}
        </text>
      </svg>
      <div>
        <b>{name}</b>
        <span className="disp">
          {time}
          {pr ? <Pr /> : null}
        </span>
        {note ? <small>{note}</small> : null}
      </div>
    </div>
  );
}

/* ---- reloj de cuenta regresiva: avanza cada segundo ---- */
const onSecond = (cb: () => void) => {
  const t = setInterval(cb, 1000);
  return () => clearInterval(t);
};
const nowSec = () => Math.floor(Date.now() / 1000);
/** la hora en segundos, que avanza sola (null hasta dibujar en el navegador) */
export const useNowSec = () => useSyncExternalStore(onSecond, nowSec, () => null);
const CLOCK_L = ['Días', 'Horas', 'Min', 'Seg'];

const exact = (to: Date) => (now: number) => {
  const s = Math.max(0, Math.floor(to.getTime() / 1000 - now / 1000));
  return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
};
/** `to`: la largada (fecha y hora). `parts`: otra forma de contar ([días, horas, min, seg] para un instante en ms) */
export function Countdown({ to, parts }: { to?: Date; parts?: (now: number) => number[] }) {
  const now = useNowSec();
  const v = now == null ? null : (parts || exact(to || new Date()))(now * 1000);
  return (
    <div className="p-clock" role="timer" aria-label={v ? (v[0] > 0 ? `Faltan ${v[0]} días` : `Faltan ${v[1]} horas y ${v[2]} minutos`) : undefined}>
      {CLOCK_L.map((l, k) => (
        <Fragment key={l}>
          {k ? (
            <span className="colon" aria-hidden="true">
              :
            </span>
          ) : null}
          <div aria-hidden="true">
            <span className="disp">{v ? pad(v[k]) : '––'}</span>
            <span className="lbl">{l}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

/* ---- cronógrafo de 60 marcas ---- */
/** de 0 a 100 (null: sin puntaje, con una raya); las marcas en tartán llegan hasta el valor. `children` va debajo del
    número (de 100 · faltan…) */
export function Chrono({ value, children }: { value: number | null; children?: ReactNode }) {
  const on = Math.round((clamp(value ?? 0, 0, 100) / 100) * 60);
  return (
    <div className="p-chrono" role="img" aria-label={value == null ? 'Sin puntaje' : `${Math.round(value)} de 100`}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        {Array.from({ length: 60 }, (_, k) => {
          const a = (k / 60) * Math.PI * 2 - Math.PI / 2,
            big = k % 5 === 0,
            r1 = big ? 74 : 78;
          return (
            <line
              key={k}
              x1={100 + r1 * Math.cos(a)}
              y1={100 + r1 * Math.sin(a)}
              x2={100 + 90 * Math.cos(a)}
              y2={100 + 90 * Math.sin(a)}
              stroke={k < on ? 'var(--acc)' : 'var(--line-2)'}
              strokeWidth={big ? 3 : 2}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="c" aria-hidden="true">
        <div>
          <span className="disp">{value == null ? '–' : Math.round(value)}</span>
          {children ? <small>{children}</small> : null}
        </div>
      </div>
    </div>
  );
}
