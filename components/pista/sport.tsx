'use client';
/* Piezas de deporte del rediseño «Pista» (estilos en app/styles/components/sport.css): la pista ovalada, el dorsal,
   la pulsera de ritmos, el escudo de trofeo, la medalla, el reloj de cuenta regresiva y el cronógrafo. */
import { Fragment, useId, useSyncExternalStore, type ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { clamp, fmt, fmtDur, pad } from '@/lib/domain/util';
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

/** volumen de la semana contra el plan; `children` reemplaza el número del centro */
export function Oval({ done, total, unit = 'km', children }: { done: number; total: number; unit?: string; children?: ReactNode }) {
  const chk = useId(),
    pct = total > 0 ? clamp((done / total) * 100, 0, 100) : 0,
    [rx, ry] = lanePoint(pct / 100);
  return (
    <div className="p-oval">
      <svg viewBox="0 0 200 116" role="img" aria-label={`${fmt(done)} de ${fmt(total)} ${unit}`}>
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
      </svg>
      <div className="p-oval-c" aria-hidden="true">
        {children ?? (
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
const CLOCK_L = ['Días', 'Horas', 'Min', 'Seg'];

const exact = (to: Date) => (now: number) => {
  const s = Math.max(0, Math.floor(to.getTime() / 1000 - now / 1000));
  return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
};
/** `to`: la largada (fecha y hora). `parts`: otra forma de contar ([días, horas, min, seg] para un instante en ms) */
export function Countdown({ to, parts }: { to?: Date; parts?: (now: number) => number[] }) {
  const now = useSyncExternalStore(onSecond, nowSec, () => null);
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
/** de 0 a 100; las marcas en tartán llegan hasta el valor. `children` va debajo del número (de 100 · faltan…) */
export function Chrono({ value, children }: { value: number; children?: ReactNode }) {
  const on = Math.round((clamp(value, 0, 100) / 100) * 60);
  return (
    <div className="p-chrono" role="img" aria-label={`${Math.round(value)} de 100`}>
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
          <span className="disp">{Math.round(value)}</span>
          {children ? <small>{children}</small> : null}
        </div>
      </div>
    </div>
  );
}
