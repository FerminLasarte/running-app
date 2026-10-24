'use client';
/* Detalle de un trofeo (openTrophy del original). */
import type { CSSProperties } from 'react';
import { useS } from '@/lib/store';
import { closeSheet } from '@/lib/sheets';
import { CAT_N, rarOf, trophies, trophyProg, trophyXp } from '@/lib/domain/trophies';
import { dateLabel, fmt, fmtDur } from '@/lib/domain/util';
import { MedalSvg } from '@/components/logros/MedalSvg';
import { SheetFrame } from './SheetFrame';

export default function TrophySheet({ id }: { id: string }) {
  useS();
  const t = trophies().find((q) => q.id === id);
  if (!t) return null;
  const r = rarOf(t),
    p = trophyProg(t),
    fv = t.fmtV || ((v: number) => fmt(v, 0));
  let left = '';
  if (!t.got)
    left = t.unit === 'time' ? (t.cur ? 'Tu mejor: ' + fv(t.cur) + '. Te faltan ' + fmtDur(t.cur - t.target) + '.' : '') : t.cur != null && t.target < 1e6 ? 'Llevás ' + fv(t.cur) + ' ' + t.unit + ' de ' + fv(t.target) + '.' : '';
  return (
    <SheetFrame
      title={t.got ? 'Trofeo ganado' : 'Trofeo por ganar'}
      foot={
        <button className="btn pri blk" data-a="close" onClick={closeSheet}>
          Listo
        </button>
      }
    >
      <div className={'md-detail md-' + r.k + (t.got ? '' : ' off')}>
        <MedalSvg t={t} prog={p} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <span className="lv-tag" style={{ '--bc': r.c } as CSSProperties}>
          {r.n}
        </span>
        <div className="h2" style={{ marginTop: 6 }}>
          {t.name}
        </div>
        <p className="sub">{CAT_N[t.cat]}</p>
      </div>
      <div className="lv-box" style={{ textAlign: 'center' }}>
        {t.desc}
      </div>
      {t.got ? (
        <p style={{ textAlign: 'center', marginTop: 14 }}>
          Lo ganaste el <b>{dateLabel(t.date!)}</b> · <b style={{ color: r.c }}>+{trophyXp(t)} XP</b>
        </p>
      ) : (
        <>
          {p != null ? (
            <div className="meter" style={{ marginTop: 16, '--bc': r.c } as CSSProperties}>
              <i style={{ width: Math.round(p * 100) + '%' }}></i>
            </div>
          ) : null}
          <p style={{ textAlign: 'center', marginTop: 10 }}>
            {left} Vale <b style={{ color: r.c }}>+{trophyXp(t)} XP</b>.
          </p>
        </>
      )}
    </SheetFrame>
  );
}
