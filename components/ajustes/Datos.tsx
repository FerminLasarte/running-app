'use client';
/* Cuenta y datos: dónde se guardan tus datos (en la nube o solo en este navegador), cerrar sesión, la contraseña y el
   respaldo. Probando sin cuenta, solo que nada se guarda. */
import { useState, type FormEvent } from 'react';
import { DownloadSimple, Key, SignOut, Table, UploadSimple } from '@phosphor-icons/react';
import { useS } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import { AJ_PARTS, blockDemo, focusField, toast } from '@/lib/data/actions';
import { doExport } from '@/lib/data/backup';
import { PASS_MIN, setPassword, signOut } from '@/lib/auth/client';
import { endGuest } from '@/lib/guest';
import { Button, Chip } from '@/components/pista/controls';
import { Input } from '@/components/pista/fields';
import { Panel } from '@/components/pista/structure';
import { cssVars } from '@/components/pista/util';
import { FieldErr, Row } from './Row';

/** el campo de la contraseña nueva */
const PASS_ID = 'aj-clave';

/** «ag•••••@gmail.com»: se ve de quién es sin mostrarlo entero en pantalla */
const maskMail = (m: string) => m.replace(/^(.{2})[^@]*/, (_, a: string) => a + '•••••');

export function openImport() {
  if (blockDemo()) return;
  openSheet('import');
}

/** cambiar la contraseña, en la misma fila (la primera la pone el responsable al crear la cuenta en Supabase) */
function Password() {
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const bad = await setPassword(pass);
    setBusy(false);
    if (bad) return setErr(bad);
    toast('Listo: cambiaste la contraseña.');
    setOpen(false);
    setPass('');
    setErr('');
  }
  return (
    <Row title="Contraseña" htmlFor={open ? PASS_ID : undefined} desc="Para entrar con tu mail.">
      {open ? (
        <form className="aj-pass" onSubmit={save}>
          <Input id={PASS_ID} type="password" autoComplete="new-password" placeholder={PASS_MIN + ' caracteres o más'} value={pass} invalid={!!err} onChange={(e) => setPass(e.target.value)} />
          <Button type="submit" variant="pri" size="sm" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => (setOpen(false), setPass(''), setErr(''))}>
            Cancelar
          </Button>
          <FieldErr id={PASS_ID}>{err}</FieldErr>
        </form>
      ) : (
        <Button icon={Key} onClick={() => (setOpen(true), focusField(PASS_ID))}>
          Cambiar contraseña
        </Button>
      )}
    </Row>
  );
}

export function Datos({ i }: { i: number }) {
  const { mode, email } = useS(),
    cloud = mode === 'cloud';
  if (mode === 'guest')
    return (
      <Panel id={AJ_PARTS.datos} title="Cuenta y datos" className="aj-set p-rise" style={cssVars({ '--i': i })} flush>
        <Row title="Cuenta" desc="Estás probando con datos de ejemplo: nada de lo que hagas se guarda.">
          <Chip color="var(--t-tempo)">Sin cuenta</Chip>
          <span className="aj-sp" />
          <Button variant="ghost" icon={SignOut} onClick={endGuest}>
            Salir
          </Button>
        </Row>
      </Panel>
    );
  return (
    <Panel id={AJ_PARTS.datos} title="Cuenta y datos" className="aj-set p-rise" style={cssVars({ '--i': i })} flush>
      <Row
        title="Cuenta"
        desc={cloud ? 'Tus datos se guardan en tu cuenta: no se pierden al cambiar de compu o de teléfono.' : 'Tus datos se guardan solo en este navegador. Se pueden borrar si limpiás los datos del sitio: bajá el respaldo seguido.'}
      >
        {email ? (
          <span className="mono aj-mail">
            {maskMail(email)}
          </span>
        ) : null}
        <Chip color={cloud ? 'var(--pos)' : 'var(--t-tempo)'}>{cloud ? 'En la nube' : 'En este navegador'}</Chip>
        <span className="aj-sp" />
        {email ? (
          <Button size="sm" variant="ghost" icon={SignOut} onClick={() => signOut()}>
            Cerrar sesión
          </Button>
        ) : null}
      </Row>
      {cloud ? <Password /> : null}
      <Row title="Respaldo" desc="Una copia de todo para guardar donde quieras. Con el archivo JSON se recupera todo después.">
        <Button icon={DownloadSimple} onClick={() => doExport('json')}>
          Respaldo JSON
        </Button>
        <Button icon={Table} onClick={() => doExport('csv')}>
          Planilla CSV
        </Button>
        <Button variant="ghost" icon={UploadSimple} onClick={openImport}>
          Importar
        </Button>
      </Row>
    </Panel>
  );
}
