'use client';
/* Easter egg «kipchoge» (boceto design/bocetos/easter-eggs.html, #kipchoge): escribirlo en ⌘K cierra la paleta, lleva
   a la semana de hoy y siete luces verdes, como el láser que marcaba el ritmo en Viena, dan una vuelta a la pista
   como si fuera de 400 m al ritmo del 1:59:40 (2:50/km: 1:08 la vuelta). Al terminar, el aviso. Con «reducir
   movimiento», solo el aviso. */
import { useEffect } from 'react';
import { setS, setUi, useApp } from '@/lib/store';
import { reduceMotion } from '@/lib/motion';
import { navigate } from '@/lib/nav';
import { toast } from '@/lib/data/actions';
import { norm } from '@/lib/domain/util';

export const KIP_WORD = 'kipchoge';
/** 400 m a 2:50/km */
const LAP_SEC = 68;
const MSG = '1:59:40 · Viena, 2019. El primer maratón en menos de dos horas.';
const KEY = 'kip';

/** si lo que se escribió en la paleta es la palabra */
export const isKip = (q: string) => norm(q.trim()) === KIP_WORD;

export function kipchoge() {
  if (reduceMotion()) return toast(MSG, 6000);
  setS({ weekOff: 0 });
  navigate('/semana', () => setUi<number | null>(KEY, Date.now()));
}

const lapEnd = () => {
  setUi<number | null>(KEY, null);
  toast(MSG, 6000);
};

/* cuántas pistas de la semana hay dibujadas: al irte de la semana a mitad de vuelta, la vuelta no queda pendiente
   para la próxima. Se mira en el turno siguiente, porque React (en desarrollo) desmonta y vuelve a montar de prueba */
let boards = 0;
/** la vuelta de las luces para la pista de la semana (undefined si no hay) */
export function useKipLap() {
  const key = useApp((s) => s.ui[KEY] as number | null | undefined);
  useEffect(() => {
    boards++;
    return () => {
      boards--;
      setTimeout(() => {
        if (!boards) setUi<number | null>(KEY, null);
      });
    };
  }, []);
  return key ? { key, sec: LAP_SEC, onEnd: lapEnd } : undefined;
}
