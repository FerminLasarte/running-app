'use client';
/* Lectura con Claude: cargar el plan desde capturas o texto, y el resultado desde capturas de Garmin.
   Si la app no tiene Claude disponible, todo esto queda escondido (como el original sin `sample`). */
import { useEffect, useRef, useState } from 'react';
import { aiAvailable, type AiLimits } from '@/lib/ai/client';
import { toast } from '@/lib/data/actions';

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
  ai: AiLimits | null;
  busy: boolean;
  note: string;
  noteBad: boolean;
  text: string;
  onText: (v: string) => void;
  onFiles: (fs: File[]) => void;
  onTextGo: () => void;
}) {
  const can = !!ai;
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open) taRef.current?.focus();
  }, [open]);
  const shown = note || (!can ? 'Cargar desde foto o texto no está disponible en esta vista. Armá el entrenamiento abajo, es rápido.' : '');
  /* tipo y fecha primero; las etapas como bloques; cargar desde captura queda a mano pero plegado */
  return (
    <details className="fmore" id="pf-ai-d" hidden={!can}>
      <summary>
        Cargar desde tu reloj o app <small>captura o texto</small>
      </summary>
      <div id="pf-ai">
        <p className="sub" style={{ marginTop: 2 }}>
          Subí una o varias capturas del entrenamiento (Garmin Connect, Runna…) o pegá el texto, y armo las etapas por vos.
        </p>
        <div id="pf-ai-btns" hidden={!can} style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          <button className="btn pri blk" id="pf-photo-btn" data-a="pf-photo" hidden={!(ai && ai.images)} disabled={busy} onClick={() => fileRef.current?.click()}>
            Subir captura(s)
          </button>
          <input
            type="file"
            id="pf-photo"
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
          <button className="btn blk" id="pf-text-btn" data-a="pf-text" disabled={busy} onClick={() => setOpen(!open)}>
            Pegar o escribir texto
          </button>
          <div id="pf-text-wrap" style={{ display: open ? 'grid' : 'none' }}>
            <textarea
              className="in l"
              id="pf-ai-text"
              ref={taRef}
              rows={5}
              placeholder="Ej: Calentamiento 2 km, 5 veces 1200 m a 4:35 con recuperación 2 min, enfriamiento 1,5 km"
              value={text}
              onChange={(e) => onText(e.target.value)}
            />
            <button className="btn blk" id="pf-text-go" data-a="pf-text-go" style={{ marginTop: 8 }} disabled={busy} onClick={onTextGo}>
              Leer texto
            </button>
          </div>
        </div>
        <p className="hint" id="pf-ai-note" role="status" style={{ marginTop: 10, color: noteBad ? 'var(--danger)' : undefined }}>
          {shown}
        </p>
      </div>
    </details>
  );
}

/* ---- laps desde una captura ---- */
export function LapsAiBox({ ai, busy, note, onFiles }: { ai: AiLimits | null; busy: boolean; note: string; onFiles: (fs: File[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  if (!(ai && ai.images)) return null;
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="h3">Leer el resultado desde capturas</div>
      <p className="sub" style={{ marginTop: 2 }}>
        Subí las capturas de la pestaña «Intervalos» de Garmin Connect (podés elegir todas las que necesites, hasta 24) y completo las etapas. Después revisá los números.
      </p>
      <button className="btn blk" style={{ marginTop: 10 }} data-a="rf-photo" disabled={busy} onClick={() => fileRef.current?.click()}>
        Subir capturas del resultado
      </button>
      <input
        type="file"
        id="rf-photo"
        ref={fileRef}
        multiple
        accept={accept(ai)}
        hidden
        onChange={(e) => {
          const fs = takeFiles(e.target.files, ai);
          e.target.value = '';
          if (fs.length) onFiles(fs);
        }}
      />
      <p className="hint" id="rf-ai-note" role="status" style={{ marginTop: 8 }}>
        {note}
      </p>
    </div>
  );
}
