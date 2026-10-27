/* Paneles disponibles: la clave es la que se pasa a openSheet(kind, props). Cada uno viaja en su propio archivo de JS
   y se baja solo un rato después de arrancar (preloadPanels), así abrir un panel no espera a la red. */
import { preloadable } from './preloadable';

const wait = <div className="p-dr-wait" aria-hidden="true" />;
export const PANELS = {
  result: preloadable(() => import('./ResultPanel'), wait),
  plan: preloadable(() => import('./PlanPanel'), wait),
  weekPlan: preloadable(() => import('./WeekPlanPanel'), wait),
  move: preloadable(() => import('./MovePanel'), wait),
  easy: preloadable(() => import('./EasyPanel'), wait),
  recal: preloadable(() => import('./RecalPanel'), wait),
  challenge: preloadable(() => import('./ChallengePanel'), wait),
  score: preloadable(() => import('./ScorePanel'), wait),
  trophy: preloadable(() => import('./TrophyPanel'), wait),
  raceMedal: preloadable(() => import('./RaceMedalPanel'), wait),
  level: preloadable(() => import('./LevelPanel'), wait),
  import: preloadable(() => import('./ImportPanel'), wait),
  exportCopy: preloadable(() => import('./ExportCopyPanel'), wait),
  deleteAccount: preloadable(() => import('./DeleteAccountPanel'), wait),
} as Record<string, ReturnType<typeof preloadable>>;

export const preloadPanels = () => Promise.all(Object.values(PANELS).map((c) => c.preload()));
