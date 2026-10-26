'use client';
/* Forma de las últimas 12 semanas: estado físico, fatiga y forma (la misma serie y las mismas piezas que Análisis →
   Forma y carga), con el gráfico que se recorre con el mouse o con las flechas. */
import { formSeries } from '@/lib/domain/analysis';
import { Button } from '@/components/pista/controls';
import { Panel } from '@/components/pista/structure';
import { FormChart, FormKpis, weeklyOf } from '@/components/pista/form';
import { cssVars } from '@/components/pista/util';

export function FormPanel() {
  const F = formSeries();
  const more = (
    <Button size="sm" variant="ghost" arrow href="/analisis/forma">
      Análisis
    </Button>
  );
  if (!F)
    return (
      <Panel className="p-c7 p-rise" style={cssVars({ '--i': 3 })} title="Forma" actions={more}>
        <p className="sem-note">Con 5 salidas en 3 semanas aparecen tu estado físico, tu fatiga y tu forma.</p>
      </Panel>
    );
  /* una muestra por semana, la última es hoy */
  const pts = weeklyOf(F, 12);
  return (
    <Panel className="p-c7 p-rise" style={cssVars({ '--i': 3 })} title="Forma" sub={'Últimas ' + pts.length + ' semanas'} flush actions={more}>
      <FormKpis F={F} pts={pts} />
      <div className="p-panel-b">
        <FormChart pts={pts} label="Estado físico, fatiga y forma de las últimas semanas" />
      </div>
    </Panel>
  );
}
