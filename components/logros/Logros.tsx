'use client';
/* Logros: el estadio con tu título, la XP y la ficha del jugador → el camino de títulos → la vitrina junto a los
   desafíos → el podio y los atributos. Sin salidas, el estado vacío en el nivel 1 con el camino por delante.
   El filtro de la vitrina y el criterio del podio van en la URL (`?vitrina=ganados&podio=ritmo`). */
import '@/app/styles/screens/logros.css';
import { useS } from '@/lib/store';
import { doneList } from '@/lib/domain/stats';
import { charStats, xpState } from '@/lib/domain/xp';
import type { VitFilter } from '@/lib/domain/trophies';
import { useParam } from '@/components/shell/useParam';
import { Hero } from './Hero';
import { Road } from './Road';
import { VIT_IDS, Vitrina } from './Vitrina';
import { Challenges } from './Challenges';
import { POD_IDS, Podium, type PodId } from './Podium';
import { Attributes } from './Attributes';
import { Empty } from './Empty';

export default function Logros() {
  const { cfg } = useS();
  const [vf, setVf] = useParam<VitFilter>('vitrina', VIT_IDS, 'todos');
  const [pod, setPod] = useParam<PodId>('podio', POD_IDS, 'distancia');
  const X = xpState();
  if (!doneList().length)
    return (
      <div className="p-grid lo">
        <Empty />
        <Road X={X} i={1} />
        {cfg.challenges?.length ? <Challenges i={2} /> : null}
      </div>
    );
  const st = charStats();
  return (
    <div className="p-grid lo">
      <Hero X={X} st={st} />
      <Road X={X} i={1} />
      <Vitrina f={vf} onF={setVf} i={2} />
      <Challenges i={3} />
      <Podium id={pod} onId={setPod} i={4} />
      <Attributes st={st} i={5} />
    </div>
  );
}
