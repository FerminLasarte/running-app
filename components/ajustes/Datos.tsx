'use client';
/* Cuenta y datos: dónde se guardan tus datos (en la nube o solo en este navegador), cerrar sesión, la contraseña, el
   respaldo, la política de privacidad y eliminar la cuenta. Probando sin cuenta, solo crear la cuenta y la privacidad. */
import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { DownloadSimple, Key, ShieldCheck, SignOut, Table, Trash, UploadSimple, UserPlus } from '@phosphor-icons/react';
import { useS } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import { AJ_PARTS, blockDemo, focusField, goSignup, toast } from '@/lib/data/actions';
import { doExport } from '@/lib/data/backup';
import { hasPassword, PASS_MIN, setPassword, signOut } from '@/lib/auth/client';
import { Button, Chip } from '@/components/pista/controls';
import { Input } from '@/components/pista/fields';
import { Panel } from '@/components/pista/structure';
import { cssVars } from '@/components/pista/util';
import { FieldErr, Row } from './Row';

/** el campo de la contraseña nueva (lo abre el link de «Olvidé mi contraseña», que llega con `?clave`) */
const PASS_ID = 'aj-clave';

/** «ag•••••@gmail.com»: se ve de quién es sin mostrarlo entero en pantalla */
const maskMail = (m: string) => m.replace(/^(.{2})[^@]*/, (_, a: string) => a + '•••••');

export function openImport() {
  if (blockDemo()) return;
  openSheet('import');
}
function openDelete() {
  if (blockDemo()) return;
  openSheet('deleteAccount');
}

/** poner (quien entraba con el link por mail o con Google) o cambiar la contraseña, en la misma fila */
function Password() {
  const clave = useSearchParams().has('clave');
  const [has, setHas] = useState<boolean | null>(null);
  const [open, setOpen] = useState(clave);
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void hasPassword().then(setHas);
  }, []);
  useEffect(() => {
    if (clave) focusField(PASS_ID);
  }, [clave]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const bad = await setPassword(pass);
    setBusy(false);
    if (bad) return setErr(bad);
    toast(has ? 'Listo: cambiaste la contraseña.' : 'Listo: ya podés entrar con tu mail y esta contraseña.');
    setHas(true);
    setOpen(false);
    setPass('');
    setErr('');
    /* venía del link de «Olvidé mi contraseña»: que recargar no la vuelva a pedir */
    if (clave) window.history.replaceState(null, '', '/ajustes');
  }
  const verb = has ? 'Cambiar' : 'Poner';
  return (
    <Row
      title="Contraseña"
      htmlFor={open ? PASS_ID : undefined}
      desc={has ? 'Para entrar con tu mail.' : 'Si entrabas con el link por mail o con Google, todavía no tenés: ponela para entrar también con tu mail.'}
    >
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
      ) : has != null ? (
        <Button icon={Key} onClick={() => (setOpen(true), focusField(PASS_ID))}>
          {verb} contraseña
        </Button>
      ) : null}
    </Row>
  );
}

const Privacy = () => (
  <Row title="Privacidad" desc="Qué se guarda, dónde, qué se lee de Strava y cómo borrar todo.">
    <Button variant="ghost" icon={ShieldCheck} href="/privacidad">
      Privacidad y condiciones
    </Button>
  </Row>
);

export function Datos({ i }: { i: number }) {
  const { mode, email } = useS(),
    cloud = mode === 'cloud';
  if (mode === 'guest')
    return (
      <Panel id={AJ_PARTS.datos} title="Cuenta y datos" className="aj-set p-rise" style={cssVars({ '--i': i })} flush>
        <Row title="Cuenta" desc="Estás probando con datos de ejemplo: nada de lo que hagas se guarda. Con tu cuenta, lo tuyo queda en la nube.">
          <Chip color="var(--t-tempo)">Sin cuenta</Chip>
          <span className="aj-sp" />
          <Button variant="acc" icon={UserPlus} onClick={goSignup}>
            Crear cuenta
          </Button>
        </Row>
        <Privacy />
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
      <Privacy />
      <Row
        title={cloud ? 'Eliminar la cuenta' : 'Borrar los datos'}
        desc={cloud ? 'Borra la cuenta con todo lo tuyo y desconecta Strava. No se puede deshacer.' : 'Borra todo lo que la app guardó en este navegador. No se puede deshacer.'}
      >
        <Button className="dng" icon={Trash} onClick={openDelete}>
          {cloud ? 'Eliminar mi cuenta' : 'Borrar todo'}
        </Button>
      </Row>
    </Panel>
  );
}
