/* Respaldo: descarga el JSON o el CSV. Si el navegador no deja descargar, muestra el texto para copiarlo. */
import { S } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import { toCsv } from '@/lib/domain/csv';
import { todayS } from '@/lib/domain/util';
import { blockDemo, toast } from './actions';

export type ExportKind = 'json' | 'csv';

/** `custom` exporta otro texto con el mismo mecanismo (por ejemplo, la planilla filtrada del Registro). */
export async function doExport(kind: ExportKind, custom?: { text: string; name: string }): Promise<void> {
  if (blockDemo()) return;
  if (!S.sessions.length) {
    toast('Todavía no hay datos para exportar.');
    return;
  }
  const text = custom ? custom.text : kind === 'json' ? JSON.stringify({ app: 'registro-running', v: 1, exportedAt: new Date().toISOString(), cfg: S.cfg, sessions: S.sessions }, null, 1) : toCsv();
  const name = custom ? custom.name : 'running-' + todayS() + '.' + kind;
  try {
    const type = name.endsWith('.json') ? 'application/json' : 'text/csv';
    const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Archivo listo');
  } catch {
    openSheet('exportCopy', { name, text });
  }
}
