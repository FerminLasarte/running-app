'use client';
/* Modo «No me siento al 100%»: por unos días el puntaje no castiga ir más lento ni quedarse corto. */
import { useState } from 'react';
import { S } from '@/lib/store';
import { REASONS, addDays, ymd } from '@/lib/domain/util';
import { blockDemo, saveCfg, toast } from '@/lib/data/actions';
import { closeSheet } from '@/lib/sheets';
import { Choices, Segmented } from '@/components/pista/controls';
import { PanelActions, PanelFrame, PanelSection } from './PanelFrame';

const DAYS = ['3', '5', '7', '14'];

export default function EasyPanel() {
  const [days, setDays] = useState('5');
  const [reason, setReason] = useState('');
  const save = () => {
    if (blockDemo()) return;
    const f = ymd(new Date());
    saveCfg({ ...S.cfg, easy: { from: f, until: ymd(addDays(new Date(), +days - 1)), reason } });
    closeSheet();
    toast('Modo suave activado por ' + days + ' días');
  };
  return (
    <PanelFrame eyebrow="Modo suave" title="No me siento al 100%" onSubmit={save} foot={<PanelActions label="Activar" onSave={save} />}>
      <PanelSection title="Mientras esté activo">
        <p className="p-dr-p">Para cuando estás resfriado, con una molestia o en una semana pesada.</p>
        <ul className="p-dr-list">
          <li>No te resto puntos por correr más lento o con la FC más baja.</li>
          <li>Pesa la mitad quedarte corto de distancia.</li>
          <li>Te sugiero bajar el volumen un 20–30% y correr por sensaciones.</li>
        </ul>
      </PanelSection>
      <PanelSection no="01" title="¿Por cuántos días?">
        <Segmented label="Días" value={days} onChange={setDays} options={DAYS.map((n) => ({ value: n, label: n + ' días' }))} />
      </PanelSection>
      <PanelSection no="02" title="Motivo">
        <Choices toggle label="Motivo (opcional)" value={reason || null} onChange={(v) => setReason(v || '')} options={REASONS.map((x) => ({ value: x, label: x }))} />
        <p className="p-dr-hint" style={{ marginTop: 16 }}>
          Si la molestia dura más de unos días o te duele al caminar, consultá con un profesional de la salud.
        </p>
      </PanelSection>
    </PanelFrame>
  );
}
