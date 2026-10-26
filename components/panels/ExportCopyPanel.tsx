'use client';
/* Cuando el navegador no deja descargar: el respaldo como texto para copiarlo. */
import '@/app/styles/screens/ajustes.css';
import { useEffect, useRef } from 'react';
import { Copy } from '@phosphor-icons/react';
import { requestClose } from '@/lib/sheets';
import { toast } from '@/lib/data/actions';
import { Button } from '@/components/pista/controls';
import { PanelFrame, PanelSection } from './PanelFrame';

export default function ExportCopyPanel({ name, text }: { name: string; text: string }) {
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
      toast('Seleccioné el texto: copialo a mano.');
    }
  }
  return (
    <PanelFrame
      eyebrow="Cuenta y datos"
      title="Copiá tu respaldo"
      onSubmit={copy}
      foot={
        <>
          <Button variant="ghost" onClick={requestClose}>
            Cerrar
          </Button>
          <Button variant="pri" icon={Copy} onClick={copy}>
            Copiar texto
          </Button>
        </>
      }
    >
      <PanelSection title={name}>
        <p className="p-dr-p">Tu navegador no deja descargar desde acá. Copiá este texto y pegalo en una nota o en un archivo {name}.</p>
        <textarea id="ex-text" ref={ta} rows={14} readOnly aria-label="Texto del respaldo" spellCheck={false} value={text} className="p-in aj-copy" />
      </PanelSection>
    </PanelFrame>
  );
}
