'use client';
/* Campos de tiempo (h:min:s) y ritmo (min:s), controlados. Reemplazan a hmsFields/readHMS/readMS/setHMS/setMS.
   Leer y armar los valores (sin interfaz) está en lib/domain/hms.ts. */
import type { Hms, Ms } from '@/lib/domain/hms';

/** horas : minutos : segundos (ids `${id}-h`, `${id}-m`, `${id}-s`, como el original) */
export function HmsInput({ id, value, onChange }: { id: string; value: Hms; onChange: (v: Hms) => void }) {
  const f = (k: keyof Hms, ph: string, label: string) => (
    <input className="in" id={id + '-' + k} inputMode="numeric" placeholder={ph} aria-label={label} value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
  );
  return (
    <div className="row">
      {f('h', 'h', 'horas')}
      <span className="u">:</span>
      {f('m', 'min', 'minutos')}
      <span className="u">:</span>
      {f('s', 's', 'segundos')}
    </div>
  );
}

/** minutos : segundos por km */
export function MsInput({
  id,
  value,
  onChange,
  unit = '/km',
  ph = ['min', 's'],
  labels = ['minutos', 'segundos'],
}: {
  id: string;
  value: Ms;
  onChange: (v: Ms) => void;
  unit?: string;
  /** textos de ayuda de minutos y segundos */
  ph?: [string, string];
  labels?: [string, string];
}) {
  return (
    <div className="row">
      <input className="in" id={id + '-m'} inputMode="numeric" placeholder={ph[0]} aria-label={labels[0]} value={value.m} onChange={(e) => onChange({ ...value, m: e.target.value })} />
      <span className="u">:</span>
      <input className="in" id={id + '-s'} inputMode="numeric" placeholder={ph[1]} aria-label={labels[1]} value={value.s} onChange={(e) => onChange({ ...value, s: e.target.value })} />
      {unit ? <span className="u">{unit}</span> : null}
    </div>
  );
}
