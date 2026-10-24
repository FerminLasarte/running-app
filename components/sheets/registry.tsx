/* Hojas disponibles: la clave es la que se pasa a openSheet(kind, props). */
import type { ComponentType } from 'react';
import WeekPlanSheet from './WeekPlanSheet';
import MoveSheet from './MoveSheet';
import EasySheet from './EasySheet';
import TrophySheet from './TrophySheet';
import ChallengeSheet from './ChallengeSheet';
import RaceMedalSheet from './RaceMedalSheet';
import RecalSheet from './RecalSheet';
import PlanSheet from './PlanSheet';
import ResultSheet from './ResultSheet';
import DetailSheet from './DetailSheet';
import ScoreSheet from './ScoreSheet';
import ImportSheet from './ImportSheet';
import ExportCopySheet from './ExportCopySheet';

// cada hoja declara sus props; acá se guardan como un mapa genérico
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SHEETS: Record<string, ComponentType<any>> = {
  weekPlan: WeekPlanSheet,
  move: MoveSheet,
  easy: EasySheet,
  trophy: TrophySheet,
  challenge: ChallengeSheet,
  raceMedal: RaceMedalSheet,
  recal: RecalSheet,
  plan: PlanSheet,
  result: ResultSheet,
  detail: DetailSheet,
  score: ScoreSheet,
  import: ImportSheet,
  exportCopy: ExportCopySheet,
};
