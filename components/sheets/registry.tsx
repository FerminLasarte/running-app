/* Hojas disponibles: la clave es la que se pasa a openSheet(kind, props). Cada una viaja en su propio archivo de JS
   y se baja sola un rato después de arrancar (preloadSheets), así abrir una hoja no espera a la red. */
import { preloadable } from '@/components/ui/preloadable';

const wait = <div className="skel" style={{ margin: '20px 0' }} />;
export const SHEETS = {
  weekPlan: preloadable(() => import('./WeekPlanSheet'), wait),
  move: preloadable(() => import('./MoveSheet'), wait),
  easy: preloadable(() => import('./EasySheet'), wait),
  trophy: preloadable(() => import('./TrophySheet'), wait),
  challenge: preloadable(() => import('./ChallengeSheet'), wait),
  raceMedal: preloadable(() => import('./RaceMedalSheet'), wait),
  recal: preloadable(() => import('./RecalSheet'), wait),
  plan: preloadable(() => import('./PlanSheet'), wait),
  result: preloadable(() => import('./ResultSheet'), wait),
  detail: preloadable(() => import('./DetailSheet'), wait),
  score: preloadable(() => import('./ScoreSheet'), wait),
  import: preloadable(() => import('./ImportSheet'), wait),
  exportCopy: preloadable(() => import('./ExportCopySheet'), wait),
} as Record<string, ReturnType<typeof preloadable>>;

export const preloadSheets = () => Promise.all(Object.values(SHEETS).map((c) => c.preload()));
