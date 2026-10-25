'use client';
/* Atajos de teclado (compu): 1–6 secciones, ← → semana (en Semana), R registrar, P planificar y Esc cierra lo que esté
   arriba de todo. «/» busca en Registro: está en LogView. */
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { S, setS } from '@/lib/store';
import { openSheet, requestClose } from '@/lib/sheets';
import { weekGo } from '@/lib/data/actions';
import { NAV } from './sections';

const typingIn = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

export function useShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const path = useRef(pathname);
  useEffect(() => {
    path.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map = S.ui.map as { fs?: boolean } | undefined;
      if (e.key === 'Escape') {
        if (map && map.fs && path.current === '/mapa' && !S.sheet) setS({ ui: { ...S.ui, map: { ...map, fs: false } } });
        else if (S.ui.celebrate) setS({ ui: { ...S.ui, celebrate: null } });
        else if (S.ui.sheetConfirm) setS({ ui: { ...S.ui, sheetConfirm: false } });
        else if (S.sheet) requestClose();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || S.sheet || S.ui.celebrate || (map && map.fs) || typingIn(e.target)) return;
      const k = e.key.toLowerCase();
      if (/^[1-6]$/.test(k)) router.push(NAV[+k - 1].href);
      else if (path.current === '/semana' && (k === 'arrowleft' || k === 'arrowright')) weekGo(k === 'arrowleft' ? -1 : 1);
      else if (k === 'r') openSheet('result', { id: null });
      else if (k === 'p') openSheet('plan', {});
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [router]);
}
