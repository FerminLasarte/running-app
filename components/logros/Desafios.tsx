'use client';
/* Desafíos: activos, sugeridos y terminados. */
import type { CSSProperties } from 'react';
import { S, getUi, setUi, useS } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import { blockDemo, saveCfg, toast } from '@/lib/data/actions';
import { addChallenge, chKindOf, chPresets, chProgress } from '@/lib/domain/challenges';
import type { Challenge } from '@/lib/domain/types';
import { cleanObj, dayDiff, dShort, fmt, pd, sod, todayS } from '@/lib/domain/util';

const cssVars = (o: Record<string, string | number>) => o as CSSProperties;

/* borrar pide un segundo toque */
function delChallenge(id: string) {
  if (blockDemo()) return;
  if (getUi<string | null>('chDel', null) !== id) {
    setUi('chDel', id);
    toast('Tocá «Borrar» de nuevo para confirmar.', 3500);
    return;
  }
  setUi('chDel', null);
  const c = cleanObj(S.cfg);
  c.challenges = (c.challenges || []).filter((x) => x.id !== id);
  saveCfg(c);
  toast('Desafío borrado');
}

function ChCard({ c }: { c: Challenge }) {
  const p = chProgress(c),
    K = chKindOf(c.kind),
    f = Math.min(1, p.cur / c.target),
    tS = todayS(),
    left = dayDiff(sod(new Date()), pd(c.to));
  const fv = (v: number) => (c.kind === 'runs' ? fmt(v, 0) : c.kind === 'plan' ? fmt(v, 0) : fmt(v, 1));
  let st;
  if (p.done)
    st = (
      <span className="lv-tag" style={cssVars({ '--bc': 'var(--good)' })}>
        Cumplido el {dShort(pd(p.doneDate!))}
      </span>
    );
  else if (p.over)
    st = (
      <span className="lv-tag" style={cssVars({ '--bc': 'var(--serious)' })}>
        Terminó: {fv(p.cur)} de {fv(c.target)} {K.u}
      </span>
    );
  else if (c.from > tS)
    st = (
      <span className="lv-tag" style={cssVars({ '--bc': 'var(--info)' })}>
        Empieza el {dShort(pd(c.from))}
      </span>
    );
  else {
    const need = c.target - p.cur,
      per = left > 0 ? need / (left + 1) : need;
    st = (
      <span className="mut" style={{ fontSize: 14 }}>
        {'Faltan ' +
          (left + 1) +
          (left === 0 ? ' día' : ' días') +
          (c.kind === 'km' && need > 0 ? ' · necesitás ' + fmt(per, 1) + ' km por día' : c.kind === 'runs' && need > 0 ? ' · te faltan ' + Math.ceil(need) + ' salidas' : '')}
      </span>
    );
  }
  return (
    <div className="lrow" style={cssVars({ '--kc2': p.done ? 'var(--good)' : p.over ? 'var(--base)' : 'var(--c1)' })}>
      <div className="lhd">
        <div>
          <b>{c.name}</b>
          <small>
            {K.n} · {dShort(pd(c.from))} al {dShort(pd(c.to))}
          </small>
        </div>
        <button className="chip s" data-a="ch-del" data-id={c.id} aria-label="Borrar desafío" onClick={() => delChallenge(c.id)}>
          Borrar
        </button>
      </div>
      <div className="lv-r">
        <span className="num">
          {fv(p.cur)}{' '}
          <small className="mut">
            de {fv(c.target)} {K.u}
          </small>
        </span>
        <span className="num">{Math.round(f * 100)}%</span>
      </div>
      <div className="meter" style={cssVars({ '--bc': p.done ? 'var(--good)' : 'var(--c1)' })}>
        <i style={{ width: Math.round(f * 100) + '%' }}></i>
      </div>
      <div style={{ marginTop: 8 }}>{st}</div>
    </div>
  );
}

export default function Desafios() {
  useS();
  const C = (S.cfg.challenges || []).slice(),
    tS = todayS();
  const act = C.filter((c) => c.to >= tS && !chProgress(c).done),
    fin = C.filter((c) => !(c.to >= tS && !chProgress(c).done)).sort((a, b) => b.to.localeCompare(a.to));
  const P = chPresets().filter((q) => !C.some((c) => c.kind === q.kind && c.from === q.from && c.to === q.to));
  return (
    <>
      <section className="card">
        <div className="h3">Desafíos activos</div>
        {act.length ? act.map((c) => <ChCard key={c.id} c={c} />) : <p className="sub">No tenés desafíos en curso. Elegí uno de abajo o armá el tuyo.</p>}
      </section>
      <section className="card">
        <div className="h3">Sumar un desafío</div>
        <div className="sub">Sugeridos según tus últimas semanas.</div>
        <div className="chips" style={{ marginTop: 10 }}>
          {P.map((q, i) => (
            <button key={i} className="chip" data-a="ch-preset" data-i={i} onClick={() => addChallenge(q)}>
              + {q.name}
            </button>
          ))}
        </div>
        <button className="btn blk" style={{ marginTop: 12 }} data-a="ch-new" onClick={() => openSheet('challenge')}>
          Armar mi propio desafío
        </button>
      </section>
      {fin.length ? (
        <section className="card">
          <div className="h3">Terminados</div>
          {fin.map((c) => (
            <ChCard key={c.id} c={c} />
          ))}
        </section>
      ) : null}
    </>
  );
}
