/* Gota de vidrio líquido que marca la opción elegida en todos los selectores: la barra de abajo, la lateral,
   las subpestañas y el período del mapa. Se ubica sobre la opción activa; si la arrastrás, te sigue (estirándose
   según la velocidad, con la opción de abajo como bajo una lupa) y al soltar elige la opción que quedó debajo.
   Es una capa decorativa: se agrega a los selectores que dibuja React y solo toca estilos y clases propias. */
import { S, type Tab } from '@/lib/store';
import { buzz, goTab } from '@/lib/data/actions';
import { clamp } from '@/lib/domain/util';

const PILL_SEL = '.tabs-in,.sidenav,.subtabs,.mp-top,.mp-seg2';
const isNav = (n: Element) => n.classList.contains('tabs-in') || n.classList.contains('sidenav');
const prevPos: Record<string, [number, number, number, number]> = {};
const watched = new WeakSet<HTMLElement>();

function pillOf(nav: HTMLElement) {
  let p = nav.querySelector<HTMLElement>(':scope>.lg-pill');
  if (!p) {
    p = document.createElement('i');
    p.className = 'lg-pill';
    p.setAttribute('aria-hidden', 'true');
    nav.prepend(p);
  }
  return p;
}
const pillTabs = (nav: HTMLElement) => [...nav.querySelectorAll<HTMLButtonElement>(':scope>button')].filter((b) => b.offsetWidth > 0);
const pillActive = (nav: HTMLElement) => {
  const T = pillTabs(nav);
  return isNav(nav) ? T.find((b) => b.dataset.v === S.tab) : T.find((b) => b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true');
};
const pillKey = (nav: HTMLElement) => {
  if (isNav(nav)) return '';
  const list = [...document.querySelectorAll<HTMLElement>(PILL_SEL)].filter((n) => !isNav(n));
  const first = nav.querySelector('button');
  return list.indexOf(nav) + ':' + (first ? first.textContent : '');
};
const setVar = (nav: HTMLElement, k: string, v: number) => nav.style.setProperty(k, v + 'px');

/* si el selector o sus opciones cambian de tamaño (carga de la letra, ventana, filtros), la gota se reacomoda sola */
function pillWatch(nav: HTMLElement) {
  if (watched.has(nav) || !window.ResizeObserver) return;
  watched.add(nav);
  const ro = new ResizeObserver(() => {
    if (!nav.isConnected) {
      ro.disconnect();
      return;
    }
    if (nav.classList.contains('drag')) return;
    const b = pillActive(nav),
      p = pillOf(nav);
    if (!b || !p.dataset.ok) return;
    p.style.transition = 'none';
    pillPlace(nav, b);
    void p.offsetWidth;
    p.style.transition = '';
  });
  ro.observe(nav);
  pillTabs(nav).forEach((b) => ro.observe(b));
}
function pillPlace(nav: HTMLElement, b: HTMLElement | undefined) {
  pillWatch(nav);
  const p = pillOf(nav);
  if (!b) {
    p.classList.add('off');
    return;
  }
  p.classList.remove('off');
  /* las subpestañas se redibujan con la página: la gota arranca donde estaba antes y viaja a la nueva opción */
  const k = pillKey(nav),
    prev = k ? prevPos[k] : undefined,
    first = !p.dataset.ok;
  if (first) {
    p.style.transition = 'none';
    if (prev) {
      setVar(nav, '--px', prev[0]);
      setVar(nav, '--py', prev[1]);
      setVar(nav, '--pw', prev[2]);
      setVar(nav, '--ph', prev[3]);
    }
    void p.offsetWidth;
    if (prev) p.style.transition = '';
  }
  setVar(nav, '--px', b.offsetLeft);
  setVar(nav, '--py', b.offsetTop);
  setVar(nav, '--pw', b.offsetWidth);
  setVar(nav, '--ph', b.offsetHeight);
  if (first && !prev) {
    void p.offsetWidth;
    p.style.transition = '';
  }
  p.dataset.ok = '1';
  if (k) prevPos[k] = [b.offsetLeft, b.offsetTop, b.offsetWidth, b.offsetHeight];
}
export function pillSync() {
  document.querySelectorAll<HTMLElement>(PILL_SEL).forEach((nav) => {
    if (nav.classList.contains('drag') || !nav.offsetWidth) return;
    pillPlace(nav, pillActive(nav));
  });
}

interface Drag {
  nav: HTMLElement;
  vert: boolean;
  x: number;
  y: number;
  lx: number;
  ly: number;
  lt: number;
  on: boolean;
  id: number;
  hov?: HTMLElement | null;
}

/** Engancha los gestos una sola vez (devuelve cómo desengancharlos). */
export function pillInit() {
  let st: Drag | null = null,
    swallow = false;
  const down = (e: PointerEvent) => {
    const t = e.target as Element | null;
    const nav = t && t.closest ? t.closest<HTMLElement>(PILL_SEL) : null;
    if (!nav || e.button > 0) return;
    const b = t!.closest('button');
    if (!b || b.parentNode !== nav) return;
    st = { nav, vert: nav.classList.contains('sidenav'), x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), on: false, id: e.pointerId };
  };
  const move = (e: PointerEvent) => {
    if (!st || e.pointerId !== st.id) return;
    const nav = st.nav,
      vert = st.vert,
      d = vert ? e.clientY - st.y : e.clientX - st.x;
    if (!st.on) {
      if (Math.abs(d) < 7) return;
      /* era un scroll vertical, no un arrastre */
      if (!vert && Math.abs(e.clientY - st.y) > Math.abs(d) * 1.2 && !isNav(nav)) {
        st = null;
        return;
      }
      st.on = true;
      try {
        nav.setPointerCapture(st.id);
      } catch {
        /* sin captura */
      }
      nav.classList.add('drag');
      nav.closest('.tabs')?.classList.add('lift');
      buzz(5);
    }
    const T = pillTabs(nav),
      r = nav.getBoundingClientRect(),
      cur = pillActive(nav) || T[0];
    if (!cur) return;
    const w = cur.offsetWidth,
      h = cur.offsetHeight,
      padL = T[0].offsetLeft,
      padT = T[0].offsetTop,
      last = T[T.length - 1];
    /* la gota sigue al dedo, sin salirse del selector */
    const c = vert ? clamp(e.clientY - r.top, padT + h / 2, last.offsetTop + last.offsetHeight - h / 2) : clamp(e.clientX - r.left, padL + w / 2, last.offsetLeft + last.offsetWidth - w / 2);
    if (vert) setVar(nav, '--py', c - h / 2);
    else setVar(nav, '--px', c - w / 2);
    setVar(nav, '--pw', w);
    setVar(nav, '--ph', h);
    /* se estira en el sentido del movimiento según la velocidad */
    const now = performance.now(),
      v = Math.abs((vert ? e.clientY - st.ly : e.clientX - st.lx) / Math.max(1, now - st.lt));
    st.lx = e.clientX;
    st.ly = e.clientY;
    st.lt = now;
    const k = Math.min(0.2, v * 0.11),
      big = vert ? 1.04 : isNav(nav) ? 1.14 : 1.08;
    nav.style.setProperty(vert ? '--sy' : '--sx', (big + k).toFixed(3));
    nav.style.setProperty(vert ? '--sx' : '--sy', (big - k * 0.6).toFixed(3));
    /* la opción que queda debajo se resalta como bajo una lupa */
    let hov: HTMLElement | null = null,
      bd = 1e9;
    T.forEach((b) => {
      const m = vert ? b.offsetTop + b.offsetHeight / 2 : b.offsetLeft + b.offsetWidth / 2,
        dd = Math.abs(m - c);
      if (dd < bd) {
        bd = dd;
        hov = b;
      }
    });
    T.forEach((b) => b.classList.toggle('hov', b === hov));
    if (st.hov && st.hov !== hov) buzz(4);
    st.hov = hov;
  };
  const end = (e: PointerEvent) => {
    if (!st || e.pointerId !== st.id) return;
    const { nav, on, hov } = st;
    st = null;
    if (!on) return;
    nav.classList.remove('drag');
    nav.closest('.tabs')?.classList.remove('lift');
    nav.style.removeProperty('--sx');
    nav.style.removeProperty('--sy');
    pillTabs(nav).forEach((b) => b.classList.remove('hov'));
    const act = pillActive(nav);
    if (hov && hov !== act) {
      if (isNav(nav)) goTab(hov.dataset.v as Tab);
      else hov.click();
    } else pillPlace(nav, act);
    swallow = true;
    setTimeout(() => {
      swallow = false;
    }, 0);
  };
  /* si fue un arrastre, el clic que llega al soltar no cuenta */
  const click = (e: MouseEvent) => {
    const t = e.target as Element | null;
    if (swallow && t && t.closest && t.closest(PILL_SEL)) {
      e.stopPropagation();
      e.preventDefault();
      swallow = false;
    }
  };
  document.addEventListener('pointerdown', down);
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  document.addEventListener('click', click, true);
  window.addEventListener('resize', pillSync);
  document.fonts?.ready.then(() => pillSync()).catch(() => {});
  return () => {
    document.removeEventListener('pointerdown', down);
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', end);
    document.removeEventListener('pointercancel', end);
    document.removeEventListener('click', click, true);
    window.removeEventListener('resize', pillSync);
  };
}
