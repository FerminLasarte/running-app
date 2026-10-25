'use client';
/* Pestaña Logros: Personaje, Vitrina, Desafíos y Ranking (viewLogros del original). */
import { setUi, useApp } from '@/lib/store';
import Character from '@/components/logros/Character';
import Vitrina from '@/components/logros/Vitrina';
import Desafios from '@/components/logros/Desafios';
import TopList from '@/components/logros/TopList';
import { SubTabs } from '@/components/ui/SubTabs';

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
  };
  return (
    <>
      <SubTabs label="Secciones de logros" value={sub} items={SUBS} onPick={pick} act="logSub" />
      {sub === 'pj' ? <Character /> : sub === 'vit' ? <Vitrina /> : sub === 'des' ? <Desafios /> : <TopList />}
    </>
  );
}
