'use client';
/* Frecuencia cardíaca: la FC máxima (con zonas a mano, la Z5 llega hasta ella) y las zonas. */
import { useS } from '@/lib/store';
import { AJ_HRMAX, AJ_PARTS } from '@/lib/data/actions';
import { applyHrMax, hrMaxErr } from '@/lib/domain/settings';
import { Button } from '@/components/pista/controls';
import { UnitInput } from '@/components/pista/fields';
import { Panel } from '@/components/pista/structure';
import { cssVars } from '@/components/pista/util';
import { commitCfg, resetZones } from './actions';
import { FieldErr, Row } from './Row';
import { useAuto } from './useAuto';
import { Zones } from './Zones';

export function Fc({ i }: { i: number }) {
  const { cfg } = useS();
  /* sin cargar, el campo queda vacío y la provisoria se ve de fondo */
  const { draft, edit, bind } = useAuto(cfg, () => (cfg.hrSet ? String(cfg.hrMax) : ''), (v) => commitCfg((c) => applyHrMax(c, v)));
  const err = hrMaxErr(draft, cfg.zones);
  return (
    <Panel id={AJ_PARTS.fc} title="Frecuencia cardíaca" sub="Guía los fondos y regenerativos" className="aj-set p-rise" style={cssVars({ '--i': i })} flush>
      <Row
        title="FC máxima"
        desc={
          'La más alta que viste en un test o una carrera. Las zonas se calculan con ella.' +
          (cfg.hrSet ? '' : ' Todavía no la cargaste: mientras tanto uso ' + cfg.hrMax + ' lpm, la que da la fórmula para ' + (cfg.age > 0 ? 'tu edad' : '30 años') + '.')
        }
        htmlFor={AJ_HRMAX}
      >
        <span className="aj-fld" {...bind}>
          <UnitInput id={AJ_HRMAX} unit="lpm" inputMode="numeric" className="aj-n" invalid={!!err} placeholder={cfg.hrSet ? undefined : String(cfg.hrMax)} value={draft} onChange={(e) => edit(() => e.target.value)} />
          <FieldErr id={AJ_HRMAX}>{err}</FieldErr>
        </span>
        {cfg.zones ? (
          <Button size="sm" variant="ghost" onClick={resetZones}>
            Recalcular zonas
          </Button>
        ) : null}
      </Row>
      <Row title="Tus zonas" desc="Arrastrá los cortes o escribí el número. Cada zona arranca donde termina la anterior." className="aj-top">
        <Zones />
      </Row>
    </Panel>
  );
}
