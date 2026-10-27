'use client';
/* Eliminar la cuenta (desde Ajustes → Cuenta y datos): qué se borra, la oferta de bajar el respaldo antes y, para que no
   se toque sin querer, escribir «eliminar». Sin cuenta, borra lo que la app guardó en este navegador. */
import { useState } from 'react';
import { DownloadSimple, Trash } from '@phosphor-icons/react';
import { useApp } from '@/lib/store';
import { requestClose, useSheetDirty } from '@/lib/sheets';
import { doExport } from '@/lib/data/backup';
import { deleteAccount } from '@/lib/auth/client';
import { Button } from '@/components/pista/controls';
import { Field, Input } from '@/components/pista/fields';
import { PanelFrame, PanelSection } from './PanelFrame';

const WORD = 'eliminar';

export default function DeleteAccountPanel() {
  const cloud = useApp((s) => s.mode === 'cloud');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ok = text.trim().toLowerCase() === WORD;
  useSheetDirty(!!text.trim());

  async function go() {
    if (!ok || busy) return;
    setBusy(true);
    setErr('');
    try {
      await deleteAccount();
    } catch {
      setErr('No pude eliminar la cuenta. No se borró nada: probá de nuevo en un rato.');
      setBusy(false);
    }
  }

  return (
    <PanelFrame
      eyebrow="Cuenta y datos"
      title={cloud ? 'Eliminar mi cuenta' : 'Borrar los datos'}
      err={err || null}
      onSubmit={go}
      foot={
        <>
          <Button variant="ghost" onClick={requestClose}>
            Cancelar
          </Button>
          <Button className="dng" icon={Trash} disabled={!ok || busy} onClick={go}>
            {busy ? 'Eliminando…' : cloud ? 'Eliminar mi cuenta' : 'Borrar todo'}
          </Button>
        </>
      }
    >
      <PanelSection title="Qué se borra">
        <p className="p-dr-p">
          {cloud
            ? 'Todo: tus sesiones, la configuración (carreras, zapatillas, zonas, desafíos), los recorridos y las series de Strava, la conexión con Strava (se revoca también allá) y la cuenta misma. No se puede deshacer.'
            : 'Todo lo que la app guardó en este navegador: tus sesiones, la configuración y los recorridos. No se puede deshacer.'}
        </p>
      </PanelSection>
      <PanelSection no="01" title="Antes, bajá tu respaldo">
        <p className="p-dr-p">Con el archivo JSON podés recuperar todo después, acá o en otra cuenta.</p>
        <div>
          <Button icon={DownloadSimple} onClick={() => doExport('json')}>
            Respaldo JSON
          </Button>
        </div>
      </PanelSection>
      <PanelSection no="02" title="Confirmá">
        <Field id="del-word" label={'Escribí «' + WORD + '»'}>
          <Input id="del-word" autoComplete="off" autoCapitalize="none" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
      </PanelSection>
    </PanelFrame>
  );
}
