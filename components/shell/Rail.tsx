'use client';
/* Barra lateral (compu): marca, secciones con su atajo, nivel y la cuenta. En el celu, las secciones van abajo. */
import Link from 'next/link';
import { GearSix, User } from '@phosphor-icons/react';
import { useApp, useS } from '@/lib/store';
import { doneList } from '@/lib/domain/stats';
import { xpState } from '@/lib/domain/xp';
import { nf } from '@/lib/domain/util';
import { Laps } from '@/components/pista/meters';
import { BrandMark } from './BrandMark';
import { NAV, type SectionDef } from './sections';

/** tu foto, tus iniciales o, sin nombre, el ícono de persona */
export function Avatar() {
  const av = useApp((s) => s.cfg.avatar),
    name = useApp((s) => s.cfg.name);
  const ini =
    (name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  return (
    <span className="av" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {av ? <img src={av} alt="" /> : ini || <User weight="bold" />}
    </span>
  );
}

/* nivel como contador de vueltas: 10 marcas, la actual a medio llenar */
function Level() {
  useS();
  if (!doneList().length) return null;
  const X = xpState();
  return (
    <Link className="lvl" href="/logros" title="Ver tu personaje">
      <span className="lvl-top">
        <b>{X.title}</b>
        <span className="disp">{X.L}</span>
      </span>
      <Laps value={X.f} partial label={Math.round(X.f * 100) + '% al nivel ' + (X.L + 1)} />
      <small>
        Nivel {X.L} · {nf(X.b - X.total)} XP para el {X.L + 1}
      </small>
    </Link>
  );
}

export function Rail({ section }: { section: SectionDef | null }) {
  const name = useApp((s) => s.cfg.name);
  const loaded = useApp((s) => s.loaded);
  return (
    <aside className="rail" aria-label="Navegación principal">
      <Link className="brand" href="/semana">
        <BrandMark />
        <span>
          <b>Lane One</b>
          <small>Registro y progreso</small>
        </span>
      </Link>
      <nav className="nav" aria-label="Secciones">
        {NAV.map((s, i) => (
          <Link key={s.id} href={s.href} aria-current={section?.id === s.id ? 'page' : undefined}>
            <s.Icon weight={section?.id === s.id ? 'fill' : 'regular'} aria-hidden="true" />
            {s.label}
            <kbd>{i + 1}</kbd>
          </Link>
        ))}
      </nav>
      <div className="rail-foot">
        {loaded ? <Level /> : null}
        <Link className="me" href="/ajustes" aria-current={section?.id === 'ajustes' ? 'page' : undefined}>
          <Avatar />
          <span>
            <b>{name || 'Tu cuenta'}</b>
            <small>Ajustes y cuenta</small>
          </span>
          <GearSix aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
