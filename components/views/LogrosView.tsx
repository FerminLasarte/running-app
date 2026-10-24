'use client';
/* Pestaña Logros: Personaje, Vitrina, Desafíos y Ranking (viewLogros del original). */
import { setS, setUi, useApp } from '@/lib/store';
import Character from '@/components/logros/Character';
import Vitrina from '@/components/logros/Vitrina';
import Desafios from '@/components/logros/Desafios';
import TopList from '@/components/logros/TopList';

const SUBS: [string, string][] = [
  ['pj', 'Personaje'],
  ['vit', 'Vitrina'],
  ['des', 'Desafíos'],
  ['rank', 'Ranking'],
];

export default function LogrosView() {
  const v = useApp((st) => st.ui.logSub) as string | undefined;
  const sub = v && SUBS.some((q) => q[0] === v) ? v : 'pj';
  const pick = (k: string) => {
    setUi('logSub', k);
    setS({ lastTab: null });
  };
  return (
    <>
      <div className="seg subtabs" role="tablist">
        {SUBS.map((q) => (
          <button key={q[0]} className="chip" data-a="logSub" data-v={q[0]} aria-pressed={q[0] === sub} onClick={() => pick(q[0])}>
            {q[1]}
          </button>
        ))}
      </div>
      {sub === 'pj' ? <Character /> : sub === 'vit' ? <Vitrina /> : sub === 'des' ? <Desafios /> : <TopList />}
    </>
  );
}
