/* Borrador: si la página se recarga (por ejemplo al volver de la app de Garmin) no perdés lo que cargaste.
   Las hojas «Planificar» y «Registrar resultado» guardan su formulario con useDraft; el shell llama a draftRestore()
   una vez, cuando ya cargaron los datos. */
import { useEffect } from 'react';
import { S } from '@/lib/store';
import { closeSheet, openSheet } from '@/lib/sheets';
import { planInit, type PlanDraft } from '@/lib/domain/planForm';
import { resultInit, type ResultDraft } from '@/lib/domain/resultForm';
import { toast } from './actions';

const DK = 'rr_draft1';
export type Draft = PlanDraft | ResultDraft;
type Stored = Draft & { t: number };

/** el formulario abierto (lo registra useDraft) */
let cur: Draft | null = null;
let draftT: ReturnType<typeof setTimeout> | undefined;

function draftSave() {
  if (S.demo || !cur) return;
  try {
    localStorage.setItem(DK, JSON.stringify({ ...cur, t: Date.now() }));
  } catch {
    /* sin almacenamiento */
  }
}
export function draftClear() {
  try {
    localStorage.removeItem(DK);
  } catch {
    /* sin almacenamiento */
  }
}
function draftSoon() {
  clearTimeout(draftT);
  draftT = setTimeout(draftSave, 350);
}

/** Desde la hoja: guarda `data` (memoizado) un rato después de cada cambio y al irse de la página.
    Al cerrarse la hoja el borrador se borra, como hacía closeSheet en el original. */
export function useDraft(data: Draft) {
  useEffect(() => {
    cur = data;
    draftSoon();
  }, [data]);
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) draftSave();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', draftSave);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', draftSave);
      clearTimeout(draftT);
      cur = null;
      draftClear();
    };
  }, []);
}

export function draftRestore() {
  let d: Stored | null = null;
  try {
    d = JSON.parse(localStorage.getItem(DK) || 'null');
  } catch {
    d = null;
  }
  if (!d || !d.k || !(Date.now() - d.t <= 3 * 864e5)) {
    draftClear();
    return;
  }
  try {
    if (d.k === 'plan') {
      const props = { id: d.sid || null, date: d.date, draft: d };
      planInit(props); // si el borrador está roto, falla acá y no abre nada
      openSheet('plan', props);
    } else if (d.k === 'result') {
      const props = { id: d.sid || null, free: true, draft: d };
      resultInit(props);
      openSheet('result', props);
    } else return;
    toast('Recuperé lo que estabas cargando', 3500);
  } catch (e) {
    console.error(e);
    closeSheet();
    draftClear();
  }
}
