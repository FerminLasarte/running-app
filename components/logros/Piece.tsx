'use client';
/* La pieza de un trofeo, la misma en la vitrina, el panel del trofeo y la celebración: copa para las marcas, medalla
   colgada para las carreras (con la cinta de la carrera que la ganó) y escudo con pie para lo demás. Cuanto más
   valioso el metal, más grande, como en la vitrina de un club. */
import { trophyRace, trophyTier, type Trophy } from '@/lib/domain/trophies';
import { Cup, HungMedal, StandShield } from '@/components/pista/sport';
import { medalColor } from '@/components/carreras/Medals';
import { trophyIcon, trophyKind, trophyPlate } from './util';

const BASE = { cup: 84, medal: 66, shield: 72 };
const SCALE = [0.86, 0.93, 1, 1.07];

/** `k` agranda o achica la pieza (1 es la de la vitrina) */
export function TrophyPiece({ t, k = 1, className }: { t: Trophy; k?: number; className?: string }) {
  const kind = trophyKind(t),
    tier = trophyTier(t),
    size = Math.round(BASE[kind] * SCALE[tier] * k);
  if (kind === 'cup') return <Cup tier={tier} got={t.got} plate={trophyPlate(t)} size={size} className={className} />;
  if (kind === 'medal') {
    const r = trophyRace(t);
    return <HungMedal tier={tier} got={t.got} num={trophyPlate(t)} color={r ? medalColor(r) : 'var(--acc)'} size={size} className={className} />;
  }
  return <StandShield tier={tier} got={t.got} icon={trophyIcon(t)} size={size} className={className} />;
}
