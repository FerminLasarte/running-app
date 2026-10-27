/* Sin recorridos (boceto «Primera vez»): el panel oscuro que invita a traerlos de Strava. */
import { Lightning, MapTrifold } from '@phosphor-icons/react';
import { Button } from '@/components/pista/controls';
import { EmptyPanel } from '@/components/pista/structure';
import { useStravaGo } from './useStravaGo';

export function Empty({ msg, syncing }: { msg: string; syncing: boolean }) {
  const sv = useStravaGo();
  return (
    <div className="mapa-emptyw">
      <EmptyPanel icon={MapTrifold} title="Mapa" text="Tus recorridos van a pintar la Ciudad: cuanto más pasás por una calle, más fuerte se ve." className="mapa-empty">
        <Button variant="acc" size="sm" icon={Lightning} iconWeight="bold" disabled={syncing} onClick={sv.go}>
          {syncing ? 'Trayendo…' : sv.connect ? 'Conectar con Strava' : 'Traer de Strava'}
        </Button>
        <p className="mapa-foot" role="status">
          {msg}
        </p>
      </EmptyPanel>
    </div>
  );
}
