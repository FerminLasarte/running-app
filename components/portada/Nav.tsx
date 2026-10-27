'use client';
/* La barra de arriba de la portada: la marca, las dos secciones y entrar. Arriba de todo es transparente; al bajar
   se vuelve sólida, se achica y abajo corre una raya de tartán con lo que llevás leído. Cuando los botones del estadio
   salen de la pantalla, «Probar sin cuenta» pasa a la barra. */
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { startGuest } from '@/lib/guest';
import { BrandMark } from '@/components/shell/BrandMark';
import { Button } from '@/components/pista/controls';

const SECTIONS = [
  { id: 'que-hace', label: 'Qué hace' },
  { id: 'probala', label: 'Probala' },
] as const;

/* la marca, ya en la portada, sube en vez de recargar */
function toTop(e: MouseEvent) {
  if (scrollY <= 0) return;
  e.preventDefault();
  scrollTo({ top: 0 });
}

export function Nav() {
  const bar = useRef<HTMLElement>(null);
  const [cur, setCur] = useState<string | null>(null);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      el.style.setProperty('--sp', String(max > 0 ? Math.min(1, scrollY / max) : 0));
      el.classList.toggle('stuck', scrollY > 8);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    paint();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);

    /* «Probar sin cuenta» en la barra mientras no se ven los del estadio */
    const ctas = document.querySelector('.po-hero .po-ctas');
    const ioCta = new IntersectionObserver(([e]) => el.classList.toggle('cta', !e.isIntersecting && e.boundingClientRect.top < 0));
    if (ctas) ioCta.observe(ctas);

    /* la sección en la que estás: la que cruza la mitad de la pantalla */
    const ioSec = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setCur(e.target.id)), { rootMargin: '-50% 0px -50% 0px' });
    const secs = SECTIONS.map((s) => document.getElementById(s.id)).filter((n): n is HTMLElement => !!n);
    secs.forEach((n) => ioSec.observe(n));
    /* arriba de todo, ninguna */
    const ioTop = new IntersectionObserver(([e]) => e.isIntersecting && setCur(null), { rootMargin: '-50% 0px -50% 0px' });
    const hero = document.querySelector('.po-hero');
    if (hero) ioTop.observe(hero);

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      ioCta.disconnect();
      ioSec.disconnect();
      ioTop.disconnect();
    };
  }, []);

  return (
    <header ref={bar} className="po-top">
      <div className="po-top-in">
        <Link className="brand" href="/" onClick={toTop}>
          <BrandMark />
          <span>
            <b>Lane One</b>
            <small>Registro y progreso</small>
          </span>
        </Link>
        <nav className="po-links" aria-label="Secciones">
          {SECTIONS.map((s) => (
            <a key={s.id} href={'#' + s.id} aria-current={cur === s.id ? 'true' : undefined}>
              {s.label}
            </a>
          ))}
        </nav>
        <nav className="po-nav" aria-label="Cuenta">
          <Button variant="ghost" href="/login" className="po-enter">
            Entrar
          </Button>
          <span className="po-try">
            <Button variant="acc" arrow onClick={startGuest}>
              Probar sin cuenta
            </Button>
          </span>
        </nav>
      </div>
      <i className="po-prog" aria-hidden="true" />
    </header>
  );
}
