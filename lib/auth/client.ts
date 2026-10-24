'use client';
/* Sesión del usuario desde el navegador. */
import { supabaseBrowser } from '@/lib/supabase/client';

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
