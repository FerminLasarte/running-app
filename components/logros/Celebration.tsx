'use client';
/* Celebración al ganar un trofeo o subir de nivel (boceto «Celebración»): el estadio a oscuras con la pista que se
   dibuja, confeti en los colores de la app, el escudo con rayos girando, el nombre en grande, la XP que sube contando y
   la barra del nivel que se completa y vuelve a arrancar. «Seguir» o «Ver la vitrina»; Esc cierra. Con «reducir
   movimiento» no hay confeti ni animaciones: se ve todo quieto, ya en su valor final.
   El host se monta una vez en el shell y, cada vez que cambian tus datos, festeja lo nuevo (una sola vez: queda
   anotado en la configuración). */
import '@/app/styles/screens/logros.css';
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useApp } from '@/lib/store';
import { reduceMotion } from '@/lib/motion';
import { closeSheet } from '@/lib/sheets';
import { goLogros } from '@/lib/data/actions';
import { celebratePending, closeCelebrate, trophyTier, type CelebrateState } from '@/lib/domain/trophies';
import { nf } from '@/lib/domain/util';
import { Button } from '@/components/pista/controls';
import { BrandTitle } from '@/components/pista/structure';
import { Shield, TIER_C, TIER_NAME } from '@/components/pista/sport';
import { cssVars } from '@/components/pista/util';
import { LO_PARTS, trophyIcon } from './util';

const N = 20;

/* la pista de fondo: 8 andariveles, el cuarto en tartán; el largo del borde para dibujarlo */
const LANES = Array.from({ length: 8 }, (_, k) => {
  const o = 60 + k * 30,
    w = 1200 - o * 2,
    h = 800 - o * 2,
    r = Math.min(340 - k * 30, h / 2);
  return { o, w, h, r, L: Math.round(2 * (w + h) - 8 * r + 2 * Math.PI * r) };
});

/** las marcas del nivel: arrancan donde estabas, se completan si subiste y vuelven a arrancar hasta donde quedaste */
function useLaps(c: CelebrateState) {
  const on0 = Math.round(c.f0 * N),
    on1 = Math.round(c.x1.f * N),
    up = c.x1.L > c.l0;
  const [on, setOn] = useState(() => (reduceMotion() ? on1 : on0));
  useEffect(() => {
    if (reduceMotion()) return;
    const steps: number[] = [];
    if (up) {
      for (let k = on0 + 1; k <= N; k++) steps.push(k);
      steps.push(0);
      for (let k = 1; k <= on1; k++) steps.push(k);
    } else for (let k = on0 + 1; k <= on1; k++) steps.push(k);
    const T = steps.map((v, j) => setTimeout(() => setOn(v), 500 + j * 120 + (up && j > N - on0 ? 250 : 0)));
    return () => T.forEach(clearTimeout);
  }, [on0, on1, up]);
  return on;
}

/** la XP que sube contando, de 0 a lo que sumaste */
function useCount(to: number) {
  const [v, setV] = useState(() => (reduceMotion() ? to : 0));
  useEffect(() => {
    if (reduceMotion()) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const f = Math.min(1, (t - t0) / 1300);
      setV(Math.round(to * (1 - Math.pow(1 - f, 3))));
      if (f < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return v;
}

function Cel({ c }: { c: CelebrateState }) {
  const best = c.T[0],
    up = c.x1.L > c.l0,
    tier = best ? trophyTier(best) : 0;
  const boxRef = useRef<HTMLDivElement>(null);
  const on = useLaps(c),
    xp = useCount(c.g);

  useEffect(() => {
    const t = setTimeout(() => boxRef.current?.querySelector<HTMLElement>('.p-btn.acc')?.focus(), 60);
    /* Esc cierra la celebración antes que cualquier panel abierto */
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      closeCelebrate();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey, true);
    };
  }, []);
  /* el foco no sale de la celebración */
  const trap = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const B = [...(boxRef.current?.querySelectorAll<HTMLElement>('button') || [])];
    const i = B.indexOf(document.activeElement as HTMLElement);
    e.preventDefault();
    B[(i + (e.shiftKey ? -1 : 1) + B.length) % B.length]?.focus();
  };
  const go = () => {
    closeCelebrate();
    closeSheet();
    goLogros(best ? LO_PARTS.vit : undefined);
  };

  return (
    <div className="lo-cel" role="dialog" aria-modal="true" aria-labelledby="lo-cel-h" onKeyDown={trap}>
      <svg className="lo-cel-lanes" viewBox="0 0 1200 800" aria-hidden="true">
        {LANES.map((q, k) => (
          <rect key={k} className={k === 3 ? 'a' : undefined} x={q.o} y={q.o} width={q.w} height={q.h} rx={q.r} style={k === 3 ? cssVars({ '--L': q.L }) : undefined} />
        ))}
      </svg>
      {c.conf.length ? (
        <div className="lo-cel-conf" aria-hidden="true">
          {c.conf.map((q, i) => (
            <i key={i} style={cssVars({ left: q.left, '--cc': q.c, '--d': q.d, '--dl': q.dl, '--dx': q.dx, '--r': q.r })} />
          ))}
        </div>
      ) : null}
      <div className="lo-cel-box" ref={boxRef}>
        {best ? (
          <>
            <div className="lo-cel-badge" style={cssVars({ '--rc': TIER_C[tier] })}>
              <div className="lo-cel-rays" />
              <Shield tier={tier} got icon={trophyIcon(best)} size={132} />
            </div>
            <span className="lbl" style={{ color: TIER_C[tier] }}>
              Nuevo trofeo · {TIER_NAME[tier]}
            </span>
            <BrandTitle as="h2" id="lo-cel-h" className="lo-cel-h">
              {best.name}
            </BrandTitle>
            <p className="lo-cel-d">
              {best.desc}
              {c.T.length > 1 ? ' Y ' + (c.T.length - 1) + (c.T.length === 2 ? ' trofeo más.' : ' trofeos más.') : ''}
            </p>
          </>
        ) : (
          <>
            <div className="lo-cel-badge lv" style={cssVars({ '--rc': 'var(--acc)' })}>
              <div className="lo-cel-rays" />
              <span className="lo-cel-num">{c.x1.L}</span>
            </div>
            <span className="lbl">Subiste de nivel</span>
            <BrandTitle as="h2" id="lo-cel-h" className="lo-cel-h">
              {c.x1.title}
            </BrandTitle>
          </>
        )}
        {c.g > 0 ? (
          <div className="lo-cel-xp">
            <span className="disp">
              +{nf(xp)}
              <span className="p-u">XP</span>
            </span>
          </div>
        ) : null}
        <div className="lo-cel-lv">
          <div className="lo-rowb">
            <span className="lbl">{up ? 'Nivel ' + c.l0 + ' → ' + c.x1.L : 'Nivel ' + c.x1.L}</span>
            <span>
              {up && best ? (
                <>
                  Ahora sos <b>{c.x1.title}</b>
                </>
              ) : (
                <>
                  Faltan <b>{nf(c.x1.b - c.x1.total)}</b> para el {c.x1.L + 1}
                </>
              )}
            </span>
          </div>
          <span className="p-laps on-dark lo-cel-laps" style={cssVars({ '--n': N })} role="img" aria-label={Math.round(c.x1.f * 100) + '% al nivel ' + (c.x1.L + 1)}>
            {Array.from({ length: N }, (_, k) => (
              <i key={k} className={k < on ? 'on' : undefined} />
            ))}
          </span>
        </div>
        <div className="lo-cel-acts">
          <Button variant="on-dark" onClick={closeCelebrate}>
            Seguir
          </Button>
          <Button variant="acc" arrow onClick={go}>
            {best ? 'Ver la vitrina' : 'Ver tu personaje'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Celebration() {
  const c = useApp((st) => st.ui.celebrate) as CelebrateState | null | undefined;
  const loaded = useApp((s) => s.loaded && s.fresh),
    sessions = useApp((s) => s.sessions),
    routes = useApp((s) => s.routes),
    races = useApp((s) => s.cfg.races),
    challenges = useApp((s) => s.cfg.challenges);
  /* al abrir la app y cada vez que llega algo (la nube, Strava, una carga): festeja lo que haya de nuevo */
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(celebratePending, 600);
    return () => clearTimeout(t);
  }, [loaded, sessions, routes, races, challenges]);
  return c ? <Cel key={c.key} c={c} /> : null;
}
export default Celebration;
