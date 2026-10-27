/* Una sesión real en las piezas «Pista»: su barra de estructura, su descripción corta, las columnas de la tabla de
   sesiones (la misma en Semana y en Registro) y los avisos de una sesión planificada (movida, ritmos recalibrados). */
import type { Plan, Session, SessionType } from '@/lib/domain/types';
import { keyPace, scoreSession } from '@/lib/domain/score';
import { decBand } from '@/lib/domain/dec';
import { expand, isRep, stepsBrief } from '@/lib/domain/stages';
import { hrRangeOf, planKmOf, sdate, stepKm } from '@/lib/domain/stats';
import { TYPES } from '@/lib/domain/config';
import { WD, dateLabel, fmt, fmtDur, fmtPace, pd, todayS } from '@/lib/domain/util';
import { typeColor } from './util';
import { Chip, Tag } from './controls';
import { StructureBar, Ticks, type Seg } from './meters';
import type { Col } from './structure';

/* intensidad del trabajo según el tipo, de suave a fuerte (alto de la barra) */
const RUN_I: Record<SessionType, number> = { regen: 0.34, fondo: 0.55, tempo: 0.78, series: 0.96, test: 1 };

/** la estructura del plan (calor y calma, trabajo, pausas); sin tramos, un solo bloque con toda la distancia */
export function segsOf(s: Session): Seg[] {
  const ex = expand(s.plan?.steps),
    segs: Seg[] = ex
      .map((e) => ({ d: stepKm(e.st), k: e.k === 'run' ? 'r' : e.k === 'rec' ? 'x' : 'w', i: e.k === 'run' ? RUN_I[s.type] : e.k === 'rec' ? 0.2 : 0.36 }) as Seg)
      .filter((g) => g.d > 0);
  if (segs.length) return segs;
  return [{ d: 1, k: 'r', i: RUN_I[s.type] }];
}

const dist = (km: number) => (km < 1 ? Math.round(km * 1000) + ' m' : fmt(km, 1) + ' km');

/** lo principal en pocas palabras: «6 × 800 m», «FC 120–140», «a 4:30 /km» */
export function briefOf(s: Session): string {
  const p = s.plan;
  if (!p) return '';
  const rep = (p.steps || []).find(isRep),
    main = rep && rep.steps.find((x) => x.k === 'run');
  if (rep && main) return rep.n + ' × ' + (main.dist! > 0 ? dist(main.dist!) : main.dur! > 0 ? fmtDur(main.dur!) : '');
  const hr = hrRangeOf(s);
  if (hr) return 'FC ' + hr[0] + '–' + hr[1];
  if (p.paceSec! > 0) return 'a ' + fmtPace(p.paceSec!) + ' /km';
  return '';
}

/** nombre del link de una fila de sesión, para los lectores de pantalla: «Fondo del dom 25 oct» */
export const sessionLabel = (s: Session) => TYPES[s.type].label + ' del ' + dateLabel(sdate(s));

/** km de la sesión: los hechos si está hecha, si no los del plan */
export const kmOf = (s: Session) => (s.result ? s.result.distKm || 0 : planKmOf(s));

export const SessionBar = ({ s, height }: { s: Session; height?: number }) => <StructureBar segs={segsOf(s)} color={typeColor(s.type)} height={height} plan={!s.result} />;

/** puntaje con sus marcas; o en qué quedó si no está hecha (si ya pasó el día, falta cargarla) */
export function ScoreCell({ s }: { s: Session }) {
  if (!s.result) return s.missed ? <Tag>No hecha</Tag> : sdate(s) < todayS() ? <Tag warn>Falta cargar</Tag> : <Tag>Pendiente</Tag>;
  const sc = scoreSession(s)?.score;
  if (sc == null) return <Tag>Hecha</Tag>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <Ticks value={sc} />
      {sc}
    </span>
  );
}

const DASH = <span className="mut">–</span>;
export const SESSION_COLS: Col<Session>[] = [
  {
    key: 'd',
    label: 'Fecha',
    className: 'dd',
    cell: (s) => {
      const d = pd(sdate(s));
      return (
        <>
          <b>{d.getDate()}</b>
          <span>{WD[(d.getDay() + 6) % 7]}</span>
        </>
      );
    },
  },
  {
    key: 't',
    label: 'Sesión',
    cell: (s) => (
      <>
        <Chip type={s.type} />
        {briefOf(s) ? <span className="s">{briefOf(s)}</span> : null}
        {s.result?.pain ? <span className="pain" title="Con molestia" /> : null}
      </>
    ),
  },
  { key: 'sb', label: 'Estructura', hideS: true, className: 'sbc', cell: (s) => <SessionBar s={s} height={16} /> },
  { key: 'km', label: 'Km', num: true, cell: (s) => fmt(kmOf(s), 2) },
  { key: 'tm', label: 'Tiempo', num: true, hideS: true, cell: (s) => (s.result?.timeSec ? fmtDur(s.result.timeSec) : DASH) },
  { key: 'p', label: 'Ritmo', num: true, cell: (s) => (s.result ? fmtPace(keyPace(s)) : DASH) },
  { key: 'hr', label: 'FC', num: true, hideS: true, cell: (s) => s.result?.hrAvg || DASH },
  { key: 'f', label: 'Sens.', num: true, hideS: true, cell: (s) => (s.result?.feel ? s.result.feel + '/10' : DASH) },
  { key: 'sc', label: 'Puntaje', num: true, cell: (s) => <ScoreCell s={s} /> },
];

/** deriva cardíaca: en rojo desde el 5% (cuando empieza a restar en el puntaje) */
const DEC_COL: Col<Session> = {
  key: 'dc',
  label: 'Deriva',
  num: true,
  hideS: true,
  cell: (s) => {
    const p = s.result?.dec?.p;
    return p != null ? <span className={decBand({ p }).k === 'good' ? undefined : 'p-dn'}>{fmt(p, 1)}%</span> : DASH;
  },
};
/** las columnas del Registro: las mismas, con la deriva antes del puntaje */
export const SESSION_COLS_FULL: Col<Session>[] = [...SESSION_COLS.slice(0, -1), DEC_COL, ...SESSION_COLS.slice(-1)];

/** «Movida desde el …»: en la próxima sesión y en el detalle */
export function MovedNote({ p, className }: { p: Plan | null | undefined; className: string }) {
  if (!(p && p.moved)) return null;
  return (
    <p className={className}>
      Movida desde el {dateLabel(p.moved.from)}
      {p.moved.reason ? ' · ' + p.moved.reason.toLowerCase() : ''}.
    </p>
  );
}

/** ritmos recalibrados en una sesión planificada: cuándo, con qué test y cómo eran antes */
export function RecalNote({ p, className }: { p: Plan | null | undefined; className: string }) {
  if (!p || !p.recal) return null;
  return (
    <p className={className}>
      Ritmos recalibrados el {dateLabel(p.recal.at)} con tu {String(p.recal.src).toLowerCase()}. Antes: {stepsBrief(p.recal.prev)}.
    </p>
  );
}
