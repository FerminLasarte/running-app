'use client';
/* Conexiones: Strava (conectar, traer los recorridos nuevos al mapa y desconectar) y si está activa la lectura de
   capturas del reloj, que depende de la clave de IA del servidor. Sin cuenta (modo local) no hay ninguna de las dos. */
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowsClockwise, Camera, Lightning } from '@phosphor-icons/react';
import { useS } from '@/lib/store';
import { AJ_PARTS, toast } from '@/lib/data/actions';
import { getMapUi } from '@/lib/domain/geo';
import { agoTxt } from '@/lib/domain/util';
import { stravaConnect } from '@/lib/strava/client';
import { stravaLast, stravaSync } from '@/lib/strava/sync';
import { aiAvailable } from '@/lib/ai/client';
import { Button, Tag } from '@/components/pista/controls';
import { Panel } from '@/components/pista/structure';
import { cssVars, cx } from '@/components/pista/util';
import { setStravaStatus, useStravaStatus } from '@/components/shell/useStravaStatus';

/** `ink`: el logo en tinta (se invierte con el tema) en vez de un color de marca */
function Conn({ logo, bg, ink, name, children, acts }: { logo: ReactNode; bg?: string; ink?: boolean; name: string; children: ReactNode; acts?: ReactNode }) {
  return (
    <div className="aj-conn">
      <span className={cx('aj-lg', ink && 'ink')} style={bg ? cssVars({ background: bg }) : undefined} aria-hidden="true">
        {logo}
      </span>
      <span className="aj-nm">
        <b>{name}</b>
        <small role="status">{children}</small>
      </span>
      <span className="aj-sp" />
      {acts}
    </div>
  );
}

function Strava() {
  const cloud = useS().mode === 'cloud';
  const st = useStravaStatus();
  const [busy, setBusy] = useState(false);
  const [ran, setRan] = useState(false);
  const map = getMapUi();
  async function disconnect() {
    setBusy(true);
    try {
      const r = await fetch('/api/strava/disconnect', { method: 'POST' });
      if (!r.ok) throw new Error(String(r.status));
      setStravaStatus({ connected: false, configured: true });
      toast('Strava desconectado');
    } catch {
      toast('No pude desconectar Strava. Probá de nuevo.');
    }
    setBusy(false);
  }
  const sync = () => {
    setRan(true);
    void stravaSync();
  };
  const last = stravaLast();
  const note = !cloud
    ? 'Para conectarlo tenés que entrar con tu cuenta.'
    : st == null
      ? 'Revisando la conexión…'
      : st.configured === false
        ? 'La conexión con Strava todavía no está configurada en el servidor.'
        : !st.connected
          ? 'Conectá tu cuenta para traer tus salidas, los parciales de cada vuelta y los recorridos del mapa.'
          : map.syncing || (ran && map.msg)
            ? map.msg
            : 'Conectado' + (st.athlete ? ' como ' + st.athlete : '') + (last ? ' · última sincronización ' + agoTxt(last) : ' · todavía no trajiste tus recorridos');
  return (
    <Conn logo={<Lightning weight="bold" />} bg="#FC4C02" name="Strava" acts={
      st?.connected ? (
        <>
          <Button size="sm" icon={ArrowsClockwise} disabled={map.syncing} onClick={sync}>
            {map.syncing ? 'Sincronizando…' : 'Sincronizar'}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={disconnect}>
            Desconectar
          </Button>
        </>
      ) : cloud && st && st.configured !== false ? (
        <Button size="sm" variant="pri" onClick={() => stravaConnect()}>
          Conectar con Strava
        </Button>
      ) : null
    }>
      {note}
    </Conn>
  );
}

function Shots() {
  const cloud = useS().mode === 'cloud';
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    aiAvailable().then((v) => live && setOn(!!v));
    return () => {
      live = false;
    };
  }, [cloud]);
  return (
    <Conn logo={<Camera />} ink name="Leer capturas del reloj" acts={on == null ? null : <Tag>{on ? 'Activada' : 'Desactivada'}</Tag>}>
      Cargá un plan o los parciales desde una foto.{on ? '' : ' La activa quien administra la app.'}
    </Conn>
  );
}

export function Conexiones({ i }: { i: number }) {
  return (
    <Panel id={AJ_PARTS.con} title="Conexiones" className="aj-set p-rise" style={cssVars({ '--i': i })}>
      <div className="aj-conns">
        <Strava />
        <Shots />
      </div>
    </Panel>
  );
}
