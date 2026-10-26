'use client';
/* Vitrina de trofeos: colección, podio, medallas de carreras, top 10, lo próximo y estantes por categoría. */
import { Fragment, useEffect, useState, type CSSProperties } from 'react';
import { useS } from '@/lib/store';
import { openSheet } from '@/lib/sheets';
import { pastRaces } from '@/lib/domain/config';
import { raceTheme } from '@/lib/domain/raceTheme';
import { CAT_N, RARITY, markTrophiesSeen, rarOf, trophies, trophyProg, trophyXp, type Trophy } from '@/lib/domain/trophies';
import { dateLabel, dShort, fmtDur, nf, pd, sum } from '@/lib/domain/util';
import { RaceMedalSvg } from '@/components/carreras/RaceMedalSvg';
import { MedalSvg } from './MedalSvg';

const cssVars = (o: Record<string, string | number>) => o as CSSProperties;
const openTrophy = (id: string) => openSheet('trophy', { id });

export function MedalBtn({ t, isNew, big }: { t: Trophy; isNew?: boolean; big?: boolean }) {
  const r = rarOf(t),
    p = trophyProg(t);
  return (
    <button className={'md md-' + r.k + (t.got ? '' : ' off') + (isNew ? ' new' : '') + (big ? ' big' : '')} data-a="trophy" data-id={t.id} aria-label={t.name + (t.got ? ', ganado' : ', bloqueado')} onClick={() => openTrophy(t.id)}>
      <MedalSvg t={t} prog={p} />
      <b>{t.name}</b>
      <small>
        {t.got ? (
          <>
            <span style={{ color: r.c }}>{r.n}</span> · +{trophyXp(t)} XP
          </>
        ) : (
          (p != null ? Math.round(p * 100) + '% · ' : '') + '+' + trophyXp(t) + ' XP'
        )}
      </small>
      {isNew ? <span className="tr-new">Nuevo</span> : null}
    </button>
  );
}

export default function Vitrina() {
  const S = useS();
  /* lo que ya habías visto al entrar: las insignias «Nuevo» quedan mientras mirás la vitrina */
  const [seenAtOpen] = useState(() => ({ first: !Array.isArray(S.cfg.seenTrophies), seen: new Set(S.cfg.seenTrophies || []) }));
  // como el original, después de cada dibujo marca los trofeos ganados como vistos (no hace nada si no cambió)
  useEffect(() => {
    markTrophiesSeen();
  });

  const T = trophies(),
    got = T.filter((t) => t.got).sort((a, b) => b.date!.localeCompare(a.date!));
  if (!T.length)
    return (
      <section className="card">
        <p>Cuando cargues tus salidas, acá aparecen tus trofeos.</p>
      </section>
    );
  const isNew = (t: Trophy) => !seenAtOpen.first && t.got && !seenAtOpen.seen.has(t.id),
    pct = got.length / T.length,
    C = 326.7;
  const byR = RARITY.map((r) => ({ r, n: got.filter((t) => rarOf(t).k === r.k).length, all: T.filter((t) => rarOf(t).k === r.k).length }));
  const xpT = sum(got.map(trophyXp));
  const PR = pastRaces().filter((r) => r.resultSec! > 0);
  /* destacados: los tres más valiosos que ganaste */
  const top = got
    .slice()
    .sort((a, b) => trophyXp(b) - trophyXp(a) || b.date!.localeCompare(a.date!))
    .slice(0, 3);
  const ord = top.length === 3 ? [top[1], top[0], top[2]] : top;
  /* top 10: los trofeos ganados más importantes (más XP; a igual XP, el más reciente) */
  const t10 = got
    .slice()
    .sort((a, b) => trophyXp(b) - trophyXp(a) || b.date!.localeCompare(a.date!))
    .slice(0, 10);
  /* lo próximo */
  const cats = [...new Set(T.map((t) => t.cat))];
  const next = cats
    .map((c) => T.filter((t) => t.cat === c && !t.got)[0])
    .filter((t) => t && trophyProg(t) != null && t.cat !== 'ch')
    .sort((a, b) => trophyProg(b)! - trophyProg(a)!)
    .slice(0, 6);

  return (
    <>
      {/* encabezado de la colección */}
      <section className="card vit-head">
        <div className="eyebrow">Vitrina de trofeos</div>
        <div className="lv-h">
          <div className="ring" role="img" aria-label={got.length + ' de ' + T.length + ' trofeos'} style={cssVars({ '--circ': C, '--off': (C * (1 - pct)).toFixed(1), '--bc': 'var(--accent)' })}>
            <svg viewBox="0 0 124 124" aria-hidden="true">
              <circle className="rt" cx="62" cy="62" r="52" />
              <circle className="rf" cx="62" cy="62" r="52" />
            </svg>
            <div className="sc-num">
              {got.length}
              <small>DE {T.length}</small>
            </div>
          </div>
          <div className="lv-s">
            <b style={{ font: '700 var(--fs-xl)/1.15 var(--body)', letterSpacing: '-.01em' }}>{Math.round(pct * 100)}% de la colección</b>
            <br />
            {nf(xpT)} XP en trofeos.
            <div className="rar-row">
              {byR.map((o) => (
                <span key={o.r.k} className="rar-chip" style={cssVars({ '--rc': o.r.c })}>
                  <i></i>
                  {o.n}
                  <small>/{o.all}</small> {(o.n === 1 ? o.r.n : o.r.p).toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
      {top.length ? (
        <section className="card vit-stage">
          <div className="eyebrow">Los más valiosos</div>
          <div className={'podium p' + top.length}>
            {ord.map((t) => (
              <div key={t.id} className={'pod' + (t === top[0] ? ' first' : '')}>
                <MedalBtn t={t} big={t === top[0]} isNew={isNew(t)} />
                <div className="ped">
                  <span>{top.indexOf(t) + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {PR.length ? (
        <section className="card rm-shelf">
          <div className="h3">Medallas de tus carreras</div>
          <div className="rm-row">
            {PR.map((r) => (
              <div key={r.id} className="rm-it" style={cssVars({ '--ra': raceTheme(r).ra })}>
                <RaceMedalSvg r={r} />
                <b>{r.name}</b>
                <span>
                  {fmtDur(r.resultSec!)} · {dShort(pd(r.date))}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {t10.length ? (
        <section className="card top10">
          <div className="h3">Top 10</div>
          <div className="sub">Tus trofeos más importantes hasta ahora.</div>
          <ol className="t10">
            {t10.map((t, i) => {
              const r = rarOf(t);
              return (
                <li key={t.id}>
                  <button className={'t10-row md-' + r.k} data-a="trophy" data-id={t.id} style={cssVars({ '--rc': r.c })} onClick={() => openTrophy(t.id)}>
                    <span className={'t10-n' + (i < 3 ? ' p' + (i + 1) : '')}>{i + 1}</span>
                    <span className="t10-md">
                      <MedalSvg t={t} />
                    </span>
                    <span className="t10-tx">
                      <b>{t.name}</b>
                      <small>
                        <span style={{ color: r.c }}>{r.n}</span> · {CAT_N[t.cat]} · {dateLabel(t.date!)}
                      </small>
                    </span>
                    <span className="t10-xp">
                      +{nf(trophyXp(t))}
                      <small>XP</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
      {next.length ? (
        <section className="card">
          <div className="h3">Lo próximo</div>
          <div className="sub">Tus trofeos más cerca. El anillo muestra cuánto te falta.</div>
          <div className="shelf-wrap">
            <div className="shelf">
              {next.map((t) => (
                <MedalBtn key={t.id} t={t} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
      {/* estantes por categoría */}
      <section className="card vit-all">
        <div className="h3">La colección</div>
        {cats.map((c) => {
          const L = T.filter((t) => t.cat === c);
          return (
            <Fragment key={c}>
              <div className="shelf-h">
                <span>{CAT_N[c]}</span>
                <small>
                  {L.filter((t) => t.got).length} de {L.length}
                </small>
              </div>
              <div className="shelf-wrap">
                <div className="shelf">
                  {L.map((t) => (
                    <MedalBtn key={t.id} t={t} isNew={isNew(t)} />
                  ))}
                </div>
              </div>
            </Fragment>
          );
        })}
      </section>
    </>
  );
}
