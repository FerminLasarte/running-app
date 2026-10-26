'use client';
/* Apariencia: claro, oscuro o el del sistema, cada uno con una vista previa de la app. El botón de la barra de arriba
   elige uno fijo; acá se ve cuál quedó. */
import { useSyncExternalStore } from 'react';
import { AJ_PARTS } from '@/lib/data/actions';
import { onThemeChange, setThemeMode, themeMode, type ThemeMode } from '@/lib/theme';
import { Panel } from '@/components/pista/structure';
import { cssVars, cx } from '@/components/pista/util';
import { Row } from './Row';

/* los colores de la vista previa son los del tema que muestra, no los del que está puesto */
const THEMES: { m: ThemeMode; l: string; pv?: [string, string, string] }[] = [
  { m: 'light', l: 'Claro', pv: ['#F2F1ED', '#FFFFFF', '#EAE9E4'] },
  { m: 'dark', l: 'Oscuro', pv: ['#0E0E0F', '#171718', '#262628'] },
  { m: 'system', l: 'Como el sistema' },
];

export function Apariencia({ i }: { i: number }) {
  const mode = useSyncExternalStore(onThemeChange, themeMode, () => 'system');
  return (
    <Panel id={AJ_PARTS.apa} title="Apariencia" className="aj-set p-rise" style={cssVars({ '--i': i })} flush>
      <Row title="Tema" desc="Por defecto sigue al de tu compu o tu teléfono.">
        <div className="aj-themes" role="group" aria-label="Tema">
          {THEMES.map((t) => (
            <button key={t.m} type="button" className="aj-th" aria-pressed={mode === t.m} onClick={() => setThemeMode(t.m)}>
              <span className={cx('aj-pv', !t.pv && 'split')} style={t.pv ? cssVars({ '--pc1': t.pv[0], '--pc2': t.pv[1], '--pc3': t.pv[2] }) : undefined} aria-hidden="true">
                {t.pv ? (
                  <>
                    <i className="rl" />
                    <span className="mn">
                      <i />
                      <i />
                      <i />
                    </span>
                  </>
                ) : null}
              </span>
              <span>{t.l}</span>
            </button>
          ))}
        </div>
      </Row>
    </Panel>
  );
}
