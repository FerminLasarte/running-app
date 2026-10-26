'use client';
/* Análisis: el encabezado con el período de los gráficos, las cuatro pestañas (cada una es una ruta) y, con menos de 3
   salidas, el estado vacío del boceto «Primera vez». Lo dibuja el layout, así que al cambiar de pestaña queda igual. */
import '@/app/styles/screens/analisis.css';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { CalendarBlank, ChartLineUp } from '@phosphor-icons/react';
import { useS } from '@/lib/store';
import { demoOn } from '@/lib/data/actions';
import { AN_PERIODS } from '@/lib/domain/analysis';
import { doneList } from '@/lib/domain/stats';
import { Button, SelectButton, Tabs } from '@/components/pista/controls';
import { BrandTitle, PageHead, Panel } from '@/components/pista/structure';
import { Laps } from '@/components/pista/meters';
import { cssVars } from '@/components/pista/util';
import { AN_TABS, analisisHref, tabOf, useAnPeriod } from './period';

/** salidas que hacen falta para los primeros gráficos */
const AN_MIN = 3;

function Empty({ n, demo }: { n: number; demo: boolean }) {
  return (
    <Panel className="an-empty p-rise" style={cssVars({ '--i': 1 })}>
      <ChartLineUp className="ic" aria-hidden="true" />
      <BrandTitle as="h2">Análisis</BrandTitle>
      <p>Con 3 salidas aparecen tus primeros gráficos; con un test, tus ritmos y tu predicción.</p>
      <Laps value={n / AN_MIN} n={AN_MIN} gap={4} label={n + ' de ' + AN_MIN + ' salidas'} />
      <small>
        {n} de {AN_MIN} salidas
      </small>
      {demo ? null : (
        <Button size="sm" onClick={demoOn}>
          Ver con datos de ejemplo
        </Button>
      )}
    </Panel>
  );
}

export default function Frame({ children }: { children: ReactNode }) {
  const st = useS();
  const pathname = usePathname();
  const [per, setPer] = useAnPeriod();
  const n = doneList().length;
  const ok = n >= AN_MIN;
  return (
    <div className="an">
      <PageHead
        eyebrow="Cómo venís"
        title="Análisis"
        actions={ok ? <SelectButton icon={CalendarBlank} options={AN_PERIODS} value={per} onChange={setPer} label="Período de los gráficos" /> : null}
      />
      {ok ? (
        <>
          <div className="an-tabs p-rise" style={cssVars({ '--i': 1 })}>
            <Tabs items={AN_TABS.map((t) => ({ value: t.value, label: t.label, href: analisisHref(t.value, per) }))} value={tabOf(pathname)} label="Secciones de Análisis" />
          </div>
          {children}
        </>
      ) : (
        <Empty n={n} demo={st.demo} />
      )}
    </div>
  );
}
