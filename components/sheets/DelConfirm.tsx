'use client';
/* Borrar una sesión, después de confirmar: el panel de planificar (al editar) y la página del detalle. En un panel,
   cancelar lo cierra; la página pasa qué hacer al borrar y al cancelar. */
import { closeSheet, requestClose } from '@/lib/sheets';
import { blockDemo, deleteSession, toast } from '@/lib/data/actions';

/** borra y avisa (en el modo ejemplo no hace nada) */
export function delSession(id: string, onDone: () => void) {
  if (blockDemo()) return;
  deleteSession(id);
  onDone();
  toast('Sesión eliminada');
}

export function DelConfirm({ id, onDone = closeSheet, onCancel = requestClose }: { id: string; onDone?: () => void; onCancel?: () => void }) {
  return (
    <>
      <p style={{ fontWeight: 600, textAlign: 'center' }}>¿Eliminar esta sesión? No se puede deshacer.</p>
      <button className="btn dng blk" data-a="del-do" onClick={() => delSession(id, onDone)}>
        Sí, eliminar
      </button>
      <button className="btn blk" data-a="close" onClick={onCancel}>
        Cancelar
      </button>
    </>
  );
}
