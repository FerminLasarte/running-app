/* La columna del Mapa: el período, los cuatro números, los km por mes, tus barrios (tocás uno y se encienden sus
   recorridos), las capas y Strava (probando sin cuenta, sin Strava). */
import { ArrowsClockwise } from '@phosphor-icons/react';
import { useApp } from '@/lib/store';
import { MAP_PERIODS, barrioCount, cellArea, mapBarrios, mapCells, type MapPeriod } from '@/lib/domain/geo';
import type { Route } from '@/lib/domain/types';
import { DF_M, dShort, fmt, kmByMonth, nf, pd, plural, sum } from '@/lib/domain/util';
import { stravaLast } from '@/lib/strava/sync';
import { Button, Segmented, Switch } from '@/components/pista/controls';
import { MiniBars } from '@/components/pista/charts';
import { ShareBars, type ShareItem } from '@/components/pista/meters';
import { BrandTitle, Kpis } from '@/components/pista/structure';
import type { useMapParams } from './params';
import { useStravaGo } from './useStravaGo';

/** barrios a la vista; el resto, plegado */
const TOP = 8;

const H2 = ({ t, sub }: { t: string; sub?: string }) => (
  <div className="mapa-h2">
    <h2>{t}</h2>
    {sub ? <span className="lbl">{sub}</span> : null}
  </div>
);

export function Side({ P, routes, L, msg, syncing, baseErr, onPeriod, onBarrio }: { P: ReturnType<typeof useMapParams>; routes: Route[]; L: Route[]; msg: string; syncing: boolean; baseErr: boolean; onPeriod: (p: MapPeriod) => void; onBarrio: (n: string | null) => void }) {
  const { o } = P;
  const sv = useStravaGo(),
    guest = useApp((s) => s.mode === 'guest');
  const all = o.period === 'todo',
    km = sum(L.map((r) => r.km || 0)),
    cells = L.length ? mapCells(L, o.period).m.size : 0,
    bz = mapBarrios(L, o.period),
    nB = barrioCount();
  /* km por mes: los últimos 12, con todos tus recorridos (no siguen al período) */
  const now = new Date(),
    months = kmByMonth(
      routes.map((r) => [r.date, r.km || 0]),
      new Date(now.getFullYear(), now.getMonth() - 11, 1),
    );
  const last = stravaLast();
  const pickBz = (n: string) => onBarrio(o.hb === n ? null : n);
  const bzItems: ShareItem[] = bz.list.map((e, i) => ({
    key: e.b.n,
    label: (
      <>
        <span className="mapa-rk">{i + 1}</span>
        {e.b.n}
        <small>{plural(e.n, 'salida', 'salidas')}</small>
      </>
    ),
    v: e.km,
    value: fmt(e.km, e.km < 10 ? 1 : 0) + ' km',
    pct: e.km / km < 0.01 ? '<1%' : Math.round((e.km / km) * 100) + '%',
  }));
  return (
    <aside className="mapa-side" aria-label="Tus recorridos">
      <div className="lbl">Tus recorridos de Strava{routes.length ? ' · desde el ' + dShort(pd(routes[0].date)) + ' ' + routes[0].date.slice(0, 4) : ''}</div>
      <BrandTitle className="mapa-t">Mapa</BrandTitle>
      <Segmented<MapPeriod> fill label="Período" options={MAP_PERIODS.map(([value, label]) => ({ value, label }))} value={o.period} onChange={onPeriod} />
      <div className="mapa-stats">
        <Kpis
          items={[
            { label: 'Recorridos', value: nf(L.length), note: all ? (L.length ? 'desde el ' + dShort(pd(L[0].date)) : '') : 'en el período' },
            { label: 'Distancia', value: nf(km), unit: 'km', note: L.length ? fmt(km / L.length, 1) + ' km por salida' : '' },
            { label: 'Explorado', value: fmt(cellArea(cells), 1), unit: 'km²', note: nf(cells) + ' cuadras de 200 m' },
            { label: 'Barrios', value: bz ? bz.list.length : '–', unit: 'de ' + nB, note: 'de la Ciudad' },
          ]}
        />
      </div>

      <H2 t="Por mes" sub="Últimos 12 meses · km" />
      <MiniBars label={'Kilómetros por mes, los últimos 12: ' + months.map((m) => DF_M.format(m.m).replace('.', '') + ' ' + nf(m.km)).join(', ')} items={months.map((m) => ({ key: m.m.toISOString(), label: DF_M.format(m.m).charAt(0), v: m.km, cur: m.cur }))} />

      <H2 t="Tus barrios" sub={bz && bz.list.length ? 'Tocá uno' : undefined} />
      {!bz ? (
        <p className="mapa-foot">{baseErr ? 'No pude bajar el mapa de la Ciudad. Probá de nuevo más tarde.' : o.base ? 'Cargando el mapa de la Ciudad…' : 'Prendé «Calles y barrios» para ver por qué barrios pasaste.'}</p>
      ) : !bz.list.length ? (
        <p className="mapa-foot">En este período no hay recorridos dentro de la Ciudad.</p>
      ) : (
        <>
          <ShareBars label="Kilómetros por barrio" sel={o.hb} onPick={pickBz} items={bzItems.slice(0, TOP)} />
          {bzItems.length > TOP ? (
            <details className="mapa-more">
              <summary>{bzItems.length - TOP === 1 ? 'Ver el otro barrio' : 'Ver los otros ' + (bzItems.length - TOP)}</summary>
              <ShareBars label="Más barrios" sel={o.hb} onPick={pickBz} items={bzItems.slice(TOP)} />
            </details>
          ) : null}
          {bz.out.km >= 0.5 ? (
            <p className="mapa-foot">
              Fuera de la Ciudad: {fmt(bz.out.km, 0)} km en {plural(bz.out.n, 'salida', 'salidas')}.
            </p>
          ) : null}
        </>
      )}

      <H2 t="Capas" />
      <Segmented
        fill
        label="Color de los recorridos"
        options={[
          { value: 'one', label: 'Un color' },
          { value: 'type', label: 'Por tipo' },
        ]}
        value={o.color}
        onChange={P.setColor}
      />
      <div className="mapa-tgs">
        <Switch checked={o.zones} onChange={P.setZones} label="Zonas pintadas" desc="Cuadrículas de 200 m, más fuertes cuanto más pasás" />
        <Switch checked={o.base} onChange={P.setBase} label="Calles y barrios" desc="El mapa de la Ciudad de fondo" />
      </div>

      {/* probando sin cuenta no hay Strava */}
      {guest ? null : (
        <>
          <H2 t="Strava" sub={last ? 'Actualizado el ' + dShort(new Date(last)) : undefined} />
          <Button className="mapa-sync" icon={ArrowsClockwise} disabled={syncing} onClick={sv.go}>
            {syncing ? 'Trayendo…' : sv.connect ? 'Conectar con Strava' : 'Traer recorridos nuevos'}
          </Button>
        </>
      )}
      <p className="mapa-foot" role="status">
        {msg}
      </p>
    </aside>
  );
}
