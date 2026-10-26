'use client';
/* La barra de filtros del Registro: tipo (con la cantidad de cada uno), búsqueda (tecla «/»), estado y período. */
import { useEffect, useRef, useState } from 'react';
import { CalendarBlank, ListChecks } from '@phosphor-icons/react';
import type { SessionType } from '@/lib/domain/types';
import { S } from '@/lib/store';
import { TYPES, TYPE_KEYS } from '@/lib/domain/config';
import { LG_PERIODS, LG_ST, type LgStatus } from '@/lib/domain/log';
import { Segmented, SelectButton, type SegOption } from '@/components/pista/controls';
import { SearchField } from '@/components/pista/fields';
import { cssVars, typeColor } from '@/components/pista/util';
import { typingIn } from '@/components/shell/useShortcuts';
import type { RegFilters } from './filters';

/* estados: primero todos (el Registro muestra hechas, planificadas y no hechas juntas) */
const ESTADOS: [LgStatus | 'all', string][] = [['all', 'Todos los estados'], ...LG_ST.filter((x) => x[0] !== 'all')];

/** la búsqueda: lo que se tipea se ve al instante y va a la URL. Si la URL cambia por otro lado (atrás, un link de la
    paleta, volver a la sección) y no estás tipeando, el campo la sigue */
function Search({ q, set }: { q: string; set: (patch: Partial<RegFilters>) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(q);
  const [typing, setTyping] = useState(false);
  const [seen, setSeen] = useState(q);
  if (q !== seen) {
    setSeen(q);
    if (!typing) setDraft(q);
  }

  /* «/» busca (en la compu), salvo que estés escribiendo en otro lado o haya un panel arriba */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || S.sheet || S.ui.palette || S.ui.celebrate || typingIn(e.target)) return;
      e.preventDefault();
      ref.current?.focus();
      ref.current?.select();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const put = (v: string) => {
    setDraft(v);
    set({ q: v });
  };
  return (
    <SearchField
      ref={ref}
      label="Buscar sesiones"
      kbd="/"
      placeholder="Buscar en notas, mes, clima…"
      value={draft}
      onChange={(e) => put(e.target.value)}
      onFocus={() => setTyping(true)}
      onBlur={() => setTyping(false)}
      onKeyDown={(e) => {
        /* Esc borra la búsqueda; con el campo vacío, lo suelta */
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        if (draft) put('');
        else e.currentTarget.blur();
      }}
    />
  );
}

export function FilterBar({ f, set, counts, all }: { f: RegFilters; set: (patch: Partial<RegFilters>) => void; counts: Partial<Record<SessionType, number>>; all: number }) {
  /* los tipos que tenés alguna vez (no cambian al filtrar), y el elegido aunque no tenga ninguna */
  const used = TYPE_KEYS.filter((k) => k === f.tipo || S.sessions.some((x) => x.type === k));
  const types: SegOption<SessionType | 'all'>[] = [{ value: 'all', label: 'Todas', n: all }, ...used.map((k) => ({ value: k, label: TYPES[k].label, n: counts[k] || 0, color: typeColor(k) }))];
  return (
    <div className="reg-bar p-rise" style={cssVars({ '--i': 2 })}>
      <div className="reg-types">
        <Segmented label="Filtrar por tipo" options={types} value={f.tipo} onChange={(tipo) => set({ tipo })} />
      </div>
      <div className="reg-tools">
        <Search q={f.q} set={set} />
        <SelectButton label="Estado" icon={ListChecks} options={ESTADOS} value={f.estado} onChange={(estado) => set({ estado })} />
        <SelectButton label="Período" icon={CalendarBlank} options={LG_PERIODS} value={f.per} onChange={(per) => set({ per })} />
      </div>
    </div>
  );
}
