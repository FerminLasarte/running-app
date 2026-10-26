'use client';
/* Perfil: tu foto, tu nombre, edad y desde cuándo corrés (para el Test de nivel) y las salidas por semana de la racha. */
import { useState } from 'react';
import { UploadSimple } from '@phosphor-icons/react';
import { useS } from '@/lib/store';
import { AJ_PARTS } from '@/lib/data/actions';
import { ageErr, applyProfile, profileDraft } from '@/lib/domain/settings';
import { streakInfo } from '@/lib/domain/stats';
import { Button, Stepper } from '@/components/pista/controls';
import { Field, Input, UnitInput } from '@/components/pista/fields';
import { Panel } from '@/components/pista/structure';
import { cssVars } from '@/components/pista/util';
import { Avatar } from '@/components/shell/Rail';
import { plural } from '@/components/analisis/util';
import { avatarDel, commitCfg, setAvatar, setGoal } from './actions';
import { Row } from './Row';
import { useAuto } from './useAuto';

function Photo() {
  const has = useS().cfg.avatar;
  /* se vuelve a montar vacío: así elegir la misma foto otra vez también dispara el cambio */
  const [key, setKey] = useState(0);
  return (
    <Row title="Tu foto" desc="Aparece en la barra lateral y en tu ficha de Logros.">
      <span className="aj-av">
        <Avatar />
      </span>
      <label className="p-btn sm" htmlFor="aj-photo">
        <UploadSimple aria-hidden="true" />
        {has ? 'Cambiar foto' : 'Subir foto'}
      </label>
      <input
        type="file"
        id="aj-photo"
        className="aj-file"
        accept="image/*"
        key={key}
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          setKey((k) => k + 1);
          if (f) setAvatar(f);
        }}
      />
      {has ? (
        <Button size="sm" variant="ghost" onClick={avatarDel}>
          Quitar
        </Button>
      ) : null}
    </Row>
  );
}

export function Perfil({ i }: { i: number }) {
  const { cfg } = useS();
  const { draft: d, edit, now, bind } = useAuto(cfg, () => profileDraft(cfg), (v) => commitCfg((c) => applyProfile(c, v)));
  const ae = ageErr(d.age),
    st = streakInfo();
  return (
    <Panel id={AJ_PARTS.perfil} title="Perfil" className="aj-set p-rise" style={cssVars({ '--i': i })} flush>
      <Photo />
      <div {...bind}>
        <Row title="Tu nombre" desc="Va en la barra lateral y en tu ficha de Logros." htmlFor="aj-name">
          <Input id="aj-name" className="aj-wide" value={d.name} maxLength={40} autoComplete="given-name" placeholder="Cómo te llamamos" onChange={(e) => edit((x) => ({ ...x, name: e.target.value }))} />
        </Row>
        <Row title="Edad y experiencia" desc="Con esto el Test de nivel te compara con corredores de tu edad y tu tiempo de práctica." className="aj-top">
          <Field id="aj-age" label="Edad" error={ae}>
            <UnitInput id="aj-age" unit="años" inputMode="numeric" className="aj-n" invalid={!!ae} value={d.age} onChange={(e) => edit((x) => ({ ...x, age: e.target.value }))} />
          </Field>
          <Field id="aj-since" label="Corriendo desde">
            <Input id="aj-since" type="date" value={d.since} onChange={(e) => now((x) => ({ ...x, since: e.target.value }))} />
          </Field>
        </Row>
      </div>
      <Row
        title="Salidas por semana"
        desc={
          <>
            Tu objetivo para la racha.
            {st.cur ? ' Hoy llevás ' + plural(st.cur, 'semana', 'semanas seguidas') + ' cumpliéndolo.' : ''}
          </>
        }
      >
        <Stepper label="Salidas por semana" value={cfg.weeklyGoal} min={1} max={7} onChange={setGoal} />
        <span className="aj-mut">{cfg.weeklyGoal === 1 ? 'salida' : 'salidas'}</span>
      </Row>
    </Panel>
  );
}
