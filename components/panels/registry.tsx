/* Paneles disponibles: la clave es la que se pasa a openSheet(kind, props). Cada uno viaja en su propio archivo de JS
   y se baja solo un rato después de arrancar (preloadPanels), así abrir un panel no espera a la red.
   Los de components/sheets/ tienen todavía el contenido viejo adentro del marco nuevo: se rehacen con su pantalla
   (el trofeo con Logros y el respaldo con Ajustes). */
import { preloadable } from '@/components/ui/preloadable';

const wait = <div className="p-dr-wait" aria-hidden="true" />;
export const PANELS = {
  result: preloadable(() => import('./ResultPanel'), wait),
  plan: preloadable(() => import('./PlanPanel'), wait),
  weekPlan: preloadable(() => import('./WeekPlanPanel'), wait),
  move: preloadable(() => import('./MovePanel'), wait),
  easy: preloadable(() => import('./EasyPanel'), wait),
  recal: preloadable(() => import('./RecalPanel'), wait),
  challenge: preloadable(() => import('./ChallengePanel'), wait),
  score: preloadable(() => import('@/components/sheets/ScoreSheet'), wait),
  trophy: preloadable(() => import('@/components/sheets/TrophySheet'), wait),
  raceMedal: preloadable(() => import('./RaceMedalPanel'), wait),
  level: preloadable(() => import('./LevelPanel'), wait),
  import: preloadable(() => import('@/components/sheets/ImportSheet'), wait),
  exportCopy: preloadable(() => import('@/components/sheets/ExportCopySheet'), wait),
} as Record<string, ReturnType<typeof preloadable>>;

export const preloadPanels = () => Promise.all(Object.values(PANELS).map((c) => c.preload()));
