'use client';
/* Desafíos: metas con fecha. Los que están en curso o por empezar, con lo que llevás, lo que falta y si lo que tenés
   planificado alcanza; los terminados quedan plegados al final. «Nuevo» abre el panel con los sugeridos. */
import { Plus, Trash } from '@phosphor-icons/react';
import { useS } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import { chLists, chView, delChallenge } from '@/lib/domain/challenges';
import type { Challenge } from '@/lib/domain/types';
import { Button, Chip, Tag } from '@/components/pista/controls';
import { Panel } from '@/components/pista/structure';
import { cssVars, cx } from '@/components/pista/util';
import { LO_PARTS } from './util';

function Item({ c }: { c: Challenge }) {
  const v = chView(c),
    end = v.state === 'done' || v.state === 'over';
  return (
    <li className={cx('lo-ch', v.hot && 'hot', end && 'end')}>
      <div className="lo-ch-h">
        <span className="lbl">{v.lbl}</span>
        {v.state === 'done' ? <Chip color="var(--pos)">Cumplido</Chip> : v.state === 'over' ? <Tag>Sin cumplir</Tag> : v.left ? <Tag warn={v.hot}>{v.left}</Tag> : null}
        <button type="button" className="lo-ch-del" aria-label={'Borrar el desafío ' + c.name} title="Borrar" onClick={() => delChallenge(c.id)}>
          <Trash aria-hidden="true" />
        </button>
      </div>
      <h3>{c.name}</h3>
      {end ? null : (
        <>
          <span className="disp">
            {v.cur}
            <span className="p-u">{v.of}</span>
          </span>
          <span className="lo-ch-bar" role="img" aria-label={Math.round(v.f * 100) + '% cumplido'}>
            <i style={cssVars({ width: v.f * 100 + '%' })} />
          </span>
        </>
      )}
      <small>{v.note}</small>
    </li>
  );
}

export function Challenges({ i }: { i: number }) {
  useS();
  const { act, fin } = chLists();
  return (
    <Panel
      id={LO_PARTS.ch}
      title="Desafíos"
      actions={
        <Button size="sm" icon={Plus} onClick={() => openSheet('challenge')}>
          Nuevo
        </Button>
      }
      className="p-c4 p-rise lo-ch-p"
      style={cssVars({ '--i': i })}
      flush
    >
      {act.length ? (
        <ul className="lo-chs">
          {act.map((c) => (
            <Item key={c.id} c={c} />
          ))}
        </ul>
      ) : (
        <p className="lo-none">No tenés desafíos en curso. Con «Nuevo» elegís uno de los sugeridos según tus últimas semanas o armás el tuyo.</p>
      )}
      {/* el lugar libre del panel (lo estira la vitrina de al lado) invita a sumar otro, como los días libres de Semana */}
      <button type="button" className="lo-ch-add" onClick={() => openSheet('challenge')}>
        <Plus aria-hidden="true" />
        Nuevo desafío
      </button>
      {fin.length ? (
        <details className="lo-ch-fin">
          <summary>
            Terminados <span>{fin.length}</span>
          </summary>
          <ul className="lo-chs">
            {fin.map((c) => (
              <Item key={c.id} c={c} />
            ))}
          </ul>
        </details>
      ) : null}
    </Panel>
  );
}
