'use client';
/* Ajustes: el índice fijo a la izquierda, que marca la sección que estás leyendo, y las secciones con cada ajuste a un
   lado y su control al otro. Todo se guarda solo. Probando sin cuenta no están las conexiones (Strava y la lectura de
   capturas necesitan la cuenta). */
import '@/app/styles/screens/ajustes.css';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { CircleHalf, Database, FlagCheckered, Heartbeat, PlugsConnected, Sneaker, User, type Icon } from '@phosphor-icons/react';
import { useApp } from '@/lib/store';
import { AJ_PARTS } from '@/lib/data/actions';
import { PageHead } from '@/components/pista/structure';
import { cssVars } from '@/components/pista/util';
import { Perfil } from './Perfil';
import { Fc } from './Fc';
import { Races } from './Races';
import { Shoes } from './Shoes';
import { Conexiones } from './Conexiones';
import { Apariencia } from './Apariencia';
import { Datos } from './Datos';

const NAV: [string, string, Icon][] = [
  [AJ_PARTS.perfil, 'Perfil', User],
  [AJ_PARTS.fc, 'Frecuencia cardíaca', Heartbeat],
  [AJ_PARTS.races, 'Carreras', FlagCheckered],
  [AJ_PARTS.shoes, 'Zapatillas', Sneaker],
  [AJ_PARTS.con, 'Conexiones', PlugsConnected],
  [AJ_PARTS.apa, 'Apariencia', CircleHalf],
  [AJ_PARTS.datos, 'Cuenta y datos', Database],
];
/** desde qué altura de la ventana un título ya se está leyendo (debajo de la barra de arriba) */
const READ_Y = 140;

/** la sección que estás leyendo: la última cuyo título ya pasó por debajo de la barra (o la última, si llegaste al fondo) */
function useCurrent(nav: typeof NAV) {
  const [cur, setCur] = useState(nav[0][0]);
  useEffect(() => {
    const spy = () => {
      const end = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      const ids = nav.map((n) => n[0]);
      const past = ids.filter((id) => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) < READ_Y);
      setCur(end ? ids[ids.length - 1] : past[past.length - 1] || ids[0]);
    };
    spy();
    window.addEventListener('scroll', spy, { passive: true });
    window.addEventListener('resize', spy);
    return () => {
      window.removeEventListener('scroll', spy);
      window.removeEventListener('resize', spy);
    };
  }, [nav]);
  return cur;
}

/** baja hasta la sección sin tocar la dirección, y el foco va ahí (para seguir con el teclado desde esa sección) */
function go(e: MouseEvent, id: string) {
  e.preventDefault();
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ block: 'start' });
  el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

const NAV_GUEST = NAV.filter((n) => n[0] !== AJ_PARTS.con);

export default function Ajustes() {
  const guest = useApp((s) => s.mode === 'guest'),
    nav0 = guest ? NAV_GUEST : NAV;
  const cur = useCurrent(nav0);
  /* en el celu el índice se corre de costado: la sección marcada queda a la vista */
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const n = nav.current,
      a = n?.querySelector('[aria-current]');
    if (!n || !a || n.scrollWidth <= n.clientWidth) return;
    const nr = n.getBoundingClientRect(),
      ar = a.getBoundingClientRect();
    n.scrollTo({ left: n.scrollLeft + ar.left - nr.left - (nr.width - ar.width) / 2 });
  }, [cur]);
  return (
    <div className="aj">
      <PageHead
        eyebrow="Tu cuenta y la app"
        title="Ajustes"
        actions={
          <span className="aj-saved">
            <i aria-hidden="true" />
            Cada cambio se guarda solo
          </span>
        }
      />
      <div className="aj-cols">
        <nav ref={nav} className="aj-nav p-rise" style={cssVars({ '--i': 1 })} aria-label="Secciones de ajustes">
          {nav0.map(([id, label, I]) => (
            <a key={id} href={'#' + id} aria-current={cur === id ? 'true' : undefined} onClick={(e) => go(e, id)}>
              <I aria-hidden="true" />
              {label}
            </a>
          ))}
        </nav>
        <div className="aj-sets">
          <Perfil i={2} />
          <Fc i={3} />
          <Races i={4} />
          <Shoes i={5} />
          {guest ? null : <Conexiones i={6} />}
          <Apariencia i={7} />
          <Datos i={8} />
        </div>
      </div>
    </div>
  );
}
