/* ---- medalla de finisher, nivel premium ----
   · la forma dice la rareza: común = disco liso, rara = canto acuñado, épica = rayos de sol, legendaria = estrella de orden
   · bisel de dos tonos + cara cóncava con brillo radial: se ve metal macizo, no un círculo pintado
   · emblema en relieve (sombra abajo-derecha, luz arriba-izquierda) y laureles en épica y legendaria
   · cinta tejida a dos aguas con franja central, pliegue y argolla de metal */
import { Fragment, useId, type ReactNode } from 'react';
import { RARITY, catBase, rarOf, type Trophy } from '@/lib/domain/trophies';

const EMB: Record<string, ReactNode> = {
  tot: (
    <>
      <path d="M5 21 10 3M19 21 14 3" />
      <path d="M12 5v2M12 10v2M12 15v2" />
    </>
  ),
  long: (
    <>
      <path d="M2 20 9 8l4 6 3-4 6 10z" />
      <path d="m7.5 10.5 1.5 1 1.5-1" />
    </>
  ),
  pr: (
    <>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 13.5V9.5M10 3h4M12 3v3.5M18 7l1.5-1.5" />
    </>
  ),
  race: (
    <>
      <path d="M5 22V3" />
      <path d="M5 4h12l-2.5 4L17 12H5" />
    </>
  ),
  week: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="m9 15 2 2 4-4" />
    </>
  ),
  month: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2" />
    </>
  ),
  streak: <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.5-4.5 2.5-6.5 1 1.2 2 1.8 3 1.8 0-2.5-.5-4.5.5-7.3z" />,
  runs: (
    <>
      <path d="M3 15.5h11.5l4.5-2c1.5-.8 1.2-3-.8-3h-3.7L11.3 7l-3 1 1 2.6L3 12.5z" />
      <path d="M3 19h18" />
    </>
  ),
  hours: (
    <>
      <path d="M7 3h10M7 21h10" />
      <path d="M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" />
    </>
  ),
  plan: (
    <>
      <path d="M10 6h10M10 12h10M10 18h10" />
      <path d="m3.5 6 1.5 1.5 2.5-2.5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5" />
    </>
  ),
  score: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  area: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" />
    </>
  ),
  ch: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8" />
    </>
  ),
};
const RIB: Record<string, string> = {
  tot: 'var(--t1)',
  long: 'var(--t3)',
  pr: 'var(--t2)',
  race: 'var(--t5)',
  week: 'var(--t4)',
  month: 'var(--t4)',
  streak: 'var(--serious)',
  runs: 'var(--info)',
  hours: 'var(--t5)',
  plan: 'var(--good)',
  score: 'var(--warn)',
  area: 'var(--t3)',
  ch: 'var(--accent)',
};

const MD_C = [50, 80];
const ptsAround = (n: number, ra: number, rb: number, rot?: number) => {
  const p: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + (rot || 0),
      r = i % 2 ? rb : ra;
    p.push((MD_C[0] + r * Math.sin(a)).toFixed(2) + ',' + (MD_C[1] - r * Math.cos(a)).toFixed(2));
  }
  return p.join(' ');
};
const MD_SHAPE: Record<string, { R: number; outer: ReactNode; rays?: ReactNode; rays2?: ReactNode }> = {
  com: { R: 37, outer: <circle cx="50" cy="80" r="37" /> },
  rar: { R: 36.5, outer: <polygon points={ptsAround(40, 38.4, 36.6, 0)} /> },
  epi: { R: 34.5, rays: <polygon points={ptsAround(16, 44, 33, Math.PI / 16)} />, outer: <circle cx="50" cy="80" r="35.5" /> },
  leg: {
    R: 32.5,
    rays: <polygon points={ptsAround(8, 45, 31, 0)} />,
    rays2: <polygon points={ptsAround(8, 40, 30, Math.PI / 8)} />,
    outer: <circle cx="50" cy="80" r="33.5" />,
  },
};
function mdStar(x: number, y: number, r: number) {
  let p = '';
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2,
      rr = i % 2 ? r * 0.45 : r;
    p += (x + rr * Math.cos(a)).toFixed(2) + ',' + (y + rr * Math.sin(a)).toFixed(2) + ' ';
  }
  return p;
}
function MdLaurel({ R, fill }: { R: number; fill: string }) {
  /* dos ramas de hojas que suben por los costados del campo */
  const h: ReactNode[] = [];
  [-1, 1].forEach((sd) => {
    for (let i = 0; i < 7; i++) {
      const a = ((30 + i * 17) * Math.PI) / 180,
        x = 50 + sd * R * Math.sin(a),
        y = 80 + R * Math.cos(a);
      /* la hoja sigue la curva (tangente) y se abre un poco hacia afuera, como una rama de laurel real */
      const rot = (Math.atan2(-Math.sin(a), sd * Math.cos(a)) * 180) / Math.PI - sd * 32;
      h.push(<ellipse key={sd + '_' + i} cx={x.toFixed(2)} cy={y.toFixed(2)} rx="3.6" ry="1.5" transform={'rotate(' + rot.toFixed(1) + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ')'} />);
    }
  });
  return <g fill={fill}>{h}</g>;
}
const DIST_LAB: Record<string, string> = { '5': '5K', '10': '10K', '15': '15K', '21': '21K', '42': '42K' };

/** Medalla de un trofeo. `prog` (0–1) dibuja el anillo de progreso en las bloqueadas. */
export function MedalSvg({ t, prog }: { t: Trophy; prog?: number | null }) {
  /* cada medalla necesita su propio recorte para el brillo que la cruza */
  const clipId = 'mc' + useId().replace(/[^\w-]/g, '');
  const r = rarOf(t),
    cb = catBase(t.cat),
    got = t.got;
  const m = got ? r.k : 'lock',
    sh = MD_SHAPE[got ? r.k : 'com'],
    R = sh.R,
    ink = got ? r.ink : '#8C97A6';
  const lab = cb === 'pr' ? DIST_LAB[t.cat.slice(2)] || '' : '';
  const rib = got ? RIB[cb] : '#3A4350',
    ri = RARITY.findIndex((q) => q.k === r.k);
  const mg = 'url(#mg-' + m + ')',
    mr = 'url(#mr-' + m + ')',
    mf = 'url(#mf-' + m + ')';
  let progEl: ReactNode = null;
  if (!got && prog != null) {
    const C = 2 * Math.PI * 42;
    progEl = (
      <>
        <circle cx="50" cy="80" r="42" fill="none" stroke="var(--line)" strokeWidth="2.6" />
        <circle cx="50" cy="80" r="42" fill="none" stroke={r.c} strokeWidth="2.6" strokeLinecap="round" strokeDasharray={(C * prog).toFixed(1) + ' ' + C.toFixed(1)} transform="rotate(-90 50 80)" />
      </>
    );
  }
  /* cinta tejida: dos tiras con franja central, la de atrás más oscura, y el pliegue sobre la argolla */
  const strap = (pts: string, stripe: string, dark: boolean) => (
    <>
      <polygon points={pts} fill={rib} />
      {dark ? <polygon points={pts} fill="#000" opacity=".22" /> : null}
      <polygon points={stripe} fill="#fff" opacity={got ? 0.85 : 0.25} />
      <polygon points={pts} fill="url(#mg-weave)" opacity=".35" />
    </>
  );
  /* emblema en relieve */
  const s = lab ? 1.2 : 1.32,
    cy = lab ? 75 : 80,
    tx = (50 - 12 * s).toFixed(2),
    ty = (cy - 12 * s).toFixed(2);
  const emb = (dx: number, dy: number, col: string, op: number, w: number) => (
    <g transform={'translate(' + (+tx + dx) + ' ' + (+ty + dy) + ') scale(' + s + ')'} fill="none" stroke={col} strokeOpacity={op} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      {EMB[cb]}
    </g>
  );
  return (
    <svg className="md-svg" viewBox="0 0 100 126" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>{sh.rays ? <circle cx="50" cy="80" r="44" /> : <circle cx="50" cy="80" r={R + 1.5} />}</clipPath>
      </defs>
      <g className="rib">
        {strap('59,0 77,0 54,45 46,42', '66.5,0 69.5,0 51.4,44 49.6,43.2', true)}
        {strap('23,0 41,0 54,42 46,45', '30.5,0 33.5,0 50.4,43.2 48.6,44', false)}
        <path d="M43 41.5h14l-2.2 5.5h-9.6z" fill="#000" opacity=".28" />
        <rect x="44.5" y="40" width="11" height="5.4" rx="2.7" fill={mg} stroke="#000" strokeOpacity=".25" strokeWidth=".6" />
        <circle cx="50" cy="45.6" r="2.6" fill="none" stroke={mr} strokeWidth="1.8" />
      </g>
      {progEl}
      {/* cuerpo de metal */}
      <g className="disc">
        {sh.rays2 ? (
          <g fill={mr} opacity=".9">
            {sh.rays2}
          </g>
        ) : null}
        {sh.rays ? (
          <g fill={mg} stroke="#000" strokeOpacity=".18" strokeWidth=".6">
            {sh.rays}
          </g>
        ) : null}
        <g fill={mg} stroke="#000" strokeOpacity=".22" strokeWidth=".7">
          {sh.outer}
        </g>
        {/* bisel */}
        <circle cx="50" cy="80" r={R - 2.6} fill={mr} />
        {/* cara cóncava */}
        <circle cx="50" cy="80" r={R - 4.6} fill={mf} />
        <circle cx="50" cy="80" r={R - 4.6} fill="none" stroke="#000" strokeOpacity=".18" strokeWidth="1" />
        <circle cx="50" cy="80" r={R - 7.6} fill="none" stroke={ink} strokeOpacity=".32" strokeWidth=".8" strokeDasharray={got ? '0' : '1.6 2.2'} />
        {got && (r.k === 'epi' || r.k === 'leg') ? <MdLaurel R={R - 10.5} fill={ink + '99'} /> : null}
        {got ? (
          <>
            {emb(0.7, 0.8, '#000', 0.28, 1.9)}
            {emb(-0.5, -0.6, '#fff', 0.6, 1.6)}
            {emb(0, 0, ink, 0.95, 1.7)}
          </>
        ) : (
          emb(0, 0, ink, 0.5, 1.6)
        )}
        {/* distancia en una cinta, o estrellas según la rareza */}
        {lab ? (
          <g>
            <path d="M33 95.5h34l-2.5 4 2.5 4H33l2.5-4z" fill={ink} opacity={got ? 0.92 : 0.55} />
            <text x="50" y="102.3" textAnchor="middle" fontFamily="Barlow Condensed,Arial Narrow,sans-serif" fontWeight="700" fontSize="8.6" letterSpacing=".08em" fill={mf}>
              {lab}
            </text>
          </g>
        ) : got ? (
          <g fill={ink} opacity=".75">
            {Array.from({ length: ri + 1 }, (_, k) => (
              <polygon key={k} points={mdStar(50 + (k - ri / 2) * 6.2, 104 - (R < 36 ? 3 : 0), 2.3)} />
            ))}
          </g>
        ) : null}
        {/* brillo: reflejo suave arriba a la izquierda y filo de luz en el canto */}
        <ellipse cx="38" cy="64" rx="15" ry="6.5" fill="#fff" opacity={got ? 0.28 : 0.07} transform="rotate(-32 38 64)" />
        <path
          d={'M' + (50 - R * Math.sin(0.9)).toFixed(1) + ' ' + (80 - R * Math.cos(0.9)).toFixed(1) + 'A' + R + ' ' + R + ' 0 0 1 ' + (50 + R * Math.sin(0.35)).toFixed(1) + ' ' + (80 - R * Math.cos(0.35)).toFixed(1)}
          fill="none"
          stroke="#fff"
          strokeOpacity={got ? 0.65 : 0.15}
          strokeWidth="1.1"
          strokeLinecap="round"
          transform="rotate(-25 50 80)"
        />
        {!got ? (
          <g transform="translate(64 93)">
            <circle r="8.5" fill="#1C222B" stroke="#566273" />
            <path d="M-3.5 0h7v5h-7zM-2.2 0v-2.3a2.2 2.2 0 0 1 4.4 0V0" fill="none" stroke="#B7C1CD" strokeWidth="1.5" strokeLinejoin="round" transform="translate(0 -1.5)" />
          </g>
        ) : null}
        <rect className="sweep" x="-70" y="30" width="30" height="100" fill="url(#mg-sheen)" clipPath={'url(#' + clipId + ')'} />
      </g>
    </svg>
  );
}

/* degradados compartidos: metal (mg), bisel invertido (mr), cara cóncava (mf), trama de la cinta y brillo.
   Van una sola vez en la página (los monta <CelebrateHost/>). */
const MD_M: Record<string, string[]> = {
  com: ['#F8D3A8', '#D78C4C', '#8F4C20', '#E6A86C', '#A85D27'],
  rar: ['#FFFFFF', '#D6DEE8', '#8695A7', '#F1F5F9', '#9DABBB'],
  epi: ['#FFF7C7', '#F7CD3B', '#AD7A05', '#FFE47F', '#CF9714'],
  leg: ['#F1FDFF', '#A9E4FF', '#C7B2FF', '#FFC9EC', '#B6F0FF'],
  lock: ['#56606F', '#323A45', '#232A33', '#47515F', '#2B323C'],
};
const MD_F: Record<string, string[]> = {
  com: ['#FBE3C4', '#D99456', '#9C5524'],
  rar: ['#FFFFFF', '#DCE3EC', '#97A5B6'],
  epi: ['#FFF9D6', '#F6CC45', '#B98309'],
  leg: ['#FFFFFF', '#CFEFFF', '#C9B6FF'],
  lock: ['#4A5462', '#343C47', '#262D36'],
};
const stops = (a: string[]) => a.map((c, i) => <stop key={i} offset={(i / (a.length - 1)).toFixed(2)} stopColor={c} />);
export function MedalDefs() {
  return (
    <div id="md-defs" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <svg width="0" height="0" aria-hidden="true">
        <defs>
          {Object.keys(MD_M).map((k) => (
            <Fragment key={k}>
              <linearGradient id={'mg-' + k} x1="0" y1="0" x2="1" y2="1">
                {stops(MD_M[k])}
              </linearGradient>
              <linearGradient id={'mr-' + k} x1="1" y1="1" x2="0" y2="0">
                {stops(MD_M[k])}
              </linearGradient>
              <radialGradient id={'mf-' + k} cx=".38" cy=".3" r=".85">
                {stops(MD_F[k])}
              </radialGradient>
            </Fragment>
          ))}
          <pattern id="mg-weave" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
            <rect width="3" height="1.2" fill="#000" opacity=".35" />
          </pattern>
          <linearGradient id="mg-sheen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".75" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
