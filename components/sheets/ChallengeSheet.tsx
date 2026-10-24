'use client';
/* Nuevo desafío (openChallenge / paintChallenge / saveChallenge del original). */
import { useState } from 'react';
import { closeSheet } from '@/lib/sheets';
import { CH_KINDS, CH_KIND_KEYS, addChallenge, type ChKind } from '@/lib/domain/challenges';
import { addDays, dShort, fmt, num, pd, sod, ymd } from '@/lib/domain/util';
import { SheetFrame } from './SheetFrame';

const HINT: Record<ChKind, string> = {
  km: 'Suma los km de tus salidas en esas fechas.',
  runs: 'Cuenta las salidas.',
  hours: 'Suma el tiempo corriendo.',
  long: 'Se cumple con una sola salida de esa distancia.',
  plan: 'Porcentaje de las sesiones planificadas en esas fechas que hiciste (meta 100%).',
};

export default function ChallengeSheet() {
  const [f, setF] = useState(() => {
    const t = sod(new Date());
    return { ck: 'km' as ChKind, target: '', from: ymd(t), to: ymd(addDays(t, 29)), name: '' };
  });
  const [err, setErr] = useState('');
  const set = (p: Partial<typeof f>) => setF((o) => ({ ...o, ...p }));

  const save = () => {
    const t = num(f.target),
      a = f.from,
      b = f.to;
    if (!(t != null && t > 0)) return setErr('Poné una meta mayor a cero.');
    if (!a || !b || b < a) return setErr('Revisá las fechas: «hasta» tiene que ser después de «desde».');
    const K = CH_KINDS[f.ck],
      nm =
        f.name.trim() ||
        (f.ck === 'plan' ? 'Todo el plan' : f.ck === 'long' ? 'Salida de ' + fmt(t, 1) + ' km' : fmt(t, f.ck === 'hours' ? 1 : 0) + ' ' + K.u) + ' (' + dShort(pd(a)) + ' al ' + dShort(pd(b)) + ')';
    addChallenge({ kind: f.ck, target: t, from: a, to: b, name: nm.slice(0, 60) });
    closeSheet();
  };

  return (
    <SheetFrame
      title="Nuevo desafío"
      foot={
        <button className="btn pri blk" data-a="ch-save" onClick={save}>
          Crear desafío
        </button>
      }
    >
      <div className="field">
        <span className="lab">Tipo</span>
        <div className="chips">
          {CH_KIND_KEYS.map((k) => (
            <button key={k} className="chip" data-a="ch-kind" data-v={k} aria-pressed={f.ck === k} onClick={() => set(k === 'plan' ? { ck: k, target: '100' } : { ck: k })}>
              {CH_KINDS[k].n}
            </button>
          ))}
        </div>
        <p className="hint" id="ch-hint">
          {HINT[f.ck]}
        </p>
      </div>
      <div className="field">
        <label htmlFor="ch-target">Meta</label>
        <div className="row">
          <input className="in" id="ch-target" inputMode="decimal" value={f.target} onChange={(e) => set({ target: e.target.value })} />
          <span className="u" id="ch-u">
            {CH_KINDS[f.ck].u}
          </span>
        </div>
      </div>
      <div className="g2">
        <div className="field">
          <label htmlFor="ch-from">Desde</label>
          <input className="in" type="date" id="ch-from" value={f.from} onChange={(e) => set({ from: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="ch-to">Hasta</label>
          <input className="in" type="date" id="ch-to" value={f.to} onChange={(e) => set({ to: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="ch-name">Nombre (opcional)</label>
        <input className="in l" id="ch-name" maxLength={40} placeholder="Se arma solo" value={f.name} onChange={(e) => set({ name: e.target.value })} />
      </div>
      <div className="err" id="ch-err" role="alert">
        {err}
      </div>
    </SheetFrame>
  );
}
