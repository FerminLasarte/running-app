/* Modelo de datos de la app. Los nombres de campos son los mismos que usaba el artifact original,
   así los respaldos JSON exportados desde claude.ai se importan sin traducir nada. */

export type SessionType = 'fondo' | 'series' | 'tempo' | 'regen' | 'test';
export type StepKind = 'warm' | 'run' | 'rec' | 'cool';

/** Un tramo del plan: distancia (km) o duración (s), con ritmo (s/km) y/o FC opcionales. */
export interface Step {
  k: StepKind;
  dist?: number;
  dur?: number;
  /** ritmo rápido / lento del rango, en s/km */
  pf?: number;
  ps?: number;
  /** FC baja / alta del rango */
  hl?: number;
  hh?: number;
}
/** Bloque de repeticiones: n veces la lista de pasos. */
export interface RepStep {
  k: 'rep';
  n: number;
  steps: Step[];
}
export type PlanStep = Step | RepStep;

export interface Plan {
  type?: SessionType;
  date: string;
  distKm?: number;
  durMin?: number;
  paceSec?: number;
  hrMin?: number;
  hrMax?: number;
  steps?: PlanStep[];
  notes?: string;
  moved?: { from: string; at: string; reason: string };
  recal?: { id: string; at: string; src: string; prev: PlanStep[] };
}

export interface Lap {
  distKm?: number;
  timeSec?: number;
  paceSec?: number;
  hrAvg?: number;
  hrMax?: number;
}
export interface Stage extends Lap {
  skipped?: boolean;
  est?: boolean;
  avg?: boolean;
  laps?: Lap[];
}

/** Deriva cardíaca calculada con los streams de Strava. `na` = no se pudo medir. */
export interface Decoupling {
  p?: number;
  p1?: number;
  p2?: number;
  a?: number;
  b?: number;
  m?: number;
  ok?: number;
  na?: number;
}

export interface Result {
  date: string;
  distKm: number;
  timeSec: number;
  paceSec: number;
  mainPaceSec?: number;
  paceManual?: boolean;
  hrAvg?: number;
  hrMax?: number;
  feel?: number;
  pain?: boolean;
  easy?: boolean;
  weather?: string;
  notes?: string;
  shoe?: string;
  /** id de la actividad de Strava */
  sid?: string;
  dec?: Decoupling;
  stages?: Stage[];
}

export interface Session {
  id: string;
  type: SessionType;
  plan: Plan | null;
  result: Result | null;
  missed: boolean;
  created: number;
  updated: number;
}

export type PhaseKey = 'base' | 'dev' | 'spec' | 'taper';

export interface Race {
  id: string;
  name: string;
  km: number;
  date: string;
  targetSec: number;
  /** objetivo "menos de" (redondea el ritmo hacia abajo) */
  lt: boolean;
  time: string;
  place: string;
  planStart: string;
  resultSec?: number;
  phases?: { k: PhaseKey; from: string }[];
}

export interface Shoe {
  id: string;
  name: string;
  startKm: number;
  limitKm: number;
  main?: boolean;
  retired?: boolean;
  [k: string]: unknown;
}

export interface Challenge {
  id: string;
  kind: string;
  name: string;
  target: number;
  from: string;
  to: string;
  [k: string]: unknown;
}

export interface PaceRef {
  km: number;
  sec: number;
  label?: string;
  date?: string;
}

export interface Recal {
  id: string;
  at: string;
  prevRef?: PaceRef;
  [k: string]: unknown;
}

export interface EasyMode {
  from: string;
  until: string;
  reason?: string;
}

export interface Cfg {
  hrMax: number;
  weeklyGoal: number;
  planStart: string;
  age: number;
  since: string;
  races: Race[];
  easy: EasyMode | null;
  /** 5 pares [mín, máx] cargados a mano; null = por % de la FC máxima */
  zones: [number, number][] | null;
  /** chequeos del día de carrera, por id de carrera */
  rcs: Record<string, unknown>;
  rc?: unknown;
  shoes: Shoe[];
  avatar?: string;
  name?: string;
  paceRef?: PaceRef;
  recals?: Recal[];
  challenges?: Challenge[];
  seenTrophies?: string[];
}

/** Recorrido traído de Strava (polilínea codificada). */
export interface Route {
  id: string;
  sid: string;
  date: string;
  name: string;
  km: number;
  tsec: number;
  poly: string;
}
