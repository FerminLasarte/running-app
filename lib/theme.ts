/* Tema: claro, oscuro o el del sistema. Sin nada guardado sigue al sistema, también si cambia con la app abierta.
   La lógica vive en el script que corre antes de pintar (app/layout.tsx): así no parpadea y hay una sola copia. */
export type ThemeMode = 'light' | 'dark' | 'system';

const KEY = 'rr_theme';
const EVENT = 'rr-theme';

declare global {
  interface Window {
    /** vuelve a aplicar el tema guardado; lo define THEME_SCRIPT */
    __applyTheme?: () => void;
  }
}

export const THEME_SCRIPT = `(function(){var d=document.documentElement,m=matchMedia('(prefers-color-scheme: dark)');function a(){var t=null;try{t=localStorage.getItem('${KEY}')}catch(e){}d.setAttribute('data-theme',t==='dark'||t==='light'?t:m.matches?'dark':'light')}a();m.addEventListener('change',a);window.__applyTheme=a})()`;

/* quien prueba sin cuenta no guarda nada en el navegador: el tema que elige dura hasta recargar */
let remember = true,
  held: ThemeMode = 'system';
export function rememberTheme(on: boolean) {
  held = themeMode();
  remember = on;
}

export function themeMode(): ThemeMode {
  if (!remember) return held;
  try {
    const t = localStorage.getItem(KEY);
    return t === 'dark' || t === 'light' ? t : 'system';
  } catch {
    return 'system';
  }
}

export function setThemeMode(m: ThemeMode) {
  held = m;
  if (remember) {
    try {
      if (m === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, m);
    } catch {
      /* sin almacenamiento: el cambio dura hasta recargar */
    }
    window.__applyTheme?.();
  }
  if (m !== 'system') document.documentElement.setAttribute('data-theme', m);
  else if (!remember) document.documentElement.setAttribute('data-theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  window.dispatchEvent(new Event(EVENT));
}

/** para useSyncExternalStore: avisa cuando se elige otro tema desde cualquier lado de la app */
export function onThemeChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/** el botón de la barra: fija el contrario del que se ve */
export const toggleTheme = () => setThemeMode(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
