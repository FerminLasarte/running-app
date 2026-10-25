'use client';
/* Celebración al ganar trofeos o subir de nivel (celebrate del original). Se monta una vez en el shell;
   también pone los degradados compartidos de las medallas. */
import { useEffect, useRef, type CSSProperties } from 'react';
import { setUi, useApp } from '@/lib/store';
import { closeSheet } from '@/lib/sheets';
import { jumpTo } from '@/lib/data/actions';
import { navigate } from '@/lib/nav';
import { closeCelebrate, rarOf, trophyXp, type CelebrateState } from '@/lib/domain/trophies';
import { nf } from '@/lib/domain/util';
import { MedalDefs, MedalSvg } from './MedalSvg';

const cssVars = (o: Record<string, string | number>) => o as CSSProperties;

function Celebrate({ c }: { c: CelebrateState }) {
  const { T, x0, x1, g } = c;
  const best = T.slice().sort((a, b) => trophyXp(b) - trophyXp(a))[0],
    up = x1.L > x0.L;
  const r = best ? rarOf(best) : null;
  const goRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t = setTimeout(() => goRef.current?.focus(), 50);
    /* Escape cierra la celebración antes que cualquier hoja abierta */
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

  const go = () => {
    closeCelebrate();
    closeSheet();
    setUi('logSub', best ? 'vit' : 'pj');
    navigate('/logros', () => jumpTo(0));
  };

  return (
    <div id="celebrate" className="celebrate" role="dialog" aria-modal="true" aria-label="Nuevo logro">
      <div className="cel-conf" aria-hidden="true">
        {c.conf.map((q, i) => (
          <i key={i} style={cssVars({ left: q.left, background: q.bg, animationDelay: q.delay, animationDuration: q.dur, '--dx': q.dx, '--rot': q.rot })}></i>
        ))}
      </div>
      <div className="cel-box">
        {best && r ? (
          <>
            <div className="cel-rays" style={cssVars({ '--rc': r.c })}></div>
            <div className={'cel-md md-' + r.k}>
              <MedalSvg t={best} />
            </div>
            <div className="eyebrow" style={{ color: r.c }}>
              Nuevo trofeo · {r.n}
            </div>
            <div className="h2">{best.name}</div>
            <p className="sub">{best.desc}</p>
            {T.length > 1 ? (
              <p className="sub" style={{ marginTop: 4 }}>
                {'Y ' + (T.length - 1) + (T.length === 2 ? ' trofeo más' : ' trofeos más') + '.'}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <div className="cel-lv">{x1.L}</div>
            <div className="eyebrow">Subiste de nivel</div>
            <div className="h2">{x1.title}</div>
          </>
        )}
        <div className="cel-xp">+{nf(g)} XP</div>
        {best && up ? <p className="cel-up">{'¡Subiste a nivel ' + x1.L + '!' + (x1.title !== x0.title ? ' Ahora sos ' + x1.title + '.' : '')}</p> : null}
        <div className="acts" style={{ marginTop: 16 }}>
          <button className="btn" data-a="cel-close" onClick={closeCelebrate}>
            Seguir
          </button>
          <button ref={goRef} className="btn pri" data-a="cel-go" onClick={go}>
            {best ? 'Ver vitrina' : 'Ver personaje'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CelebrateHost() {
  const c = useApp((st) => st.ui.celebrate) as CelebrateState | null | undefined;
  return (
    <>
      <MedalDefs />
      {c ? <Celebrate key={c.key} c={c} /> : null}
    </>
  );
}
export default CelebrateHost;
