'use client';
/* Pie de hoja para confirmar el borrado de una sesión (Detalle y Editar plan). */
import { closeSheet, requestClose } from '@/lib/sheets';
import { blockDemo, deleteSession, toast } from '@/lib/data/actions';

export function DelConfirm({ id }: { id: string }) {
  return (
    <>
      <p style={{ fontWeight: 600, textAlign: 'center' }}>¿Eliminar esta sesión? No se puede deshacer.</p>
      <button
        className="btn dng blk"
        data-a="del-do"
        onClick={() => {
          if (blockDemo()) return;
          deleteSession(id);
          closeSheet();
          toast('Sesión eliminada');
        }}
      >
        Sí, eliminar
      </button>
      <button className="btn blk" data-a="close" onClick={requestClose}>
        Cancelar
      </button>
    </>
  );
}
