'use client';
/* Cuenta y datos: dónde se guardan tus datos (en la nube o solo en este navegador), cerrar sesión y el respaldo. */
import { DownloadSimple, SignOut, Table, UploadSimple } from '@phosphor-icons/react';
import { useS } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import { AJ_PARTS, blockDemo } from '@/lib/data/actions';
import { doExport } from '@/lib/data/backup';
import { signOut } from '@/lib/auth/client';
import { Button, Chip } from '@/components/pista/controls';
import { Panel } from '@/components/pista/structure';
import { cssVars } from '@/components/pista/util';
import { Row } from './Row';

/** «ag•••••@gmail.com»: se ve de quién es sin mostrarlo entero en pantalla */
const maskMail = (m: string) => m.replace(/^(.{2})[^@]*/, (_, a: string) => a + '•••••');

export function openImport() {
  if (blockDemo()) return;
  openSheet('import');
}

export function Datos({ i }: { i: number }) {
  const { mode, email } = useS(),
    cloud = mode === 'cloud';
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
