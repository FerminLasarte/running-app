'use client';
/* Lectura con Claude: el plan desde capturas o texto, y el resultado desde capturas de Garmin. Si la app no tiene
   Claude disponible, no se muestra (el panel de planificar deja «Desde una captura» apagado). */
import { useEffect, useRef, useState } from 'react';
import { Camera, TextAlignLeft } from '@phosphor-icons/react';
import { aiAvailable, type AiLimits } from '@/lib/ai/client';
import { toast } from '@/lib/data/actions';
import { Button } from '@/components/pista/controls';
import { Field, TextArea } from '@/components/pista/fields';

/** límites de Claude; null mientras carga o si no está disponible */
export function useAi() {
  const [ai, setAi] = useState<AiLimits | null>(null);
  useEffect(() => {
    let on = true;
    aiAvailable().then((l) => {
      if (on) setAi(l);
    });
    return () => {
      on = false;
    };
  }, []);
  return ai;
}

/** las capturas elegidas: hasta 24, avisando si van en varias tandas */
function takeFiles(list: FileList | null, ai: AiLimits | null): File[] {
  let fs = list ? [...list] : [];
  const max = (ai && ai.maxCount) || 1;
  if (fs.length > 24) {
    toast('Tomé las primeras 24 capturas.', 4000);
    fs = fs.slice(0, 24);
  } else if (fs.length > max) toast('Son ' + fs.length + ' capturas: las leo en ' + Math.ceil(fs.length / max) + ' tandas.', 4000);
  return fs;
}
const accept = (ai: AiLimits | null) => (ai && ai.mediaTypes && ai.mediaTypes.length ? ai.mediaTypes.join(',') : 'image/*');

/** botón que abre el selector de capturas */
function PickFiles({ ai, busy, label, onFiles }: { ai: AiLimits; busy: boolean; label: string; onFiles: (fs: File[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button icon={Camera} disabled={busy} onClick={() => fileRef.current?.click()}>
        {label}
      </Button>
      <input
        type="file"
        ref={fileRef}
        accept={accept(ai)}
        multiple
        hidden
        onChange={(e) => {
          const fs = takeFiles(e.target.files, ai);
          e.target.value = '';
          if (fs.length) onFiles(fs);
        }}
      />
    </>
  );
}

/** planificar: capturas del entrenamiento (Garmin Connect, Runna…) o el texto pegado */
export function PlanAiBox({
  ai,
  busy,
  note,
  noteBad,
  text,
  onText,
  onFiles,
  onTextGo,
}: {
  ai: AiLimits;
  busy: boolean;
  note: string;
  noteBad: boolean;
  text: string;
  onText: (v: string) => void;
  onFiles: (fs: File[]) => void;
  onTextGo: () => void;
}) {
  const [open, setOpen] = useState(!!text);
  return (
    <div className="p-ai">
      <p className="p-dr-p">Subí una o varias capturas del entrenamiento o pegá el texto, y armo los tramos por vos.</p>
      <div className="acts">
        {ai.images ? <PickFiles ai={ai} busy={busy} label="Subir capturas" onFiles={onFiles} /> : null}
        <Button icon={TextAlignLeft} disabled={busy} aria-expanded={open} onClick={() => setOpen(!open)}>
          Pegar el texto
        </Button>
      </div>
      {open ? (
        <>
          <Field id="pf-ai-text" label="Texto del entrenamiento">
            <TextArea
              id="pf-ai-text"
              autoFocus
              rows={4}
              placeholder="Calentamiento 2 km, 5 veces 1200 m a 4:35 con 2 min de pausa, enfriamiento 1,5 km"
              value={text}
              onChange={(e) => onText(e.target.value)}
            />
          </Field>
          <div className="acts">
            <Button size="sm" disabled={busy} onClick={onTextGo}>
              Leer el texto
            </Button>
          </div>
        </>
      ) : null}
      {note ? (
        <p className="p-dr-hint" role="status" style={noteBad ? { color: 'var(--neg)' } : undefined}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

/** registrar por etapas: capturas de la pestaña «Intervalos» de Garmin Connect */
export function LapsAiBox({ ai, busy, note, onFiles }: { ai: AiLimits | null; busy: boolean; note: string; onFiles: (fs: File[]) => void }) {
  if (!(ai && ai.images)) return null;
  return (
    <div className="p-ai">
      <p className="p-dr-p">Subí las capturas de la pestaña «Intervalos» de Garmin Connect (hasta 24) y completo las etapas. Después revisá los números.</p>
      <div className="acts">
        <PickFiles ai={ai} busy={busy} label="Leer desde capturas" onFiles={onFiles} />
      </div>
      {note ? (
        <p className="p-dr-hint" role="status">
          {note}
        </p>
      ) : null}
    </div>
  );
}
