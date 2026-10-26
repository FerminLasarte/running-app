'use client';
/* Lo que viene después de hoy: la próxima sesión planificada con su estructura y sus tramos. */
import { ArrowsLeftRight, MagicWand, Plus } from '@phosphor-icons/react';
import type { PlanStep, Session, SessionType } from '@/lib/domain/types';
import { TYPES } from '@/lib/domain/config';
import { KINDS, isRep, stepDesc, stepTgt } from '@/lib/domain/stages';
import { hrRangeOf, planKmOf, sdate } from '@/lib/domain/stats';
import { nextSession } from '@/lib/domain/week';
import { DF_LONG, addDays, cap, daysTo, fmt, fmtPace, mondayOf, pd, sod, ymd } from '@/lib/domain/util';
import { openSheet } from '@/lib/sheets';
import { MovedNote } from '@/components/detail/MovedNote';
import { RecalNote } from '@/components/carreras/RecalNote';
import { BrandTitle, Panel } from '@/components/pista/structure';
import { Button, Chip } from '@/components/pista/controls';
import { StructureBar } from '@/components/pista/meters';
import { briefOf, segsOf } from '@/components/pista/session';
import { cssVars, typeColor } from '@/components/pista/util';

/* «8 km suaves», «14 km de fondo»; con repeticiones, «6 × 800 m» */
const WORD: Record<SessionType, string> = { regen: 'suaves', fondo: 'de fondo', tempo: 'de tempo', series: 'de series', test: 'de test' };
function headline(s: Session) {
  const km = planKmOf(s);
  if ((s.plan?.steps || []).some(isRep)) return briefOf(s);
  return km ? fmt(km, km % 1 ? 1 : 0) + ' km ' + WORD[s.type] : TYPES[s.type].label;
}

/** el objetivo, para el medio del eje de la estructura */
function target(s: Session) {
  const hr = hrRangeOf(s);
  if (hr) return 'FC ' + hr[0] + '–' + hr[1];
  return s.plan?.paceSec ? 'a ' + fmtPace(s.plan.paceSec) + ' /km' : '';
}

/* cada tramo del plan con su color: calor y calma en gris, el trabajo en el del tipo, las pausas apenas */
function StepRow({ st, tc }: { st: PlanStep; tc: string }) {
  if (isRep(st))
    return (
      <li style={cssVars({ '--k': tc })}>
        {st.n} repeticiones
        <span className="mono">{st.steps.map((x) => stepDesc(x) + (stepTgt(x) ? ' @ ' + stepTgt(x) : '')).join(' + ')}</span>
      </li>
    );
  return (
    <li style={cssVars({ '--k': st.k === 'run' ? tc : st.k === 'rec' ? 'var(--line-2)' : 'var(--ink-4)' })}>
      {KINDS[st.k].l}
      <span className="mono">{[stepDesc(st), stepTgt(st)].filter(Boolean).join(' · ')}</span>
    </li>
  );
}

export function NextPanel({ easyOn }: { easyOn: boolean }) {
  const today = sod(new Date()),
    s = nextSession(ymd(addDays(today, 1)));
  if (!s)
    return (
      <Panel className="p-c5 p-rise sem-next" style={cssVars({ '--i': 2 })} title="Próxima">
        <BrandTitle as="div" className="sem-next-t">
          Nada por delante
        </BrandTitle>
        <p className="sem-next-sub">No hay sesiones planificadas después de hoy.</p>
        <div className="sem-next-acts">
          <Button icon={Plus} onClick={() => openSheet('plan', { date: ymd(addDays(today, 1)) })}>
            Planificar
          </Button>
          <Button variant="ghost" icon={MagicWand} onClick={() => openSheet('weekPlan', { mon: ymd(mondayOf(addDays(today, 1))) })}>
            Planificar semana
          </Button>
        </div>
      </Panel>
    );
  const p = s.plan!,
    d = sdate(s),
    nd = daysTo(d),
    km = planKmOf(s),
    tc = typeColor(s.type);
  return (
    <Panel
      className="p-c5 p-rise sem-next"
      style={cssVars({ '--i': 2, '--tc': tc })}
      title={nd === 1 ? 'Mañana' : 'Próxima'}
      sub={cap(DF_LONG.format(pd(d)).replace(',', '').replace(/ de \S+$/, ''))}
      actions={<Chip type={s.type} />}
    >
      <BrandTitle as="div" className="sem-next-t">
        {headline(s)}
      </BrandTitle>
      <p className="sem-next-sub">{p.notes || TYPES[s.type].hint}</p>
      <StructureBar segs={segsOf(s)} color={tc} height={52} axis={['0 km', target(s), (km ? fmt(km, 1) : '–') + ' km']} />
      {p.steps && p.steps.length ? (
        <ul className="sem-steps">
          {p.steps.map((st, i) => (
            <StepRow key={i} st={st} tc={tc} />
          ))}
        </ul>
      ) : null}
      <RecalNote p={p} />
      <MovedNote p={p} />
      <div className="sem-next-acts">
        <Button icon={ArrowsLeftRight} onClick={() => openSheet('move', { id: s.id })}>
          Mover
        </Button>
        <Button variant="ghost" onClick={() => openSheet('plan', { id: s.id })}>
          Editar plan
        </Button>
        {easyOn ? null : (
          <Button variant="ghost" onClick={() => openSheet('easy')}>
            No me siento al 100%
          </Button>
        )}
      </div>
    </Panel>
  );
}
