/* Lo que comparten Logros, la celebración, el panel del trofeo y la paleta: el ícono de cada categoría, cómo se abre
   un trofeo y a dónde lleva cada parte de la pantalla. */
import { CalendarCheck, CalendarDots, Clock, Compass, Fire, FlagCheckered, Footprints, ListChecks, Path, SneakerMove, Star, Target, Timer, type Icon } from '@phosphor-icons/react';
import { openSheet } from '@/lib/sheets';
import { buzz } from '@/lib/data/actions';
import { catBase, type Trophy } from '@/lib/domain/trophies';

const CAT_ICON: Record<string, Icon> = {
  tot: Path,
  long: SneakerMove,
  pr: Timer,
  race: FlagCheckered,
  week: CalendarDots,
  month: CalendarCheck,
  streak: Fire,
  runs: Footprints,
  hours: Clock,
  plan: ListChecks,
  score: Star,
  area: Compass,
  ch: Target,
};
export const trophyIcon = (t: Pick<Trophy, 'cat'>) => CAT_ICON[catBase(t.cat)] || Star;

export function openTrophy(id: string) {
  openSheet('trophy', { id });
  buzz(6);
}

/* las partes de la pantalla: la paleta y la celebración bajan hasta cada una con goLogros */
export const LO_PARTS = { road: 'lo-camino', vit: 'lo-vitrina', ch: 'lo-desafios', pod: 'lo-podio', att: 'lo-atributos' } as const;
