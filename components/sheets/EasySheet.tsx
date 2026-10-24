'use client';
/* Modo «No me siento al 100%»: por unos días el puntaje no castiga ir más lento ni quedarse corto. */
import { useState } from 'react';
import { SheetFrame } from './SheetFrame';
import { S } from '@/lib/store';
import { REASONS, addDays, ymd } from '@/lib/domain/util';
import { blockDemo, saveCfg, toast } from '@/lib/data/actions';
import { closeSheet } from '@/lib/sheets';

export default function EasySheet() {
  const [days, setDays] = useState(5);
  const [reason, setReason] = useState('');
  const save = () => {
    if (blockDemo()) return;
    const f = ymd(new Date());
    saveCfg({ ...S.cfg, easy: { from: f, until: ymd(addDays(new Date(), days - 1)), reason } });
    closeSheet();
    toast('Modo suave activado por ' + days + ' días');
  };
  return (
    <SheetFrame
      title="No me siento al 100%"
      foot={
        <button className="btn pri blk" data-a="easy-save" onClick={save}>
          Activar
        </button>
      }
    >
      <p>Para cuando estás resfriado, con una molestia o en una semana pesada. Mientras esté activo:</p>
      <ul style={{ margin: '10px 0 18px 18px', color: 'var(--ink2)', lineHeight: 1.6 }}>
        <li>No te resto puntos por correr más lento o con la FC más baja.</li>
        <li>Pesa la mitad quedarte corto de distancia.</li>
        <li>Te sugiero bajar el volumen un 20–30% y correr por sensaciones.</li>
      </ul>
      <div className="field">
        <span className="lab">¿Por cuántos días?</span>
        <div className="seg">
          {[3, 5, 7, 14].map((n) => (
            <button key={n} className="chip" data-a="easy-days" data-v={n} aria-pressed={days === n} onClick={() => setDays(n)}>
              {n} días
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="lab">Motivo (opcional)</span>
        <div className="chips">
          {REASONS.map((x) => (
            <button key={x} className="chip" data-a="easy-reason" data-v={x} aria-pressed={reason === x} onClick={() => setReason(reason === x ? '' : x)}>
              {x}
            </button>
          ))}
        </div>
      </div>
      <p className="hint">Si la molestia dura más de unos días o te duele al caminar, consultá con un profesional de la salud.</p>
    </SheetFrame>
  );
}
