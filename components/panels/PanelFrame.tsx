'use client';
/* Marco de un panel (se abre desde la derecha; en el celu ocupa toda la pantalla): de qué se trata arriba, el título
   de marca con la ×, el cuerpo con scroll y el pie con los botones. Con `onSubmit`, ⌘↵ (Ctrl+↵) guarda desde
   cualquier campo del panel. Estilos en app/styles/components/panels.css. */
import type { KeyboardEvent, ReactNode } from 'react';
import { CheckCircle, Warning, X } from '@phosphor-icons/react';
import { requestClose } from '@/lib/sheets';
import { S } from '@/lib/store';
import { BrandTitle } from '@/components/pista/structure';
import { Button } from '@/components/pista/controls';

export const PANEL_TITLE_ID = 'p-dr-t';
export const PANEL_BODY_ID = 'p-dr-b';

/** el atajo de guardar, como se escribe en este equipo */
export const submitKbd = () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘↵' : 'Ctrl ↵');

export function PanelFrame({
  eyebrow,
  title,
  note,
  foot,
  err,
  onSubmit,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  /** a la izquierda del pie: el resumen de lo que se va a guardar */
  note?: ReactNode;
  foot?: ReactNode;
  /** lo que no deja guardar: sobre el pie, siempre a la vista */
  err?: ReactNode;
  onSubmit?: () => void;
  children: ReactNode;
}) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (!onSubmit || e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    /* mientras se cierra (ya se guardó) no se guarda dos veces */
    if (!S.ui.sheetClosing) onSubmit();
  };
  return (
    <div className="p-dr-in" onKeyDown={onKeyDown}>
      <div className="p-dr-h">
        {eyebrow ? <span className="lbl">{eyebrow}</span> : null}
        <BrandTitle as="h2" id={PANEL_TITLE_ID}>
          {title}
        </BrandTitle>
        <div className="close">
          <kbd aria-hidden="true">Esc</kbd>
          <button className="ib" type="button" data-close aria-label="Cerrar" onClick={requestClose}>
            <X aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="p-dr-b" id={PANEL_BODY_ID}>
        {children}
      </div>
      {err ? (
        <p className="p-dr-err" role="alert">
          {err}
        </p>
      ) : null}
      {foot ? (
        <div className="p-dr-f">
          <span className="sp">{note}</span>
          {foot}
        </div>
      ) : null}
    </div>
  );
}

/** un paso del panel: número en tartán, título y, a la derecha, un dato (los km del plan) */
export function PanelSection({ no, title, aside, children }: { no?: string; title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="p-dr-s">
      <div className="p-dr-sh">
        {no ? <span className="no">{no}</span> : null}
        <h3>{title}</h3>
        {aside ? <span className="r">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

/** el pie de siempre: «Cancelar» (pregunta si hay cambios) y el botón principal con su atajo */
export function PanelActions({ label, onSave, disabled }: { label: ReactNode; onSave: () => void; disabled?: boolean }) {
  return (
    <>
      <Button variant="ghost" onClick={requestClose}>
        Cancelar
      </Button>
      <Button variant="pri" kbd={submitKbd()} disabled={disabled} onClick={onSave}>
        {label}
      </Button>
    </>
  );
}

/** aviso en el momento: verde si está bien, ámbar si conviene revisar */
export function Advice({ ok, children }: { ok?: boolean; children: ReactNode }) {
  return (
    <div className={'p-advice ' + (ok ? 'ok' : 'warn')} role="status">
      {ok ? <CheckCircle weight="fill" aria-hidden="true" /> : <Warning weight="fill" aria-hidden="true" />}
      <div>{children}</div>
    </div>
  );
}
