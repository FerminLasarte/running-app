'use client';
/* Pie para confirmar el borrado de una sesión (Editar plan y la página del detalle). En una hoja, cancelar la
   cierra; la página pasa qué hacer al borrar y al cancelar. */
import { closeSheet, requestClose } from '@/lib/sheets';
import { blockDemo, deleteSession, toast } from '@/lib/data/actions';

export function DelConfirm({ id, onDone = closeSheet, onCancel = requestClose }: { id: string; onDone?: () => void; onCancel?: () => void }) {
  return (
    <>
      <p style={{ fontWeight: 600, textAlign: 'center' }}>¿Eliminar esta sesión? No se puede deshacer.</p>
      <button
        className="btn dng blk"
        data-a="del-do"
        onClick={() => {
          if (blockDemo()) return;
          deleteSession(id);
          onDone();
          toast('Sesión eliminada');
        }}
      >
        Sí, eliminar
      </button>
      <button className="btn blk" data-a="close" onClick={onCancel}>
        Cancelar
      </button>
    </>
  );
}
