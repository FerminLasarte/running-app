'use client';
/* Importar un respaldo JSON o una planilla CSV (openImport / checkImport / doImport). */
import { useState } from 'react';
import { S } from '@/lib/store';
import { closeSheet } from '@/lib/sheets';
import { blockDemo, saveCfg, saveSessions, toast } from '@/lib/data/actions';
import { parseImport, type Parsed } from '@/lib/domain/csv';
import { defaultCfgRaw, normCfg } from '@/lib/domain/config';
import { SheetFrame } from './SheetFrame';

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
  toast('Se importaron ' + p.sessions.length + ' sesiones.');
}

export default function ImportSheet() {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);

  function checkImport(t: string) {
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
      setText(t);
      checkImport(t);
    };
    fr.onerror = () => setErr('No pude leer el archivo.');
    fr.readAsText(f);
  }

  let prev = null;
  if (parsed) {
    const ids = new Set(S.sessions.map((s) => s.id)),
      upd = parsed.sessions.filter((s) => ids.has(s.id)).length;
    prev = (
      <div className="scorebox">
        <b>{parsed.sessions.length} sesiones encontradas</b>
        <p className="sub">{parsed.sessions.length - upd + ' nuevas · ' + upd + ' actualizan existentes' + (parsed.cfg ? ' · incluye ajustes' : '')}</p>
      </div>
    );
  }

  return (
    <SheetFrame
      title="Importar datos"
      foot={
        parsed ? (
          <button className="btn pri blk" data-a="im-do" onClick={() => doImport(parsed)}>
            Importar
          </button>
        ) : (
          <button className="btn pri blk" data-a="im-check" onClick={() => checkImport(text)}>
            Revisar
          </button>
        )
      }
    >
      <p>Elegí un archivo JSON o CSV exportado desde esta app, o pegá su texto. Las sesiones con el mismo id se actualizan; las demás se suman. No se borra nada.</p>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="im-file">Archivo</label>
        <input className="in l" type="file" id="im-file" accept=".json,.csv,application/json,text/csv,text/plain" style={{ paddingTop: 14 }} onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      <div className="field">
        <label htmlFor="im-text">O pegá el texto</label>
        <textarea
          className="in l"
          id="im-text"
          rows={6}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // si cambia el texto hay que volver a revisarlo antes de importar
            setParsed(null);
          }}
        ></textarea>
      </div>
      <div className="err" id="im-err" role="alert">
        {err}
      </div>
      <div id="im-prev">{prev}</div>
    </SheetFrame>
  );
}
