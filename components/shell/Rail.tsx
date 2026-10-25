'use client';
/* Barra lateral (compu): marca, secciones con su atajo, nivel y la cuenta. En el celu, las secciones van abajo. */
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { GearSix, User } from '@phosphor-icons/react';
import { setUi, useApp, useS } from '@/lib/store';
import { doneList } from '@/lib/domain/stats';
import { xpState } from '@/lib/domain/xp';
import { NAV, type SectionDef } from './sections';

/* la pista vista desde arriba, con la línea de llegada */
export const BrandMark = () => (
  <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
    <rect x="1" y="1" width="30" height="30" rx="4" fill="var(--acc)" />
    <rect x="5.5" y="10" width="21" height="12" rx="6" fill="none" stroke="#fff" strokeWidth="2.4" />
    <rect x="9.4" y="13.6" width="13.2" height="4.8" rx="2.4" fill="none" stroke="#fff" strokeWidth="1" opacity=".55" />
    <rect x="11.4" y="7.4" width="1.8" height="6" fill="#141414" />
  </svg>
);

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
  const X = xpState(),
    on = Math.floor(X.f * 10);
  return (
    <Link className="lvl" href="/logros" title="Ver tu personaje" onClick={() => setUi('logSub', 'pj')}>
      <span className="lvl-top">
        <b>{X.title}</b>
        <span className="disp">{X.L}</span>
      </span>
      <span className="laps" aria-label={Math.round(X.f * 100) + '% al nivel ' + (X.L + 1)}>
        {Array.from({ length: 10 }, (_, k) => (
          <i key={k} className={k < on ? 'on' : k === on ? 'cur' : ''} style={k === on ? { '--p': Math.round((X.f * 10 - on) * 100) + '%' } as CSSProperties : undefined} />
        ))}
      </span>
      <small>
        Nivel {X.L} · {X.b - X.total} XP para el {X.L + 1}
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
          <b>My Running App</b>
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
