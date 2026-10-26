'use client';
/* Semana, la pantalla de inicio: el estadio con lo de hoy (o la última salida) y el dorsal de la próxima carrera, la
   semana con la pista y los 7 días, lo que viene, la forma y las últimas sesiones. La cinta de datos va arriba, de
   punta a punta (la pone el shell). Sin ninguna sesión, la bienvenida y la semana vacía. */
import '@/app/styles/screens/semana.css';
import { S, useS } from '@/lib/store';
import { easyActive } from '@/lib/domain/config';
import { isFirstRun } from '@/lib/domain/firstRun';
import { doneList } from '@/lib/domain/stats';
import { dShort, pd, todayS } from '@/lib/domain/util';
import { blockDemo, saveCfg, toast } from '@/lib/data/actions';
import { sessionHref } from '@/lib/nav';
import { Button } from '@/components/pista/controls';
import { Panel, Table } from '@/components/pista/structure';
import { SESSION_COLS, sessionLabel } from '@/components/pista/session';
import { cssVars } from '@/components/pista/util';
import { Hero } from './Hero';
import { WeekBoard } from './WeekBoard';
import { NextPanel } from './NextPanel';
import { FormPanel } from './FormPanel';
import { Welcome } from './Welcome';

function easyOff() {
  if (blockDemo()) return;
  saveCfg({ ...S.cfg, easy: null });
  toast('Modo suave terminado');
}

function Recent() {
  const rows = doneList().slice(-6).reverse();
  if (!rows.length) return null;
  return (
    <Panel
      className="p-c12 p-rise tw"
      style={cssVars({ '--i': 4 })}
      title="Últimas sesiones"
      flush
      actions={
        <Button size="sm" variant="ghost" arrow href="/registro">
          Todo el registro
        </Button>
      }
    >
      <Table cols={SESSION_COLS} rows={rows} rowKey={(s) => s.id} href={(s) => sessionHref(s.id)} goLabel={sessionLabel} label="Últimas sesiones" />
    </Panel>
  );
}

export default function Semana() {
  const st = useS();
  if (isFirstRun())
    return (
      <div className="p-grid sem">
        <Welcome />
        <WeekBoard fresh />
      </div>
    );
  const easyOn = !!(st.cfg.easy && easyActive(todayS()));
  return (
    <div className="p-grid sem">
      {easyOn ? (
        <div className="p-c12 sem-easy" role="status">
          <span>
            <b>Modo «No me siento al 100%» hasta el {dShort(pd(st.cfg.easy!.until))}.</b> Bajá el volumen un 20–30% y corré por sensaciones.
          </span>
          <Button size="sm" onClick={easyOff}>
            Terminar
          </Button>
        </div>
      ) : null}
      <Hero />
      <WeekBoard />
      <NextPanel easyOn={easyOn} />
      <FormPanel />
      <Recent />
    </div>
  );
}
