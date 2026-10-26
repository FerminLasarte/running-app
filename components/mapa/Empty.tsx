/* Sin recorridos (boceto «Primera vez»): el panel oscuro que invita a traerlos de Strava. */
import { Lightning, MapTrifold } from '@phosphor-icons/react';
import { stravaSync } from '@/lib/strava/sync';
import { Button } from '@/components/pista/controls';
import { EmptyPanel } from '@/components/pista/structure';

export function Empty({ msg, syncing }: { msg: string; syncing: boolean }) {
  return (
    <div className="mapa-emptyw">
      <EmptyPanel icon={MapTrifold} title="Mapa" text="Tus recorridos van a pintar la Ciudad: cuanto más pasás por una calle, más fuerte se ve." className="mapa-empty">
        <Button variant="acc" size="sm" icon={Lightning} iconWeight="bold" disabled={syncing} onClick={() => void stravaSync()}>
          {syncing ? 'Trayendo…' : 'Traer de Strava'}
        </Button>
        <p className="mapa-foot" role="status">
          {msg}
        </p>
      </EmptyPanel>
    </div>
  );
}
