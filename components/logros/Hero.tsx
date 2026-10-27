'use client';
/* El estadio de Logros: tu título enorme, la XP con el avance al próximo nivel, las últimas ganancias (3 a la vista y
   hasta 9 más plegadas) y la ficha del jugador (el escudo de papel con la media, los atributos y el nivel). */
import { useS } from '@/lib/store';
import { charOvr, type CharStat, type XpEvent, type XpState } from '@/lib/domain/xp';
import { doneList } from '@/lib/domain/stats';
import { cap, dateLabel, nf, todayS } from '@/lib/domain/util';
import { Chip } from '@/components/pista/controls';
import { Laps } from '@/components/pista/meters';
import { BrandTitle, Stadium } from '@/components/pista/structure';
import { fitWords } from '@/components/pista/util';
import { Avatar } from '@/components/shell/Rail';

/** el título en dos renglones: la primera palabra y el resto («Corredor / urbano», «Aspirante / a maratonista») */
function TitleLines({ t }: { t: string }) {
  const [a, ...b] = t.split(' ');
  return b.length ? (
    <>
      {a}
      <br />
      {b.join(' ')}
    </>
  ) : (
    <>{t}</>
  );
}

const when = (d: string) => (d === todayS() ? 'Hoy' : cap(dateLabel(d)));

/** la ficha: los mismos números que la lista de atributos, con la media y el nivel */
function PlayerCard({ X, st }: { X: XpState; st: CharStat[] }) {
  const { cfg } = useS();
  const ovr = charOvr(st),
    best = Math.max(0, ...st.map((s) => s.v ?? 0)),
    D = doneList(),
    since = (cfg.since || (D.length ? D[0].result.date : '')).slice(0, 4);
  const sr = 'Tu ficha: media ' + (ovr ?? 'sin medir') + ', ' + st.map((s) => s.n.toLowerCase() + ' ' + (s.v ?? 'sin medir')).join(', ') + ', nivel ' + X.L + '.';
  return (
    <div className="lo-pcw">
      <div className="lo-pc" role="img" aria-label={sr}>
        <div className="lo-pc-top">
          <div className="lo-pc-ovr">
            {ovr ?? '–'}
            <small>Media</small>
          </div>
          <div className="lo-pc-mono">
            <Avatar />
          </div>
        </div>
        <div className="lo-pc-name">{cfg.name || 'Vos'}</div>
        <div className="lo-pc-att">
          {st.map((s) => (
            <div key={s.k} className={s.v != null && s.v === best ? 'hi' : undefined}>
              <b>{s.v ?? '–'}</b>
              <span>{s.k.toUpperCase()}</span>
            </div>
          ))}
          <div>
            <b>{X.L}</b>
            <span>NIV</span>
          </div>
        </div>
        {since ? <div className="lo-pc-foot">Corriendo desde {since}</div> : null}
      </div>
    </div>
  );
}

/** las ganancias a la vista; las otras, de las 12 últimas como el original, plegadas */
const SHOWN = 3;
const Gains = ({ list, label }: { list: XpEvent[]; label: string }) => (
  <ul className="lo-gains" aria-label={label}>
    {list.map((e, i) => (
      <li key={i}>
        <b>+{nf(e.xp)} XP</b>
        <span>{e.t}</span>
        <small>{when(e.d)}</small>
      </li>
    ))}
  </ul>
);

export function Hero({ X, st }: { X: XpState; st: CharStat[] }) {
  const gains = X.E.slice(-12).reverse(),
    more = gains.length - SHOWN;
  return (
    <Stadium className="lo-hero p-c12 p-rise" sideWidth={290} side={<PlayerCard X={X} st={st} />}>
      <div className="p-st-top">
        <Chip color="var(--acc)" solid>
          Nivel {X.L}
        </Chip>
        <span className="lbl">Tu personaje</span>
      </div>
      <BrandTitle className="lo-h" style={fitWords(X.title)}>
        <TitleLines t={X.title} />
      </BrandTitle>
      <div className="lo-xp">
        <span className="disp">
          {nf(X.total)}
          <span className="p-u">XP</span>
        </span>
        <div className="lo-xpbar">
          <Laps value={X.f} n={20} h={10} gap={3} partial onDark label={Math.round(X.f * 100) + '% al nivel ' + (X.L + 1)} />
          <div className="lo-rowb">
            <span>
              <b>{nf(X.total - X.a)}</b> de {nf(X.b - X.a)} XP del nivel {X.L}
            </span>
            <span>
              Faltan <b>{nf(X.b - X.total)}</b> para el {X.L + 1}
            </span>
          </div>
        </div>
      </div>
      <Gains list={gains.slice(0, SHOWN)} label="Últimas ganancias" />
      {more > 0 ? (
        <details className="lo-gains-more">
          <summary>{more === 1 ? 'Ver la otra' : 'Ver las otras ' + more}</summary>
          <Gains list={gains.slice(SHOWN)} label="Ganancias anteriores" />
        </details>
      ) : null}
    </Stadium>
  );
}
