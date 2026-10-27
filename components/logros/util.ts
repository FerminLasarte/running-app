/* Lo que comparten Logros, la vitrina, la celebración, el panel del trofeo y la paleta: el ícono de cada categoría, la
   forma de cada trofeo, cómo se abre y a dónde lleva cada parte de la pantalla. */
import { CalendarCheck, CalendarDots, Clock, Compass, Crown, Fire, FlagCheckered, Footprints, ListChecks, Path, SneakerMove, Star, Target, Timer, type Icon } from '@phosphor-icons/react';
import { openSheet } from '@/lib/sheets';
import { buzz } from '@/lib/data/actions';
import { catBase, type Trophy } from '@/lib/domain/trophies';
import { fmtDur } from '@/lib/domain/util';

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
  egg: Crown,
};
export const trophyIcon = (t: Pick<Trophy, 'cat'>) => CAT_ICON[catBase(t.cat)] || Star;

/** qué pieza es en la vitrina: copa para las marcas, medalla colgada para las carreras, escudo con pie para lo demás */
export type TrophyKind = 'cup' | 'medal' | 'shield';
export const trophyKind = (t: Pick<Trophy, 'cat'>): TrophyKind => (catBase(t.cat) === 'pr' ? 'cup' : t.cat === 'race' ? 'medal' : 'shield');
/** lo que va grabado: el tiempo a bajar en la copa («25:00»), la distancia si es terminarla («21K»), cuántas carreras en
    la medalla */
export const trophyPlate = (t: Pick<Trophy, 'id' | 'cat' | 'target' | 'unit'>) =>
  t.cat === 'race' ? String(t.target) : t.id.endsWith('_fin') ? t.cat.slice(2) + 'K' : t.unit === 'time' ? fmtDur(t.target) : '';

export function openTrophy(id: string) {
  openSheet('trophy', { id });
  buzz(6);
}

/* las partes de la pantalla: la paleta y la celebración bajan hasta cada una con goLogros */
export const LO_PARTS = { road: 'lo-camino', vit: 'lo-vitrina', ch: 'lo-desafios', pod: 'lo-podio', att: 'lo-atributos' } as const;
