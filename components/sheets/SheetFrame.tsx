'use client';
/* Marco de una hoja: título con ×, cuerpo con scroll y pie con los botones. */
import type { ReactNode } from 'react';
import { requestClose } from '@/lib/sheets';

export function SheetFrame({ title, foot, children }: { title: ReactNode; foot?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="shead">
        <h2 id="stitle">{title}</h2>
        <button id="sclose" className="ibtn" aria-label="Cerrar" onClick={requestClose}>
          &times;
        </button>
      </div>
      <div id="sbody" className="sbody">
        {children}
      </div>
      <div id="sfoot" className="sfoot">
        {foot}
      </div>
    </>
  );
}
