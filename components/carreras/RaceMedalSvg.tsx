'use client';
/* Medalla de una carrera corrida, dibujada con la estética de su evento (raceMedalSvg, líneas 3205–3267 del original).
   Los ids internos del SVG (degradés, recortes, trayectos de texto) salen de useId para no chocar entre medallas. */
import { useId, type ReactNode } from 'react';
import type { Race } from '@/lib/domain/types';
import { RACE_PHOTO, raceTheme } from '@/lib/domain/raceTheme';

const FONT = { fontFamily: 'Barlow Condensed,Arial Narrow,sans-serif', fontWeight: 800 } as const;
const cx = 60,
  cy = 106;

/** la distancia como va grabada en la medalla: «10K», «21K», «42K» */
export const medalDist = (r: Pick<Race, 'km'>) => (r.km > 21 && r.km < 21.2 ? '21K' : r.km > 42 && r.km < 42.3 ? '42K' : Math.round(r.km) + 'K');

export function RaceMedalSvg({ r }: { r: Pick<Race, 'name' | 'km'> }) {
  const n = 'rm' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const t = raceTheme(r),
    km = medalDist(r);
  const url = (id: string) => 'url(#' + n + id + ')';
  const grad = (id: string, a: string, b: string, c: string) => (
    <linearGradient id={n + id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={a} />
      <stop offset=".5" stopColor={b} />
      <stop offset="1" stopColor={c} />
    </linearGradient>
  );
  const silver = grad('s', '#F4F6F8', '#A7AFB8', '#5E656D'),
    silverR = (
      <linearGradient id={n + 'r'} x1="1" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#F4F6F8" />
        <stop offset=".5" stopColor="#A7AFB8" />
        <stop offset="1" stopColor="#5E656D" />
      </linearGradient>
    );
  /* texto grabado siguiendo un arco: sombra oscura abajo, luz arriba */
  const arc = (id: string, rr: number, top: boolean) => (
    <path id={n + id} d={top ? 'M' + (cx - rr) + ' ' + cy + 'A' + rr + ' ' + rr + ' 0 0 1 ' + (cx + rr) + ' ' + cy : 'M' + (cx - rr) + ' ' + cy + 'A' + rr + ' ' + rr + ' 0 0 0 ' + (cx + rr) + ' ' + cy} fill="none" />
  );
  const ring = (id: string, rr: number) => <path id={n + id} d={'M' + cx + ' ' + (cy - rr) + 'a' + rr + ' ' + rr + ' 0 1 1 -.01 0'} fill="none" />;
  const onPath = (id: string, txt: string, size: number, col: string, off?: string, ls?: number) => (
    <text {...FONT} fontSize={size} letterSpacing={ls || 0.4} fill={col}>
      <textPath href={'#' + n + id} startOffset={off || '50%'} textAnchor="middle">
        {txt}
      </textPath>
    </text>
  );
  const onRing = (id: string, rr: number, txt: string, size: number, col: string) => (
    <text {...FONT} fontSize={size} fill={col}>
      <textPath href={'#' + n + id} textLength={(2 * Math.PI * rr - 3).toFixed(1)} lengthAdjust="spacing">
        {txt}
      </textPath>
    </text>
  );
  const eng = (x: number, y: number, s: number, txt: string, col: string, anchor?: 'start' | 'middle' | 'end') => (
    <>
      <text x={x + 0.5} y={y + 0.6} {...FONT} fontSize={s} textAnchor={anchor || 'middle'} fill="#000" opacity=".35">
        {txt}
      </text>
      <text x={x} y={y} {...FONT} fontSize={s} textAnchor={anchor || 'middle'} fill={col}>
        {txt}
      </text>
    </>
  );
  const loop = <rect x="50" y="52" width="20" height="10" rx="3" fill="none" stroke={url('s')} strokeWidth="3" />;
  const bars3 = (x: number, y: number, w: number, col: string) => {
    const k = w / 10,
      g: ReactNode[] = [];
    for (let i = 0; i < 3; i++) {
      const x0 = i * 3.45,
        bw = 2.95,
        h = 2.4 + i * 2.3,
        dx = h * 0.58;
      g.push(
        <polygon
          key={i}
          points={[x0, 7, x0 + bw, 7, x0 + bw + dx, 7 - h, x0 + dx, 7 - h].map((v, j) => (j % 2 ? y + (v - 7) * k : x + v * k).toFixed(2)).join(' ')}
        />,
      );
    }
    return <g fill={col}>{g}</g>;
  };
  const shine = <ellipse cx="42" cy="84" rx="20" ry="7" fill="#fff" opacity=".18" transform="rotate(-35 42 84)" />;

  /* cada medalla: defs extra, la cinta (lo que va antes del aro) y la medalla en sí */
  let defs: ReactNode = null,
    ribbon: ReactNode = null,
    medal: ReactNode = null,
    hasLoop = true;
  if (t.k === 'mba') {
    /* cinta violeta con la fecha; medalla plateada, triángulo con el Obelisco y rayos violetas */
    defs = (
      <>
        <clipPath id={n + 'c'}>
          <circle cx={cx} cy={cy} r="44" />
        </clipPath>
        <clipPath id={n + 'k'}>
          <polygon points="60,79 97,136 23,136" />
        </clipPath>
      </>
    );
    const rays: ReactNode[] = [];
    for (let i = 0; i < 6; i++) {
      const a = ((200 + i * 11) * Math.PI) / 180;
      rays.push(<line key={i} x1="58" y1="110" x2={(58 + 34 * Math.cos(a)).toFixed(1)} y2={(110 + 34 * Math.sin(a)).toFixed(1)} stroke="#6A35C9" strokeWidth="2" strokeLinecap="round" />);
    }
    ribbon = (
      <>
        <rect x="44" y="0" width="32" height="56" fill="#6A35C9" />
        <rect x="44" y="0" width="5" height="56" fill="#000" opacity=".15" />
        {bars3(48.5, 22, 22, '#fff')}
        <text x="60" y="34" {...FONT} fontSize="5.4" fill="#fff" textAnchor="middle">
          BUENOS AIRES
        </text>
        <text x="60" y="41" {...FONT} fontSize="5.4" fill="#fff" textAnchor="middle">
          23-08-2026
        </text>
      </>
    );
    medal = (
      <>
        <circle cx={cx} cy={cy} r="47" fill={url('s')} />
        <circle cx={cx} cy={cy} r="43.5" fill={url('r')} />
        <circle cx={cx} cy={cy} r="41" fill="#8C939B" />
        <g clipPath={url('c')}>
          <path d="M14 142q23 -6 46 0t46 0v14H14z" fill="#74ACDF" />
          <path d="M14 146q23 -6 46 0t46 0v3q-23 -6 -46 0t-46 0z" fill="#fff" />
        </g>
        {arc('t', 37, true)}
        {onPath('t', 'MEDIO MARATÓN BUENOS AIRES', 6, '#2A2F35')}
        <polygon points="60,79 97,136 23,136" fill={url('s')} stroke="#4A5057" strokeWidth=".8" />
        <g clipPath={url('k')}>{rays}</g>
        <g fill="#C5CBD2" stroke="#6B727A" strokeWidth=".5">
          <rect x="30" y="124" width="5" height="11" />
          <rect x="35" y="118" width="6" height="17" />
          <rect x="41" y="121" width="4" height="14" />
          <rect x="45" y="114" width="5" height="21" />
          <rect x="50" y="120" width="5" height="15" />
        </g>
        <polygon points="60,82 62.6,87 64,133 56,133 57.4,87" fill="#F4F6F8" stroke="#6B727A" strokeWidth=".6" />
        <polygon points="60,82 62.6,87 57.4,87" fill="#D9DEE3" />
        {eng(81, 131, 14, km, '#6A35C9')}
        {bars3(24, 142.4, 8, '#2A2F35')}
        {eng(64, 142.5, 6.4, 'BUENOS AIRES 2026', '#2A2F35')}
        {shine}
      </>
    );
  } else if (t.k === 'adz') {
    /* cinta a cuadros de bandera de llegada; medalla gris oscura con texto alrededor y barras de velocidad */
    defs = (
      <>
        {grad('g', '#B8BEC5', '#5D636A', '#2B2F34')}
        <pattern id={n + 'p'} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#111" />
          <rect width="5" height="5" fill="#F4F4F4" />
          <rect x="5" y="5" width="5" height="5" fill="#F4F4F4" />
        </pattern>
      </>
    );
    const bars: ReactNode[] = [];
    for (let i = 0; i < 4; i++) {
      const y = 99 + i * 7,
        w = 10 - i * 1.4,
        xl = 31 + i * 2.2,
        xr = 89 - i * 2.2;
      bars.push(
        <polygon key={'l' + i} points={xl + ',' + y + ' ' + (xl + w) + ',' + (y + 2.6) + ' ' + (xl + w) + ',' + (y + 5.4) + ' ' + xl + ',' + (y + 2.8)} fill="#C9CED4" />,
        <polygon key={'r' + i} points={xr + ',' + y + ' ' + (xr - w) + ',' + (y + 2.6) + ' ' + (xr - w) + ',' + (y + 5.4) + ' ' + xr + ',' + (y + 2.8)} fill="#C9CED4" />,
      );
    }
    ribbon = (
      <>
        <rect x="44" y="0" width="32" height="56" fill={url('p')} />
        <rect x="44" y="0" width="32" height="56" fill="#000" opacity=".08" />
        <rect x="47" y="30" width="26" height="20" rx="2" fill="#111" />
        {bars3(51.5, 46, 17, '#fff')}
      </>
    );
    medal = (
      <>
        <circle cx={cx} cy={cy} r="47" fill={url('g')} />
        <circle cx={cx} cy={cy} r="44" fill="none" stroke="#D5DADF" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="34" fill="#3B4046" stroke="#9AA1A8" strokeWidth="1.2" />
        {ring('t', 39.5)}
        {onRing('t', 39.5, '15K ADIZERO · 15K ADIZERO · 15K ADIZERO · 15K ADIZERO ·', 6.2, '#D5DADF')}
        {eng(60, 95, 9, 'ADIZERO', '#E3E7EB')}
        {eng(60, 118, 24, km, '#E3E7EB')}
        {bars}
        {bars3(55, 133, 10, '#C9CED4')}
        {shine}
      </>
    );
  } else if (t.k === 'nova') {
    /* cinta celeste; medalla plateada con «Vial Costero · Vicente López» alrededor */
    ribbon = (
      <>
        <rect x="44" y="0" width="32" height="56" fill="#2E9BE0" />
        <path d="M44 10l16 8 16-8M44 26l16 8 16-8M44 42l16 8 16-8" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2" />
      </>
    );
    medal = (
      <>
        <circle cx={cx} cy={cy} r="47" fill={url('s')} />
        <circle cx={cx} cy={cy} r="44" fill={url('r')} />
        <circle cx={cx} cy={cy} r="33" fill="#7E858D" stroke="#4E555C" strokeWidth="1" />
        {ring('t', 38.5)}
        {onRing('t', 38.5, 'VIAL COSTERO · 12.04.26 · VICENTE LÓPEZ · 12.04.26 ·', 6.3, '#2F353B')}
        {bars3(49.6, 96.4, 21, '#3C4248')}
        {bars3(49, 95.8, 21, '#EEF1F4')}
        {eng(60, 108, 7.4, 'VIVAMOS', '#F1F4F7')}
        {eng(60, 116.5, 7.4, 'VICENTE LÓPEZ', '#F1F4F7')}
        {eng(60, 128, 6, 'SUPERNOVA ' + km, '#2E9BE0')}
        {shine}
      </>
    );
  } else if (t.k === 'est') {
    /* etapa Otoño: aro rojo, anillo plateado con el nombre, libro abierto y hoja de arce, placa «OTOÑO» */
    const L = [[0, -1], [0.14, -0.66], [0.36, -0.78], [0.3, -0.36], [0.7, -0.5], [0.6, -0.22], [0.92, -0.1], [0.48, 0.18], [0.56, 0.4], [0.1, 0.3], [0.05, 0.33], [0.05, 0.95]];
    const P = L.concat(
      L.slice(1)
        .reverse()
        .map((q) => [-q[0], q[1]]),
    )
      .map((q) => (60 + q[0] * 25).toFixed(1) + ',' + (100 + q[1] * 25).toFixed(1))
      .join(' ');
    hasLoop = false;
    ribbon = (
      <>
        <rect x="46" y="0" width="28" height="60" fill="#F2401C" />
        <rect x="46" y="0" width="5" height="60" fill="#000" opacity=".14" />
        <rect x="66" y="0" width="3" height="60" fill="#fff" opacity=".18" />
        <rect x="46" y="44" width="28" height="16" rx="3" fill="#F2401C" />
        <rect x="46" y="44" width="28" height="5" rx="2" fill="#fff" opacity=".25" />
        <circle cx={cx} cy={cy} r="45" fill="none" stroke="#F2401C" strokeWidth="9" />
        <circle cx={cx} cy={cy} r="49.5" fill="none" stroke="#9AA1A8" strokeWidth="1.2" />
        <circle cx={cx} cy={cy} r="40.5" fill="none" stroke="#9AA1A8" strokeWidth="1.2" />
        <circle cx={cx} cy={cy} r="35" fill="none" stroke={url('s')} strokeWidth="9.5" />
        <circle cx={cx} cy={cy} r="30.2" fill="none" stroke="#4E555C" strokeWidth=".8" />
        {arc('t', 34, true)}
        {onPath('t', 'CIRCUITO DE LAS ESTACIONES', 6.2, '#2A2F35')}
        <path d="M30 132l30-6 30 6v-16l-30-6-30 6z" fill={url('r')} stroke="#4E555C" strokeWidth=".8" />
        <path d="M60 110v16M36 118l20-4M36 123l20-4M64 114l20 4M64 119l20 4" stroke="#4E555C" strokeWidth=".8" fill="none" />
        <polygon points={P} fill="#F2401C" stroke="#8A1B05" strokeWidth="1" strokeLinejoin="round" />
        <path d="M60 80v40" stroke="#B72A0D" strokeWidth="1" />
        {eng(88, 124, 7, '2026', '#2A2F35')}
        <rect x="34" y="138" width="52" height="13" rx="3" fill={url('s')} stroke="#4E555C" strokeWidth=".8" />
        {eng(60, 148, 9.5, 'OTOÑO', '#2A2F35')}
        {shine}
      </>
    );
  } else {
    defs = grad('g', '#FFF1C2', '#E2A93B', '#8A5A12');
    ribbon = <rect x="44" y="0" width="32" height="56" fill="var(--acc)" />;
    medal = (
      <>
        <circle cx="60" cy="106" r="44" fill={url('g')} />
        <circle cx="60" cy="106" r="36" fill="none" stroke="#fff" strokeOpacity=".45" />
        {eng(60, 115, 26, km, '#5A3A08')}
        {shine}
      </>
    );
  }
  /* de estas tres hay foto de la medalla real: la cinta queda dibujada y la medalla es la foto recortada */
  const photo = RACE_PHOTO[t.k];
  return (
    <svg className="rmed" viewBox="0 0 120 160" aria-hidden="true">
      <defs>
        {silver}
        {silverR}
        {defs}
      </defs>
      {ribbon}
      {hasLoop ? loop : null}
      {hasLoop ? photo ? <image href={photo} x="12" y="58" width="96" height="96" /> : medal : null}
    </svg>
  );
}
