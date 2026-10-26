'use client';
/* Importar un respaldo JSON o una planilla CSV (desde Ajustes → Cuenta y datos): un archivo o su texto pegado, qué se
   encontró antes de importar y, al confirmar, las sesiones con el mismo id se actualizan y las demás se suman. */
import '@/app/styles/screens/ajustes.css';
import { useState } from 'react';
import { UploadSimple } from '@phosphor-icons/react';
import { S } from '@/lib/store';
import { closeSheet, useSheetDirty } from '@/lib/sheets';
import { blockDemo, saveCfg, saveSessions, toast } from '@/lib/data/actions';
import { parseImport, type Parsed } from '@/lib/domain/csv';
import { defaultCfgRaw, normCfg } from '@/lib/domain/config';
import { TextArea } from '@/components/pista/fields';
import { plural } from '@/components/analisis/util';
import { Advice, PanelActions, PanelFrame, PanelSection } from './PanelFrame';

/** Las sesiones con el mismo id se actualizan y las demás se suman; los ajustes del respaldo reemplazan a los actuales. */
function doImport(p: Parsed) {
  if (blockDemo()) return;
  saveSessions(p.sessions);
  if (p.cfg) {
    const raw: Record<string, unknown> = Object.assign(defaultCfgRaw(), p.cfg);
    delete raw.kind;
    saveCfg(normCfg(raw));
  }
  closeSheet();
  toast('Se importaron ' + plural(p.sessions.length, 'sesión', 'sesiones') + '.');
}

export default function ImportPanel() {
  const [text, setText] = useState('');
  const [file, setFile] = useState('');
  const [err, setErr] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  useSheetDirty(!!text.trim());

  function check(t: string) {
    if (!t.trim()) {
      setErr('Elegí un archivo o pegá el texto.');
      return;
    }
    try {
      setParsed(parseImport(t));
      setErr('');
    } catch (e) {
      setErr((e instanceof Error && e.message) || 'No pude leer ese contenido.');
      setParsed(null);
    }
  }
  function onFile(f: File | undefined) {
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      const t = String(fr.result || '');
      setFile(f.name);
      setText(t);
      check(t);
    };
    fr.onerror = () => setErr('No pude leer el archivo.');
    fr.readAsText(f);
  }
  const go = () => (parsed ? doImport(parsed) : check(text));

  let found = null;
  if (parsed) {
    const ids = new Set(S.sessions.map((s) => s.id)),
      n = parsed.sessions.length,
      upd = parsed.sessions.filter((s) => ids.has(s.id)).length;
    found = (
      <Advice ok>
        <b>{plural(n, 'sesión encontrada', 'sesiones encontradas')}</b>: {n - upd} {n - upd === 1 ? 'nueva' : 'nuevas'} y {upd} que ya tenías (se actualizan).
        {parsed.cfg ? ' Trae ajustes: reemplazan a los de ahora.' : ''}
      </Advice>
    );
  }

  return (
    <PanelFrame eyebrow="Cuenta y datos" title="Importar" err={err || null} onSubmit={go} foot={<PanelActions label={parsed ? 'Importar' : 'Revisar'} onSave={go} />}>
      <PanelSection title="Qué se puede traer">
        <p className="p-dr-p">Un respaldo JSON o una planilla CSV exportados desde esta app. Las sesiones con el mismo id se actualizan y las demás se suman: no se borra nada.</p>
      </PanelSection>
      <PanelSection no="01" title="Elegí el archivo">
        <div className="aj-pick">
          <label className="p-btn" htmlFor="im-file">
            <UploadSimple aria-hidden="true" />
            Elegir archivo
          </label>
          <input type="file" id="im-file" className="aj-file" accept=".json,.csv,application/json,text/csv,text/plain" onChange={(e) => onFile(e.target.files?.[0])} />
          <span className="aj-mut">{file || 'JSON o CSV'}</span>
        </div>
      </PanelSection>
      <PanelSection no="02" title="O pegá el texto">
        <TextArea
          id="im-text"
          rows={7}
          aria-label="Texto del respaldo"
          spellCheck={false}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFile('');
            // si cambia el texto hay que volver a revisarlo antes de importar
            setParsed(null);
          }}
        />
        {found ? <div className="aj-found">{found}</div> : null}
      </PanelSection>
    </PanelFrame>
  );
}
