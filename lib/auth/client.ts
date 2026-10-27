'use client';
/* Sesión del usuario desde el navegador. */
import { S } from '@/lib/store';
import { supabaseBrowser } from '@/lib/supabase/client';

/** todo lo que la app guarda en el navegador (sus claves empiezan con «rr»: datos, cambios sin subir, el borrador…) */
function wipeLocal() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('rr'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* sin almacenamiento local */
  }
}

export async function signOut() {
  await supabaseBrowser().auth.signOut();
  try {
    localStorage.removeItem('rr1');
  } catch {
    /* sin almacenamiento local */
  }
  // recarga completa: borra el estado de la app en memoria
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = '/login';
}

/** Elimina la cuenta con todo lo suyo (sin cuenta, lo de este navegador) y limpia lo guardado acá. Si falla, tira error y
    no toca nada de acá. */
export async function deleteAccount() {
  const cloud = S.mode === 'cloud';
  if (cloud) {
    const r = await fetch('/api/account/delete', { method: 'POST' });
    if (!r.ok) throw new Error(String(r.status));
    await supabaseBrowser()
      .auth.signOut({ scope: 'local' })
      .catch(() => null);
  }
  wipeLocal();
  // recarga completa: borra el estado de la app en memoria (sin cuenta, arranca de cero con la bienvenida)
  window.location.href = cloud ? '/login' : '/';
}
