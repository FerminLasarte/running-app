'use client';
/* Nuevo desafío: uno de los sugeridos según tus últimas semanas (se crea con un toque) o el tuyo, con tipo, meta y
   fechas; el nombre se arma solo si no ponés uno. */
import { useState } from 'react';
import { closeSheet } from '@/lib/sheets';
import { S } from '@/lib/store';
import { CH_KINDS, CH_KIND_KEYS, addChallenge, chDay, chPresets, type ChKind, type ChSpec } from '@/lib/domain/challenges';
import { addDays, dShort, fmt, num, pd, sod, ymd } from '@/lib/domain/util';
import { Choices } from '@/components/pista/controls';
import { Field, Input, UnitInput } from '@/components/pista/fields';
import { PanelActions, PanelFrame, PanelSection } from './PanelFrame';

const HINT: Record<ChKind, string> = {
  km: 'Suma los km de tus salidas en esas fechas.',
  runs: 'Cuenta las salidas.',
  hours: 'Suma el tiempo corriendo.',
  long: 'Se cumple con una sola salida de esa distancia.',
  plan: 'Porcentaje de las sesiones planificadas en esas fechas que hiciste (meta 100%).',
};

export default function ChallengePanel() {
  const [f, setF] = useState(() => {
    const t = sod(new Date());
    return { ck: 'km' as ChKind, target: '', from: ymd(t), to: ymd(addDays(t, 29)), name: '' };
  });
  const [err, setErr] = useState('');
  /* los sugeridos que todavía no agregaste */
  const [sug] = useState(() => chPresets().filter((q) => !(S.cfg.challenges || []).some((c) => c.kind === q.kind && c.from === q.from && c.to === q.to)));
  const pick = (q: ChSpec) => {
    addChallenge(q);
    closeSheet();
  };
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
    <PanelFrame eyebrow="Logros" title="Nuevo desafío" onSubmit={save} err={err || null} foot={<PanelActions label="Crear desafío" onSave={save} />}>
      {sug.length ? (
        <PanelSection title="Sugeridos">
          <div className="p-choices" role="group" aria-label="Desafíos sugeridos">
            {sug.map((q) => (
              <button key={q.name} type="button" onClick={() => pick(q)}>
                {q.name}
                <small>
                  {chDay(q.from)} al {chDay(q.to)}
                </small>
              </button>
            ))}
          </div>
          <p className="p-dr-hint">Se crea con un toque. O armá el tuyo abajo.</p>
        </PanelSection>
      ) : null}
      <PanelSection no="01" title="Tipo">
        <Choices label="Tipo de desafío" value={f.ck} onChange={(k) => k && set(k === 'plan' ? { ck: k, target: '100' } : { ck: k })} options={CH_KIND_KEYS.map((k) => ({ value: k, label: CH_KINDS[k].n }))} />
        <p className="p-dr-hint">{HINT[f.ck]}</p>
      </PanelSection>
      <PanelSection no="02" title="Meta y fechas">
        <Field id="ch-target" label="Meta">
          <UnitInput id="ch-target" unit={CH_KINDS[f.ck].u} autoFocus value={f.target} onChange={(e) => set({ target: e.target.value })} />
        </Field>
        <div className="p-dr-g2" style={{ marginTop: 16 }}>
          <Field id="ch-from" label="Desde">
            <Input id="ch-from" type="date" value={f.from} onChange={(e) => set({ from: e.target.value })} />
          </Field>
          <Field id="ch-to" label="Hasta">
            <Input id="ch-to" type="date" value={f.to} onChange={(e) => set({ to: e.target.value })} />
          </Field>
        </div>
        <div style={{ marginTop: 16 }}>
          <Field id="ch-name" label="Nombre (opcional)">
            <Input id="ch-name" maxLength={40} placeholder="Se arma solo" value={f.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
        </div>
      </PanelSection>
    </PanelFrame>
  );
}
