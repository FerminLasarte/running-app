'use client';
/* Cuando el navegador no deja descargar: el respaldo como texto para copiar. */
import { useEffect, useRef } from 'react';
import { requestClose } from '@/lib/sheets';
import { toast } from '@/lib/data/actions';
import { PanelFrame } from '@/components/panels/PanelFrame';

export default function ExportCopySheet({ name, text }: { name: string; text: string }) {
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ta.current?.focus();
    ta.current?.select();
  }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copiado');
    } catch {
      ta.current?.focus();
      ta.current?.select();
      toast('Seleccioné el texto: copialo manualmente.');
    }
  }
  return (
    <PanelFrame
      title="Copiá tu respaldo"
      foot={
        <>
          <button className="btn pri blk" data-a="copy" onClick={copy}>
            Copiar texto
          </button>
          <button className="btn blk" data-a="close" onClick={requestClose}>
            Cerrar
          </button>
        </>
      }
    >
      <p>Tu navegador no deja descargar desde acá. Copiá este texto y pegalo en una nota o un archivo {name}.</p>
      <div className="field" style={{ marginTop: 12 }}>
        <textarea className="in l" id="ex-text" rows={12} readOnly value={text} ref={ta}></textarea>
      </div>
    </PanelFrame>
  );
}
