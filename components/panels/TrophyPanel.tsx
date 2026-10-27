'use client';
/* Un trofeo de cerca: su pieza de la vitrina en grande, de qué se trata, el metal y la XP, cuándo lo ganaste o cuánto
   te falta, y la escalera de su categoría (los otros trofeos de lo mismo, con el que estás mirando marcado). Se abre
   desde la vitrina, la vidriera de Logros y ⌘K. */
import '@/app/styles/screens/logros.css';
import { usePathname } from 'next/navigation';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { S, useS, useUi } from '@/lib/store';
import { closeSheet, requestClose } from '@/lib/sheets';
import { goVitrina } from '@/lib/data/actions';
import { CAT_N, trophies, trophyLeft, trophyNote, trophyProg, trophyTier, trophyXp } from '@/lib/domain/trophies';
import { DEC_UI0, decBackfill, decEligible, type DecUi } from '@/lib/domain/dec';
import { cap, dateLabel, nf, pd, plural } from '@/lib/domain/util';
import { EX_UI0, exBackfill, exPending, type ExUi } from '@/lib/strava/extra';
import { Button } from '@/components/pista/controls';
import { Laps } from '@/components/pista/meters';
import { Kpis, MarkList } from '@/components/pista/structure';
import { Shield, TIER_C, TIER_NAME } from '@/components/pista/sport';
import { cssVars } from '@/components/pista/util';
import { trophyIcon } from '@/components/logros/util';
import { TrophyPiece } from '@/components/logros/Piece';
import { PanelFrame } from './PanelFrame';

/** los trofeos que salen de datos de Strava que pueden faltar (la deriva de los fondos; el desnivel y las mitades de
    cada salida): cuántas salidas no los tienen y el botón para completarlos */
function Fill({ cat }: { cat: string }) {
  const [E] = useUi<ExUi>('ex', EX_UI0),
    [Dc] = useUi<DecUi>('dec', DEC_UI0);
  const dec = cat === 'dec';
  if (S.demo || (!dec && cat !== 'up' && cat !== 'ns')) return null;
  const M = dec ? Dc : E,
    n = dec ? S.sessions.filter((q) => decEligible(q) && !q.result.dec).length : exPending().length;
  if (!n && !M.msg) return null;
  return (
    <div className="lo-tp-fill">
      <p>
        {dec ? 'La deriva sale de las series de Strava de cada fondo.' : 'El desnivel y las mitades salen del detalle de cada salida en Strava.'}
        {n ? ' ' + (dec ? plural(n, 'fondo', 'fondos') : plural(n, 'salida', 'salidas')) + ' todavía no ' + (n === 1 ? 'lo tiene.' : 'lo tienen.') : ''}
      </p>
      <div className="lo-tp-fill-a">
        <Button size="sm" icon={ArrowsClockwise} disabled={M.busy} onClick={() => void (dec ? decBackfill() : exBackfill())}>
          {M.busy ? 'Completando…' : 'Completar con Strava'}
        </Button>
        <span role="status">{M.msg}</span>
      </div>
    </div>
  );
}

export default function TrophyPanel({ id }: { id: string }) {
  useS();
  const here = usePathname() === '/logros/vitrina';
  const T = trophies(),
    t = T.find((q) => q.id === id);
  if (!t) return <PanelFrame title="Trofeo">{null}</PanelFrame>;
  const tier = trophyTier(t),
    p = trophyProg(t),
    left = trophyLeft(t),
    ladder = T.filter((q) => q.cat === t.cat);
  const foot = (
    <>
      {!here ? (
        <Button
          variant="ghost"
          arrow
          onClick={() => {
            closeSheet();
            goVitrina(t.cat);
          }}
        >
          Ver la vitrina
        </Button>
      ) : null}
      <Button variant="pri" autoFocus onClick={requestClose}>
        Listo
      </Button>
    </>
  );
  return (
    <PanelFrame eyebrow={'Trofeo · ' + (CAT_N[t.cat] || '')} title={t.name} foot={foot}>
      <div className="lo-tp">
        <div className="lo-tp-badge" style={cssVars({ '--rc': TIER_C[tier] })}>
          <TrophyPiece t={t} k={1.35} />
        </div>
        <p className="lo-tp-desc">{t.desc}</p>
        <Kpis
          items={[
            { label: 'Metal', value: cap(TIER_NAME[tier]), color: t.got ? TIER_C[tier] : undefined },
            { label: 'Vale', value: '+' + nf(trophyXp(t)), unit: 'XP' },
            t.got ? { label: 'Ganado', value: cap(dateLabel(t.date!)), note: pd(t.date!).getFullYear() } : { label: 'Avance', value: p != null ? Math.round(p * 100) : '–', unit: p != null ? '%' : undefined, note: trophyNote(t) || undefined },
          ]}
        />
        {!t.got && (p != null || left) ? (
          <div className="lo-tp-left">
            {p != null ? <Laps value={p} n={20} h={6} label={Math.round(p * 100) + '% hecho'} /> : null}
            {left ? <p>{left}</p> : null}
          </div>
        ) : null}
        <Fill cat={t.cat} />
        {ladder.length > 1 ? (
          <section className="lo-tp-ladder" aria-labelledby="lo-tp-lh">
            <h3 id="lo-tp-lh" className="lbl">
              {CAT_N[t.cat]} · {ladder.filter((q) => q.got).length} de {ladder.length}
            </h3>
            <MarkList
              items={ladder.map((q) => ({
                key: q.id,
                label: (
                  <span className="lo-tp-row">
                    <Shield tier={trophyTier(q)} got={q.got} icon={trophyIcon(q)} size={22} />
                    <span>
                      {q.name}
                      {q.id === t.id ? <em> · este</em> : null}
                    </span>
                  </span>
                ),
                sub: q.got ? 'Ganado el ' + trophyNote(q) : trophyNote(q) || 'Por ganar',
                value: '+' + nf(trophyXp(q)),
              }))}
            />
          </section>
        ) : null}
      </div>
    </PanelFrame>
  );
}
