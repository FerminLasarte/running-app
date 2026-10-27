/* Completa con Strava el desnivel y las mitades (result.ex) de las salidas que se cargaron antes de que se guardaran, o
   a mano: un pedido del detalle de cada actividad, hasta 40 por vez (el límite de pedidos a Strava lo comparte toda la
   app). Lo nuevo se guarda solo al traer cada salida de Strava en el panel de carga. */
import { S, getUi, setUi } from '@/lib/store';
import { blockDemo, saveSessions } from '@/lib/data/actions';
import { doneList } from '@/lib/domain/stats';
import { runExtra } from '@/lib/domain/streams';
import type { Session } from '@/lib/domain/types';
import { stravaErrMsg, svCall } from './client';
import { SV_FATAL, matchRuns } from './match';

export interface ExUi {
  busy: boolean;
  msg: string;
}
export const EX_UI0: ExUi = { busy: false, msg: '' };
const exSet = (p: Partial<ExUi>) => setUi<ExUi>('ex', (v) => ({ ...(v || EX_UI0), ...p }));
const MAX = 40;

/** las salidas hechas que todavía no tienen el desnivel ni las mitades */
export const exPending = () => doneList().filter((s) => !s.result.ex);

export async function exBackfill() {
  if (blockDemo()) return;
  if (getUi<ExUi>('ex', EX_UI0).busy) return;
  const note = (t: string) => exSet({ msg: t });
  exSet({ busy: true });
  let done = 0;
  const out: Session[] = [];
  try {
    const todo = exPending();
    if (!todo.length) {
      exSet({ busy: false, msg: 'Todas tus salidas ya tienen su desnivel.' });
      return;
    }
    const jobs = await matchRuns(todo, () => note('Buscando tus corridas en Strava…'));
    if (!jobs.length) {
      exSet({ busy: false, msg: 'No encontré en Strava corridas que coincidan con tus salidas.' });
      return;
    }
    try {
      for (const [q, c] of jobs.slice(0, MAX)) {
        note('Completando ' + (done + 1) + ' de ' + Math.min(jobs.length, MAX) + '…');
        try {
          const ex = runExtra(await svCall('get_activity_performance', { activity_id: c.id }));
          const cur = S.sessions.find((x) => x.id === q.id);
          if (!ex || !cur || !cur.result) continue;
          out.push({ ...cur, result: { ...cur.result, sid: c.id, ex } });
          done++;
        } catch (e) {
          const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
          if (SV_FATAL.has(code)) throw e;
        }
      }
    } finally {
      /* lo que ya se completó se guarda aunque Strava corte a mitad de camino */
      await saveSessions(out);
    }
    exSet({
      msg:
        'Listo: completé ' +
        done +
        (done === 1 ? ' salida.' : ' salidas.') +
        (jobs.length > MAX ? ' Quedan más: tocá de nuevo.' : '') +
        (todo.length > jobs.length ? ' ' + (todo.length - jobs.length) + ' no tenían una corrida parecida en Strava (misma fecha y distancia).' : ''),
    });
  } catch (e) {
    exSet({ msg: stravaErrMsg(e) });
    console.error(e);
  }
  exSet({ busy: false });
}
