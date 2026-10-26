'use client';
/* El momento de Semana: lo de hoy (hecho o por hacer) o la última salida, y a la derecha el dorsal de la próxima
   carrera. */
import { Check, Plus } from '@phosphor-icons/react';
import type { Race, Session, SessionType } from '@/lib/domain/types';
import { nextRace, racePaceSec } from '@/lib/domain/config';
import { scoreSession } from '@/lib/domain/score';
import { doneList, hrRangeOf, planKmOf, sdate, type DoneSession } from '@/lib/domain/stats';
import { nextSession } from '@/lib/domain/week';
import { DF_LONG, cap, daysTo, dShort, fmt, fmtDur, fmtPace, pd, todayS, WD } from '@/lib/domain/util';
import { openSheet } from '@/lib/sheets';
import { sessionHref } from '@/lib/nav';
import { Bib } from '@/components/pista/sport';
import { BrandTitle, Stadium } from '@/components/pista/structure';
import { Button, Chip } from '@/components/pista/controls';
import { Ticks } from '@/components/pista/meters';
import { Spark } from '@/components/pista/charts';
import { SessionBar } from '@/components/pista/session';
import { cssVars, fitWords, typeColor } from '@/components/pista/util';

/* el nombre en el título: «Fondo cumplido.», «Series cumplidas.» */
const NAME: Record<SessionType, string> = { fondo: 'Fondo', series: 'Series', tempo: 'Tempo', regen: 'Regenerativo', test: 'Test' };
const DONE: Record<SessionType, string> = { fondo: 'cumplido', series: 'cumplidas', tempo: 'cumplido', regen: 'cumplido', test: 'cumplido' };


const dayLabel = (date: string) => cap(DF_LONG.format(pd(date)).replace(',', '')) + (date === todayS() ? ' · Hoy' : '');

/** el ritmo km a km (las vueltas de cada tramo); sin al menos 3, no hay línea */
function lapPaces(s: Session) {
  const v = (s.result?.stages || [])
    .flatMap((st) => (st.laps && st.laps.length ? st.laps : [st]))
    .map((l) => l.paceSec || (l.timeSec && l.distKm ? l.timeSec / l.distKm : 0))
    .filter((p) => p > 0);
  return v.length >= 3 ? v : null;
}

const Stat = ({ label, value, unit }: { label: string; value: string | number; unit?: string }) => (
  <div>
    <span className="lbl">{label}</span>
    <span className="disp">
      {value}
      {unit ? <span className="p-u">{unit}</span> : null}
    </span>
  </div>
);

function Done({ s }: { s: DoneSession }) {
  const r = s.result,
    sc = scoreSession(s)?.score,
    laps = lapPaces(s);
  return (
    <>
      <div className="p-st-top">
        <Chip type={s.type} solid />
        <span className="lbl">{dayLabel(r.date)}</span>
        <span className="p-st-ok">
          <Check weight="bold" aria-hidden="true" />
          Hecho
        </span>
      </div>
      <BrandTitle className="p-st-h sem-fit" style={fitWords(NAME[s.type], DONE[s.type])}>
        {NAME[s.type]}
        <br />
        {DONE[s.type]}
      </BrandTitle>
      <div className="p-st-stats">
        <Stat label="Distancia" value={fmt(r.distKm, 2)} unit="km" />
        <Stat label="Tiempo" value={fmtDur(r.timeSec)} />
        <Stat label="Ritmo" value={fmtPace(r.mainPaceSec || r.paceSec)} unit="/km" />
        {r.hrAvg ? <Stat label="FC media" value={r.hrAvg} unit="lpm" /> : null}
      </div>
      <div className="sem-st-foot">
        {sc != null ? (
          <div className="sem-st-score">
            <span className="disp">{sc}</span>
            <span>
              <Ticks value={sc} onDark />
              <span className="lbl">Puntaje</span>
            </span>
          </div>
        ) : null}
        {laps ? <Spark values={laps} label="Ritmo km a km" /> : <span className="sem-st-gap" />}
        <Button size="sm" variant="on-dark" arrow href={sessionHref(s.id)}>
          Ver la salida
        </Button>
      </div>
    </>
  );
}

function Planned({ s }: { s: Session }) {
  const km = planKmOf(s),
    hr = hrRangeOf(s),
    p = s.plan!,
    date = sdate(s);
  return (
    <>
      <div className="p-st-top">
        <Chip type={s.type} solid />
        <span className="lbl">{dayLabel(date)}</span>
        <span className="sem-st-plan">Planificada</span>
      </div>
      <BrandTitle className="p-st-h sem-fit" style={fitWords(NAME[s.type], 'hoy')}>
        {NAME[s.type]}
        <br />
        {date === todayS() ? 'hoy' : WD[(pd(date).getDay() + 6) % 7] + ' ' + pd(date).getDate()}
      </BrandTitle>
      <div className="p-st-stats">
        {km ? <Stat label="Distancia" value={fmt(km, 1)} unit="km" /> : null}
        {p.paceSec ? <Stat label="Ritmo" value={fmtPace(p.paceSec)} unit="/km" /> : null}
        {hr ? <Stat label="FC" value={hr[0] + '–' + hr[1]} unit="lpm" /> : null}
      </div>
      <div className="sem-st-foot">
        <div className="sem-st-bar">
          <SessionBar s={s} height={40} />
        </div>
        <Button size="sm" variant="acc" icon={Plus} iconWeight="bold" onClick={() => openSheet('result', { id: s.id })}>
          Registrar
        </Button>
        <Button size="sm" variant="on-dark" arrow href={sessionHref(s.id)}>
          Ver el plan
        </Button>
      </div>
    </>
  );
}

/** sin salidas hechas ni planificadas por delante (la bienvenida cubre el caso de cero sesiones) */
function Idle() {
  return (
    <>
      <div className="p-st-top">
        <span className="lbl">{dayLabel(todayS())}</span>
      </div>
      <BrandTitle className="p-st-h">
        A la
        <br />
        pista
      </BrandTitle>
      <p className="sem-wl-p">No tenés nada planificado. Armá la semana o registrá una salida suelta.</p>
      <div className="sem-wl-acts">
        <Button variant="acc" icon={Plus} iconWeight="bold" onClick={() => openSheet('plan', {})}>
          Planificar
        </Button>
        <Button variant="on-dark" onClick={() => openSheet('result', { id: null })}>
          Registrar una salida
        </Button>
      </div>
    </>
  );
}

function RaceBib({ r }: { r: Race }) {
  const n = daysTo(r.date),
    d = pd(r.date),
    meta = [{ label: 'Distancia', value: fmt(r.km, r.km % 1 ? 1 : 0) + ' km' }];
  if (r.time) meta.unshift({ label: 'Largada', value: r.time });
  return (
    <Bib
      band={[r.name, WD[(d.getDay() + 6) % 7] + ' ' + dShort(d)]}
      num={n === 0 ? 'Hoy' : n}
      numLabel={n === 0 ? undefined : n === 1 ? 'día' : 'días'}
      meta={meta}
      tear={[
        { label: 'Objetivo', value: r.targetSec ? (r.lt ? '<' : '') + fmtDur(r.targetSec) : '–' },
        {
          label: 'Ritmo',
          value: r.targetSec ? (
            <>
              {fmtPace(racePaceSec(r))}
              <span className="p-u">/km</span>
            </>
          ) : (
            '–'
          ),
        },
      ]}
    >
      <Button size="sm" variant="on-dark" arrow href="/carreras">
        Plan de carrera
      </Button>
    </Bib>
  );
}

export function Hero() {
  const tS = todayS(),
    done = doneList(),
    today = done.filter((s) => s.result.date === tS).pop(),
    next = nextSession(tS),
    /* lo de hoy, hecho; si no, lo planificado para hoy; si no, la última salida; si no, lo próximo */
    s = today || (next && sdate(next) === tS ? next : null) || done[done.length - 1] || next,
    r = nextRace();
  return (
    <Stadium className="p-c12 p-rise" side={r ? <RaceBib r={r} /> : undefined} style={s ? cssVars({ '--tc': typeColor(s.type) }) : undefined}>
      {!s ? <Idle /> : s.result ? <Done s={s as DoneSession} /> : <Planned s={s} />}
    </Stadium>
  );
}
