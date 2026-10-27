'use client';
/* Logros: el estadio con tu título, la XP y la ficha del jugador → el camino de títulos → la vidriera (los últimos
   trofeos y los que están por caer; la vitrina entera es /logros/vitrina) junto a los desafíos → el podio y los
   atributos. Sin salidas, el estado vacío en el nivel 1 con el camino por delante. El criterio del podio va en la URL
   (`?podio=ritmo`). */
import '@/app/styles/screens/logros.css';
import { useS } from '@/lib/store';
import { doneList } from '@/lib/domain/stats';
import { charStats, xpState } from '@/lib/domain/xp';
import { useParam } from '@/components/shell/useParam';
import { Hero } from './Hero';
import { Road } from './Road';
import { Vidriera } from './Vidriera';
import { Challenges } from './Challenges';
import { POD_IDS, Podium, type PodId } from './Podium';
import { Attributes } from './Attributes';
import { Empty } from './Empty';

export default function Logros() {
  useS();
  const [pod, setPod] = useParam<PodId>('podio', POD_IDS, 'distancia');
  const X = xpState();
  if (!doneList().length)
    return (
      <div className="p-grid lo">
        <Empty />
        <Road X={X} i={1} />
        <Challenges i={2} />
      </div>
    );
  const st = charStats();
  return (
    <div className="p-grid lo">
      <Hero X={X} st={st} />
      <Road X={X} i={1} />
      <Vidriera i={2} />
      <Challenges i={3} />
      <Podium id={pod} onId={setPod} i={4} />
      <Attributes st={st} i={5} />
    </div>
  );
}
